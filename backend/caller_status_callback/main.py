from flask import request, Response
from google.cloud import firestore
from twilio.rest import Client
import os

db = firestore.Client()
client = Client(
    os.getenv("TWILIO_ACCOUNT_SID"),
    os.getenv("TWILIO_AUTH_TOKEN")
)

FINAL_USER_STATUSES = {"completed", "no-answer", "busy", "failed", "canceled"}

def caller_status_callback(request):
    form = request.form.to_dict()
    call_sid = form.get("CallSid")
    call_status = form.get("CallStatus")
    user_id = request.args.get("user_id")
    account_id = request.args.get("account_id")
    parent_call_sid = request.args.get("call_sid")  # from handle_call callback URL

    print("========== Twilio Callback ==========")
    for key, value in form.items():
        print(f"{key}: {value}")
    print(f"user_id: {user_id}")
    print(f"account_id: {account_id}")
    print(f"parent_call_sid: {parent_call_sid}")
    print("=====================================")

    if not account_id or not call_sid:
        print("[CALLBACK] Missing account_id or call_sid")
        return Response("Missing account_id or call_sid", status=400)

    try:
        account_ref = db.collection("accounts").document(account_id)

        # 🛑 Early check: if call is still ringing but caller has already left
        if parent_call_sid and user_id:
            main_call_ref = account_ref.collection("calls").document(parent_call_sid)
            main_call_doc = main_call_ref.get()
            if main_call_doc.exists and main_call_doc.to_dict().get("status") == "caller_left":
                try:
                    print(f"[CALLBACK] Caller already left. Canceling ringing call: {call_sid}")
                    client.calls(call_sid).update(status="canceled")
                except Exception as ce:
                    print(f"[CALLBACK] Error canceling early call {call_sid}: {ce}")
                return Response("Caller already left; call canceled.", status=200)

        # 🧑‍💼 User leg handling
        if user_id:
            if call_status in FINAL_USER_STATUSES:
                print(f"[CALLBACK] Final status for user leg: {call_status}. Marking user available.")
                account_ref.collection("users").document(user_id).update({
                    "status": "available"
                })

                if parent_call_sid:
                    outbound_ref = account_ref.collection("calls").document(parent_call_sid).collection("outbound").document(call_sid)
                    if outbound_ref.get().exists:
                        outbound_ref.update({"status": call_status})
                        print(f"[CALLBACK] Updated outbound {call_sid} with status: {call_status}")

        # ☎️ Caller leg ends
        if not user_id and call_status == "completed":
            main_call_ref = account_ref.collection("calls").document(call_sid)
            if main_call_ref.get().exists:
                print(f"[CALLBACK] Caller hung up. Updating status and canceling outbound.")
                main_call_ref.update({"status": "caller_left"})

                outbound_calls = main_call_ref.collection("outbound").stream()
                for doc in outbound_calls:
                    outbound_sid = doc.id
                    try:
                        print(f"[CALLBACK] Canceling outbound call: {outbound_sid}")
                        client.calls(outbound_sid).update(status="canceled")
                    except Exception as ce:
                        print(f"[CALLBACK] Error canceling {outbound_sid}: {ce}")
            else:
                print(f"[CALLBACK] Caller call SID not found: {call_sid}")

    except Exception as e:
        print(f"[CALLBACK ERROR] {e}")

    return Response("OK", status=200)
