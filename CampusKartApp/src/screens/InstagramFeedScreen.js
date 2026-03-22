import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import StoryBar from '../components/StoryBar';
import StoryViewer from '../components/StoryViewer';
import PostCard from '../components/PostCard';
import CommentsModal from '../components/CommentsModal';

const { height } = Dimensions.get('window');

export default function FeedScreen({ navigation }) {
  const { user, userData } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewingStory, setViewingStory] = useState(null);
  const [allStories, setAllStories] = useState([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [commentsModal, setCommentsModal] = useState(null);

  // Fetch posts
  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(data);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

  const handleAddStory = () => {
    navigation.navigate('CreateStory');
  };

  const handleViewStory = (storyGroup, allStoriesData) => {
    if (allStoriesData) {
      setAllStories(allStoriesData);
      const index = allStoriesData.findIndex(s => s.userId === storyGroup.userId);
      setCurrentStoryIndex(index >= 0 ? index : 0);
    }
    setViewingStory(storyGroup);
  };

  const handleNextStoryGroup = () => {
    if (currentStoryIndex < allStories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setViewingStory(allStories[currentStoryIndex + 1]);
    } else {
      setViewingStory(null);
    }
  };

  const handlePreviousStoryGroup = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setViewingStory(allStories[currentStoryIndex - 1]);
    }
  };

  const handleComment = (post) => {
    setCommentsModal(post);
  };

  const handleShare = (post) => {
    // Share functionality
  };

  const handleProfile = (userId) => {
    navigation.navigate('UserProfile', { userId });
  };

  const renderPost = ({ item }) => (
    <PostCard
      post={item}
      onComment={() => handleComment(item)}
      onShare={() => handleShare(item)}
      onProfile={handleProfile}
    />
  );

  const ListHeader = () => (
    <StoryBar
      onAddStory={handleAddStory}
      onViewStory={(storyGroup) => {
        // Collect all stories for navigation
        handleViewStory(storyGroup);
      }}
    />
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
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Text style={styles.logo}>CampusKart</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('CreatePost')} style={styles.headerBtn}>
            <Ionicons name="add-circle-outline" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="heart-outline" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ChatList')} style={styles.headerBtn}>
            <Ionicons name="paper-plane-outline" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#fff"
            colors={['#fff']}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="camera-outline" size={60} color="#888" />
            <Text style={styles.emptyTitle}>No Posts Yet</Text>
            <Text style={styles.emptyText}>Start following people to see their photos</Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => navigation.navigate('CreatePost')}
            >
              <Text style={styles.createBtnText}>Create your first post</Text>
            </TouchableOpacity>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Story Viewer Modal */}
      <Modal
        visible={!!viewingStory}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
      >
        {viewingStory && (
          <StoryViewer
            storyGroup={viewingStory}
            onClose={() => setViewingStory(null)}
            onNext={handleNextStoryGroup}
            onPrevious={handlePreviousStoryGroup}
          />
        )}
      </Modal>

      {/* Comments Modal */}
      <Modal
        visible={!!commentsModal}
        animationType="slide"
        transparent={false}
        statusBarTranslucent
      >
        {commentsModal && (
          <View style={styles.commentsModalContainer}>
            <CommentsModal
              postId={commentsModal.id}
              postOwnerId={commentsModal.userId}
              onClose={() => setCommentsModal(null)}
            />
          </View>
        )}
      </Modal>
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
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontStyle: 'italic',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    marginLeft: 20,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  createBtn: {
    marginTop: 24,
    backgroundColor: '#0095F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  commentsModalContainer: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 50,
  },
});
