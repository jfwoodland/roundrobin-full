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
  setDoc,
  updateDoc,
  getDocs,
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
        console.error("Missing invite token.");
        setError("Missing invite token.");
        return;
      }

      try {
        console.log("Sending POST request to validate_invite with token:", token);
        const response = await fetch("https://us-central1-roundrobin-clean.cloudfunctions.net/validate_invite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        console.log("Response status:", response.status);
        const data = await response.json();
        console.log("Response data:", data);

        if (!response.ok) {
          console.error("Error validating invite:", data.error || "Unknown error");
          setError(data.error || "Failed to validate invite.");
          return;
        }

        setInvite(data);
        setAccountName(data.accountName || "an account");
      } catch (err) {
        console.error("An error occurred while validating the invite:", err);
        setError("An error occurred while validating the invite.");
      }
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
