import { useState, useEffect, useCallback } from 'react';
import { getPosts, togglePostLike, isPostLiked } from '../lib/firestore';
import { useAuth } from '../contexts/AuthContext';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import StoriesList from '../components/StoriesList';
import './Feed.css';

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postLiked, setPostLiked] = useState({});
  const [createPostOpen, setCreatePostOpen] = useState(false);

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
    <div className="feed">
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

      {createPostOpen && (
        <CreatePostModal
          onClose={() => setCreatePostOpen(false)}
          onSuccess={() => { setCreatePostOpen(false); loadPosts(); }}
        />
      )}
    </div>
  );
}
