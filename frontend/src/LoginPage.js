import React, { useState } from "react";
import { auth } from "./firebaseConfig";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
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
import { Link as RouterLink } from "react-router-dom";


const LoginPage = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [showReset, setShowReset] = useState(false);
    const navigate = useNavigate();
  
    const handleLogin = async (e) => {
      e.preventDefault();
      setError("");
      setMessage("");
  
      try {
        await signInWithEmailAndPassword(auth, email, password);
        navigate("/"); // ✅ redirect after login
      } catch (err) {
        setError(err.message);
      }
    };
  

  const handleResetPassword = async () => {
    setError("");
    setMessage("");
  
    if (!email) {
      setError("Please enter your email to reset your password.");
      return;
    }
  
    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/reset-confirmation`,
      });
      setMessage("Password reset email sent. Please check your inbox.");
    } catch (err) {
      setError(err.message);
    }
  };
  

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 4, mt: 8 }}>
        <Typography variant="h5" gutterBottom>
          {showReset ? "Reset Password" : "Login"}
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}

        <Box
          component="form"
          onSubmit={handleLogin}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            label="Email"
            type="email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
          />

          {!showReset && (
            <TextField
              label="Password"
              type="password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
            />
          )}

          {showReset ? (
            <Button variant="contained" onClick={handleResetPassword}>
              Send Reset Email
            </Button>
          ) : (
            <Button type="submit" variant="contained">
              Sign In
            </Button>
          )}
        </Box>

        <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between" }}>
        <Link
            component="button"
            variant="body2"
            onClick={() => setShowReset((prev) => !prev)}
        >
            {showReset ? "Back to Login" : "Forgot Password?"}
        </Link>
        <Link
            component={RouterLink}
            to="/signup"
            variant="body2"
        >
            Don't have an account? Sign up
        </Link>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;
