// src/AdminPanel.js
import React, { useEffect, useState } from "react";
import { db, auth } from "./firebaseConfig";
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  Box,
  Chip,
  Button,
  TextField,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

import SortableUserItem from "./components/SortableUserItem";
import UserCard from "./components/UserCard";
import UserForm from "./components/UserForm";
import TabPanel from "./components/TabPanel";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import getAccountId from "./utils/getAccountId";


const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [tabIndex, setTabIndex] = useState(0);
  const [accountId, setAccountId] = useState(null);
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const sensors = useSensors(useSensor(PointerSensor));
  const navigate = useNavigate();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  // 🔐 Protect route
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
      } else {
        const id = await getAccountId(user.uid);
        setAccountId(id);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // 🔄 Load users from this user's account
  useEffect(() => {
    if (!accountId) return;
    const q = query(collection(db, "accounts", accountId, "users"), orderBy("order"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedUsers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(loadedUsers);
    });
    return () => unsubscribe();
  }, [accountId]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = users.findIndex((u) => u.id === active.id);
      const newIndex = users.findIndex((u) => u.id === over.id);
      const newUsers = arrayMove(users, oldIndex, newIndex);
      setUsers(newUsers);

      const batch = newUsers.map((user, idx) =>
        updateDoc(doc(db, "accounts", accountId, "users", user.id), {
          order: idx,
        })
      );
      await Promise.all(batch);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    const phoneObj = parsePhoneNumberFromString(newUserPhone, "US");
    if (!phoneObj || !phoneObj.isValid()) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }

    const newUser = {
      name: newUserName,
      phone_number: phoneObj.number,
      status: "available",
      order: users.length,
    };

    await addDoc(collection(db, "accounts", accountId, "users"), newUser);
    setNewUserName("");
    setNewUserPhone("");
  };

  const handleDeleteUser = async (userId) => {
    await deleteDoc(doc(db, "accounts", accountId, "users", userId));
  };

  const handleUpdateUser = async (userId, name, phone) => {
    const phoneObj = parsePhoneNumberFromString(phone, "US");
    if (!phoneObj || !phoneObj.isValid()) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }

    await updateDoc(doc(db, "accounts", accountId, "users", userId), {
      name,
      phone_number: phoneObj.number,
    });
  };
  
  // Trigger Firestore write
  const handleSendInvite = async () => {
    try {
      await addDoc(collection(db, "invites"), {
        email: inviteEmail,
        accountId, // use your current accountId
        createdAt: new Date(),
      });
      setInviteMessage("Invite sent!");
      setInviteEmail("");
    } catch (err) {
      console.error("Error sending invite:", err);
      setInviteMessage("Error sending invite.");
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ padding: 3, marginTop: 4 }}>
        <Typography variant="h4" gutterBottom>Admin Panel</Typography>
        <Button
          variant="outlined"
          color="secondary"
          sx={{ float: "right" }}
          onClick={async () => {
            await auth.signOut();
            navigate("/login");
          }}
        >
          Logout
        </Button>

        <Tabs value={tabIndex} onChange={(e, newIndex) => setTabIndex(newIndex)}>
          <Tab label="Call Order" />
          <Tab label="Add/Remove Users" />
        </Tabs>

        <TabPanel value={tabIndex} index={0}>
          <Typography variant="h6">Drag and drop to reorder users:</Typography>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={users.map((u) => u.id)} strategy={verticalListSortingStrategy}>
              {users.map((user) => (
                <SortableUserItem
                  key={user.id}
                  id={user.id}
                  name={user.name || user.phone_number}
                  status={user.status}
                />
              ))}
            </SortableContext>
          </DndContext>
        </TabPanel>

        <TabPanel value={tabIndex} index={1}>
          <UserForm
            onSubmit={handleAddUser}
            name={newUserName}
            phone={newUserPhone}
            setName={setNewUserName}
            setPhone={setNewUserPhone}
          />

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Invite New User</Typography>
            <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
              <TextField
                label="Email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                fullWidth
              />
              <Button variant="contained" onClick={handleSendInvite}>
                Send Invite
              </Button>
            </Box>
            {inviteMessage && (
              <Typography variant="body2" color="secondary" sx={{ mt: 1 }}>
                {inviteMessage}
              </Typography>
            )}
          </Box>


          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Current Users</Typography>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <Chip label="Available" color="success" size="small" />
              <Chip label="In Call" color="warning" size="small" />
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {users.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onUpdate={handleUpdateUser}
                  onDelete={handleDeleteUser}
                />
              ))}
            </Box>
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default AdminPanel;
