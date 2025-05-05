// src/ResetConfirmation.js
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Typography, Button, Paper, Container } from "@mui/material";

const ResetConfirmation = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/login"), 8000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: 4, mt: 8 }}>
        <Typography variant="h5" gutterBottom>
          Password changed
        </Typography>
        <Typography sx={{ mb: 2 }}>
          You can now sign in with your new password.
        </Typography>
        <Button variant="contained" onClick={() => navigate("/login")}>
          Go to Login
        </Button>
      </Paper>
    </Container>
  );
};

export default ResetConfirmation;
