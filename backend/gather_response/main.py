from flask import Response, request
from twilio.twiml.voice_response import VoiceResponse, Gather
import logging

logging.basicConfig(level=logging.INFO)

MAX_RETRIES = 2  # You can increase this if needed

def gather_response(request):
    room = request.args.get("room", "").strip()
    user_id = request.args.get("user_id", "").strip()
    account_id = request.args.get("account_id", "").strip()
    retry_count = int(request.args.get("retry", 0))

    logging.info(f"[GATHER] room: {room}")
    logging.info(f"[GATHER] user_id: {user_id}")
    logging.info(f"[GATHER] account_id: {account_id}")
    logging.info(f"[GATHER] retry: {retry_count}")

    response = VoiceResponse()

    if not all([room, user_id, account_id]):
        logging.warning("[GATHER] Missing parameters. Ending call.")
        response.say("Missing required information. Goodbye.")
        return Response(str(response), mimetype="application/xml")

    if retry_count >= MAX_RETRIES:
        logging.info("[GATHER] Max retries reached. Ending call.")
        response.say("Too many failed attempts. Goodbye.")
        return Response(str(response), mimetype="application/xml")

    next_retry = retry_count + 1
    retry_url = (
        f"https://us-central1-roundrobin-clean.cloudfunctions.net/gather_response"
        f"?room={room}&user_id={user_id}&account_id={account_id}&retry={next_retry}"
    )

    gather = Gather(
        num_digits=1,
        action=f"https://us-central1-roundrobin-clean.cloudfunctions.net/process_response"
               f"?room={room}&user_id={user_id}&account_id={account_id}&retry={retry_count}",  # 👈 carry over current retry
        method="POST"
    )
    gather.say("Press 1 to accept the call.")
    response.append(gather)

    response.redirect(retry_url)
    return Response(str(response), mimetype="application/xml")
