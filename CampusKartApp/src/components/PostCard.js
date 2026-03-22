import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function PostCard({ post, onComment, onShare, onProfile, onOptions }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.likes?.includes(user?.uid));
  const [saved, setSaved] = useState(post.savedBy?.includes(user?.uid));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartAnim = useRef(new Animated.Value(0)).current;

  const handleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((prev) => (newLiked ? prev + 1 : prev - 1));

    // Animate
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();

    try {
      await updateDoc(doc(db, 'posts', post.id), {
        likes: newLiked ? arrayUnion(user.uid) : arrayRemove(user.uid),
      });
    } catch (err) {
      console.error('Error liking post:', err);
      setLiked(!newLiked);
      setLikesCount((prev) => (newLiked ? prev - 1 : prev + 1));
    }
  };

  const handleDoubleTap = useCallback(() => {
    if (!liked) {
      handleLike();
    }
    // Show heart animation
    Animated.sequence([
      Animated.timing(heartAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(500),
      Animated.timing(heartAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [liked]);

  const handleSave = async () => {
    const newSaved = !saved;
    setSaved(newSaved);

    try {
      await updateDoc(doc(db, 'posts', post.id), {
        savedBy: newSaved ? arrayUnion(user.uid) : arrayRemove(user.uid),
      });
    } catch (err) {
      console.error('Error saving post:', err);
      setSaved(!newSaved);
    }
  };

  const lastTap = useRef(0);
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      handleDoubleTap();
    }
    lastTap.current = now;
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const postTime = timestamp.toDate?.() || new Date(timestamp);
    const diff = now - postTime.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return `${weeks}w`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.userInfo} onPress={() => onProfile?.(post.userId)}>
          <Image
            source={{ uri: post.userPhoto || 'https://via.placeholder.com/150' }}
            style={styles.avatar}
          />
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{post.userName}</Text>
              {post.isPremium && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#0095F6" />
                </View>
              )}
            </View>
            {post.location && <Text style={styles.location}>{post.location}</Text>}
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={onOptions}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Image */}
      <TouchableOpacity activeOpacity={1} onPress={handleTap}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: post.imageUrl }} style={styles.image} resizeMode="cover" />
          
          {/* Double tap heart animation */}
          <Animated.View
            style={[
              styles.doubleTapHeart,
              {
                opacity: heartAnim,
                transform: [
                  {
                    scale: heartAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 1.2, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="heart" size={100} color="#fff" />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.leftActions}>
          <TouchableOpacity onPress={handleLike}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={28}
                color={liked ? '#ED4956' : '#fff'}
              />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity onPress={onComment}>
            <Ionicons name="chatbubble-outline" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onShare}>
            <Ionicons name="paper-plane-outline" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleSave}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Likes */}
      {likesCount > 0 && (
        <Text style={styles.likes}>
          {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
        </Text>
      )}

      {/* Caption */}
      {post.caption && (
        <View style={styles.captionContainer}>
          <Text style={styles.caption}>
            <Text style={styles.captionUser}>{post.userName}</Text>{' '}
            {post.caption}
          </Text>
        </View>
      )}

      {/* View Comments */}
      {post.commentsCount > 0 && (
        <TouchableOpacity onPress={onComment}>
          <Text style={styles.viewComments}>
            View all {post.commentsCount} comments
          </Text>
        </TouchableOpacity>
      )}

      {/* Timestamp */}
      <Text style={styles.timestamp}>{getTimeAgo(post.createdAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  verifiedBadge: {
    marginLeft: 4,
  },
  location: {
    color: '#888',
    fontSize: 12,
    marginTop: 1,
  },
  imageContainer: {
    width: width,
    aspectRatio: 1,
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  doubleTapHeart: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -50,
    marginLeft: -50,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  likes: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
  },
  captionContainer: {
    paddingHorizontal: 12,
    marginTop: 6,
  },
  caption: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
  },
  captionUser: {
    fontWeight: '600',
  },
  viewComments: {
    color: '#888',
    fontSize: 14,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  timestamp: {
    color: '#888',
    fontSize: 11,
    paddingHorizontal: 12,
    marginTop: 6,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
});
