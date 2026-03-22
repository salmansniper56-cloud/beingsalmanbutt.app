import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Linking,
  Platform,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const { width, height } = Dimensions.get('window');

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

// Category icons helper
const getCategoryIcon = (category) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('restaurant') || cat.includes('food') || cat.includes('cafe') || cat.includes('coffee')) return '🍽️';
  if (cat.includes('hospital') || cat.includes('clinic') || cat.includes('medical') || cat.includes('pharmacy')) return '🏥';
  if (cat.includes('hotel') || cat.includes('lodging')) return '🏨';
  if (cat.includes('school') || cat.includes('college') || cat.includes('university') || cat.includes('education')) return '🎓';
  if (cat.includes('bank') || cat.includes('atm')) return '🏦';
  if (cat.includes('shop') || cat.includes('store') || cat.includes('mall') || cat.includes('market')) return '🛒';
  if (cat.includes('gas') || cat.includes('fuel') || cat.includes('petrol')) return '⛽';
  if (cat.includes('mosque') || cat.includes('religious')) return '🕌';
  if (cat.includes('park') || cat.includes('garden')) return '🌳';
  if (cat.includes('gym') || cat.includes('fitness') || cat.includes('sport')) return '🏋️';
  if (cat.includes('airport') || cat.includes('bus') || cat.includes('transit') || cat.includes('station')) return '🚏';
  if (cat.includes('place') || cat.includes('city') || cat.includes('locality')) return '🏙️';
  return '📍';
};

export default function MapScreen() {
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [selected, setSelected] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [directions, setDirections] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [mapType, setMapType] = useState('standard');

  // Get user location
  const getLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location services');
        setLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const coords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      setUserLocation(coords);

      mapRef.current?.animateToRegion({
        latitude: coords.lat,
        longitude: coords.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    } catch (err) {
      Alert.alert('Error', 'Could not get location');
    } finally {
      setLocating(false);
    }
  };

  // Fetch sellers
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

  // Search handler - includes universities, sellers, and places
  const handleSearch = useCallback(async (query) => {
    setSearch(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const lower = query.toLowerCase();
    
    // Search universities
    const uniResults = UNIVERSITIES.filter(
      (u) => u.name.toLowerCase().includes(lower) || u.city.toLowerCase().includes(lower)
    ).map((u) => ({ ...u, kind: 'university', icon: '🎓' }));

    // Search sellers
    const sellerResults = sellers
      .filter((s) => s.title?.toLowerCase().includes(lower))
      .map((s) => ({ ...s, kind: 'seller', icon: '🛍️', name: s.title }));

    // Search places via Nominatim (OpenStreetMap) - free alternative
    let placeResults = [];
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=pk&limit=5`,
        { headers: { 'User-Agent': 'CampusKartApp/1.0' } }
      );
      const data = await res.json();
      placeResults = data.map((p) => ({
        name: p.display_name.split(',')[0],
        fullName: p.display_name,
        lat: parseFloat(p.lat),
        lng: parseFloat(p.lon),
        kind: 'place',
        category: p.type,
        icon: getCategoryIcon(p.type),
      }));
    } catch (err) {
      console.error('Place search error:', err);
    }

    setSearchResults([...uniResults, ...sellerResults, ...placeResults]);
  }, [sellers]);

  // Select search result
  const selectResult = (item) => {
    setSearch(item.name);
    setSearchResults([]);
    setSearchFocused(false);
    setSelected(item);

    mapRef.current?.animateToRegion({
      latitude: item.lat,
      longitude: item.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 1000);
  };

  // Calculate distance using Haversine formula
  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
  };

  // Get directions using OSRM
  const getDirections = async (dest) => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Get your location first!');
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
        const coords = route.geometry.coordinates.map(([lng, lat]) => ({
          latitude: lat,
          longitude: lng,
        }));
        setRouteCoords(coords);
        setDirections({
          distance: (route.distance / 1000).toFixed(1),
          duration: Math.round(route.duration / 60),
          dest: dest.name || dest.title,
        });

        // Fit map to show entire route
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
          animated: true,
        });
      }
    } catch (err) {
      console.error('Directions error:', err);
      Alert.alert('Error', 'Could not get directions');
    } finally {
      setDirectionsLoading(false);
    }
  };

  // Clear directions
  const clearDirections = () => {
    setRouteCoords([]);
    setDirections(null);
    setSelected(null);
  };

  // Open in external maps app
  const openInMaps = (dest) => {
    const url = Platform.select({
      ios: `maps:0,0?daddr=${dest.lat},${dest.lng}`,
      android: `google.navigation:q=${dest.lat},${dest.lng}`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`);
    });
  };

  // Toggle map type
  const toggleMapType = () => {
    setMapType(prev => prev === 'standard' ? 'satellite' : 'standard');
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        initialRegion={{
          latitude: 30.3753,
          longitude: 69.3451,
          latitudeDelta: 10,
          longitudeDelta: 10,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* University markers */}
        {UNIVERSITIES.map((uni, idx) => (
          <Marker
            key={`uni-${idx}`}
            coordinate={{ latitude: uni.lat, longitude: uni.lng }}
            onPress={() => setSelected({ ...uni, kind: 'university' })}
          >
            <View style={[styles.marker, { backgroundColor: uni.type === 'Private' ? '#AF52DE' : '#34C759' }]}>
              <Text style={styles.markerEmoji}>🎓</Text>
            </View>
          </Marker>
        ))}

        {/* Seller markers */}
        {sellers.map((ad) => (
          <Marker
            key={`ad-${ad.id}`}
            coordinate={{ latitude: ad.lat, longitude: ad.lng }}
            onPress={() => setSelected({ ...ad, kind: 'seller', name: ad.title })}
          >
            <View style={[styles.marker, { backgroundColor: '#FF3B30' }]}>
              <Text style={styles.markerEmoji}>🛍️</Text>
            </View>
          </Marker>
        ))}

        {/* Route polyline */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#4285F4"
            strokeWidth={5}
          />
        )}
      </MapView>

      {/* Search Box */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search any place, university, seller..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={handleSearch}
          onFocus={() => setSearchFocused(true)}
        />
        {search ? (
          <TouchableOpacity onPress={() => { setSearch(''); setSearchResults([]); }}>
            <Ionicons name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Search Results */}
      {searchFocused && searchResults.length > 0 && (
        <View style={styles.searchResults}>
          <FlatList
            data={searchResults}
            keyExtractor={(item, idx) => `${item.name}-${idx}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.searchResult} onPress={() => selectResult(item)}>
                <Text style={styles.resultIcon}>{item.icon}</Text>
                <View style={styles.resultText}>
                  <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.resultSub} numberOfLines={1}>
                    {item.fullName || item.city || item.category}
                  </Text>
                </View>
                {userLocation && (
                  <Text style={styles.resultDist}>
                    {getDistance(userLocation.lat, userLocation.lng, item.lat, item.lng)} km
                  </Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Close search overlay */}
      {searchFocused && (
        <TouchableOpacity style={styles.overlay} onPress={() => setSearchFocused(false)} />
      )}

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.controlBtn} onPress={toggleMapType}>
          <Ionicons name={mapType === 'standard' ? 'satellite-outline' : 'map-outline'} size={22} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlBtn, styles.locationBtn]} onPress={getLocation} disabled={locating}>
          {locating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="navigate" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Directions Card */}
      {directions && (
        <View style={styles.directionsCard}>
          <View style={styles.dirInfo}>
            <Text style={styles.dirIcon}>🚗</Text>
            <View>
              <Text style={styles.dirDest} numberOfLines={1}>{directions.dest}</Text>
              <Text style={styles.dirStats}>{directions.distance} km • {directions.duration} min</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.dirClose} onPress={clearDirections}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Selected Place Card */}
      {selected && !directions && (
        <View style={styles.placeCard}>
          <TouchableOpacity style={styles.cardClose} onPress={() => setSelected(null)}>
            <Ionicons name="close" size={20} color="#888" />
          </TouchableOpacity>

          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>
              {selected.kind === 'university' ? '🎓' : selected.kind === 'seller' ? '🛍️' : '📍'}
            </Text>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>{selected.name}</Text>
              <Text style={styles.cardSubtitle}>
                {selected.kind === 'university'
                  ? `${selected.type} • ${selected.city}`
                  : selected.kind === 'seller'
                  ? `Rs. ${(selected.price || 0).toLocaleString()} • ${selected.category}`
                  : selected.fullName}
              </Text>
            </View>
          </View>

          {selected.programs && (
            <Text style={styles.cardPrograms}>📚 {selected.programs}</Text>
          )}

          {userLocation && (
            <Text style={styles.cardDistance}>
              📏 {getDistance(userLocation.lat, userLocation.lng, selected.lat, selected.lng)} km away
            </Text>
          )}

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={() => getDirections(selected)}
              disabled={directionsLoading}
            >
              {directionsLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="navigate" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Directions</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => openInMaps(selected)}
            >
              <Ionicons name="open-outline" size={18} color="#6366f1" />
              <Text style={[styles.actionBtnText, { color: '#6366f1' }]}>Open in Maps</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  searchBox: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 100,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#202124',
  },
  searchResults: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: 300,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 100,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#202124',
  },
  resultSub: {
    fontSize: 12,
    color: '#5f6368',
    marginTop: 2,
  },
  resultDist: {
    fontSize: 12,
    color: '#1a73e8',
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 200,
    gap: 8,
  },
  controlBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  locationBtn: {
    backgroundColor: '#6366f1',
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  markerEmoji: {
    fontSize: 18,
  },
  directionsCard: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#4285F4',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
  },
  dirInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dirIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  dirDest: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dirStats: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 2,
  },
  dirClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeCard: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#5f6368',
    marginTop: 2,
  },
  cardPrograms: {
    fontSize: 14,
    color: '#5f6368',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  cardDistance: {
    fontSize: 14,
    color: '#1a73e8',
    fontWeight: '500',
    marginTop: 8,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f3f4',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnPrimary: {
    backgroundColor: '#6366f1',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
