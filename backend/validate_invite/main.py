import functions_framework
from firebase_admin import firestore, initialize_app
from flask import make_response, jsonify

# Initialize Firebase Admin
initialize_app()
db = firestore.client()

@functions_framework.http
def validate_invite(request):
    if request.method == "OPTIONS":
        # Handle preflight CORS request
        response = make_response("", 204)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        return response

    try:
        request_json = request.get_json(silent=True)
        token = request_json.get('token') if request_json else None

        if not token:
            response = make_response("Missing token.", 400)
            response.headers["Access-Control-Allow-Origin"] = "*"
            return response

        # Query the invites collection for the token
        invites_ref = db.collection('invites')
        query = invites_ref.where('token', '==', token).limit(1)
        results = query.stream()

        invite = None
        for doc in results:
            invite = doc.to_dict()
            invite['id'] = doc.id

        if not invite:
            response = make_response("Invalid or expired token.", 404)
            response.headers["Access-Control-Allow-Origin"] = "*"
            return response

        if invite.get('used', False):
            response = make_response("This invite has already been used.", 400)
            response.headers["Access-Control-Allow-Origin"] = "*"
            return response

        # Fetch accountName using accountId
        account_ref = db.collection('accounts').document(invite['accountId'])
        account_doc = account_ref.get()
        if account_doc.exists:
            invite['accountName'] = account_doc.to_dict().get('name', 'Unknown Account')
        else:
            invite['accountName'] = 'Unknown Account'

        # Return invite details
        response = make_response(jsonify(invite), 200)
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response

    except Exception as e:
        response = make_response(str(e), 500)
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response