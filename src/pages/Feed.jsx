import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAds } from '../lib/firestore';
import { useAuth } from '../contexts/AuthContext';
import { toggleLike, isLiked } from '../lib/firestore';
import AdCard from '../components/AdCard';
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
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

export default function Feed() {
  const { user } = useAuth();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState({});
  const [category, setCategory] = useState('');

  const loadAds = useCallback(async () => {
    setLoading(true);
    try {
      const { ads: list } = await getAds({ limitCount: 50 });
      const filtered = category ? list.filter((a) => a.category === category) : list;
      setAds(rankAds(filtered));
      const likedMap = {};
      await Promise.all(
        list.slice(0, 30).map(async (ad) => {
          if (user?.uid) likedMap[ad.id] = await isLiked(ad.id, user.uid);
        })
      );
      setLiked(likedMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [category, user?.uid]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  async function handleLike(adId) {
    if (!user?.uid) return;
    try {
      await toggleLike(adId, user.uid);
      setAds((prev) =>
        prev.map((a) =>
          a.id === adId ? { ...a, likeCount: (a.likeCount ?? 0) + (liked[adId] ? -1 : 1) } : a
        )
      );
      setLiked((prev) => ({ ...prev, [adId]: !prev[adId] }));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="feed">
      <div className="feed-toolbar">
        <h1>Feed</h1>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All</option>
          <option value="books">Books</option>
          <option value="electronics">Electronics</option>
          <option value="other">Other</option>
        </select>
      </div>
      {loading ? (
        <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} aria-hidden="true" /></div>
      ) : ads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <p>No ads yet. Be the first to post!</p>
          <Link to="/ad/create" className="btn btn-primary">Create an ad</Link>
        </div>
      ) : (
        <div className="feed-grid">
          {ads.map((ad) => (
            <AdCard
              key={ad.id}
              ad={ad}
              likeCount={ad.likeCount}
              isLiked={!!liked[ad.id]}
              onLike={() => handleLike(ad.id)}
              showSeller
            />
          ))}
        </div>
      )}
    </div>
  );
}
