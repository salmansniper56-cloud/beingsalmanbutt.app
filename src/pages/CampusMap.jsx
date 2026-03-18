import { useEffect, useRef, useState, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './CampusMap.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

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
  { name: "Aga Khan University", city: "Karachi", lat: 24.8607, lng: 67.0648, type: "Private", programs: "Medical, Nursing" },
  { name: "University of Peshawar", city: "Peshawar", lat: 34.0139, lng: 71.5377, type: "Public", programs: "Sciences, Arts, Law" },
  { name: "University of Sindh", city: "Jamshoro", lat: 25.4300, lng: 68.3700, type: "Public", programs: "Sciences, Arts" },
];

const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  standard: 'mapbox://styles/mapbox/standard',
};

export default function CampusMap() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const watchIdRef = useRef(null);
  const destinationMarkerRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState('streets');
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [selected, setSelected] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [directions, setDirections] = useState(null);
  const [directionsLoading, setDirectionsLoading] = useState(false);

  // Haversine distance
  const getDistance = useCallback((lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
  }, []);

  // Create marker element - fixed anchoring
  const createMarkerElement = useCallback((color, emoji) => {
    const el = document.createElement('div');
    el.className = 'cmap-marker';
    el.innerHTML = `
      <div class="cmap-marker-pin" style="background: ${color}">
        <span class="cmap-marker-emoji">${emoji}</span>
      </div>
    `;
    return el;
  }, []);

  // Create user location marker
  const createUserMarkerElement = useCallback(() => {
    const el = document.createElement('div');
    el.className = 'cmap-user-marker';
    el.innerHTML = `
      <div class="cmap-user-pulse"></div>
      <div class="cmap-user-dot"></div>
    `;
    return el;
  }, []);

  // Create destination marker
  const createDestinationMarker = useCallback(() => {
    const el = document.createElement('div');
    el.className = 'cmap-dest-marker';
    el.innerHTML = `<div class="cmap-dest-pin">📍</div>`;
    return el;
  }, []);

  // Initialize map
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[mapStyle],
      center: [69.3451, 30.3753],
      zoom: 5,
      pitch: 0,
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-left');

    map.on('load', () => {
      setMapLoaded(true);
      mapRef.current = map;
    });

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Change map style
  const changeMapStyle = useCallback((style) => {
    if (!mapRef.current) return;
    setMapStyle(style);
    mapRef.current.setStyle(MAP_STYLES[style]);
  }, []);

  // Fetch sellers
  useEffect(() => {
    const fetchSellers = async () => {
      try {
        const snap = await getDocs(collection(db, 'ads'));
        const ads = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((ad) => ad.lat && ad.lng);
        setSellers(ads);
      } catch (err) {
        console.error('Failed to fetch sellers:', err);
      }
    };
    fetchSellers();
  }, []);

  // Clear markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  }, []);

  // Plot all markers on map load
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    clearMarkers();

    // Plot universities
    UNIVERSITIES.forEach((u) => {
      const color = u.type === 'Private' ? '#AF52DE' : '#34C759';
      const el = createMarkerElement(color, '🎓');

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([u.lng, u.lat])
        .addTo(mapRef.current);

      el.addEventListener('click', () => {
        setSelected({ ...u, kind: 'university' });
        mapRef.current.flyTo({ center: [u.lng, u.lat], zoom: 15, duration: 1000 });
      });

      markersRef.current.push(marker);
    });

    // Plot sellers
    sellers.forEach((ad) => {
      const el = createMarkerElement('#FF3B30', '🛍️');

      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([ad.lng, ad.lat])
        .addTo(mapRef.current);

      el.addEventListener('click', () => {
        setSelected({ ...ad, kind: 'seller' });
        mapRef.current.flyTo({ center: [ad.lng, ad.lat], zoom: 15, duration: 1000 });
      });

      markersRef.current.push(marker);
    });
  }, [mapLoaded, sellers, clearMarkers, createMarkerElement]);

  // Get user location
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserLocation({ lat, lng });
        setLocating(false);

        if (userMarkerRef.current) userMarkerRef.current.remove();

        const el = createUserMarkerElement();
        userMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(mapRef.current);

        mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 1500 });
      },
      () => {
        setLocating(false);
        alert('Could not get location. Enable location services.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [createUserMarkerElement]);

  // Combined search - universities, sellers, and places
  const handleSearch = useCallback(async (query) => {
    setSearch(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    // Search universities locally
    const uniResults = UNIVERSITIES.filter(
      (u) => u.name.toLowerCase().includes(query.toLowerCase()) || u.city.toLowerCase().includes(query.toLowerCase())
    ).map((u) => ({ ...u, kind: 'university', icon: '🎓' }));

    // Search sellers locally
    const sellerResults = sellers
      .filter((s) => s.title?.toLowerCase().includes(query.toLowerCase()))
      .map((s) => ({ ...s, kind: 'seller', icon: '🛍️', name: s.title }));

    // Search places via Mapbox
    let placeResults = [];
    try {
      const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=pk&limit=5`
      );
      const data = await res.json();
      placeResults = (data.features || []).map((f) => ({
        name: f.text,
        fullName: f.place_name,
        lat: f.center[1],
        lng: f.center[0],
        kind: 'place',
        icon: '📍',
      }));
    } catch (err) {
      console.error('Place search error:', err);
    }

    setSearchResults([...placeResults, ...uniResults.slice(0, 2), ...sellerResults.slice(0, 2)]);
    setSearching(false);
  }, [sellers]);

  // Select a search result
  const selectResult = useCallback((item) => {
    setSearch(item.name);
    setSearchResults([]);
    setSearchFocused(false);
    setSelected(item);

    mapRef.current?.flyTo({ center: [item.lng, item.lat], zoom: 15, duration: 1500 });

    // Add destination marker for places
    if (item.kind === 'place') {
      if (destinationMarkerRef.current) destinationMarkerRef.current.remove();
      const el = createDestinationMarker();
      destinationMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([item.lng, item.lat])
        .addTo(mapRef.current);
    }
  }, [createDestinationMarker]);

  // Get directions
  const getDirections = useCallback(async (dest) => {
    if (!userLocation) {
      alert('Get your location first!');
      getLocation();
      return;
    }

    setDirectionsLoading(true);

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.routes?.length) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates;

        const map = mapRef.current;

        // Remove existing route
        if (map.getLayer('route')) map.removeLayer('route');
        if (map.getLayer('route-bg')) map.removeLayer('route-bg');
        if (map.getSource('route')) map.removeSource('route');

        // Add route
        map.addSource('route', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString', coordinates } },
        });

        map.addLayer({
          id: 'route-bg',
          type: 'line',
          source: 'route',
          paint: { 'line-color': '#4285F4', 'line-width': 8, 'line-opacity': 0.4 },
        });

        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          paint: { 'line-color': '#4285F4', 'line-width': 5 },
        });

        // Fit to route
        const bounds = coordinates.reduce(
          (b, c) => b.extend(c),
          new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
        );
        map.fitBounds(bounds, { padding: 80, duration: 1500 });

        setDirections({
          distance: (route.distance / 1000).toFixed(1),
          duration: Math.round(route.duration / 60),
          dest: dest.name || dest.title,
        });
      }
    } catch (err) {
      console.error('Directions error:', err);
      alert('Could not get directions');
    } finally {
      setDirectionsLoading(false);
    }
  }, [userLocation, getLocation]);

  // Clear directions
  const clearDirections = useCallback(() => {
    const map = mapRef.current;
    if (map) {
      if (map.getLayer('route')) map.removeLayer('route');
      if (map.getLayer('route-bg')) map.removeLayer('route-bg');
      if (map.getSource('route')) map.removeSource('route');
    }
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }
    setDirections(null);
    setSelected(null);
  }, []);

  // Close selected
  const closeSelected = useCallback(() => {
    setSelected(null);
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }
  }, []);

  return (
    <div className="cmap-page">
      <div ref={mapContainerRef} className="cmap-map" />

      {!mapLoaded && (
        <div className="cmap-loading">
          <div className="cmap-loading-spinner" />
          <p>Loading Map...</p>
        </div>
      )}

      {/* Google Maps style search */}
      <div className={`cmap-search-box ${searchFocused ? 'focused' : ''}`}>
        <div className="cmap-search-input-row">
          <span className="cmap-search-icon">🔍</span>
          <input
            className="cmap-search-input"
            placeholder="Search any place, city, restaurant..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
          />
          {search && (
            <button className="cmap-search-clear" onClick={() => { setSearch(''); setSearchResults([]); }}>
              ✕
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {searchFocused && (searchResults.length > 0 || !search) && (
          <div className="cmap-search-dropdown">
            {searchResults.length > 0 ? (
              searchResults.map((r, i) => (
                <div key={i} className="cmap-search-result" onClick={() => selectResult(r)}>
                  <span className="cmap-result-icon">{r.icon}</span>
                  <div className="cmap-result-text">
                    <span className="cmap-result-name">{r.name}</span>
                    <span className="cmap-result-sub">{r.fullName || r.city || r.category}</span>
                  </div>
                  {userLocation && (
                    <span className="cmap-result-dist">{getDistance(userLocation.lat, userLocation.lng, r.lat, r.lng)} km</span>
                  )}
                </div>
              ))
            ) : (
              <div className="cmap-search-suggestions">
                <p className="cmap-suggestion-label">Search for anything</p>
                <div className="cmap-search-result" onClick={() => handleSearch('Islamabad')}>
                  <span className="cmap-result-icon">🏙️</span>
                  <div className="cmap-result-text">
                    <span className="cmap-result-name">Islamabad</span>
                    <span className="cmap-result-sub">Capital city</span>
                  </div>
                </div>
                <div className="cmap-search-result" onClick={() => handleSearch('Lahore')}>
                  <span className="cmap-result-icon">🏙️</span>
                  <div className="cmap-result-text">
                    <span className="cmap-result-name">Lahore</span>
                    <span className="cmap-result-sub">Punjab</span>
                  </div>
                </div>
                <div className="cmap-search-result" onClick={() => handleSearch('Karachi')}>
                  <span className="cmap-result-icon">🏙️</span>
                  <div className="cmap-result-text">
                    <span className="cmap-result-name">Karachi</span>
                    <span className="cmap-result-sub">Sindh</span>
                  </div>
                </div>
                <div className="cmap-search-result" onClick={() => handleSearch('restaurants')}>
                  <span className="cmap-result-icon">🍽️</span>
                  <div className="cmap-result-text">
                    <span className="cmap-result-name">Restaurants nearby</span>
                    <span className="cmap-result-sub">Food & dining</span>
                  </div>
                </div>
                <div className="cmap-search-result" onClick={() => handleSearch('hospitals')}>
                  <span className="cmap-result-icon">🏥</span>
                  <div className="cmap-result-text">
                    <span className="cmap-result-name">Hospitals</span>
                    <span className="cmap-result-sub">Healthcare</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close search */}
      {searchFocused && <div className="cmap-overlay" onClick={() => setSearchFocused(false)} />}

      {/* Map controls */}
      <div className="cmap-controls">
        <button className={`cmap-control-btn ${mapStyle === 'streets' ? 'active' : ''}`} onClick={() => changeMapStyle('streets')}>
          🗺️
        </button>
        <button className={`cmap-control-btn ${mapStyle === 'satellite' ? 'active' : ''}`} onClick={() => changeMapStyle('satellite')}>
          🛰️
        </button>
        <button className="cmap-control-btn cmap-location-btn" onClick={getLocation} disabled={locating}>
          {locating ? '...' : '📍'}
        </button>
      </div>

      {/* Directions card */}
      {directions && (
        <div className="cmap-directions-card">
          <div className="cmap-dir-info">
            <span className="cmap-dir-icon">🚗</span>
            <div>
              <p className="cmap-dir-dest">{directions.dest}</p>
              <p className="cmap-dir-stats">{directions.distance} km • {directions.duration} min</p>
            </div>
          </div>
          <button className="cmap-dir-close" onClick={clearDirections}>✕</button>
        </div>
      )}

      {/* Selected place card */}
      {selected && !directions && (
        <div className="cmap-place-card">
          <button className="cmap-card-close" onClick={closeSelected}>✕</button>

          <div className="cmap-card-header">
            <span className="cmap-card-icon">{selected.kind === 'university' ? '🎓' : selected.kind === 'seller' ? '🛍️' : '📍'}</span>
            <div>
              <h3 className="cmap-card-title">{selected.name || selected.title}</h3>
              <p className="cmap-card-subtitle">
                {selected.kind === 'university' && `${selected.type} • ${selected.city}`}
                {selected.kind === 'seller' && `Rs. ${(selected.price || 0).toLocaleString()} • ${selected.category}`}
                {selected.kind === 'place' && selected.fullName}
              </p>
            </div>
          </div>

          {selected.programs && <p className="cmap-card-programs">📚 {selected.programs}</p>}

          {userLocation && (
            <p className="cmap-card-distance">
              📏 {getDistance(userLocation.lat, userLocation.lng, selected.lat, selected.lng)} km away
            </p>
          )}

          <div className="cmap-card-actions">
            <button className="cmap-action-btn primary" onClick={() => getDirections(selected)} disabled={directionsLoading}>
              {directionsLoading ? 'Getting route...' : '🧭 Directions'}
            </button>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="cmap-action-btn secondary"
            >
              Open in Google Maps
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
