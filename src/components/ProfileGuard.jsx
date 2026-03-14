import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUser } from '../lib/firestore';

export default function ProfileGuard({ children }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;
    getUser(user.uid).then((profile) => {
      const hasProfile = profile && (profile.displayName || user.displayName) && (profile.photoURL || user.photoURL);
      setNeedsOnboarding(!hasProfile);
      setReady(true);
    }).catch(() => {
      setNeedsOnboarding(true);
      setReady(true);
    });
  }, [user]);

  if (!ready) return <div className="app-loading">Loading…</div>;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  return children;
}
