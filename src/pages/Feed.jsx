import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAds, getPosts, toggleLike, isLiked, togglePostLike, isPostLiked, getUser, searchUsers, toggleFollow, isFollowing } from '../lib/firestore';
import { useAuth } from '../contexts/AuthContext';
import AdCard from '../components/AdCard';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import StoriesList from '../components/StoriesList';
import './Feed.css';

function rankAds(ads) {
  const now = new Date();
  return [...ads].sort((a, b) => {
    const aBoost = a.boostExpiresAt && new Date(a.boostExpiresAt) > now;
    const bBoost = b.boostExpiresAt && new Date(b.boostExpiresAt) > now;
    if (aBoost && !bBoost) return -1;
    if (!aBoost && bBoost) return 1;
    const aScore = (a.likeCount ?? 0) * 2 + (aBoost ? 100 : 0);
    const bScore = (b.likeCount ?? 0) * 2 + (bBoost ? 100 : 0);
    if (bScore !== aScore) return bScore - aScore;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

export default function Feed() {
  const { user } = useAuth();
  const [feedMode, setFeedMode] = useState('posts');
  const [ads, setAds] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState({});
  const [postLiked, setPostLiked] = useState({});
  const [category, setCategory] = useState('');
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [followingStates, setFollowingStates] = useState({});

  const loadAds = useCallback(async () => {
    try {
      const { ads: list } = await getAds({ limitCount: 50 });
      const filtered = category ? list.filter((a) => a.category === category) : list;
      setAds(rankAds(filtered));
      if (user?.uid) {
        const likedMap = {};
        await Promise.all(list.slice(0, 30).map(async (ad) => {
          likedMap[ad.id] = await isLiked(ad.id, user.uid);
        }));
        setLiked(likedMap);
      }
    } catch (err) { console.error(err); }
  }, [category, user?.uid]);

  const loadPosts = useCallback(async () => {
    try {
      const { posts: list } = await getPosts({ limitCount: 50 });
      setPosts(list);
      if (user?.uid) {
        const likedMap = {};
        await Promise.all(list.slice(0, 30).map(async (p) => {
          likedMap[p.id] = await isPostLiked(p.id, user.uid);
        }));
        setPostLiked(likedMap);
      }
    } catch (err) { console.error(err); }
  }, [user?.uid]);

  useEffect(() => {
    setLoading(true);
    (feedMode === 'ads' ? loadAds() : loadPosts()).finally(() => setLoading(false));
  }, [feedMode, loadAds, loadPosts]);

  useEffect(() => {
    if (user?.uid) {
      loadUserProfile();
      loadSuggestedUsers();
    }
  }, [user?.uid]);

  async function loadUserProfile() {
    try {
      const profile = await getUser(user.uid);
      setUserProfile(profile);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadSuggestedUsers() {
    try {
      const users = await searchUsers('');
      const filtered = users.filter(u => u.id !== user.uid).slice(0, 5);
      setSuggestedUsers(filtered);

      // Load following states
      const states = {};
      await Promise.all(
        filtered.map(async (u) => {
          states[u.id] = await isFollowing(u.id, user.uid);
        })
      );
      setFollowingStates(states);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleFollowUser(userId) {
    try {
      await toggleFollow(userId, user.uid);
      setFollowingStates(prev => ({ ...prev, [userId]: !prev[userId] }));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleLike(adId) {
    if (!user?.uid) return;
    await toggleLike(adId, user.uid);
    setAds(prev => prev.map(a => a.id === adId ? { ...a, likeCount: (a.likeCount ?? 0) + (liked[adId] ? -1 : 1) } : a));
    setLiked(prev => ({ ...prev, [adId]: !prev[adId] }));
  }

  async function handlePostLike(postId) {
    if (!user?.uid) return;
    await togglePostLike(postId, user.uid);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likeCount: (p.likeCount ?? 0) + (postLiked[postId] ? -1 : 1) } : p));
    setPostLiked(prev => ({ ...prev, [postId]: !prev[postId] }));
  }

  function handlePostDelete(postId) {
    setPosts(prev => prev.filter(p => p.id !== postId));
  }

  return (
    <div className="feed-instagram-layout">
      {/* Main Content */}
      <div className="feed-main">
        <StoriesList />

        <div className="feed-tabs-bar">
          <button type="button" className={`feed-tab ${feedMode === 'posts' ? 'active' : ''}`} onClick={() => setFeedMode('posts')}>
            Posts
          </button>
          <button type="button" className={`feed-tab ${feedMode === 'ads' ? 'active' : ''}`} onClick={() => setFeedMode('ads')}>
            Marketplace
          </button>
          {feedMode === 'ads' && (
            <select className="feed-category-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              <option value="books">Books</option>
              <option value="electronics">Electronics</option>
              <option value="other">Other</option>
            </select>
          )}
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : feedMode === 'posts' ? (
          posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📷</div>
              <p>No posts yet. Share something!</p>
              <button type="button" className="btn btn-primary" onClick={() => setCreatePostOpen(true)}>Create post</button>
            </div>
          ) : (
            <div className="feed-posts">
              {posts.map(post => (
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
          <div className="empty-state">
            <div className="empty-state-icon">🏷️</div>
            <p>No listings yet. Be the first!</p>
            <Link to="/ad/create" className="btn btn-primary">Create listing</Link>
          </div>
        ) : (
          <div className="feed-grid">
            {ads.map(ad => (
              <AdCard key={ad.id} ad={ad} likeCount={ad.likeCount} isLiked={!!liked[ad.id]} onLike={() => handleLike(ad.id)} showSeller />
            ))}
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="feed-sidebar">
        {/* Current User */}
        {userProfile && (
          <div className="feed-sidebar-user">
            <Link to={`/profile/${user?.uid}`} className="sidebar-user-link">
              <img
                src={userProfile.photoURL || `https://ui-avatars.com/api?name=${encodeURIComponent(userProfile.displayName || 'User')}`}
                alt={userProfile.displayName}
                className="sidebar-user-avatar"
              />
              <div className="sidebar-user-info">
                <div className="sidebar-user-username">{userProfile.email?.split('@')[0] || 'user'}</div>
                <div className="sidebar-user-name">{userProfile.displayName || 'User'}</div>
              </div>
            </Link>
            <Link to="/settings" className="sidebar-switch-btn">Switch</Link>
          </div>
        )}

        {/* Suggestions */}
        {suggestedUsers.length > 0 && (
          <div className="feed-suggestions">
            <div className="suggestions-header">
              <h3>Suggestions For You</h3>
              <Link to="/explore">See All</Link>
            </div>

            <div className="suggestions-list">
              {suggestedUsers.map(suggestedUser => {
                const userName = suggestedUser.displayName || suggestedUser.email?.split('@')[0] || 'User';
                const userPhoto = suggestedUser.photoURL || `https://ui-avatars.com/api?name=${encodeURIComponent(userName)}`;

                return (
                  <div key={suggestedUser.id} className="suggestion-item">
                    <Link to={`/profile/${suggestedUser.id}`} className="suggestion-user-link">
                      <img src={userPhoto} alt={userName} className="suggestion-avatar" />
                      <div className="suggestion-info">
                        <div className="suggestion-username">{suggestedUser.email?.split('@')[0] || 'user'}</div>
                        <div className="suggestion-subtitle">Suggested for you</div>
                      </div>
                    </Link>
                    <button
                      className="suggestion-follow-btn"
                      onClick={() => handleFollowUser(suggestedUser.id)}
                    >
                      {followingStates[suggestedUser.id] ? 'Following' : 'Follow'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="feed-sidebar-footer">
          <div className="footer-links">
            <a href="#">About</a> · <a href="#">Help</a> · <a href="#">Press</a> · <a href="#">API</a> ·
            <a href="#">Jobs</a> · <a href="#">Privacy</a> · <a href="#">Terms</a> ·
            <a href="#">Locations</a> · <a href="#">Language</a>
          </div>
          <div className="footer-copyright">
            © 2026 CAMPUSKART FROM SALMAN
          </div>
        </div>
      </div>

      {createPostOpen && (
        <CreatePostModal
          onClose={() => setCreatePostOpen(false)}
          onSuccess={() => { setCreatePostOpen(false); loadPosts(); }}
        />
      )}
    </div>
  );
}
