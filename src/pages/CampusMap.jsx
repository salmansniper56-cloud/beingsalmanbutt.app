import { useEffect, useRef, useState, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './CampusMap.css';

// Set Mapbox access token
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

export default function CampusMap() {
  // Refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const watchIdRef = useRef(null);

  // State
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [selected, setSelected] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [activeTab, setActiveTab] = useState('universities');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [directions, setDirections] = useState(null);
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [nearby, setNearby] = useState([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [terrain3D, setTerrain3D] = useState(true);

  // Create custom marker element
  const createMarkerElement = useCallback((color, emoji, isPulsing = false) => {
    const el = document.createElement('div');
    el.className = 'cmap-marker';
    el.innerHTML = `
      <div class="cmap-marker-pin" style="background: ${color}">
        <span class="cmap-marker-emoji">${emoji}</span>
      </div>
      ${isPulsing ? `<div class="cmap-marker-pulse" style="background: ${color}"></div>` : ''}
    `;
    return el;
  }, []);

  // Create user location marker
  const createUserMarkerElement = useCallback(() => {
    const el = document.createElement('div');
    el.className = 'cmap-user-marker';
    el.innerHTML = `
      <div class="cmap-user-accuracy"></div>
      <div class="cmap-user-dot">
        <div class="cmap-user-heading"></div>
      </div>
    `;
    return el;
  }, []);

  // Initialize map
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/standard',
      center: [69.3451, 30.3753], // Pakistan center [lng, lat]
      zoom: 5,
      pitch: 45,
      bearing: -17.6,
      antialias: true,
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('load', () => {
      // Add 3D terrain
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

      // Add atmospheric sky
      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 90.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      });

      // Add 3D buildings
      const layers = map.getStyle().layers;
      const labelLayerId = layers?.find(
        (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
      )?.id;

      if (labelLayerId) {
        map.addLayer(
          {
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 15,
            paint: {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.6,
            },
          },
          labelLayerId
        );
      }

      setMapLoaded(true);
      mapRef.current = map;
    });

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fetch sellers from Firestore
  useEffect(() => {
    const fetchSellers = async () => {
      try {
        const snap = await getDocs(collection(db, 'ads'));
        const ads = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((ad) => ad.lat && ad.lng);
        setSellers(ads);
      } catch (err) {
        console.error('Failed to fetch sellers:', err);
      }
    };
    fetchSellers();
  }, []);

  // Clear all markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  }, []);

  // Plot universities
  const plotUniversities = useCallback(() => {
    if (!mapRef.current || !mapLoaded) return;
    clearMarkers();

    UNIVERSITIES.forEach((u) => {
      const color = u.type === 'Private' ? '#AF52DE' : '#34C759';
      const el = createMarkerElement(color, '🎓');

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([u.lng, u.lat])
        .addTo(mapRef.current);

      el.addEventListener('click', () => {
        setSelected({ ...u, kind: 'university' });
        setSheetOpen(true);
        mapRef.current.flyTo({
          center: [u.lng, u.lat],
          zoom: 14,
          pitch: 60,
          duration: 1500,
        });
      });

      markersRef.current.push(marker);
    });
  }, [mapLoaded, clearMarkers, createMarkerElement]);

  // Plot sellers
  const plotSellers = useCallback(() => {
    if (!mapRef.current || !mapLoaded) return;
    clearMarkers();

    sellers.forEach((ad) => {
      const el = createMarkerElement('#FF3B30', '🛍️');

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([ad.lng, ad.lat])
        .addTo(mapRef.current);

      el.addEventListener('click', () => {
        setSelected({ ...ad, kind: 'seller' });
        setSheetOpen(true);
        mapRef.current.flyTo({
          center: [ad.lng, ad.lat],
          zoom: 14,
          pitch: 60,
          duration: 1500,
        });
      });

      markersRef.current.push(marker);
    });
  }, [mapLoaded, sellers, clearMarkers, createMarkerElement]);

  // Plot all markers
  const plotAll = useCallback(() => {
    if (!mapRef.current || !mapLoaded) return;
    clearMarkers();

    UNIVERSITIES.forEach((u) => {
      const color = u.type === 'Private' ? '#AF52DE' : '#34C759';
      const el = createMarkerElement(color, '🎓');

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([u.lng, u.lat])
        .addTo(mapRef.current);

      el.addEventListener('click', () => {
        setSelected({ ...u, kind: 'university' });
        setSheetOpen(true);
      });

      markersRef.current.push(marker);
    });

    sellers.forEach((ad) => {
      const el = createMarkerElement('#FF3B30', '🛍️');

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([ad.lng, ad.lat])
        .addTo(mapRef.current);

      el.addEventListener('click', () => {
        setSelected({ ...ad, kind: 'seller' });
        setSheetOpen(true);
      });

      markersRef.current.push(marker);
    });
  }, [mapLoaded, sellers, clearMarkers, createMarkerElement]);

  // Update markers based on active tab
  useEffect(() => {
    if (!mapLoaded) return;
    if (activeTab === 'universities') plotUniversities();
    else if (activeTab === 'sellers') plotSellers();
    else if (activeTab === 'all') plotAll();
  }, [activeTab, mapLoaded, plotUniversities, plotSellers, plotAll]);

  // Distance calculation (Haversine)
  const getDistance = useCallback((lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }, []);

  // Update user location on map
  const updateUserLocationOnMap = useCallback(
    (lat, lng, heading = null) => {
      if (!mapRef.current) return;

      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([lng, lat]);
        if (heading !== null) {
          const headingEl = userMarkerRef.current.getElement().querySelector('.cmap-user-heading');
          if (headingEl) {
            headingEl.style.transform = `rotate(${heading}deg)`;
          }
        }
      } else {
        const el = createUserMarkerElement();
        userMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(mapRef.current);
      }
    },
    [createUserMarkerElement]
  );

  // Get current location
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserLocation({ lat, lng });
        setLocating(false);

        updateUserLocationOnMap(lat, lng);

        mapRef.current?.flyTo({
          center: [lng, lat],
          zoom: 15,
          pitch: 60,
          duration: 2000,
        });

        // Find nearby universities
        const withDist = UNIVERSITIES.map((u) => ({
          ...u,
          distance: getDistance(lat, lng, u.lat, u.lng),
        }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 5);
        setNearby(withDist);
        setSheetOpen(true);
      },
      () => {
        setLocating(false);
        alert('Could not get your location. Please enable location services.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [getDistance, updateUserLocationOnMap]);

  // Start continuous tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) return;

    setTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, heading } = pos.coords;
        setUserLocation({ lat, lng });
        updateUserLocationOnMap(lat, lng, heading);
      },
      (error) => {
        console.error('Tracking error:', error);
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, [updateUserLocationOnMap]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  }, []);

  // Search places using Mapbox Geocoding
  const searchPlace = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${token}&country=pk&limit=5&types=place,locality,neighborhood,address,poi`;

      const res = await fetch(url);
      const data = await res.json();

      setSearchResults(
        data.features?.map((f) => ({
          name: f.text,
          fullName: f.place_name,
          lat: f.center[1],
          lng: f.center[0],
        })) || []
      );
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  // Fly to searched place
  const flyToPlace = useCallback((place) => {
    mapRef.current?.flyTo({
      center: [place.lng, place.lat],
      zoom: 14,
      pitch: 60,
      duration: 1500,
    });
    setSearchResults([]);
    setSearch(place.name);
  }, []);

  // Get directions using OSRM
  const getDirections = useCallback(
    async (dest) => {
      if (!userLocation) {
        alert('Please get your location first!');
        return;
      }

      setDirectionsLoading(true);
      setSelected(null);

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes?.length) {
          const route = data.routes[0];
          const coordinates = route.geometry.coordinates;

          // Remove existing route layers
          if (mapRef.current.getLayer('route')) mapRef.current.removeLayer('route');
          if (mapRef.current.getLayer('route-outline')) mapRef.current.removeLayer('route-outline');
          if (mapRef.current.getSource('route')) mapRef.current.removeSource('route');

          // Add route source
          mapRef.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates,
              },
            },
          });

          // Add route outline (shadow)
          mapRef.current.addLayer({
            id: 'route-outline',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#1a73e8',
              'line-width': 10,
              'line-opacity': 0.3,
            },
          });

          // Add main route line
          mapRef.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#007AFF',
              'line-width': 6,
            },
          });

          // Fit bounds
          const bounds = coordinates.reduce(
            (bounds, coord) => bounds.extend(coord),
            new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
          );

          mapRef.current.fitBounds(bounds, {
            padding: { top: 100, bottom: 300, left: 50, right: 50 },
            pitch: 45,
            duration: 1500,
          });

          setDirections({
            distance: (route.distance / 1000).toFixed(1),
            duration: Math.round(route.duration / 60),
            dest: dest.name || dest.title,
          });
          setSheetOpen(true);
        }
      } catch (err) {
        console.error('Directions error:', err);
        alert('Could not get directions. Please try again.');
      } finally {
        setDirectionsLoading(false);
      }
    },
    [userLocation]
  );

  // Clear directions
  const clearDirections = useCallback(() => {
    if (mapRef.current) {
      if (mapRef.current.getLayer('route')) mapRef.current.removeLayer('route');
      if (mapRef.current.getLayer('route-outline')) mapRef.current.removeLayer('route-outline');
      if (mapRef.current.getSource('route')) mapRef.current.removeSource('route');
    }
    setDirections(null);
  }, []);

  // Toggle 3D terrain
  const toggleTerrain = useCallback(() => {
    if (!mapRef.current) return;

    if (terrain3D) {
      mapRef.current.setTerrain(null);
      mapRef.current.setPitch(0);
    } else {
      mapRef.current.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      mapRef.current.setPitch(45);
    }
    setTerrain3D(!terrain3D);
  }, [terrain3D]);

  // Reset map view
  const resetView = useCallback(() => {
    mapRef.current?.flyTo({
      center: [69.3451, 30.3753],
      zoom: 5,
      pitch: 45,
      bearing: -17.6,
      duration: 2000,
    });
  }, []);

  return (
    <div className="cmap-page">
      {/* Map container */}
      <div ref={mapContainerRef} className="cmap-map" />

      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="cmap-loading">
          <div className="cmap-loading-spinner" />
          <p>Loading 3D Map...</p>
        </div>
      )}

      {/* Search bar */}
      <div className="cmap-search-container">
        <div className="cmap-search-icon">🔍</div>
        <input
          className="cmap-search"
          placeholder="Search any place in Pakistan..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            searchPlace(e.target.value);
          }}
        />
        {searching && <div className="cmap-search-spinner" />}
        {searchResults.length > 0 && (
          <div className="cmap-search-results">
            {searchResults.map((r, i) => (
              <div key={i} className="cmap-search-item" onClick={() => flyToPlace(r)}>
                <span className="cmap-search-item-icon">📍</span>
                <div className="cmap-search-item-text">
                  <span className="cmap-search-item-name">{r.name}</span>
                  <span className="cmap-search-item-full">{r.fullName}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating action buttons */}
      <div className="cmap-fab-container">
        <button
          className="cmap-fab"
          onClick={toggleTerrain}
          title={terrain3D ? 'Disable 3D' : 'Enable 3D'}
        >
          {terrain3D ? '🗻' : '🗺️'}
        </button>
        <button className="cmap-fab" onClick={resetView} title="Reset view">
          🧭
        </button>
        <button
          className={`cmap-fab cmap-fab-location ${tracking ? 'active' : ''}`}
          onClick={() => {
            if (tracking) {
              stopTracking();
            } else {
              getLocation();
              startTracking();
            }
          }}
          disabled={locating}
          title={tracking ? 'Stop tracking' : 'My location'}
        >
          {locating ? '...' : tracking ? '📡' : '📍'}
        </button>
      </div>

      {/* Legend */}
      <div className="cmap-legend">
        <div className="cmap-legend-item">
          <div className="cmap-legend-dot" style={{ background: '#34C759' }} />
          <span>Public</span>
        </div>
        <div className="cmap-legend-item">
          <div className="cmap-legend-dot" style={{ background: '#AF52DE' }} />
          <span>Private</span>
        </div>
        <div className="cmap-legend-item">
          <div className="cmap-legend-dot" style={{ background: '#FF3B30' }} />
          <span>Seller</span>
        </div>
      </div>

      {/* Bottom sheet */}
      <div className={`cmap-bottom-sheet ${sheetOpen ? 'open' : ''}`}>
        <div className="cmap-sheet-handle" onClick={() => setSheetOpen(!sheetOpen)} />

        {/* Tabs */}
        <div className="cmap-tabs">
          {[
            { key: 'universities', label: '🎓 Universities' },
            { key: 'sellers', label: '🛍️ Sellers' },
            { key: 'all', label: '🌍 All' },
          ].map((t) => (
            <button
              key={t.key}
              className={`cmap-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Directions card */}
        {directions && (
          <div className="cmap-directions-card">
            <div className="cmap-directions-header">
              <span className="cmap-directions-icon">🧭</span>
              <div className="cmap-directions-info">
                <h3>Directions to {directions.dest}</h3>
                <p>
                  {directions.distance} km • {directions.duration} min drive
                </p>
              </div>
              <button className="cmap-directions-close" onClick={clearDirections}>
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Selected item */}
        {selected && (
          <div className="cmap-selected-card">
            <button className="cmap-selected-close" onClick={() => setSelected(null)}>
              ✕
            </button>
            {selected.kind === 'university' ? (
              <>
                <span
                  className="cmap-selected-badge"
                  style={{
                    background: selected.type === 'Private' ? '#F5E6FF' : '#E8FFF0',
                    color: selected.type === 'Private' ? '#7B1FA2' : '#1B5E20',
                  }}
                >
                  {selected.type}
                </span>
                <h3 className="cmap-selected-name">{selected.name}</h3>
                <p className="cmap-selected-info">📍 {selected.city}</p>
                <p className="cmap-selected-info">📚 {selected.programs}</p>
                {userLocation && (
                  <p className="cmap-selected-info">
                    📏 {getDistance(userLocation.lat, userLocation.lng, selected.lat, selected.lng)}{' '}
                    km away
                  </p>
                )}
                <div className="cmap-selected-actions">
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(selected.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cmap-btn secondary"
                  >
                    Google Maps
                  </a>
                  <button
                    className="cmap-btn primary"
                    onClick={() => getDirections(selected)}
                    disabled={directionsLoading || !userLocation}
                  >
                    {directionsLoading
                      ? 'Loading...'
                      : !userLocation
                      ? 'Get location first'
                      : '🧭 Directions'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="cmap-selected-badge" style={{ background: '#FFEBEE', color: '#C62828' }}>
                  Seller
                </span>
                <h3 className="cmap-selected-name">{selected.title}</h3>
                <p className="cmap-selected-info">💰 Rs. {(selected.price || 0).toLocaleString()}</p>
                <p className="cmap-selected-info">📦 {selected.category}</p>
                {userLocation && (
                  <p className="cmap-selected-info">
                    📏 {getDistance(userLocation.lat, userLocation.lng, selected.lat, selected.lng)}{' '}
                    km away
                  </p>
                )}
                <button
                  className="cmap-btn primary"
                  onClick={() => getDirections({ ...selected, name: selected.title })}
                  disabled={directionsLoading || !userLocation}
                >
                  {directionsLoading
                    ? 'Loading...'
                    : !userLocation
                    ? 'Get location first'
                    : '🧭 Directions'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Nearby universities */}
        {nearby.length > 0 && !selected && (
          <div className="cmap-nearby">
            <h4 className="cmap-section-title">📍 Nearby Universities</h4>
            {nearby.map((u, i) => (
              <div
                key={i}
                className="cmap-nearby-item"
                onClick={() => {
                  mapRef.current?.flyTo({
                    center: [u.lng, u.lat],
                    zoom: 14,
                    pitch: 60,
                    duration: 1500,
                  });
                  setSelected({ ...u, kind: 'university' });
                }}
              >
                <div className="cmap-nearby-info">
                  <p className="cmap-nearby-name">{u.name}</p>
                  <p className="cmap-nearby-distance">{u.distance} km away</p>
                </div>
                <button
                  className="cmap-nearby-dir"
                  onClick={(e) => {
                    e.stopPropagation();
                    getDirections(u);
                  }}
                  disabled={directionsLoading}
                >
                  🧭
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Universities list */}
        {activeTab === 'universities' && nearby.length === 0 && !selected && (
          <div className="cmap-list">
            <h4 className="cmap-section-title">All Universities</h4>
            {UNIVERSITIES.map((u, i) => (
              <div
                key={i}
                className="cmap-list-item"
                onClick={() => {
                  mapRef.current?.flyTo({
                    center: [u.lng, u.lat],
                    zoom: 14,
                    pitch: 60,
                    duration: 1500,
                  });
                  setSelected({ ...u, kind: 'university' });
                }}
              >
                <div
                  className="cmap-list-dot"
                  style={{ background: u.type === 'Private' ? '#AF52DE' : '#34C759' }}
                />
                <div className="cmap-list-info">
                  <p className="cmap-list-name">{u.name}</p>
                  <p className="cmap-list-sub">
                    {u.city} • {u.type}
                  </p>
                </div>
                {userLocation && (
                  <button
                    className="cmap-list-dir"
                    onClick={(e) => {
                      e.stopPropagation();
                      getDirections(u);
                    }}
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
    </div>
  );
}
