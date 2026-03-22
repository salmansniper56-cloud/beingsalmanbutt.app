import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getMarketplaceAds, getFeaturedAds, toggleLike, isLiked } from '../lib/firestore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const CATEGORIES = [
  { id: '', name: 'All', icon: '🏷️' },
  { id: 'books', name: 'Books', icon: '📚' },
  { id: 'electronics', name: 'Electronics', icon: '📱' },
  { id: 'clothing', name: 'Clothing', icon: '👕' },
  { id: 'services', name: 'Services', icon: '💼' },
  { id: 'other', name: 'Other', icon: '📦' },
];

export default function MarketplaceScreen({ navigation }) {
  const { user } = useAuth();
  const [ads, setAds] = useState([]);
  const [featuredAds, setFeaturedAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [likedAds, setLikedAds] = useState({});

  const loadAds = useCallback(async () => {
    try {
      const [{ ads: list }, featured] = await Promise.all([
        getMarketplaceAds({ limitCount: 50, category: category || null }),
        getFeaturedAds(5),
      ]);
      setAds(list);
      setFeaturedAds(featured);

      if (user?.uid) {
        const likedMap = {};
        await Promise.all(
          list.slice(0, 20).map(async (ad) => {
            likedMap[ad.id] = await isLiked(ad.id, user.uid);
          })
        );
        setLikedAds(likedMap);
      }
    } catch (err) {
      console.error('Failed to load ads:', err);
    }
  }, [category, user?.uid]);

  useEffect(() => {
    setLoading(true);
    loadAds().finally(() => setLoading(false));
  }, [loadAds]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAds();
    setRefreshing(false);
  };

  const handleLike = async (adId) => {
    if (!user?.uid) return;
    const wasLiked = likedAds[adId];
    setLikedAds(prev => ({ ...prev, [adId]: !wasLiked }));
    setAds(prev =>
      prev.map(a =>
        a.id === adId ? { ...a, likeCount: (a.likeCount ?? 0) + (wasLiked ? -1 : 1) } : a
      )
    );
    try {
      await toggleLike(adId, user.uid);
    } catch (err) {
      setLikedAds(prev => ({ ...prev, [adId]: wasLiked }));
    }
  };

  const filteredAds = ads.filter(ad =>
    !search || ad.title?.toLowerCase().includes(search.toLowerCase())
  );

  const renderAdCard = ({ item }) => (
    <TouchableOpacity
      style={styles.adCard}
      onPress={() => navigation.navigate('AdDetail', { adId: item.id })}
    >
      <Image
        source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }}
        style={styles.adImage}
      />
      <View style={styles.adInfo}>
        <Text style={styles.adTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.adPrice}>Rs. {(item.price || 0).toLocaleString()}</Text>
        <View style={styles.adMeta}>
          <Text style={styles.adCategory}>{item.category}</Text>
          <TouchableOpacity onPress={() => handleLike(item.id)}>
            <Ionicons
              name={likedAds[item.id] ? 'heart' : 'heart-outline'}
              size={18}
              color={likedAds[item.id] ? '#ef4444' : '#888'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFeaturedAd = ({ item }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => navigation.navigate('AdDetail', { adId: item.id })}
    >
      <Image
        source={{ uri: item.images?.[0] || 'https://via.placeholder.com/200' }}
        style={styles.featuredImage}
      />
      <View style={styles.featuredOverlay}>
        <Text style={styles.featuredBadge}>⭐ Featured</Text>
        <Text style={styles.featuredTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.featuredPrice}>Rs. {(item.price || 0).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateAd')}>
          <Ionicons name="add-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Categories */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryChip, category === item.id && styles.categoryChipActive]}
            onPress={() => setCategory(item.id)}
          >
            <Text style={styles.categoryIcon}>{item.icon}</Text>
            <Text style={[styles.categoryText, category === item.id && styles.categoryTextActive]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={filteredAds}
        renderItem={renderAdCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.adsList}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
        ListHeaderComponent={
          featuredAds.length > 0 ? (
            <View>
              <Text style={styles.sectionTitle}>Featured</Text>
              <FlatList
                horizontal
                data={featuredAds}
                renderItem={renderFeaturedAd}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredList}
              />
              <Text style={styles.sectionTitle}>All Items</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏷️</Text>
            <Text style={styles.emptyText}>No items found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#1a1a2e',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    color: '#fff',
    fontSize: 16,
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#6366f1',
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    color: '#888',
    fontSize: 14,
  },
  categoryTextActive: {
    color: '#fff',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  featuredList: {
    paddingHorizontal: 16,
  },
  featuredCard: {
    width: 220,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3d3d5c',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  featuredBadge: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  featuredTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  featuredPrice: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  adsList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
  },
  adCard: {
    width: CARD_WIDTH,
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  adImage: {
    width: '100%',
    height: CARD_WIDTH,
    backgroundColor: '#3d3d5c',
  },
  adInfo: {
    padding: 10,
  },
  adTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  adPrice: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  adMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adCategory: {
    color: '#888',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
});
