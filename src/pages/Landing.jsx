import { Link } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
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
