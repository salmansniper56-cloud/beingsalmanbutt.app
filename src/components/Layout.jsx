import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import './Layout.css';

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button type="button" className="btn-link" onClick={handleSignOut}>Log out</button>
        </nav>
      </header>
      <main className="layout-main">{children}</main>
    </div>
  );
}
