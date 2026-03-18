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
      {/* Cover Photo */}
      <div className="profile-cover">
        <div className="profile-cover-image"></div>
      </div>

      {/* Header Section */}
      <div className="profile-header-section">
        {/* Avatar - overlapping cover */}
        <div className="profile-avatar-wrapper">
          {photoURL ? (
            <img src={photoURL} alt={displayName} className="profile-avatar" />
          ) : (
            <div className="profile-avatar profile-avatar-fallback">
              {displayName[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="profile-user-info">
          <h1 className="profile-display-name">{displayName}</h1>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
        </div>

        {/* Stats Row */}
        <div className="profile-stats">
          <div className="profile-stat">
            <div className="profile-stat-value">{posts.length + ads.length}</div>
            <div className="profile-stat-label">Posts</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">{profile.followerCount ?? 0}</div>
            <div className="profile-stat-label">Followers</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">{stories.length}</div>
            <div className="profile-stat-label">Stories</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="profile-actions">
          {!isOwn && currentUser?.uid && (
            <button
              type="button"
              className={`profile-btn ${following ? 'following' : 'follow'}`}
              onClick={handleFollow}
            >
              {following ? 'Following' : 'Follow'}
            </button>
          )}
          {isOwn && (
            <>
              <Link to="/ad/create" className="profile-btn">Create Listing</Link>
              <Link to="/settings" className="profile-btn secondary">Edit Profile</Link>
            </>
          )}
          {!isOwn && currentUser?.uid && (
            <Link to={`/chat/${uid}`} className="profile-btn secondary">Message</Link>
          )}
        </div>
      </div>

      {/* Stories Carousel */}
      {stories.length > 0 && (
        <div className="profile-stories">
          <h3>Stories</h3>
          <div className="profile-stories-list">
            {stories.map((story) => (
              <div key={story.id} className="profile-story-item">
                <img src={story.mediaUrl} alt="Story" className="profile-story-thumbnail" />
                <div className="profile-story-likes">❤️ {story.likeCount}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="profile-tabs">
        <button
          className={`profile-tab ${selectedTab === 'posts' ? 'active' : ''}`}
          onClick={() => setSelectedTab('posts')}
        >
          Posts ({posts.length})
        </button>
        <button
          className={`profile-tab ${selectedTab === 'ads' ? 'active' : ''}`}
          onClick={() => setSelectedTab('ads')}
        >
          Listings ({ads.length})
        </button>
      </div>

      {/* Content Section */}
      <div className="profile-content">
        {selectedTab === 'posts' ? (
          posts.length === 0 ? (
            <div className="profile-empty-state">
              <div className="empty-icon">📷</div>
              <p>No posts yet</p>
            </div>
          ) : (
            <div className="profile-posts">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  isLiked={!!postLiked[post.id]}
                  onLike={() => handlePostLike(post.id)}
                  onDelete={handlePostDelete}
                />
              ))}
            </div>
          )
        ) : ads.length === 0 ? (
          <div className="profile-empty-state">
            <div className="empty-icon">🏷️</div>
            <p>No listings yet</p>
            {isOwn && <Link to="/ad/create" className="btn btn-primary">Create listing</Link>}
          </div>
        ) : (
          <div className="profile-ads-grid">
            {ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} likeCount={ad.likeCount} showSeller={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return currentUser ? <Layout>{content}</Layout> : <div className="layout"><header className="layout-header"><Link to="/" className="layout-logo">CampusKart</Link><Link to="/login">Log in</Link></header><main className="layout-main">{content}</main></div>;
}
