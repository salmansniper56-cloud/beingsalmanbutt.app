import { Link } from 'react-router-dom';
import AdImage from './AdImage';
import './AdCard.css';

const PLACEHOLDER = 'https://placehold.co/400x240/181828/7c6ff7?text=No+image';

function getFirstImageUrl(ad) {
  const images = Array.isArray(ad.images) ? ad.images : [];
  const first = images[0];
  return typeof first === 'string' ? first : (first?.url ?? null) || PLACEHOLDER;
}

function getConditionClass(condition) {
  if (!condition) return '';
  const c = condition.toLowerCase();
  if (c === 'like new') return 'like-new';
  if (c === 'good') return 'good';
  if (c === 'fair') return 'fair';
  if (c === 'used') return 'used';
  return 'good';
}

export default function AdCard({ ad, likeCount, onLike, isLiked, showSeller }) {
  const imageUrl = getFirstImageUrl(ad);
  const conditionClass = getConditionClass(ad.condition);

  return (
    <article className="ad-card">
      <Link to={`/ad/${ad.id}`} className="ad-card-image-wrap">
        <AdImage src={imageUrl} alt={ad.title} />
        {ad.boostExpiresAt && new Date(ad.boostExpiresAt) > new Date() && (
          <span className="ad-card-boost">⚡ Boosted</span>
        )}
      </Link>
      <div className="ad-card-body">
        <Link to={`/ad/${ad.id}`} style={{ textDecoration: 'none' }}>
          <h3 className="ad-card-title">{ad.title}</h3>
        </Link>
        <p className="ad-card-price">{(ad.price ?? 0).toLocaleString()} {ad.currency || 'PKR'}</p>
        <div className="ad-card-meta">
          {ad.condition && (
            <span className={`ad-card-condition ${conditionClass}`}>{ad.condition}</span>
          )}
          {showSeller && ad.createdBy && (
            <Link to={`/profile/${ad.createdBy}`} className="ad-card-seller">View seller</Link>
          )}
        </div>
        <div className="ad-card-actions">
          <button
            type="button"
            className={`ad-card-like ${isLiked ? 'is-liked' : ''}`}
            onClick={(e) => { e.preventDefault(); onLike?.(); }}
            aria-label={isLiked ? 'Unlike' : 'Like'}
          >
            ♥ {likeCount ?? ad.likeCount ?? 0}
          </button>
        </div>
      </div>
    </article>
  );
}