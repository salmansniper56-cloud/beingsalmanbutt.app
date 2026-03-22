import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function CommentsModal({ postId, postOwnerId, onClose }) {
  const { user, userData } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    // Simple query without ordering to avoid index requirement
    const q = query(
      collection(db, 'comments'),
      where('postId', '==', postId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Sort client-side
      data.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return aTime - bTime;
      });
      setComments(data);
      setLoading(false);
    }, (err) => {
      console.log('Comments error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleSend = async () => {
    if (!text.trim()) return;

    const commentText = text.trim();
    setText('');
    setSending(true);

    try {
      await addDoc(collection(db, 'comments'), {
        postId,
        postOwnerId,
        userId: user.uid,
        userName: userData?.name || user.displayName || 'User',
        userPhoto: userData?.photoURL || user.photoURL,
        text: commentText,
        likes: [],
        createdAt: serverTimestamp(),
      });

      // Update comments count on post
      await updateDoc(doc(db, 'posts', postId), {
        commentsCount: increment(1),
      });
    } catch (err) {
      console.error('Error posting comment:', err);
      setText(commentText);
    } finally {
      setSending(false);
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const commentTime = timestamp.toDate?.() || new Date(timestamp);
    const diff = now - commentTime.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return `${weeks}w`;
  };

  const handleLikeComment = async (comment) => {
    const liked = comment.likes?.includes(user.uid);
    try {
      await updateDoc(doc(db, 'comments', comment.id), {
        likes: liked
          ? comment.likes.filter((id) => id !== user.uid)
          : [...(comment.likes || []), user.uid],
      });
    } catch (err) {
      console.error('Error liking comment:', err);
    }
  };

  const renderComment = ({ item }) => (
    <View style={styles.comment}>
      <Image
        source={{ uri: item.userPhoto || 'https://via.placeholder.com/150' }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <Text style={styles.commentText}>
          <Text style={styles.commentUser}>{item.userName}</Text>{' '}
          {item.text}
        </Text>
        <View style={styles.commentMeta}>
          <Text style={styles.commentTime}>{getTimeAgo(item.createdAt)}</Text>
          {item.likes?.length > 0 && (
            <Text style={styles.commentLikes}>
              {item.likes.length} {item.likes.length === 1 ? 'like' : 'likes'}
            </Text>
          )}
          <TouchableOpacity>
            <Text style={styles.commentReply}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.commentLikeBtn} onPress={() => handleLikeComment(item)}>
        <Ionicons
          name={item.likes?.includes(user?.uid) ? 'heart' : 'heart-outline'}
          size={14}
          color={item.likes?.includes(user?.uid) ? '#ED4956' : '#888'}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.dragHandle} />
        <Text style={styles.headerTitle}>Comments</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Comments List */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No comments yet</Text>
              <Text style={styles.emptyText}>Start the conversation.</Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <Image
          source={{ uri: userData?.photoURL || user?.photoURL || 'https://via.placeholder.com/150' }}
          style={styles.inputAvatar}
        />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Add a comment..."
          placeholderTextColor="#888"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim() || sending}
          style={styles.sendBtn}
        >
          <Text style={[styles.sendText, !text.trim() && styles.sendTextDisabled]}>
            {sending ? '...' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    marginBottom: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    top: 20,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 12,
  },
  comment: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
  },
  commentUser: {
    fontWeight: '600',
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  commentTime: {
    color: '#888',
    fontSize: 12,
  },
  commentLikes: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  commentReply: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  commentLikeBtn: {
    padding: 8,
    marginLeft: 8,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#262626',
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    maxHeight: 80,
  },
  sendBtn: {
    paddingLeft: 12,
  },
  sendText: {
    color: '#0095F6',
    fontSize: 14,
    fontWeight: '600',
  },
  sendTextDisabled: {
    opacity: 0.3,
  },
});
