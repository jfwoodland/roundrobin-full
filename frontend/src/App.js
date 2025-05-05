// src/App.js
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

import AdminPanel from "./AdminPanel";
import LoginPage from "./LoginPage";
import AccountCreationPage from "./components/AccountCreationPage";
import ResetConfirmation from "./components/ResetConfirmation";
import SignupPage from "./SignUpPage";
import AcceptInvitePage from "./components/AcceptInvitePage";

const App = () => {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [hasAccount, setHasAccount] = useState(false);

  const refreshAccountStatus = async (user) => {
    if (!user) {
      setUser(null);
      setHasAccount(false);
      return;
    }

    const userDoc = await getDoc(doc(db, "users", user.uid));
    const hasAccountId = userDoc.exists() && !!userDoc.data().accountId;
    setUser(user);
    setHasAccount(hasAccountId);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      refreshAccountStatus(firebaseUser);
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  if (checkingAuth) return <div>Loading...</div>;

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            hasAccount ? <AdminPanel /> : <Navigate to="/create-account" />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/create-account" element={<AccountCreationPage />} />
      <Route path="/reset-confirmation" element={<ResetConfirmation />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default App;
