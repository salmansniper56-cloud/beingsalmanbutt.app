import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAd } from '../lib/firestore';
import { getUser } from '../lib/firestore';
import { useAuth } from '../contexts/AuthContext';
import { toggleLike, isLiked } from '../lib/firestore';
import { getChatId, getOrCreateChat } from '../lib/firestore';
import Layout from '../components/Layout';
import './AdDetail.css';

export default function AdDetail() {
  const { adId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ad, setAd] = useState(null);
  const [seller, setSeller] = useState(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAd(adId).then(async (data) => {
      setAd(data);
      if (data?.createdBy) {
        const s = await getUser(data.createdBy);
        setSeller(s);
      }
      if (user?.uid) {
        const l = await isLiked(adId, user.uid);
        setLiked(l);
      }
      setLoading(false);
    });
  }, [adId, user?.uid]);

  async function handleLike() {
    if (!user?.uid) return;
    try {
      await toggleLike(adId, user.uid);
      setLiked((p) => !p);
      setAd((a) => (a ? { ...a, likeCount: (a.likeCount ?? 0) + (liked ? -1 : 1) } : null));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMessage() {
    if (!user?.uid || !ad?.createdBy) return;
    try {
      const chatId = await getOrCreateChat(user.uid, ad.createdBy);
      navigate(`/messages/${chatId}`);
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="app-loading">Loading…</div>;
  if (!ad) return <div className="ad-detail-missing">Ad not found.</div>;

  const imageUrl = ad.images?.[0] || 'https://via.placeholder.com/800x400?text=No+image';
  const isOwner = user?.uid === ad.createdBy;

  const content = (
    <div className="ad-detail">
      <div className="ad-detail-gallery">
        <img src={imageUrl} alt={ad.title} />
      </div>
      <div className="ad-detail-main">
        <h1>{ad.title}</h1>
        <p className="ad-detail-price">{ad.price} {ad.currency || 'PKR'}</p>
        <p className="ad-detail-meta">Category: {ad.category} · Condition: {ad.condition || 'N/A'}</p>
        {ad.boostExpiresAt && new Date(ad.boostExpiresAt) > new Date() && (
          <span className="ad-detail-boost">Boosted</span>
        )}
        <p className="ad-detail-desc">{ad.description || 'No description.'}</p>
        <div className="ad-detail-actions">
          <button type="button" className={`ad-card-like ${liked ? 'is-liked' : ''}`} onClick={handleLike}>
            ♥ {ad.likeCount ?? 0}
          </button>
          {seller && (
            <Link to={`/profile/${seller.id}`} className="btn btn-secondary">View seller</Link>
          )}
          {user && !isOwner && (
            <button type="button" className="btn btn-primary" onClick={handleMessage}>Message</button>
          )}
          {isOwner && (
            <Link to={`/ad/${adId}/boost`} className="btn btn-primary">Boost this ad</Link>
          )}
        </div>
      </div>
    </div>
  );

  return user ? <Layout>{content}</Layout> : <div className="layout"><header className="layout-header"><Link to="/" className="layout-logo">CampusKart</Link><Link to="/login">Log in</Link></header><main className="layout-main">{content}</main></div>;
}
