// src/components/AccountDetails.js
import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import UserList from './UserList';


const AccountDetails = ({ accountId, onBack }) => {
  const [account, setAccount] = useState(null);
  const [twilioNumber, setTwilioNumber] = useState('');
  const [maxRetries, setMaxRetries] = useState(3);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const docRef = doc(db, 'accounts', accountId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAccount(data);
          setTwilioNumber(data.twilio_number || '');
          setMaxRetries(data.max_retries || 3);
        }
      } catch (err) {
        console.error('Error fetching account:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccount();
  }, [accountId]);

  const handleSave = async () => {
    try {
      const docRef = doc(db, 'accounts', accountId);
      await updateDoc(docRef, {
        twilio_number: twilioNumber,
        max_retries: parseInt(maxRetries)
      });
      alert('Account updated successfully!');
    } catch (err) {
      console.error('Error updating account:', err);
      alert('Failed to update account.');
    }
  };

  if (loading) return <p>Loading account details...</p>;

  return (
    <div>
      <h2>Account: {accountId}</h2>

      <label>Twilio Number:</label><br />
      <input
        type="text"
        value={twilioNumber}
        onChange={(e) => setTwilioNumber(e.target.value)}
      /><br /><br />

      <label>Max Retries:</label><br />
      <input
        type="number"
        value={maxRetries}
        onChange={(e) => setMaxRetries(e.target.value)}
      /><br /><br />

      <button onClick={handleSave}>Save</button>{' '}
      <button onClick={onBack}>Back</button>
      <hr />
        <UserList accountId={accountId} />
    </div>
  );
};

export default AccountDetails;
