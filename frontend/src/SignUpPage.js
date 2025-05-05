// src/SignUpPage.js
import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebaseConfig";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const SignUpPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/"); // Auto-login success → redirect to admin panel
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 4, mt: 8 }}>
        <Typography variant="h5" gutterBottom>
          Sign Up
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}

        <Box
          component="form"
          onSubmit={handleSignUp}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
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
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <Button type="submit" variant="contained">
            Create Account
          </Button>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate("/login")}
          >
            Already have an account? Log In
          </Link>
        </Box>
      </Paper>
    </Container>
  );
};

export default SignUpPage;
