import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getAdsByUser, getChatsForUser, getUser, searchAds, searchUsers } from '../lib/firestore';
import './Layout.css';

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({ ads: 0, messages: 0, followers: 0, likes: 0 });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ ads: [], users: [] });
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return;
    async function loadStats() {
      try {
        const [ads, chats, userData] = await Promise.all([
          getAdsByUser(user.uid),
          getChatsForUser(user.uid),
          getUser(user.uid),
        ]);
        const totalLikes = ads.reduce((sum, ad) => sum + (ad.likeCount ?? 0), 0);
        setStats({
          ads: ads.length,
          messages: chats.length,
          followers: userData?.followerCount ?? 0,
          likes: totalLikes,
        });
      } catch (err) {
        console.error(err);
      }
    }
    loadStats();
  }, [user?.uid]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ ads: [], users: [] });
      setShowDropdown(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const [ads, users] = await Promise.all([
          searchAds(query),
          searchUsers(query),
        ]);
        setResults({ ads, users });
        setShowDropdown(true);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleResultClick() {
    setQuery('');
    setShowDropdown(false);
  }

  function handleSignOut() {
    signOut();
    navigate('/');
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  function isActive(path) {
    return location.pathname.startsWith(path) ? 'active' : '';
  }

  const hasResults = results.ads.length > 0 || results.users.length > 0;

  return (
    <div className="layout">
      <header className="layout-header">
        <Link to="/feed" className="layout-logo">
          Campus<span>Kart</span>
        </Link>

        <div className="layout-search" ref={searchRef}>
          <span className="layout-search-icon">{searching ? '⏳' : '🔍'}</span>
          <input
            type="text"
            placeholder="Search ads, people, posts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => hasResults && setShowDropdown(true)}
          />
          {showDropdown && (
            <div className="search-dropdown">
              {!hasResults && !searching && (
                <div className="search-empty">No results for "{query}"</div>
              )}
              {results.users.length > 0 && (
                <>
                  <div className="search-section-label">People</div>
                  {results.users.map((u) => (
                    <Link
                      key={u.id}
                      to={`/profile/${u.id}`}
                      className="search-result-item"
                      onClick={handleResultClick}
                    >
                      <div className="search-avatar">{(u.displayName || u.email || 'U')[0].toUpperCase()}</div>
                      <div>
                        <div className="search-result-title">{u.displayName || u.email}</div>
                        <div className="search-result-sub">@{u.email?.split('@')[0]}</div>
                      </div>
                    </Link>
                  ))}
                </>
              )}
              {results.ads.length > 0 && (
                <>
                  <div className="search-section-label">Ads</div>
                  {results.ads.map((ad) => (
                    <Link
                      key={ad.id}
                      to={`/ad/${ad.id}`}
                      className="search-result-item"
                      onClick={handleResultClick}
                    >
                      <div className="search-ad-icon">📦</div>
                      <div>
                        <div className="search-result-title">{ad.title}</div>
                        <div className="search-result-sub">{(ad.price ?? 0).toLocaleString()} PKR · {ad.category}</div>
                      </div>
                    </Link>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <nav className="layout-nav">
          <Link to="/feed" className={isActive('/feed')}>Feed</Link>
          <Link to="/messages" className={isActive('/messages')}>Messages</Link>
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button type="button" className="btn-link" onClick={handleSignOut}>Log out</button>
        </nav>

        <Link to="/ad/create" className="layout-post-btn">+ Post Ad</Link>
        <Link to={`/profile/${user?.uid}`}>
          <div className="layout-avatar">{initials}</div>
        </Link>
      </header>

      <div className="layout-body">
        <aside className="layout-sidebar">
          <div className="sidebar-section-label">Menu</div>
          <Link to="/feed" className={`sidebar-item ${isActive('/feed')}`}>
            <span className="sidebar-dot" />Home
          </Link>
          <Link to="/ad/create" className={`sidebar-item ${isActive('/ad/create')}`}>
            <span className="sidebar-dot" />Post Ad
          </Link>
          <Link to="/messages" className={`sidebar-item ${isActive('/messages')}`}>
            <span className="sidebar-dot" />Messages
            {stats.messages > 0 && <span className="sidebar-badge">{stats.messages}</span>}
          </Link>
          <Link to={`/profile/${user?.uid}`} className={`sidebar-item ${isActive('/profile')}`}>
            <span className="sidebar-dot" />Profile
          </Link>
          <hr className="sidebar-divider" />
          <div className="sidebar-section-label">Categories</div>
          {['All','Books','Electronics','Clothing','Other'].map((cat) => (
            <div key={cat} className="sidebar-item">
              <span className="sidebar-dot" />{cat}
            </div>
          ))}
        </aside>

        <main className="layout-main">{children}</main>

        <aside className="layout-right">
          <div className="right-title">Your stats</div>
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-num">{stats.ads}</div><div className="stat-label">Active ads</div></div>
            <div className="stat-card"><div className="stat-num">{stats.likes}</div><div className="stat-label">Likes</div></div>
            <div className="stat-card"><div className="stat-num">{stats.messages}</div><div className="stat-label">Messages</div></div>
            <div className="stat-card"><div className="stat-num">{stats.followers}</div><div className="stat-label">Followers</div></div>
          </div>
          <hr className="right-divider" />
          <div className="right-title">Trending</div>
          <div className="trending-tags">
            <span className="trending-tag" style={{ background: 'rgba(124,111,247,0.15)', color: '#a99ff9' }}>Books</span>
            <span className="trending-tag" style={{ background: 'rgba(45,212,191,0.15)', color: '#2dd4bf' }}>Electronics</span>
            <span className="trending-tag" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>Clothing</span>
            <span className="trending-tag" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>Other</span>
          </div>
        </aside>
      </div>
    </div>
  );
}