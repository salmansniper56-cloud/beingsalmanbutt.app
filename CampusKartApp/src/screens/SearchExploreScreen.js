import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const GRID_SIZE = (width - 4) / 3;

export default function SearchExploreScreen({ navigation }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('accounts');
  const [posts, setPosts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch posts
      const postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const postsSnapshot = await getDocs(postsQuery);
      const postsData = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData);

      // Fetch users for search
      const usersQuery = query(
        collection(db, 'users'),
        limit(100)
      );
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(usersData);

      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setLoading(false);
    }
  };

  const handleSearch = useCallback((text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = text.toLowerCase();
    const filteredUsers = allUsers.filter(u => 
      u.name?.toLowerCase().includes(lowerQuery) ||
      u.username?.toLowerCase().includes(lowerQuery) ||
      u.email?.toLowerCase().includes(lowerQuery)
    );

    setSearchResults(filteredUsers);
  }, [allUsers]);

  const renderGridItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.gridImage} />
      {item.images?.length > 1 && (
        <View style={styles.multipleIndicator}>
          <Ionicons name="copy" size={14} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
    >
      <Image
        source={{ uri: item.photoURL || 'https://via.placeholder.com/150' }}
        style={styles.userAvatar}
      />
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.username}>{item.username || item.name || 'User'}</Text>
          {item.isPremium && (
            <Ionicons name="checkmark-circle" size={14} color="#0095F6" />
          )}
        </View>
        <Text style={styles.name}>{item.name || item.email}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
              <Ionicons name="close-circle" size={18} color="#888" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Search Results */}
      {searchQuery ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          ListEmptyComponent={
            <View style={styles.emptySearch}>
              <Text style={styles.emptyText}>No users found</Text>
            </View>
          }
        />
      ) : (
        /* Explore Grid */
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderGridItem}
          numColumns={3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              tintColor="#fff"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="camera-outline" size={60} color="#888" />
              <Text style={styles.emptyTitle}>No Posts Yet</Text>
              <Text style={styles.emptyText}>Posts from users will appear here</Text>
            </View>
          }
        />
      )}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#000',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    paddingVertical: 10,
    marginLeft: 8,
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    padding: 1,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
  },
  multipleIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#262626',
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  username: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  name: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySearch: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
  },
});
