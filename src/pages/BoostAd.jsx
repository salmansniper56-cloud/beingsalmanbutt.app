import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAd } from '../lib/firestore';
import './BoostAd.css';

const BOOST_OPTIONS = [
  { id: '24h', label: '24 hours', price: 99, durationHours: 24 },
  { id: '7d', label: '7 days', price: 299, durationHours: 168 },
];

export default function BoostAd() {
  const { adId } = useParams();
  const { user } = useAuth();
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [selected, setSelected] = useState(BOOST_OPTIONS[0].id);
  const [error, setError] = useState('');

  useEffect(() => {
    getAd(adId).then((data) => {
      setAd(data);
      setLoading(false);
    });
  }, [adId]);

  async function handleBoost() {
    if (!user || !ad || ad.createdBy !== user.uid) return;
    setError('');
    setPayLoading(true);
    try {
      const opt = BOOST_OPTIONS.find((o) => o.id === selected);
      const functions = (await import('../lib/functions')).default;
      const url = await functions.createBoostCheckout(adId, opt.id);
      if (url) window.location.href = url;
      else setError('Checkout not configured. Add Stripe and Cloud Function.');
    } catch (err) {
      setError(err.message || 'Payment failed');
    } finally {
      setPayLoading(false);
    }
  }

  if (loading) return <div className="app-loading">Loading…</div>;
  if (!ad) return <div className="boost-missing">Ad not found.</div>;
  if (ad.createdBy !== user?.uid) return <div className="boost-missing">You can only boost your own ads.</div>;

  const option = BOOST_OPTIONS.find((o) => o.id === selected);

  return (
    <div className="boost-ad">
      <h1>Boost your ad</h1>
      <p className="boost-ad-sub">Get more visibility in the feed.</p>
      <Link to={`/ad/${adId}`} className="boost-ad-link">« Back to ad</Link>
      <div className="boost-ad-options">
        {BOOST_OPTIONS.map((o) => (
          <label key={o.id} className={`boost-option ${selected === o.id ? 'selected' : ''}`}>
            <input type="radio" name="boost" value={o.id} checked={selected === o.id} onChange={() => setSelected(o.id)} />
            <span className="boost-option-label">{o.label}</span>
            <span className="boost-option-price">{o.price} PKR</span>
          </label>
        ))}
      </div>
      {error && <p className="boost-ad-error">{error}</p>}
      <button type="button" className="btn btn-primary" onClick={handleBoost} disabled={payLoading}>
        {payLoading ? 'Redirecting to payment…' : `Pay ${option?.price ?? 0} PKR with Stripe`}
      </button>
    </div>
  );
}
