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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getPosts, togglePostLike, isPostLiked, getUser } from '../lib/firestore';

const { width } = Dimensions.get('window');

export default function FeedScreen({ navigation }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState({});
  const [userCache, setUserCache] = useState({});

  const loadPosts = useCallback(async () => {
    try {
      const { posts: list } = await getPosts({ limitCount: 50 });
      setPosts(list);
      
      // Load liked status
      if (user?.uid) {
        const likedMap = {};
        await Promise.all(
          list.slice(0, 20).map(async (p) => {
            likedMap[p.id] = await isPostLiked(p.id, user.uid);
          })
        );
        setLikedPosts(likedMap);
      }

      // Load user info for posts
      const userIds = [...new Set(list.map(p => p.createdBy).filter(Boolean))];
      const users = {};
      await Promise.all(
        userIds.slice(0, 20).map(async (uid) => {
          const userData = await getUser(uid);
          if (userData) users[uid] = userData;
        })
      );
      setUserCache(users);
    } catch (err) {
      console.error('Failed to load posts:', err);
    }
  }, [user?.uid]);

  useEffect(() => {
    setLoading(true);
    loadPosts().finally(() => setLoading(false));
  }, [loadPosts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const handleLike = async (postId) => {
    if (!user?.uid) return;
    const wasLiked = likedPosts[postId];
    
    // Optimistic update
    setLikedPosts(prev => ({ ...prev, [postId]: !wasLiked }));
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, likeCount: (p.likeCount ?? 0) + (wasLiked ? -1 : 1) }
          : p
      )
    );

    try {
      await togglePostLike(postId, user.uid);
    } catch (err) {
      // Revert on error
      setLikedPosts(prev => ({ ...prev, [postId]: wasLiked }));
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, likeCount: (p.likeCount ?? 0) + (wasLiked ? 1 : -1) }
            : p
        )
      );
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const renderPost = ({ item }) => {
    const postUser = userCache[item.createdBy] || {};
    const isLiked = likedPosts[item.id];

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Image
            source={{ uri: postUser.photoURL || 'https://via.placeholder.com/40' }}
            style={styles.avatar}
          />
          <View style={styles.postHeaderText}>
            <Text style={styles.userName}>{postUser.displayName || 'User'}</Text>
            <Text style={styles.postTime}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>

        {item.caption && <Text style={styles.caption}>{item.caption}</Text>}

        {item.mediaUrls?.[0] && (
          <Image
            source={{ uri: item.mediaUrls[0] }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item.id)}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={isLiked ? '#ef4444' : '#888'}
            />
            <Text style={styles.actionText}>{item.likeCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Comments', { postId: item.id })}
          >
            <Ionicons name="chatbubble-outline" size={22} color="#888" />
            <Text style={styles.actionText}>{item.commentCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="share-outline" size={22} color="#888" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
        <Text style={styles.headerTitle}>CampusKart</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreatePost')}>
          <Ionicons name="add-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📷</Text>
            <Text style={styles.emptyText}>No posts yet</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CreatePost')}
            >
              <Text style={styles.emptyButtonText}>Create a post</Text>
            </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  list: {
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: '#2d2d44',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3d3d5c',
  },
  postHeaderText: {
    marginLeft: 12,
  },
  userName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  postTime: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  caption: {
    color: '#fff',
    paddingHorizontal: 12,
    paddingBottom: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  postImage: {
    width: '100%',
    height: width - 32,
    backgroundColor: '#3d3d5c',
  },
  postActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: '#888',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
