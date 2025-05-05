import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import AccountDetails from './AccountDetails';

const AccountList = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'accounts'));
        const accountData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAccounts(accountData);
      } catch (err) {
        console.error('Error fetching accounts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  if (loading) return <p>Loading accounts...</p>;

  if (selectedAccount) {
    return (
      <AccountDetails
        accountId={selectedAccount}
        onBack={() => setSelectedAccount(null)}
      />
    );
  }

  return (
    <div>
      <h2>Accounts</h2>
      <ul>
        {accounts.map(account => (
          <li key={account.id}>
            <button onClick={() => setSelectedAccount(account.id)}>
              {account.id}
            </button>{' '}
            - {account.twilio_number || 'No number'}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AccountList;
