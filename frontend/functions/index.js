const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");
const {v4: uuidv4} = require("uuid");

initializeApp();
const db = getFirestore();

exports.generateInviteToken = onDocumentCreated("invites/{inviteId}", async (event) => {
  const snap = event.data;
  const inviteRef = db.doc(snap.ref.path);
  const inviteData = snap.data();

  if (!inviteData || inviteData.token) return;

  const token = uuidv4();
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days

  await inviteRef.update({
    token,
    expiresAt,
    used: false,
  });
});
