from flask import jsonify, request
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Say
from google.cloud import firestore
import os
import time

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")

client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
db = firestore.Client()

WAIT_FOR_CALLER_TIMEOUT = 20  # Seconds to wait for caller to join

def handle_call(request):
    try:
        data = request.form
        call_sid = data.get("CallSid")
        twilio_number = data.get("To")

        if not call_sid or not twilio_number:
            return jsonify({"error": "Missing CallSid or To"}), 400

        room_name = f"conf-{call_sid}"
        print(f"[HANDLE CALL] Starting call {call_sid}, room: {room_name}")

        accounts = db.collection("accounts").where("twilio_number", "==", twilio_number).get()
        if not accounts:
            print("[HANDLE CALL] No account found for number:", twilio_number)
            return jsonify({"error": "Account not found"}), 404

        account_doc = accounts[0]
        account_ref = account_doc.reference
        account_id = account_ref.id
        account_twilio_number = account_doc.get("twilio_number")

        max_retries = account_doc.to_dict().get("max_retries", 3)  # 🔁 Firestore-controlled retries
        print(f"[HANDLE CALL] max_retries: {max_retries}")

        if not account_twilio_number:
            print("[HANDLE CALL] Twilio number missing in account.")
            return jsonify({"error": "Twilio number not configured for account"}), 500

        call_ref = account_ref.collection("calls").document(call_sid)
        if not call_ref.get().exists:
            call_ref.set({
                "status": "waiting",
                "timestamp": firestore.SERVER_TIMESTAMP,
                "callee_joined": False
            })
            print(f"[HANDLE CALL] Created call document with status 'waiting'")
        else:
            print(f"[HANDLE CALL] Call document already exists, not overwriting")

        print("[WAIT] Waiting for caller to join...")
        for _ in range(WAIT_FOR_CALLER_TIMEOUT):
            call_doc = call_ref.get()
            if call_doc.exists and call_doc.to_dict().get("status") == "connected":
                print("[JOINED] Caller is connected. Starting round robin.")
                break
            time.sleep(1)
        else:
            print("[TIMEOUT] Caller did not join conference.")
            return jsonify({"message": "Caller did not join"}), 200

        users_ref = account_ref.collection("users").order_by("order").stream()
        users = [{"id": doc.id, **doc.to_dict()} for doc in users_ref]
        if not users:
            print("[HANDLE CALL] No users found for account:", account_id)
            return jsonify({"error": "No users found"}), 404

        for attempt in range(max_retries):
            print(f"[ROUND {attempt + 1}] Starting user call attempts...")
            for user in users:
                user_id = user["id"]
                number = user["phone_number"]

                call_doc = call_ref.get()
                call_data = call_doc.to_dict() if call_doc.exists else {}

                if call_data.get("status") == "caller_left":
                    print("[STOP] Caller already left. Canceling all pending outbound calls.")
                    for doc in call_ref.collection("outbound").stream():
                        try:
                            client.calls(doc.id).update(status="canceled")
                        except Exception as ce:
                            print(f"[HANDLE CALL] Failed to cancel {doc.id}: {ce}")
                    return jsonify({"message": "Caller ended"}), 200

                if call_data.get("callee_joined"):
                    print("[STOP] A user has joined. Ending round robin.")
                    return jsonify({"message": "User joined"}), 200

                if user.get("status") == "in_conference":
                    print(f"[SKIP] {number} is already in a conference")
                    continue

                print(f"[CALLING] Trying {number}")
                try:
                    call = client.calls.create(
                        to=number,
                        from_=account_twilio_number,
                        url=f"https://us-central1-roundrobin-clean.cloudfunctions.net/gather_response?room={room_name}&user_id={user_id}&account_id={account_id}",
                        status_callback=f"https://us-central1-roundrobin-clean.cloudfunctions.net/caller_status_callback?user_id={user_id}&account_id={account_id}&call_sid={call_sid}",
                        status_callback_event=["initiated", "ringing", "answered", "completed"],
                        status_callback_method="POST"
                    )
                    call_ref.collection("outbound").document(call.sid).set({
                        "to": number,
                        "user_id": user_id,
                        "status": "initiated"
                    })
                except Exception as call_error:
                    print(f"[ERROR] Failed to call {number}: {call_error}")
                    continue

                for _ in range(10):
                    call_doc = call_ref.get()
                    call_data = call_doc.to_dict() if call_doc.exists else {}
                    if call_data.get("status") == "caller_left":
                        print("[STOP] Caller left during wait. Canceling remaining calls.")
                        for doc in call_ref.collection("outbound").stream():
                            try:
                                client.calls(doc.id).update(status="canceled")
                            except Exception as ce:
                                print(f"[HANDLE CALL] Failed to cancel {doc.id}: {ce}")
                        return jsonify({"message": "Caller ended during wait"}), 200
                    if call_data.get("callee_joined"):
                        print("[STOP] Conference joined during wait. Stopping further attempts.")
                        return jsonify({"message": "User joined"}), 200
                    time.sleep(1)

        print("[COMPLETE] No users connected after max retries.")
        # 🗣️ Final message to the caller before disconnecting
        try:
            twiml = VoiceResponse()
            twiml.say("Sorry, no one was available to take your call. Goodbye.")
            client.calls(call_sid).update(twiml=str(twiml))
            print("[HANDLE CALL] Sent goodbye message to caller.")
        except Exception as final_err:
            print(f"[HANDLE CALL] Failed to update caller TwiML: {final_err}")

        return jsonify({"message": "No users connected"}), 200

    except Exception as e:
        print(f"[ERROR] handle_call: {e}")
        return jsonify({"error": str(e)}), 500
