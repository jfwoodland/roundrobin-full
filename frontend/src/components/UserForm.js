import React, { useRef, useState } from "react";
import { Box, Button, TextField } from "@mui/material";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const UserForm = ({
  name,
  phone,
  setName,
  setPhone,
  onSubmit,
}) => {
  const [phoneError, setPhoneError] = useState("");
  const inputRef = useRef(null);

  const validatePhone = (value) => {
    const digitsOnly = value.replace(/\D/g, "");
    const formatted = "+1" + digitsOnly;

    const parsed = parsePhoneNumberFromString(formatted);
    if (!parsed || !parsed.isValid()) {
      setPhoneError("Please enter a valid 10-digit phone number");
    } else {
      setPhoneError("");
    }
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value;
    setPhone(raw);
    validatePhone(raw);
  };

  const handlePhoneBlur = () => {
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length === 10) {
      const parsed = parsePhoneNumberFromString("+1" + digitsOnly);
      if (parsed) {
        setPhone(parsed.formatNational()); // e.g., (555) 123-4567
      }
    }
  };

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (phoneError) return;
        onSubmit(e);
      }}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        maxWidth: 400,
        mb: 2,
      }}
    >
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        fullWidth
        InputLabelProps={{ shrink: true }}
      />

      <TextField
        label="Phone Number"
        inputRef={inputRef}
        value={phone}
        onChange={handlePhoneChange}
        onBlur={handlePhoneBlur}
        required
        fullWidth
        placeholder="(555) 123-4567"
        error={!!phoneError}
        helperText={phoneError || ""}
        InputLabelProps={{ shrink: true }}
      />

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button type="submit" variant="contained" disabled={!!phoneError}>
          Add User
        </Button>
      </Box>
    </Box>
  );
};

export default UserForm;
