import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUser, getAdsByUser, getPostsByUser, getUserStories, toggleFollow, isFollowing } from '../lib/firestore';
import AdCard from '../components/AdCard';
import PostCard from '../components/PostCard';
import Layout from '../components/Layout';
import './Profile.css';

export default function Profile() {
  const { uid } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [ads, setAds] = useState([]);
  const [stories, setStories] = useState([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('posts');
  const [postLiked, setPostLiked] = useState({});

  useEffect(() => {
    if (!uid) return;
    const loadProfile = async () => {
      try {
        const [p, postList, adList, storyList, f] = await Promise.all([
          getUser(uid),
          getPostsByUser(uid, 50),
          getAdsByUser(uid),
          getUserStories(uid, 10),
          currentUser?.uid ? isFollowing(uid, currentUser.uid) : Promise.resolve(false),
        ]);
        setProfile(p);
        setPosts(postList || []);
        setAds(adList || []);
        setStories(storyList || []);
        setFollowing(!!f);

        // Check likes for posts
        if (currentUser?.uid && postList) {
          const { isPostLiked } = await import('../lib/firestore');
          const likedMap = {};
          await Promise.all(postList.map(async (p) => {
            likedMap[p.id] = await isPostLiked(p.id, currentUser.uid);
          }));
          setPostLiked(likedMap);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [uid, currentUser?.uid]);

  async function handleFollow() {
    if (!currentUser?.uid || !uid) return;
    try {
      await toggleFollow(uid, currentUser.uid);
      setFollowing((p) => !p);
      setProfile((prev) => prev ? { ...prev, followerCount: (prev.followerCount ?? 0) + (following ? -1 : 1) } : null);
    } catch (err) {
      console.error(err);
    }
  }

  async function handlePostLike(postId) {
    if (!currentUser?.uid) return;
    const { togglePostLike } = await import('../lib/firestore');
    await togglePostLike(postId, currentUser.uid);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likeCount: (p.likeCount ?? 0) + (postLiked[postId] ? -1 : 1) } : p));
    setPostLiked(prev => ({ ...prev, [postId]: !prev[postId] }));
  }

  function handlePostDelete(postId) {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }

  if (loading) return <div className="app-loading">Loading…</div>;
  if (!profile) {
    console.error('Profile not found for uid:', uid);
    console.error('Current user uid:', currentUser?.uid);
    return <div className="profile-missing">Profile not found. (UID: {uid})</div>;
  }

  const isOwn = currentUser?.uid === uid;
  const displayName = profile.displayName || 'User';
  const photoURL = profile.photoURL || `https://ui-avatars.com/api?name=${encodeURIComponent(displayName)}`;

  const content = (
    <div className="profile-container">
      {/* Instagram-style Header */}
      <div className="profile-top-section">
        {/* Avatar */}
        <div className="profile-pic-wrapper">
          {photoURL ? (
            <img src={photoURL} alt={displayName} className="profile-pic" />
          ) : (
            <div className="profile-pic profile-pic-fallback">
              {displayName[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Info and Stats */}
        <div className="profile-info-section">
          {/* Username and buttons row */}
          <div className="profile-username-row">
            <h1 className="profile-username">{profile.email?.split('@')[0] || 'user'}</h1>
            {isOwn ? (
              <>
                <Link to="/settings" className="profile-edit-btn">Edit profile</Link>
                <button className="profile-edit-btn">View archive</button>
              </>
            ) : (
              <>
                <button
                  className={`profile-follow-btn ${following ? 'following' : ''}`}
                  onClick={handleFollow}
                >
                  {following ? 'Following' : 'Follow'}
                </button>
                <Link to={`/chat/${uid}`} className="profile-edit-btn">Message</Link>
              </>
            )}
          </div>

          {/* Stats row */}
          <div className="profile-stats-row">
            <div className="profile-stat-item">
              <span className="stat-number">{posts.length}</span> posts
            </div>
            <div className="profile-stat-item">
              <span className="stat-number">{profile.followerCount ?? 0}</span> followers
            </div>
            <div className="profile-stat-item">
              <span className="stat-number">{profile.followingCount ?? 0}</span> following
            </div>
          </div>

          {/* Name and Bio */}
          <div className="profile-bio-section">
            <div className="profile-display-name">{displayName}</div>
            {profile.bio && <div className="profile-bio-text">{profile.bio}</div>}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="profile-website">
                {profile.website}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Story Highlights */}
      {stories.length > 0 && (
        <div className="profile-highlights">
          {stories.map((story) => (
            <div key={story.id} className="highlight-item">
              <div className="highlight-circle">
                <img src={story.mediaUrl} alt="Story" />
              </div>
              <span className="highlight-name">New</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs with Icons */}
      <div className="profile-tabs-icons">
        <button
          className={`tab-icon ${selectedTab === 'posts' ? 'active' : ''}`}
          onClick={() => setSelectedTab('posts')}
          title="Posts"
        >
          <svg width="12" height="12" viewBox="0 0 48 48" fill="currentColor">
            <path d="M45 1.5H3c-.8 0-1.5.7-1.5 1.5v42c0 .8.7 1.5 1.5 1.5h42c.8 0 1.5-.7 1.5-1.5V3c0-.8-.7-1.5-1.5-1.5zm-40.5 3h11v11h-11v-11zm0 14h11v11h-11v-11zm11 25h-11v-11h11v11zm14 0h-11v-11h11v11zm0-14h-11v-11h11v11zm0-14h-11v-11h11v11zm14 28h-11v-11h11v11zm0-14h-11v-11h11v11zm0-14h-11v-11h11v11z"></path>
          </svg>
        </button>
        <button
          className={`tab-icon ${selectedTab === 'ads' ? 'active' : ''}`}
          onClick={() => setSelectedTab('ads')}
          title="Listings"
        >
          <svg width="12" height="12" viewBox="0 0 48 48" fill="currentColor">
            <path d="M41 10c-2.2-2.1-4.8-3.5-10.4-3.5h-3.3L30.5 3c.6-.6.5-1.6-.1-2.1-.6-.6-1.6-.5-2.1.1L24 5.6 19.7 1c-.6-.6-1.5-.6-2.1-.1-.6.6-.7 1.5-.1 2.1l3.2 3.5h-3.3C11.8 6.5 9.2 7.9 7 10c-2.1 2.1-3.5 4.8-3.5 10.4v13.1c0 5.6 1.4 8.3 3.5 10.4 2.1 2.1 4.8 3.5 10.4 3.5h13.1c5.6 0 8.3-1.4 10.4-3.5 2.1-2.1 3.5-4.8 3.5-10.4V20.4c0-5.6-1.4-8.3-3.5-10.4zM24 29.5c-3 0-5.5-2.5-5.5-5.5s2.5-5.5 5.5-5.5 5.5 2.5 5.5 5.5-2.5 5.5-5.5 5.5z"></path>
          </svg>
        </button>
        <button className="tab-icon" title="Saved">
          <svg width="12" height="12" viewBox="0 0 48 48" fill="currentColor">
            <path d="M43.5 48c-.4 0-.8-.2-1.1-.4L24 29 5.6 47.6c-.4.4-1.1.6-1.6.3-.6-.2-1-.8-1-1.4v-45C3 .7 3.7 0 4.5 0h39c.8 0 1.5.7 1.5 1.5v45c0 .6-.4 1.2-.9 1.4-.2.1-.4.1-.6.1z"></path>
          </svg>
        </button>
        <button className="tab-icon" title="Tagged">
          <svg width="12" height="12" viewBox="0 0 48 48" fill="currentColor">
            <path d="M41.5 5.5H32.3c-.7 0-1.3.3-1.8.8l-21 21.2c-.8.8-.8 2.1 0 2.8l9.8 9.8c.8.8 2.1.8 2.8 0l21.2-21.2c.5-.5.8-1.1.8-1.8V6.5c0-.7-.6-1-1.6-1zm-5.5 10c-1.6 0-3-1.4-3-3s1.4-3 3-3 3 1.4 3 3-1.4 3-3 3z"></path>
          </svg>
        </button>
      </div>

      {/* Posts Grid */}
      <div className="profile-grid">
        {selectedTab === 'posts' ? (
          posts.length === 0 ? (
            <div className="profile-empty">
              <div className="empty-icon">
                <svg width="62" height="62" viewBox="0 0 48 48">
                  <path d="M38.5 46h-29c-5 0-7.5-2.5-7.5-7.5v-29C2 4.5 4.5 2 9.5 2h29c5 0 7.5 2.5 7.5 7.5v29c0 5-2.5 7.5-7.5 7.5zM9.5 6C7 6 6 7 6 9.5v29c0 2.5 1 3.5 3.5 3.5h29c2.5 0 3.5-1 3.5-3.5v-29c0-2.5-1-3.5-3.5-3.5h-29z"></path>
                  <path d="M17.5 24c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6zm0-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
                  <path d="M41.5 41h-35c-1.1 0-2-.9-2-2s.9-2 2-2h1.1l9.4-9.4c1.2-1.2 3.1-1.2 4.2 0l8.4 8.4 4.7-4.7c1.2-1.2 3.1-1.2 4.2 0l5 5V39c0 1.1-.9 2-2 2z"></path>
                </svg>
              </div>
              <h2>No Posts Yet</h2>
            </div>
          ) : (
            posts.map((post) => (
              <Link key={post.id} to={`/post/${post.id}`} className="grid-item">
                {post.mediaUrls && post.mediaUrls.length > 0 ? (
                  <img src={post.mediaUrls[0]} alt="Post" />
                ) : (
                  <div className="grid-placeholder">
                    <span>{post.content?.substring(0, 50)}</span>
                  </div>
                )}
                <div className="grid-overlay">
                  <div className="grid-stats">
                    <span>❤️ {post.likeCount || 0}</span>
                    <span>💬 {post.commentCount || 0}</span>
                  </div>
                </div>
              </Link>
            ))
          )
        ) : ads.length === 0 ? (
          <div className="profile-empty">
            <div className="empty-icon">🏷️</div>
            <h2>No Listings Yet</h2>
            {isOwn && <Link to="/ad/create" className="btn-primary">Create Listing</Link>}
          </div>
        ) : (
          ads.map((ad) => (
            <Link key={ad.id} to={`/ad/${ad.id}`} className="grid-item">
              {ad.images && ad.images.length > 0 ? (
                <img src={ad.images[0]} alt={ad.title} />
              ) : (
                <div className="grid-placeholder">
                  <span>{ad.title}</span>
                </div>
              )}
              <div className="grid-overlay">
                <div className="grid-stats">
                  <span>❤️ {ad.likeCount || 0}</span>
                  <span>${ad.price}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );

  return currentUser ? <Layout>{content}</Layout> : <div className="layout"><header className="layout-header"><Link to="/" className="layout-logo">CampusKart</Link><Link to="/login">Log in</Link></header><main className="layout-main">{content}</main></div>;
}
