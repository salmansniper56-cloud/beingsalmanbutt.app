import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import './Landing.css';

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="landing">
      <header className="landing-header">
        <button type="button" className="theme-toggle-landing" onClick={toggleTheme} aria-label="Toggle theme" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <h1>CampusKart</h1>
        <p>Student Marketplace – sell books & electronics, chat with buyers</p>
      </header>
      <main className="landing-cta">
        <Link to="/register" className="btn btn-primary">Get started</Link>
        <Link to="/login" className="btn btn-secondary">Log in</Link>
      </main>
    </div>
  );
}
