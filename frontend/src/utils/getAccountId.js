// src/utils/getAccountId.js
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

export const getAccountId = async () => {
  const user = auth.currentUser;
  if (!user) return null;

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data().accountId;
  }

  return null;
};

export default getAccountId;