import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          background: '#f8fafc',
          color: '#0f172a',
        }}>
          <h1 style={{ marginBottom: 8, fontSize: '1.5rem' }}>Something went wrong</h1>
          <p style={{ color: '#64748b', marginBottom: 16, maxWidth: 400 }}>
            The app failed to load. Common causes:
          </p>
          <ul style={{ textAlign: 'left', color: '#64748b', marginBottom: 24 }}>
            <li><strong>Vercel:</strong> Add all <code>VITE_FIREBASE_*</code> env vars in Project → Settings → Environment Variables, then redeploy.</li>
            <li><strong>Firebase:</strong> Add your site domain (e.g. beingsalmanbutt.app) in Firebase Console → Authentication → Authorized domains.</li>
          </ul>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
