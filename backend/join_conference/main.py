from flask import request, Response
from twilio.twiml.voice_response import VoiceResponse, Dial
from google.cloud import firestore
import logging

db = firestore.Client()
logging.basicConfig(level=logging.INFO)

def join_conference(request):
    try:
        call_sid = request.form.get("CallSid")
        twilio_number = request.form.get("To")

        response = VoiceResponse()

        if not call_sid or not twilio_number:
            logging.error("[JOIN] Missing CallSid or To")
            response.say("Missing required information. Goodbye.")
            return Response(str(response), mimetype="application/xml")

        room_name = f"conf-{call_sid}"
        logging.info(f"[JOIN] Placing caller {call_sid} into conference room: {room_name}")

        # 🔍 Lookup account based on Twilio number
        account_query = db.collection("accounts").where("twilio_number", "==", twilio_number).get()
        if not account_query:
            logging.error(f"[JOIN] No account found for number: {twilio_number}")
            response.say("Account not found. Goodbye.")
            return Response(str(response), mimetype="application/xml")

        account_id = account_query[0].id

        # Pre-create call document so callbacks don't fail
        call_doc_ref = db.collection("accounts").document(account_id).collection("calls").document(call_sid)
        call_doc_ref.set({
            "status": "initiated",
            "timestamp": firestore.SERVER_TIMESTAMP
        })


        # ✅ Create <Dial><Conference> with proper statusCallbackEvent format
        dial = Dial()
        dial.conference(
            room_name,
            start_conference_on_enter=True,
            end_conference_on_exit=True,
            status_callback=f"https://us-central1-roundrobin-clean.cloudfunctions.net/conference_callback?call_sid={call_sid}&account_id={account_id}",
            status_callback_event="start end join leave",  # ✅ CORRECT FORMAT
            status_callback_method="POST",
            wait_url="http://twimlets.com/holdmusic?Bucket=com.twilio.music.electronica"
        )

        response.say("Please hold while we connect you.")
        response.append(dial)
        return Response(str(response), mimetype="application/xml")

    except Exception as e:
        logging.error(f"[ERROR] join_conference: {e}")
        return Response("<Response><Say>Error. Goodbye.</Say></Response>", mimetype="application/xml")





