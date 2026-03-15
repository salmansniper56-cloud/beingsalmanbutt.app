import { Link } from 'react-router-dom';
import AdImage from './AdImage';
import './AdCard.css';

const PLACEHOLDER = 'https://placehold.co/400x240?text=No+image';

function getFirstImageUrl(ad) {
  const images = Array.isArray(ad.images) ? ad.images : [];
  const first = images[0];
  return typeof first === 'string' ? first : (first?.url ?? null) || PLACEHOLDER;
}

export default function AdCard({ ad, likeCount, onLike, isLiked, showSeller }) {
  const imageUrl = getFirstImageUrl(ad);
  return (
    <article className="ad-card">
      <Link to={`/ad/${ad.id}`} className="ad-card-image-wrap">
        <AdImage src={imageUrl} alt={ad.title} />
        {ad.boostExpiresAt && new Date(ad.boostExpiresAt) > new Date() && (
          <span className="ad-card-boost">Boosted</span>
        )}
      </Link>
      <div className="ad-card-body">
        <Link to={`/ad/${ad.id}`}>
          <h3 className="ad-card-title">{ad.title}</h3>
        </Link>
        <p className="ad-card-price">{ad.price} {ad.currency || 'PKR'}</p>
        {showSeller && ad.createdBy && (
          <Link to={`/profile/${ad.createdBy}`} className="ad-card-seller">View seller</Link>
        )}
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
