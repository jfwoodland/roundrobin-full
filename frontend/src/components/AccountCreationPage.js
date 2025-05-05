// src/components/AccountCreationPage.js
import React, { useEffect, useState } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
} from "@mui/material";
import { db, auth } from "../firebaseConfig";
import { collection, addDoc, doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import {
  formatDisplayPhone,
  normalizePhoneForStorage,
} from "../utils/phoneFormatters";

const AccountCreationPage = ({ onAccountCreated }) => {
  const [accountName, setAccountName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const navigate = useNavigate();

  const validatePhone = (value) => {
    const parsed = parsePhoneNumberFromString("+1" + value.replace(/\D/g, ""));
    if (!parsed || !parsed.isValid()) {
      setPhoneError("Please enter a valid 10-digit phone number");
    } else {
      setPhoneError("");
    }
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value;
    setAdminPhone(raw);
    validatePhone(raw);
  };

  const handlePhoneBlur = () => {
    const digits = adminPhone.replace(/\D/g, "");
    if (digits.length === 10) {
      const parsed = parsePhoneNumberFromString("+1" + digits);
      if (parsed) {
        setAdminPhone(parsed.formatNational());
      }
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError("");

    if (!accountName.trim() || !adminName.trim()) {
      setError("Account name and admin name are required.");
      return;
    }

    const parsedPhone = parsePhoneNumberFromString(
      "+1" + adminPhone.replace(/\D/g, "")
    );
    if (!parsedPhone || !parsedPhone.isValid()) {
      setPhoneError("Invalid phone number.");
      return;
    }

    try {
      const accountRef = await addDoc(collection(db, "accounts"), {
        name: accountName,
        createdBy: auth.currentUser.uid,
        createdAt: new Date(),
      });

      await setDoc(doc(db, "users", auth.currentUser.uid), {
        accountId: accountRef.id,
        role: "admin",
        email: auth.currentUser.email,
      });

      await addDoc(collection(db, "accounts", accountRef.id, "users"), {
        name: adminName,
        phone_number: parsedPhone.number,
        status: "available",
        order: 0,
      });

      if (onAccountCreated) onAccountCreated();
      navigate("/");
    } catch (err) {
      console.error("Error creating account:", err);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 4, mt: 8 }}>
        <Typography variant="h5" gutterBottom>
          Create Your Account
        </Typography>
        <Typography variant="body2" gutterBottom>
          Please enter your account and contact information.
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}

        <Box
          component="form"
          onSubmit={handleCreateAccount}
          sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
        >
          <TextField
            label="Account Name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            required
          />

          <TextField
            label="Your Name"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            required
          />

          <TextField
            label="Your Phone Number"
            value={adminPhone}
            onChange={handlePhoneChange}
            onBlur={handlePhoneBlur}
            required
            placeholder="(555) 123-4567"
            error={!!phoneError}
            helperText={phoneError || ""}
          />

          <Button type="submit" variant="contained" disabled={!!phoneError}>
            Create Account
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AccountCreationPage;
