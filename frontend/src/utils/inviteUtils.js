// src/utils/inviteUtils.js
import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { nanoid } from "nanoid";

export const createInvite = async (email, accountId) => {
  const token = nanoid(24); // secure random token
  const now = new Date();
  const expiresAt = Timestamp.fromDate(new Date(now.getTime() + 1000 * 60 * 60 * 24)); // 24h expiration

  const inviteRef = await addDoc(collection(db, "pendingInvites"), {
    email,
    accountId,
    token,
    createdAt: serverTimestamp(),
    expiresAt,
    used: false,
  });

  return token;
};
