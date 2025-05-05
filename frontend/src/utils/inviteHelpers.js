import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

export const sendUserInvite = async ({ email, accountId }) => {
  const inviteRef = collection(db, "invites");
  await addDoc(inviteRef, {
    email,
    accountId,
    createdAt: serverTimestamp(),
    used: false,
  });
};
