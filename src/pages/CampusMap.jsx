import { useEffect, useRef, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import './CampusMap.css';

const UNIVERSITIES = [
  { name: "FAST-NUCES Islamabad", city: "Islamabad", lat: 33.6844, lng: 73.0479, type: "Private", programs: "CS, Engineering, Business" },
  { name: "NUST Islamabad", city: "Islamabad", lat: 33.6421, lng: 72.9901, type: "Public", programs: "Engineering, Sciences, IT" },
  { name: "COMSATS Islamabad", city: "Islamabad", lat: 33.7215, lng: 73.0435, type: "Public", programs: "CS, Engineering, Sciences" },
  { name: "Quaid-i-Azam University", city: "Islamabad", lat: 33.7487, lng: 73.1366, type: "Public", programs: "Sciences, Social Sciences" },
  { name: "Air University", city: "Islamabad", lat: 33.6380, lng: 73.1050, type: "Public", programs: "Engineering, CS, Business" },
  { name: "FAST-NUCES Lahore", city: "Lahore", lat: 31.4816, lng: 74.3014, type: "Private", programs: "CS, Engineering, Business" },
  { name: "UET Lahore", city: "Lahore", lat: 31.5204, lng: 74.3587, type: "Public", programs: "Engineering, Architecture" },
  { name: "Punjab University", city: "Lahore", lat: 31.4676, lng: 74.2686, type: "Public", programs: "Sciences, Arts, Law" },
  { name: "LUMS Lahore", city: "Lahore", lat: 31.4216, lng: 74.2691, type: "Private", programs: "Business, CS, Law, Sciences" },
  { name: "GCU Lahore", city: "Lahore", lat: 31.5497, lng: 74.3196, type: "Public", programs: "Sciences, Arts, Commerce" },
  { name: "FAST-NUCES Karachi", city: "Karachi", lat: 24.8607, lng: 67.0105, type: "Private", programs: "CS, Engineering, Business" },
  { name: "NED University", city: "Karachi", lat: 24.9230, lng: 67.1138, type: "Public", programs: "Engineering, Architecture" },
  { name: "University of Karachi", city: "Karachi", lat: 24.9414, lng: 67.1148, type: "Public", programs: "Sciences, Arts, Commerce" },
  { name: "IBA Karachi", city: "Karachi", lat: 24.8563, lng: 67.0101, type: "Public", programs: "Business, CS, Economics" },
  { name: "UET Peshawar", city: "Peshawar", lat: 34.0089, lng: 71.5702, type: "Public", programs: "Engineering, Architecture" },
  { name: "COMSATS Abbottabad", city: "Abbottabad", lat: 34.1558, lng: 73.2194, type: "Public", programs: "CS, Engineering, Sciences" },
  { name: "BZU Multan", city: "Multan", lat: 30.2672, lng: 71.4736, type: "Public", programs: "Sciences, Arts, Commerce" },
  { name: "Mehran UET", city: "Jamshoro", lat: 25.4236, lng: 68.3606, type: "Public", programs: "Engineering" },
  { name: "UET Taxila", city: "Taxila", lat: 33.7468, lng: 72.7921, type: "Public", programs: "Engineering" },
  { name: "COMSATS Lahore", city: "Lahore", lat: 31.4668, lng: 74.2826, type: "Public", programs: "CS, Engineering, Sciences" },
  { name: "LUMS Lahore", city: "Lahore", lat: 31.4216, lng: 74.2691, type: "Private", programs: "Business, CS, Law" },
  { name: "Aga Khan University", city: "Karachi", lat: 24.8607, lng: 67.0648, type: "Private", programs: "Medical, Nursing" },
  { name: "University of Peshawar", city: "Peshawar", lat: 34.0139, lng: 71.5377, type: "Public", programs: "Sciences, Arts, Law" },
  { name: "University of Sindh", city: "Jamshoro", lat: 25.4300, lng: 68.3700, type: "Public", programs: "Sciences, Arts" },
];

export default function CampusMap() {
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef     = useRef([]);
  const routeLayerRef  = useRef(null);
  const userMarkerRef  = useRef(null);

  const [leafletLoaded, setLeafletLoaded]   = useState(false);
  const [userLocation, setUserLocation]     = useState(null);
  const [locating, setLocating]             = useState(false);
  const [selected, setSelected]             = useState(null);
  const [sellers, setSellers]               = useState([]);
  const [activeTab, setActiveTab]           = useState('universities');
  const [search, setSearch]                 = useState('');
  const [searchResults, setSearchResults]   = useState([]);
  const [searching, setSearching]           = useState(false);
  const [directions, setDirections]         = useState(null);
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [nearby, setNearby]                 = useState([]);

  // Load Leaflet
  useEffect(() => {
    if (window.L) { setLeafletLoaded(true); return; }
    const link  = document.createElement('link');
    link.rel    = 'stylesheet';
    link.href   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script    = document.createElement('script');
    script.src      = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload   = () => setLeafletLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Init map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return;
    const L   = window.L;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([30.3753, 69.3451], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);
    mapInstanceRef.current = map;
    plotUniversities();
  }, [leafletLoaded]);

  // Fetch sellers from Firestore
  useEffect(() => {
    const fetchSellers = async () => {
      try {
        const snap = await getDocs(collection(db, 'ads'));
        const ads  = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(ad => ad.lat && ad.lng);
        setSellers(ads);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSellers();
  }, []);

  const makeIcon = (color, emoji = '') => {
    const L = window.L;
    return L.divIcon({
      className: '',
      html: `<div class="cmap-pin" style="background:${color}">${emoji}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  };

  const clearMarkers = () => {
    const map = mapInstanceRef.current;
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
  };

  const plotUniversities = () => {
    if (!mapInstanceRef.current || !leafletLoaded) return;
    const L   = window.L;
    const map = mapInstanceRef.current;
    clearMarkers();
    UNIVERSITIES.forEach(u => {
      const color  = u.type === 'Private' ? '#534AB7' : '#1D9E75';
      const marker = L.marker([u.lat, u.lng], { icon: makeIcon(color, '🎓') })
        .addTo(map)
        .on('click', () => setSelected({ ...u, kind: 'university' }));
      markersRef.current.push(marker);
    });
  };

  const plotSellers = () => {
    if (!mapInstanceRef.current || !leafletLoaded) return;
    const L   = window.L;
    const map = mapInstanceRef.current;
    clearMarkers();
    sellers.forEach(ad => {
      const marker = L.marker([ad.lat, ad.lng], { icon: makeIcon('#E24B4A', '🛍️') })
        .addTo(map)
        .on('click', () => setSelected({ ...ad, kind: 'seller' }));
      markersRef.current.push(marker);
    });
  };

  const plotAll = () => {
    if (!mapInstanceRef.current || !leafletLoaded) return;
    const L   = window.L;
    const map = mapInstanceRef.current;
    clearMarkers();
    UNIVERSITIES.forEach(u => {
      const color  = u.type === 'Private' ? '#534AB7' : '#1D9E75';
      const marker = L.marker([u.lat, u.lng], { icon: makeIcon(color, '🎓') })
        .addTo(map)
        .on('click', () => setSelected({ ...u, kind: 'university' }));
      markersRef.current.push(marker);
    });
    sellers.forEach(ad => {
      const marker = L.marker([ad.lat, ad.lng], { icon: makeIcon('#E24B4A', '🛍️') })
        .addTo(map)
        .on('click', () => setSelected({ ...ad, kind: 'seller' }));
      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current) return;
    if (activeTab === 'universities') plotUniversities();
    else if (activeTab === 'sellers') plotSellers();
    else if (activeTab === 'all') plotAll();
  }, [activeTab, leafletLoaded, sellers]);

  // Live location
  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserLocation({ lat, lng });
        setLocating(false);
        const L   = window.L;
        const map = mapInstanceRef.current;
        if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = L.marker([lat, lng], {
          icon: makeIcon('#E24B4A', '📍'),
          zIndexOffset: 1000,
        }).addTo(map).bindPopup('You are here').openPopup();
        map.flyTo([lat, lng], 13, { duration: 1.5 });

        // Find nearby universities
        const withDist = UNIVERSITIES.map(u => ({
          ...u,
          distance: getDistance(lat, lng, u.lat, u.lng),
        })).sort((a, b) => a.distance - b.distance).slice(0, 5);
        setNearby(withDist);
      },
      () => { setLocating(false); alert('Could not get your location.'); }
    );
  };

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R   = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a   = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  // Search places using Nominatim (free)
  const searchPlace = async (q) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ' Pakistan')}&format=json&limit=5`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const flyToPlace = (place) => {
    const map = mapInstanceRef.current;
    const L   = window.L;
    map.flyTo([place.lat, place.lon], 14, { duration: 1.5 });
    setSearchResults([]);
    setSearch(place.display_name.split(',')[0]);
  };

  // Get directions using OSRM (free)
  const getDirections = async (dest) => {
    if (!userLocation) { alert('Please get your location first!'); return; }
    setDirectionsLoading(true);
    setSelected(null);
    try {
      const url  = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.routes?.length) {
        const route    = data.routes[0];
        const coords   = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const L        = window.L;
        const map      = mapInstanceRef.current;
        if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
        routeLayerRef.current = L.polyline(coords, {
          color: '#534AB7', weight: 5, opacity: 0.8,
        }).addTo(map);
        map.fitBounds(routeLayerRef.current.getBounds(), { padding: [40, 40] });
        setDirections({
          distance: (route.distance / 1000).toFixed(1),
          duration: Math.round(route.duration / 60),
          dest: dest.name || dest.title,
        });
      }
    } catch (err) {
      alert('Could not get directions. Please try again.');
    } finally {
      setDirectionsLoading(false);
    }
  };

  const clearDirections = () => {
    if (routeLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    setDirections(null);
  };

  return (
    <div className="cmap-page">
      {/* Header */}
      <div className="cmap-header">
        <div className="cmap-header-left">
          <h1 className="cmap-title">🗺️ Campus Map</h1>
          <p className="cmap-sub">Universities · Sellers · Directions · Live Location</p>
        </div>
        <button className="cmap-locate-btn" onClick={getLocation} disabled={locating}>
          {locating ? '📡 Locating...' : '📍 My Location'}
        </button>
      </div>

      <div className="cmap-body">
        {/* Left panel */}
        <div className="cmap-panel">

          {/* Search */}
          <div className="cmap-search-wrap">
            <input
              className="cmap-search"
              placeholder="Search any place in Pakistan..."
              value={search}
              onChange={e => { setSearch(e.target.value); searchPlace(e.target.value); }}
            />
            {searching && <span className="cmap-search-spin">⏳</span>}
            {searchResults.length > 0 && (
              <div className="cmap-search-results">
                {searchResults.map((r, i) => (
                  <div key={i} className="cmap-search-item" onClick={() => flyToPlace(r)}>
                    <span>📍</span>
                    <span>{r.display_name.split(',').slice(0,2).join(', ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="cmap-tabs">
            {[
              { key: 'universities', label: '🎓 Universities' },
              { key: 'sellers',      label: '🛍️ Sellers' },
              { key: 'all',          label: '🌍 All' },
            ].map(t => (
              <button
                key={t.key}
                className={`cmap-tab ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Directions result */}
          {directions && (
            <div className="cmap-directions">
              <div className="cmap-directions-header">
                <span>🧭 Directions</span>
                <button onClick={clearDirections}>✕</button>
              </div>
              <p className="cmap-directions-dest">To: {directions.dest}</p>
              <div className="cmap-directions-stats">
                <div><span>{directions.distance} km</span><small>Distance</small></div>
                <div><span>{directions.duration} min</span><small>Drive time</small></div>
              </div>
            </div>
          )}

          {/* Nearby universities */}
          {nearby.length > 0 && (
            <div className="cmap-nearby">
              <p className="cmap-section-label">📍 Nearby universities</p>
              {nearby.map((u, i) => (
                <div key={i} className="cmap-nearby-item" onClick={() => {
                  mapInstanceRef.current?.flyTo([u.lat, u.lng], 14, { duration: 1 });
                  setSelected({ ...u, kind: 'university' });
                }}>
                  <div>
                    <p className="cmap-nearby-name">{u.name}</p>
                    <p className="cmap-nearby-dist">{u.distance} km away</p>
                  </div>
                  <button
                    className="cmap-dir-btn"
                    onClick={e => { e.stopPropagation(); getDirections(u); }}
                    disabled={directionsLoading}
                  >
                    {directionsLoading ? '...' : '🧭'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Universities list */}
          {activeTab === 'universities' && nearby.length === 0 && (
            <div className="cmap-list">
              <p className="cmap-section-label">All universities</p>
              {UNIVERSITIES.map((u, i) => (
                <div key={i} className="cmap-list-item" onClick={() => {
                  mapInstanceRef.current?.flyTo([u.lat, u.lng], 14, { duration: 1 });
                  setSelected({ ...u, kind: 'university' });
                }}>
                  <div className="cmap-list-dot" style={{ background: u.type === 'Private' ? '#534AB7' : '#1D9E75' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="cmap-list-name">{u.name}</p>
                    <p className="cmap-list-sub">{u.city} · {u.type}</p>
                  </div>
                  {userLocation && (
                    <button
                      className="cmap-dir-btn"
                      onClick={e => { e.stopPropagation(); getDirections(u); }}
                      disabled={directionsLoading}
                    >
                      🧭
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="cmap-map-wrap">
          {!leafletLoaded && (
            <div className="cmap-map-loading">
              <div className="spinner" style={{ width: 36, height: 36, borderWidth: 2 }} />
              <p>Loading map...</p>
            </div>
          )}
          <div ref={mapRef} className="cmap-map" />

          {/* Legend */}
          <div className="cmap-legend">
            <div className="cmap-legend-item"><div className="cmap-legend-dot" style={{ background: '#1D9E75' }} /><span>Public uni</span></div>
            <div className="cmap-legend-item"><div className="cmap-legend-dot" style={{ background: '#534AB7' }} /><span>Private uni</span></div>
            <div className="cmap-legend-item"><div className="cmap-legend-dot" style={{ background: '#E24B4A' }} /><span>Seller / You</span></div>
          </div>

          {/* Selected popup */}
          {selected && (
            <div className="cmap-popup">
              <button className="cmap-popup-close" onClick={() => setSelected(null)}>✕</button>
              {selected.kind === 'university' ? (
                <>
                  <span className="cmap-popup-badge" style={{ background: selected.type === 'Private' ? '#EEEDFE' : '#E1F5EE', color: selected.type === 'Private' ? '#3C3489' : '#0F6E56' }}>
                    {selected.type}
                  </span>
                  <h3 className="cmap-popup-name">{selected.name}</h3>
                  <p className="cmap-popup-info">📍 {selected.city}</p>
                  <p className="cmap-popup-info">📚 {selected.programs}</p>
                  {userLocation && (
                    <p className="cmap-popup-info">📏 {getDistance(userLocation.lat, userLocation.lng, selected.lat, selected.lng)} km from you</p>
                  )}
                  <div className="cmap-popup-btns">
                    <a href={`https://www.google.com/maps/search/${encodeURIComponent(selected.name)}`} target="_blank" rel="noopener noreferrer" className="cmap-popup-btn secondary">
                      Google Maps
                    </a>
                    <button className="cmap-popup-btn primary" onClick={() => getDirections(selected)} disabled={directionsLoading || !userLocation}>
                      {directionsLoading ? 'Loading...' : !userLocation ? 'Get location first' : '🧭 Directions'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="cmap-popup-badge" style={{ background: '#FAECE7', color: '#712B13' }}>Seller</span>
                  <h3 className="cmap-popup-name">{selected.title}</h3>
                  <p className="cmap-popup-info">💰 Rs. {(selected.price || 0).toLocaleString()}</p>
                  <p className="cmap-popup-info">📦 {selected.category}</p>
                  {userLocation && (
                    <p className="cmap-popup-info">📏 {getDistance(userLocation.lat, userLocation.lng, selected.lat, selected.lng)} km from you</p>
                  )}
                  <div className="cmap-popup-btns">
                    <button className="cmap-popup-btn primary" onClick={() => getDirections({ ...selected, name: selected.title })} disabled={directionsLoading || !userLocation}>
                      {directionsLoading ? 'Loading...' : !userLocation ? 'Get location first' : '🧭 Directions'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}