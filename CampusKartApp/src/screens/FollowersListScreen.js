import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function FollowersListScreen({ navigation, route }) {
  const { userId, type } = route.params; // type: 'followers' or 'following'
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [followingMap, setFollowingMap] = useState({});

  useEffect(() => {
    fetchUsers();
  }, [userId, type]);

  const fetchUsers = async () => {
    try {
      // Get target user
      const userDoc = await getDoc(doc(db, 'users', userId));
      const targetUserData = userDoc.data();

      // Get list of user IDs
      const userIds = type === 'followers' ? targetUserData?.followers || [] : targetUserData?.following || [];

      if (userIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Fetch user details (batch in groups of 10 for Firestore limit)
      const usersData = [];
      const chunks = [];
      for (let i = 0; i < userIds.length; i += 10) {
        chunks.push(userIds.slice(i, i + 10));
      }

      for (const chunk of chunks) {
        // Fetch each user individually to avoid __name__ query issues
        for (const uid of chunk) {
          try {
            const userDocRef = await getDoc(doc(db, 'users', uid));
            if (userDocRef.exists()) {
              usersData.push({ id: userDocRef.id, ...userDocRef.data() });
            }
          } catch (e) {
            console.log('Error fetching user:', uid);
          }
        }
      }

      setUsers(usersData);

      // Check which ones current user is following
      if (user?.uid) {
        const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
        const following = currentUserDoc.data()?.following || [];
        const followMap = {};
        usersData.forEach(u => {
          followMap[u.id] = following.includes(u.id);
        });
        setFollowingMap(followMap);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      setLoading(false);
    }
  };

  const handleFollow = async (targetUserId) => {
    const isFollowing = followingMap[targetUserId];
    
    setFollowingMap(prev => ({ ...prev, [targetUserId]: !isFollowing }));

    try {
      // Update target user's followers
      await updateDoc(doc(db, 'users', targetUserId), {
        followers: isFollowing ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });

      // Update current user's following
      await updateDoc(doc(db, 'users', user.uid), {
        following: isFollowing ? arrayRemove(targetUserId) : arrayUnion(targetUserId),
      });
    } catch (err) {
      console.error('Error following:', err);
      setFollowingMap(prev => ({ ...prev, [targetUserId]: isFollowing }));
    }
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUser = ({ item }) => {
    const isFollowing = followingMap[item.id];
    const isOwnProfile = item.id === user.uid;

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
      >
        <Image
          source={{ uri: item.photoURL || 'https://via.placeholder.com/150' }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.username}>{item.username || item.name}</Text>
            {item.isPremium && (
              <Ionicons name="checkmark-circle" size={14} color="#0095F6" />
            )}
          </View>
          <Text style={styles.name}>{item.name}</Text>
        </View>
        {!isOwnProfile && (
          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.followingBtn]}
            onPress={() => handleFollow(item.id)}
          >
            <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {type === 'followers' ? 'Followers' : 'Following'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Users List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {type === 'followers' ? 'No followers yet' : 'Not following anyone'}
              </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    margin: 16,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
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
  followBtn: {
    backgroundColor: '#0095F6',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  followingBtn: {
    backgroundColor: '#262626',
  },
  followBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  followingBtnText: {
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
});
