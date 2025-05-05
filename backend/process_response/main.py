from flask import request, Response
from google.cloud import firestore
from twilio.twiml.voice_response import VoiceResponse, Say, Dial

db = firestore.Client()
MAX_RETRIES = 2

def normalize(number):
    return number.replace("+", "").replace("-", "").replace(" ", "")

def process_response(request):
    try:
        digits = request.form.get("Digits")
        from_number = request.form.get("From")
        callee_sid = request.form.get("CallSid")  # ✅ Recipient’s unique SID
        room = request.args.get("room")
        user_id = request.args.get("user_id")
        account_id = request.args.get("account_id")
        retry_count = int(request.args.get("retry", 0))

        call_sid = room.replace("conf-", "") if room else None

        print(f"[PROCESS] Digits: {digits}")
        print(f"[PROCESS] From: {from_number}")
        print(f"[PROCESS] Room: {room}")
        print(f"[PROCESS] User ID: {user_id}")
        print(f"[PROCESS] Account ID: {account_id}")
        print(f"[PROCESS] Retry: {retry_count}")
        print(f"[PROCESS] Callee SID: {callee_sid}")

        response = VoiceResponse()

        if not all([room, user_id, account_id]):
            print("[PROCESS] Missing required parameters.")
            response.say("Missing required information. Goodbye.")
            return Response(str(response), mimetype="application/xml")

        if digits != "1":
            print("[PROCESS] Incorrect digit pressed.")
            if retry_count >= MAX_RETRIES:
                response.say("Too many failed attempts. Goodbye.")
                return Response(str(response), mimetype="application/xml")

            retry_url = (
                f"https://us-central1-roundrobin-clean.cloudfunctions.net/gather_response"
                f"?room={room}&user_id={user_id}&account_id={account_id}&retry={retry_count + 1}"
            )
            response.say("Invalid input.")
            response.redirect(retry_url)
            return Response(str(response), mimetype="application/xml")

        account_ref = db.collection("accounts").document(account_id)
        user_ref = account_ref.collection("users").document(user_id)
        call_ref = account_ref.collection("calls").document(call_sid)

        user_doc = user_ref.get()
        account_doc = account_ref.get()
        call_doc = call_ref.get()

        if not user_doc.exists or not account_doc.exists or not call_doc.exists:
            print("[PROCESS] Firestore documents missing.")
            response.say("System error occurred. Goodbye.")
            return Response(str(response), mimetype="application/xml")

        expected_twilio_number = account_doc.to_dict().get("twilio_number")
        if normalize(from_number) != normalize(expected_twilio_number):
            print(f"[PROCESS] Verification failed: {normalize(from_number)} != {normalize(expected_twilio_number)}")
            if retry_count >= MAX_RETRIES:
                response.say("Verification failed. Goodbye.")
                return Response(str(response), mimetype="application/xml")

            retry_url = (
                f"https://us-central1-roundrobin-clean.cloudfunctions.net/gather_response"
                f"?room={room}&user_id={user_id}&account_id={account_id}&retry={retry_count + 1}"
            )
            response.say("Verification failed.")
            response.redirect(retry_url)
            return Response(str(response), mimetype="application/xml")

        if call_doc.to_dict().get("status") == "caller_left":
            print("[PROCESS] Caller has already left. Do not join.")
            response.say("The caller has already left. Goodbye.")
            return Response(str(response), mimetype="application/xml")

        # ✅ Mark user as joined
        user_ref.update({"status": "in_conference"})

        # ✅ Join conference with status callbacks and participant label
        dial = Dial()
        dial.conference(
            room,
            participant_label=user_id,  # ✅ Enables user_id tracking via webhook
            start_conference_on_enter=True,
            end_conference_on_exit=True,
            status_callback=(
                f"https://us-central1-roundrobin-clean.cloudfunctions.net/conference_callback"
                f"?account_id={account_id}&call_sid={callee_sid}"
            ),
            status_callback_event="start end join leave",  # ✅ Proper format
            status_callback_method="POST",
            wait_url="http://twimlets.com/holdmusic?Bucket=com.twilio.music.ambient"
        )

        response.say("Connecting you now.")
        response.append(dial)
        return Response(str(response), mimetype="application/xml")

    except Exception as e:
        print(f"[ERROR] process_response: {e}")
        return Response("<Response><Say>Error occurred. Goodbye.</Say></Response>", mimetype="application/xml")
