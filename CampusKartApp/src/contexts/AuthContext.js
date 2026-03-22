import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { createUserIfNeeded } from '../lib/firestore';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from Firestore
  const fetchUserData = useCallback(async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (user?.uid) {
      await fetchUserData(user.uid);
    }
  }, [user?.uid, fetchUserData]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchUserData(u.uid);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [fetchUserData]);

  useEffect(() => {
    if (!user) return;
    createUserIfNeeded(user.uid, {
      displayName: user.displayName || user.email?.split('@')[0] || '',
      photoURL: user.photoURL || '',
      email: user.email || '',
    }).catch(console.error);
  }, [user?.uid]);

  async function signIn(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
    }
    return cred;
  }

  async function signOut() {
    return firebaseSignOut(auth);
  }

  const value = {
    user,
    userData,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
