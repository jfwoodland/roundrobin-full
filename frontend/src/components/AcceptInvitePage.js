// src/components/AcceptInvitePage.js
import React, { useEffect, useState } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
  CircularProgress,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  collection,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { formatDisplayPhone } from "../utils/phoneFormatters";

const AcceptInvitePage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const successFlag = searchParams.get("success") === "true";
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [accountName, setAccountName] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) {
        setError("Missing invite token.");
        return;
      }

      const q = query(collection(db, "invites"), where("token", "==", token));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("Invalid or expired invite link.");
        return;
      }

      const docData = snapshot.docs[0].data();
      const docId = snapshot.docs[0].id;

      if (docData.used) {
        setError("This invite has already been used.");
        return;
      }

      const accountSnap = await getDoc(doc(db, "accounts", docData.accountId));
      setAccountName(accountSnap.exists() ? accountSnap.data().name : "an account");
      setInvite({ id: docId, ...docData });
    };

    fetchInvite();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!invite) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const parsedPhone = parsePhoneNumberFromString(phone, "US");
    if (!parsedPhone || !parsedPhone.isValid()) {
      setError("Please enter a valid 10-digit phone number.");
      setLoading(false);
      return;
    }

    try {
      const result = await createUserWithEmailAndPassword(auth, invite.email, password);
      const userId = result.user.uid;

      const usersSnap = await getDocs(collection(db, "accounts", invite.accountId, "users"));
      const order = usersSnap.size;

      await setDoc(doc(db, "users", userId), {
        name,
        phone_number: parsedPhone.number,
        accountId: invite.accountId,
        role: "user",
        email: invite.email,
      });

      await setDoc(doc(db, "accounts", invite.accountId, "users", userId), {
        name,
        phone_number: parsedPhone.number,
        status: "available",
        order,
      });

      await updateDoc(doc(db, "invites", invite.id), { used: true });

      // ✅ Redirect to same page with success flag
      navigate(`/accept-invite?token=${token}&success=true`);
    } catch (err) {
      console.error(err);
      setError("Failed to accept invite. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 4, mt: 8 }}>
        <Typography variant="h5" gutterBottom>
          Join Account
        </Typography>

        <Typography variant="body2" gutterBottom>
          You are joining: <strong>{accountName}</strong>
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {successFlag && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Account created successfully!
          </Alert>
        )}

        {!successFlag && (
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <TextField
              label="Phone Number"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => {
                const parsed = parsePhoneNumberFromString(phone, "US");
                if (parsed?.isValid()) {
                  setPhone(formatDisplayPhone(parsed.number));
                }
              }}
              placeholder="(555) 123-4567"
            />

            <TextField label="Email" value={invite?.email || ""} disabled />

            <TextField
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <TextField
              label="Confirm Password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={!!confirmPassword && password !== confirmPassword}
              helperText={confirmPassword && password !== confirmPassword ? "Passwords do not match" : ""}
            />

            <Button type="submit" variant="contained" disabled={!invite || loading}>
              {loading ? <CircularProgress size={24} color="inherit" /> : "Join Account"}
            </Button>
          </Box>
        )}

        {successFlag && (
          <Box sx={{ mt: 3 }}>
            <Button variant="contained" onClick={() => navigate("/")}>
              Go to Account
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default AcceptInvitePage;
