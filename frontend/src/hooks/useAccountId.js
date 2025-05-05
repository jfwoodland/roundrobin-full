// src/hooks/useAccountId.js
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

const useAccountId = () => {
  const [accountId, setAccountId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccountId = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(db, "users", user.uid);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        setAccountId(snapshot.data().accountId);
      }
      setLoading(false);
    };

    fetchAccountId();
  }, []);

  return { accountId, loading };
};

export default useAccountId;
