import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProfileGuard from './components/ProfileGuard';
import AIChat from './components/AIChat';
import Notes from './pages/Notes';
import AdminUploadNotes from './pages/AdminUploadNotes';
import Meetings from './pages/Meetings';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Feed from './pages/Feed';
import AdDetail from './pages/AdDetail';
import CreateAd from './pages/CreateAd';
import BoostAd from './pages/BoostAd';
import Profile from './pages/Profile';
import ChatList from './pages/ChatList';
import ChatThread from './pages/ChatThread';
import CampusMap from './pages/CampusMap';
import Marketplace from './pages/Marketplace';

function LoadingScreen() {
  return (
    <div className="app-loading">
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 2 }} aria-hidden="true" />
    </div>
  );
}

function ProtectedRoute({ children, withLayout = true }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  const content = withLayout ? <ProfileGuard><Layout>{children}</Layout></ProfileGuard> : children;
  return content;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/feed" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute withLayout={false}>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <Feed />
            </ProtectedRoute>
          }
        />
        <Route path="/ad/:adId" element={<AdDetail />} />
        <Route
          path="/ad/create"
          element={
            <ProtectedRoute>
              <CreateAd />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ad/:adId/boost"
          element={
            <ProtectedRoute>
              <BoostAd />
            </ProtectedRoute>
          }
        />
        <Route path="/profile/:uid" element={<Profile />} />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <ChatList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages/:chatId"
          element={
            <ProtectedRoute>
              <ChatList />
            </ProtectedRoute>
          }
        />

        {/* Online Meetings */}
        <Route
          path="/meetings"
          element={
            <ProtectedRoute>
              <Meetings />
            </ProtectedRoute>
          }
        />

        {/* Campus Map — public, no login required */}
        <Route path="/map" element={<CampusMap />} />

        {/* Marketplace — public, no login required */}
        <Route path="/marketplace" element={<Marketplace />} />

        {/* Notes — public, no login required */}
        <Route path="/notes" element={<Notes />} />

        {/* Admin only — upload notes */}
        <Route
          path="/admin/upload-notes"
          element={
            <ProtectedRoute withLayout={false}>
              <AdminUploadNotes />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <AIChat />
    </>
  );
}