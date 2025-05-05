import React, { useState } from "react";
import { TextField, Button, Box, Alert } from "@mui/material";
import { sendUserInvite } from "../utils/inviteHelpers";

const InviteForm = ({ accountId }) => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");

    try {
      await sendUserInvite({ email, accountId });
      setStatus("success");
      setEmail("");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, maxWidth: 400 }}>
      <TextField
        label="Invitee Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        fullWidth
        sx={{ mb: 2 }}
      />
      <Button type="submit" variant="contained">
        Send Invite
      </Button>

      {status === "success" && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Invitation sent!
        </Alert>
      )}
      {status === "error" && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to send invitation.
        </Alert>
      )}
    </Box>
  );
};

export default InviteForm;
