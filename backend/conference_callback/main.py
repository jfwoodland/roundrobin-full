from flask import request, Response
from google.cloud import firestore
import requests
import os

db = firestore.Client()

def conference_callback(request):
    event = request.form.get("StatusCallbackEvent")
    room = request.form.get("FriendlyName")  # e.g., conf-CAxxxx
    call_sid = request.args.get("call_sid") or (room.replace("conf-", "") if room else None)
    account_id = request.args.get("account_id")
    participant_label = request.form.get("ParticipantLabel") or request.form.get("Label")
    user_id = request.args.get("user_id")  # fallback (usually not available in callback)

    print(f"[CONF-CALLBACK] Event: {event}")
    print(f"[CONF-CALLBACK] Room: {room}")
    print(f"[CONF-CALLBACK] call_sid: {call_sid}")
    print(f"[CONF-CALLBACK] account_id: {account_id}")
    print(f"[CONF-CALLBACK] participant_label (user_id): {participant_label}")
    print(f"[CONF-CALLBACK] fallback user_id: {user_id}")

    if not account_id or not call_sid:
        print("[CONF-CALLBACK] Missing account_id or call_sid")
        return Response("Missing account_id or call_sid", status=400)

    try:
        account_ref = db.collection("accounts").document(account_id)
        call_ref = account_ref.collection("calls").document(call_sid)

        if event == "participant-join":
            if participant_label:
                print(f"[CONF-CALLBACK] Callee {participant_label} joined. Setting callee_joined = True")
                if call_ref.get().exists:
                    call_ref.update({"callee_joined": True})
            else:
                print(f"[CONF-CALLBACK] Caller joined. Marking call {call_sid} as connected.")
                if call_ref.get().exists:
                    call_ref.update({"status": "connected"})

                    try:
                        print("[CONF-CALLBACK] Triggering handle_call function")
                        requests.post(
                            "https://us-central1-roundrobin-clean.cloudfunctions.net/handle_call",
                            data={
                                "CallSid": call_sid,
                                "To": account_ref.get().to_dict().get("twilio_number")
                            },
                            timeout=10
                        )
                    except Exception as trigger_err:
                        print(f"[CONF-CALLBACK] Failed to trigger handle_call: {trigger_err}")

        elif event == "participant-leave" and participant_label:
            user_ref = account_ref.collection("users").document(participant_label)
            if user_ref.get().exists:
                print(f"[CONF-CALLBACK] User {participant_label} left. Marking available.")
                user_ref.update({"status": "available"})
            else:
                print(f"[CONF-CALLBACK] User {participant_label} not found.")

        elif event == "conference-end":
            print(f"[CONF-CALLBACK] Conference ended. Marking call {call_sid} as caller_left.")
            if call_ref.get().exists:
                call_ref.update({"status": "caller_left"})

        else:
            print(f"[CONF-CALLBACK] Ignored event: {event}")

    except Exception as e:
        print(f"[CONF-CALLBACK ERROR] {e}")

    return Response("OK", status=200)

