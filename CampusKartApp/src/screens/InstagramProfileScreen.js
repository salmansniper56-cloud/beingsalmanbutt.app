import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const GRID_SIZE = width / 3;

export default function InstagramProfileScreen({ navigation, route }) {
  const { user, userData, signOut } = useAuth();
  const viewUserId = route?.params?.userId || user?.uid;
  const isOwnProfile = viewUserId === user?.uid;

  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });

  useEffect(() => {
    fetchProfileData();
  }, [viewUserId]);

  const fetchProfileData = async () => {
    try {
      // Get user data
      const userDoc = await getDoc(doc(db, 'users', viewUserId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfileData(data);
        setIsFollowing(data.followers?.includes(user?.uid));
        setStats({
          posts: data.postsCount || 0,
          followers: data.followers?.length || 0,
          following: data.following?.length || 0,
        });
      }

      // Get user posts - simple query without orderBy to avoid index
      const postsQuery = query(
        collection(db, 'posts'),
        where('userId', '==', viewUserId)
      );
      const postsSnap = await getDocs(postsQuery);
      const postsData = postsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort client-side
      postsData.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
      setPosts(postsData);
      setStats(prev => ({ ...prev, posts: postsData.length }));

      // Get saved posts (only for own profile)
      if (isOwnProfile && user?.uid) {
        try {
          const savedQuery = query(
            collection(db, 'posts'),
            where('savedBy', 'array-contains', user.uid)
          );
          const savedSnap = await getDocs(savedQuery);
          setSavedPosts(savedSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.log('Saved posts query needs index');
        }
      }

      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      const newFollowing = !isFollowing;
      setIsFollowing(newFollowing);
      setStats(prev => ({
        ...prev,
        followers: newFollowing ? prev.followers + 1 : prev.followers - 1,
      }));

      // Update target user's followers
      await updateDoc(doc(db, 'users', viewUserId), {
        followers: newFollowing ? arrayUnion(user.uid) : arrayRemove(user.uid),
      });

      // Update current user's following
      await updateDoc(doc(db, 'users', user.uid), {
        following: newFollowing ? arrayUnion(viewUserId) : arrayRemove(viewUserId),
      });
    } catch (err) {
      console.error('Error following:', err);
      setIsFollowing(!isFollowing);
    }
  };

  const renderGridItem = ({ item }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.gridImage} />
      {item.images?.length > 1 && (
        <View style={styles.multipleIndicator}>
          <Ionicons name="copy" size={16} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  const displayData = isOwnProfile ? userData : profileData;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => !isOwnProfile && navigation.goBack()}>
          {!isOwnProfile && <Ionicons name="arrow-back" size={24} color="#fff" />}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{displayData?.username || displayData?.name || 'Profile'}</Text>
        <View style={styles.headerActions}>
          {isOwnProfile ? (
            <>
              <TouchableOpacity onPress={() => navigation.navigate('CreatePost')}>
                <Ionicons name="add-circle-outline" size={26} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={{ marginLeft: 16 }} onPress={() => navigation.navigate('Settings')}>
                <Ionicons name="menu-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity>
              <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfileData(); }} tintColor="#fff" />
        }
      >
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: displayData?.photoURL || 'https://via.placeholder.com/150' }}
                style={styles.avatar}
              />
              {displayData?.isPremium && (
                <View style={styles.premiumBadge}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                </View>
              )}
            </View>
            <View style={styles.statsContainer}>
              <TouchableOpacity style={styles.stat}>
                <Text style={styles.statNumber}>{stats.posts}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stat} onPress={() => navigation.navigate('FollowersList', { userId: viewUserId, type: 'followers' })}>
                <Text style={styles.statNumber}>{stats.followers}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.stat} onPress={() => navigation.navigate('FollowersList', { userId: viewUserId, type: 'following' })}>
                <Text style={styles.statNumber}>{stats.following}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bioSection}>
            <Text style={styles.displayName}>{displayData?.name || 'User'}</Text>
            {displayData?.bio && <Text style={styles.bio}>{displayData.bio}</Text>}
            {displayData?.website && (
              <TouchableOpacity>
                <Text style={styles.website}>{displayData.website}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {isOwnProfile ? (
              <>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('EditProfile')}
                >
                  <Text style={styles.actionBtnText}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('Settings')}
                >
                  <Text style={styles.actionBtnText}>Share Profile</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, isFollowing ? styles.followingBtn : styles.followBtn]}
                  onPress={handleFollow}
                >
                  <Text style={[styles.actionBtnText, isFollowing ? {} : styles.followBtnText]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('ChatThread', { recipientId: viewUserId })}
                >
                  <Text style={styles.actionBtnText}>Message</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Highlights */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.highlightsContainer}>
          {isOwnProfile && (
            <TouchableOpacity style={styles.highlight}>
              <View style={styles.highlightAdd}>
                <Ionicons name="add" size={24} color="#fff" />
              </View>
              <Text style={styles.highlightText}>New</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => setActiveTab('posts')}
          >
            <Ionicons name="grid-outline" size={24} color={activeTab === 'posts' ? '#fff' : '#888'} />
          </TouchableOpacity>
          {isOwnProfile && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
              onPress={() => setActiveTab('saved')}
            >
              <Ionicons name="bookmark-outline" size={24} color={activeTab === 'saved' ? '#fff' : '#888'} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.tab, activeTab === 'tagged' && styles.activeTab]}
            onPress={() => setActiveTab('tagged')}
          >
            <Ionicons name="person-outline" size={24} color={activeTab === 'tagged' ? '#fff' : '#888'} />
          </TouchableOpacity>
        </View>

        {/* Posts Grid */}
        <FlatList
          data={activeTab === 'posts' ? posts : activeTab === 'saved' ? savedPosts : []}
          keyExtractor={(item) => item.id}
          renderItem={renderGridItem}
          numColumns={3}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyGrid}>
              <Ionicons name={activeTab === 'saved' ? 'bookmark-outline' : 'camera-outline'} size={60} color="#888" />
              <Text style={styles.emptyText}>
                {activeTab === 'saved' ? 'No saved posts yet' : 'No posts yet'}
              </Text>
            </View>
          }
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#000',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  premiumBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  bioSection: {
    marginTop: 12,
  },
  displayName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bio: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
    lineHeight: 18,
  },
  website: {
    color: '#E0F1FF',
    fontSize: 14,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#262626',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  followBtn: {
    backgroundColor: '#0095F6',
  },
  followBtnText: {
    color: '#fff',
  },
  followingBtn: {
    backgroundColor: '#262626',
  },
  highlightsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  highlight: {
    alignItems: 'center',
    marginRight: 16,
  },
  highlightAdd: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#363636',
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#262626',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderTopWidth: 1,
    borderTopColor: '#fff',
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    padding: 1,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  multipleIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  emptyGrid: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
  },
});
