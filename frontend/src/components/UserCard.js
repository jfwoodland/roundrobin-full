import React, { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Paper,
  Typography,
  Avatar,
  TextField,
} from "@mui/material";
import { formatDisplayPhone } from "../utils/phoneFormatters";

const statusColors = {
  available: "#e8f5e9",
  in_conference: "#fff8e1",
  unknown: "#f5f5f5",
};

const UserCard = ({ user, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.name || "");
  const [editPhone, setEditPhone] = useState(formatDisplayPhone(user.phone_number));
  const bgColor = statusColors[user.status] || statusColors.unknown;

  const handleSave = () => {
    onUpdate(user.id, editName, editPhone);
    setIsEditing(false);
  };

  return (
    <Paper
      sx={{
        padding: 2,
        backgroundColor: bgColor,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {/* Left Side: Avatar + Details */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar>{user.name?.charAt(0).toUpperCase() || "?"}</Avatar>
        <Box>
          <Typography variant="subtitle1">
            {isEditing ? (
              <TextField
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                size="small"
              />
            ) : (
              user.name
            )}
          </Typography>

          <Chip
            label={
              user.status === "in_conference"
                ? "In Call"
                : user.status === "available"
                ? "Available"
                : "Unknown"
            }
            color={
              user.status === "in_conference"
                ? "warning"
                : user.status === "available"
                ? "success"
                : "default"
            }
            size="small"
            sx={{ mt: 0.5 }}
          />

          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
            {isEditing ? (
              <TextField
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                size="small"
              />
            ) : (
              formatDisplayPhone(user.phone_number)
            )}
          </Typography>
        </Box>
      </Box>

      {/* Right Side: Buttons */}
      <Box sx={{ display: "flex", gap: 1 }}>
        {isEditing ? (
          <>
            <Button variant="contained" onClick={handleSave}>
              Save
            </Button>
            <Button variant="outlined" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button variant="outlined" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
            <Button variant="outlined" color="error" onClick={() => onDelete(user.id)}>
              Delete
            </Button>
          </>
        )}
      </Box>
    </Paper>
  );
};

export default UserCard;
