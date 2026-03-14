import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    signOut();
    navigate('/');
  }

  return (
    <div className="layout">
      <header className="layout-header">
        <Link to="/feed" className="layout-logo">CampusKart</Link>
        <nav className="layout-nav">
          <Link to="/feed">Feed</Link>
          <Link to="/ad/create">Sell</Link>
          <Link to="/messages">Messages</Link>
          <Link to={`/profile/${user?.uid}`}>Profile</Link>
          <button type="button" className="btn-link" onClick={handleSignOut}>Log out</button>
        </nav>
      </header>
      <main className="layout-main">{children}</main>
    </div>
  );
}
