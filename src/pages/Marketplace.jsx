import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getFeaturedAds, getMarketplaceAds, toggleLike, isLiked } from '../lib/firestore';
import AdCard from '../components/AdCard';
import './Marketplace.css';

const CATEGORIES = [
  { key: '', label: 'All' },
  { key: 'books', label: 'Books' },
  { key: 'electronics', label: 'Electronics' },
  { key: 'clothing', label: 'Clothing' },
  { key: 'other', label: 'Other' },
];

export default function Marketplace() {
  const { user } = useAuth();
  const [featuredAds, setFeaturedAds] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState('');
  const [showMyAds, setShowMyAds] = useState(false);
  const [liked, setLiked] = useState({});
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef(null);
  const carouselRef = useRef(null);

  // Load featured ads
  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const featured = await getFeaturedAds(10);
        setFeaturedAds(featured);
      } catch (err) {
        console.error('Error loading featured ads:', err);
      }
    };
    loadFeatured();
  }, []);

  // Load marketplace ads
  const loadAds = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      lastDocRef.current = null;
    } else {
      setLoadingMore(true);
    }

    try {
      const { ads: newAds, lastDoc } = await getMarketplaceAds({
        limitCount: 20,
        lastDoc: reset ? null : lastDocRef.current,
        category: category || null,
      });

      // Filter by user if showing only my ads
      let filteredAds = newAds;
      if (showMyAds && user?.uid) {
        filteredAds = newAds.filter(ad => ad.createdBy === user.uid);
      }

      if (reset) {
        setAds(filteredAds);
      } else {
        setAds((prev) => [...prev, ...filteredAds]);
      }

      lastDocRef.current = lastDoc;
      setHasMore(filteredAds.length === 20);

      // Load like status for logged in user
      if (user?.uid) {
        const likeChecks = await Promise.all(
          filteredAds.map((ad) => isLiked(ad.id, user.uid).then((liked) => [ad.id, liked]))
        );
        const likeMap = Object.fromEntries(likeChecks);
        setLiked((prev) => (reset ? likeMap : { ...prev, ...likeMap }));
      }
    } catch (err) {
      console.error('Error loading ads:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category, showMyAds, user?.uid]);

  useEffect(() => {
    loadAds(true);
  }, [loadAds]);

  // Handle like toggle
  const handleLike = useCallback(async (adId) => {
    if (!user?.uid) {
      alert('Please login to like ads');
      return;
    }

    const wasLiked = liked[adId];
    setLiked((prev) => ({ ...prev, [adId]: !wasLiked }));

    // Update local ad like count
    setAds((prev) =>
      prev.map((ad) =>
        ad.id === adId ? { ...ad, likeCount: (ad.likeCount || 0) + (wasLiked ? -1 : 1) } : ad
      )
    );
    setFeaturedAds((prev) =>
      prev.map((ad) =>
        ad.id === adId ? { ...ad, likeCount: (ad.likeCount || 0) + (wasLiked ? -1 : 1) } : ad
      )
    );

    try {
      await toggleLike(adId, user.uid);
    } catch (err) {
      // Revert on error
      setLiked((prev) => ({ ...prev, [adId]: wasLiked }));
      console.error('Error toggling like:', err);
    }
  }, [user?.uid, liked]);

  // Carousel scroll
  const scrollCarousel = (direction) => {
    if (!carouselRef.current) return;
    const scrollAmount = 300;
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="marketplace">
      <header className="marketplace-header">
        <h1>Marketplace</h1>
        <p>Find great deals from students near you</p>
      </header>

      {/* Featured Ads Section */}
      {featuredAds.length > 0 && (
        <section className="marketplace-featured">
          <div className="featured-header">
            <h2>Featured Ads</h2>
            <span className="featured-badge">Paid</span>
          </div>
          <div className="featured-wrapper">
            <button className="carousel-btn left" onClick={() => scrollCarousel('left')}>
              ‹
            </button>
            <div className="featured-carousel" ref={carouselRef}>
              {featuredAds.map((ad) => (
                <div key={ad.id} className="featured-item">
                  <AdCard
                    ad={ad}
                    likeCount={ad.likeCount || 0}
                    isLiked={!!liked[ad.id]}
                    onLike={() => handleLike(ad.id)}
                    showSeller
                  />
                </div>
              ))}
            </div>
            <button className="carousel-btn right" onClick={() => scrollCarousel('right')}>
              ›
            </button>
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="marketplace-filters">
        {/* My Ads Tab */}
        {user && (
          <div className="marketplace-tabs">
            <button
              className={`marketplace-tab ${!showMyAds ? 'active' : ''}`}
              onClick={() => { setShowMyAds(false); setCategory(''); }}
            >
              All Ads
            </button>
            <button
              className={`marketplace-tab ${showMyAds ? 'active' : ''}`}
              onClick={() => { setShowMyAds(true); setCategory(''); }}
            >
              My Ads ({ads.filter(a => a.createdBy === user.uid).length})
            </button>
          </div>
        )}

        <div className="filter-categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              className={`filter-btn ${category === cat.key ? 'active' : ''}`}
              onClick={() => setCategory(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* All Listings */}
      <section className="marketplace-listings">
        <h2>All Listings</h2>

        {loading ? (
          <div className="marketplace-loading">
            <div className="spinner" />
            <p>Loading ads...</p>
          </div>
        ) : ads.length === 0 ? (
          <div className="marketplace-empty">
            <p>No ads found{category ? ` in ${category}` : ''}</p>
          </div>
        ) : (
          <>
            <div className="marketplace-grid">
              {ads.map((ad) => (
                <AdCard
                  key={ad.id}
                  ad={ad}
                  likeCount={ad.likeCount || 0}
                  isLiked={!!liked[ad.id]}
                  onLike={() => handleLike(ad.id)}
                  showSeller
                />
              ))}
            </div>

            {hasMore && (
              <div className="marketplace-load-more">
                <button onClick={() => loadAds(false)} disabled={loadingMore}>
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
