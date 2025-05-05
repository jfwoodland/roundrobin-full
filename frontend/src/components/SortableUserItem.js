import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Paper, Typography, Chip} from "@mui/material";

const SortableUserItem = ({ id, name, status }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: "12px 16px",
    margin: "8px 0",
    cursor: "grab",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const statusColor =
    status === "in_conference"
      ? "warning"
      : status === "available"
      ? "success"
      : "default";

  return (
    <Paper ref={setNodeRef} sx={style} {...attributes} {...listeners}>
      <Typography variant="body1">{name}</Typography>
      <Chip label={status === "in_conference" ? "In Call" : status === "available" ? "Available" : "Unknown"} color={statusColor} size="small" />
    </Paper>
  );
};

export default SortableUserItem;

