import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUser, getAdsByUser, toggleFollow, isFollowing } from '../lib/firestore';
import AdCard from '../components/AdCard';
import Layout from '../components/Layout';
import './Profile.css';

export default function Profile() {
  const { uid } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [ads, setAds] = useState([]);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    Promise.all([getUser(uid), getAdsByUser(uid), currentUser?.uid ? isFollowing(uid, currentUser.uid) : Promise.resolve(false)]).then(([p, adList, f]) => {
      setProfile(p);
      setAds(adList || []);
      setFollowing(!!f);
      setLoading(false);
    });
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

  if (loading) return <div className="app-loading">Loading…</div>;
  if (!profile) return <div className="profile-missing">Profile not found.</div>;

  const isOwn = currentUser?.uid === uid;
  const photoURL = profile.photoURL || `https://ui-avatars.com/api?name=${encodeURIComponent(profile.displayName || 'User')}`;

  const content = (
    <div className="profile">
      <div className="profile-header">
        <img src={photoURL} alt="" className="profile-avatar" />
        <h1>{profile.displayName || 'User'}</h1>
        {profile.bio && <p className="profile-bio">{profile.bio}</p>}
        {!isOwn && currentUser?.uid && (
          <button type="button" className={`btn ${following ? 'btn-secondary' : 'btn-primary'}`} onClick={handleFollow}>
            {following ? 'Unfollow' : 'Follow'}
          </button>
        )}
        {isOwn && <Link to="/ad/create" className="btn btn-primary">Create ad</Link>}
      </div>
      <section className="profile-ads">
        <h2>Listings</h2>
        {ads.length === 0 ? (
          <p className="profile-empty">No listings yet.</p>
        ) : (
          <div className="feed-grid">
            {ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} likeCount={ad.likeCount} showSeller={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  );

  return currentUser ? <Layout>{content}</Layout> : <div className="layout"><header className="layout-header"><Link to="/" className="layout-logo">CampusKart</Link><Link to="/login">Log in</Link></header><main className="layout-main">{content}</main></div>;
}
