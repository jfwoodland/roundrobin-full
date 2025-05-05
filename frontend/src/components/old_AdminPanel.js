import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Container,
  Paper,
  TextField,
  Button,
  Chip,
} from "@mui/material";
import { addDoc } from "firebase/firestore";
import { deleteDoc } from "firebase/firestore";
import InputMask from "react-input-mask";

// 🔹 Helper: SortableItem for DnD
function SortableItem({ id, name }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: "10px",
    margin: "8px 0",
    border: "1px solid #ccc",
    backgroundColor: "#f9f9f9",
    cursor: "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {name}
    </div>
  );
}

//Phone number display format helper
const formatDisplayPhone = (e164Number) => {
  const cleaned = e164Number.replace(/\D/g, "").slice(-10); // Get last 10 digits
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : e164Number;
};

//Phone number input format helper
const formatPhoneInput = (value) => {
  const cleaned = value.replace(/\D/g, "").slice(0, 10);
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);

  if (!match) return value;

  const [, area, prefix, line] = match;
  if (line) return `(${area}) ${prefix}-${line}`;
  if (prefix) return `(${area}) ${prefix}`;
  if (area) return `(${area}`;
  return "";
};

//Phone number storage format helper
const normalizePhoneForStorage = (formatted) => {
  const digits = formatted.replace(/\D/g, "");
  return `+1${digits}`;
};

// 🔹 Tab Panel helper
function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index} style={{ paddingTop: "1rem" }}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

// 🔹 Main Admin Panel
const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [tabIndex, setTabIndex] = useState(0);
  const accountId = "demo-account-001";
  const sensors = useSensors(useSensor(PointerSensor));
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [editUserId, setEditUserId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");



  // 🔸 Load users
  const loadUsers = async () => {
    const q = query(
      collection(db, "accounts", accountId, "users"),
      orderBy("order")
    );
    const querySnapshot = await getDocs(q);
    const loadedUsers = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setUsers(loadedUsers);
  };
  
  const refreshUserList = async () => {
    await loadUsers();
  };
  

  useEffect(() => {
    loadUsers();
  }, [accountId]);

  // 🔸 Handle drag reorder
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = users.findIndex((u) => u.id === active.id);
      const newIndex = users.findIndex((u) => u.id === over.id);
      const newUsers = arrayMove(users, oldIndex, newIndex);
      setUsers(newUsers);

      const batchUpdates = newUsers.map((user, idx) =>
        updateDoc(doc(db, "accounts", accountId, "users", user.id), {
          order: idx,
        })
      );
      await Promise.all(batchUpdates);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ padding: 3, marginTop: 4 }}>
        <Typography variant="h4" gutterBottom>
          Admin Panel
        </Typography>

        <Tabs
          value={tabIndex}
          onChange={(e, newIndex) => setTabIndex(newIndex)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Call Order" />
          <Tab label="Add/Remove Users" />
        </Tabs>

        {/* Tab 0: Call Order */}
        <TabPanel value={tabIndex} index={0}>
          <Typography variant="h6" gutterBottom>
            Drag and drop to reorder users:
          </Typography>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={users.map((u) => u.id)}
              strategy={verticalListSortingStrategy}
            >
              {users.map((user) => (
                <SortableItem
                  key={user.id}
                  id={user.id}
                  name={user.name || user.phone_number}
                />
              ))}
            </SortableContext>
          </DndContext>
        </TabPanel>

        {/* Tab 1: Add/Remove Users */}
        <TabPanel value={tabIndex} index={1}>
          <Typography variant="h6" gutterBottom>
            Add a New User
          </Typography>

          <Box
            component="form"
            sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 400 }}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newUserName || !newUserPhone) return;

              try {
                // Clean and format the phone number
                const cleanedPhone = newUserPhone.replace(/\D/g, "");
                if (cleanedPhone.length !== 10) {
                  alert("Please enter a valid 10-digit phone number.");
                  return;
                }

                const newUser = {
                  name: newUserName,
                  phone_number: normalizePhoneForStorage(newUserPhone),
                  status: "available",
                  order: users.length,
                };

                const docRef = await addDoc(
                  collection(db, "accounts", accountId, "users"),
                  newUser
                );

                console.log("User added with ID:", docRef.id);
                setNewUserName("");
                setNewUserPhone("");
                await refreshUserList();
              } catch (err) {
                console.error("Error adding user:", err);
              }
            }}
          >
            <TextField
              label="Name"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              required
            />
            <TextField
              label="Phone Number"
              value={newUserPhone}
              onChange={(e) => setNewUserPhone(formatPhoneInput(e.target.value))}
              required
            />
            <Button type="submit" variant="contained">
              Add User
            </Button>
          </Box>

          <Typography variant="h6" sx={{ marginTop: 4 }}>
            Current Users
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 1,
              alignItems: "flex-start",
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip label="Available" color="success" size="small" />
              <Typography variant="body2">User is idle</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip label="In Call" color="warning" size="small" />
              <Typography variant="body2">User is in a conference</Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 2 }}>
            {users.map((user) => (
              <Paper
                key={user.id}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  padding: 2,
                }}
              >
                {editUserId === user.id ? (
                  <>
                    <TextField
                      label="Name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      size="small"
                    />
                    <TextField
                      label="Phone Number"
                      value={editPhone}
                      onChange={(e) => setEditPhone(formatPhoneInput(e.target.value))}
                      size="small"
                    />
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        variant="contained"
                        onClick={async () => {
                          try {
                            const userRef = doc(db, "accounts", accountId, "users", user.id);
                            const cleanedPhone = editPhone.replace(/\D/g, "");
                            if (cleanedPhone.length !== 10) {
                              alert("Please enter a valid 10-digit phone number.");
                              return;
                            }
                            
                            await updateDoc(userRef, {
                              name: editName,
                              phone_number: normalizePhoneForStorage(editPhone),
                            });
                            
                            setEditUserId(null);
                            setEditName("");
                            setEditPhone("");
                            await refreshUserList();
                          } catch (err) {
                            console.error("Error updating user:", err);
                          }
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setEditUserId(null);
                          setEditName("");
                          setEditPhone("");
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </>
                ) : (             
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong>{user.name}</strong>{" "}
                      <Chip
                        label={user.status === "in_conference" ? "In Call" : user.status === "available" ? "Available" : "Unknown"}
                        color={
                          user.status === "in_conference"
                            ? "warning"
                            : user.status === "available"
                            ? "success"
                            : "default"
                        }
                        size="small"
                        sx={{ ml: 1 }}
                      />
                      <br />
                      <span style={{ color: "#666" }}>{formatDisplayPhone(user.phone_number)}</span>
                    </div>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setEditUserId(user.id);
                          setEditName(user.name);
                          setEditPhone(formatDisplayPhone(user.phone_number));
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={async () => {
                          try {
                            await deleteDoc(doc(db, "accounts", accountId, "users", user.id));
                            await refreshUserList();
                          } catch (err) {
                            console.error("Error deleting user:", err);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </Box>
                  </Box>
                )}
              </Paper>
            ))}
          </Box>
        </TabPanel>


      </Paper>
    </Container>
  );
};

export default AdminPanel;
