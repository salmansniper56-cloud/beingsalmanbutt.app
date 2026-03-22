import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getUser, getPostsByUser, getAdsByUser } from '../lib/firestore';

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');

  const loadProfile = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const [userData, userPosts, userAds] = await Promise.all([
        getUser(user.uid),
        getPostsByUser(user.uid),
        getAdsByUser(user.uid),
      ]);
      setProfile(userData);
      setPosts(userPosts);
      setAds(userAds);
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  }, [user?.uid]);

  useEffect(() => {
    setLoading(true);
    loadProfile().finally(() => setLoading(false));
  }, [loadProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.settingsBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.profileSection}>
        <Image
          source={{ uri: profile?.photoURL || user?.photoURL || 'https://via.placeholder.com/100' }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{profile?.displayName || user?.displayName || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{posts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{ads.length}</Text>
            <Text style={styles.statLabel}>Listings</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile?.followerCount || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')}>
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Ionicons name="grid-outline" size={22} color={activeTab === 'posts' ? '#6366f1' : '#888'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ads' && styles.tabActive]}
          onPress={() => setActiveTab('ads')}
        >
          <Ionicons name="pricetag-outline" size={22} color={activeTab === 'ads' ? '#6366f1' : '#888'} />
        </TouchableOpacity>
      </View>

      {activeTab === 'posts' ? (
        <View style={styles.gridContainer}>
          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {posts.map((post) => (
                <TouchableOpacity key={post.id} style={styles.gridItem}>
                  <Image
                    source={{ uri: post.mediaUrls?.[0] || 'https://via.placeholder.com/120' }}
                    style={styles.gridImage}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.adsContainer}>
          {ads.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No listings yet</Text>
            </View>
          ) : (
            ads.map((ad) => (
              <TouchableOpacity
                key={ad.id}
                style={styles.adItem}
                onPress={() => navigation.navigate('AdDetail', { adId: ad.id })}
              >
                <Image
                  source={{ uri: ad.images?.[0] || 'https://via.placeholder.com/80' }}
                  style={styles.adImage}
                />
                <View style={styles.adInfo}>
                  <Text style={styles.adTitle} numberOfLines={1}>{ad.title}</Text>
                  <Text style={styles.adPrice}>Rs. {(ad.price || 0).toLocaleString()}</Text>
                  <Text style={styles.adCategory}>{ad.category}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
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
    paddingTop: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  settingsBtn: {
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3d3d5c',
    borderWidth: 3,
    borderColor: '#6366f1',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  email: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 40,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  editBtn: {
    backgroundColor: '#2d2d44',
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 24,
  },
  editBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2d2d44',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
  },
  gridContainer: {
    minHeight: 200,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 1,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2d2d44',
  },
  adsContainer: {
    padding: 16,
  },
  adItem: {
    flexDirection: 'row',
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  adImage: {
    width: 80,
    height: 80,
    backgroundColor: '#3d3d5c',
  },
  adInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  adTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  adPrice: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  adCategory: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
  bottomPadding: {
    height: 100,
  },
});
