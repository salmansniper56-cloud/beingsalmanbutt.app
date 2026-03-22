import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 seconds per story

export default function StoryViewer({ storyGroup, onClose, onNext, onPrevious }) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef(null);

  const currentStory = storyGroup?.stories?.[currentIndex];

  useEffect(() => {
    if (!currentStory) return;

    // Mark story as viewed
    const markViewed = async () => {
      try {
        await updateDoc(doc(db, 'stories', currentStory.id), {
          viewedBy: arrayUnion(user?.uid),
          views: (currentStory.views || 0) + 1,
        });
      } catch (err) {
        console.error('Error marking story viewed:', err);
      }
    };
    markViewed();

    // Start progress animation
    startProgress();

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [currentIndex, currentStory]);

  const startProgress = () => {
    progressAnim.setValue(0);
    animationRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });
    
    animationRef.current.start(({ finished }) => {
      if (finished) {
        goNext();
      }
    });
  };

  const pauseProgress = () => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
    setPaused(true);
  };

  const resumeProgress = () => {
    setPaused(false);
    const currentProgress = progressAnim._value;
    const remainingDuration = STORY_DURATION * (1 - currentProgress);
    
    animationRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: remainingDuration,
      useNativeDriver: false,
    });
    
    animationRef.current.start(({ finished }) => {
      if (finished) {
        goNext();
      }
    });
  };

  const goNext = () => {
    if (currentIndex < storyGroup.stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (onNext) {
      onNext();
    } else {
      onClose();
    }
  };

  const goPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (onPrevious) {
      onPrevious();
    }
  };

  const handlePress = (event) => {
    const touchX = event.nativeEvent.locationX;
    if (touchX < width / 3) {
      goPrevious();
    } else if (touchX > (width * 2) / 3) {
      goNext();
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const storyTime = timestamp.toDate?.() || new Date(timestamp);
    const diff = now - storyTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours === 1) return '1h';
    return `${hours}h`;
  };

  if (!currentStory) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Story Image */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.storyContainer}
        onPress={handlePress}
        onLongPress={pauseProgress}
        onPressOut={() => paused && resumeProgress()}
      >
        <Image
          source={{ uri: currentStory.imageUrl }}
          style={styles.storyImage}
          resizeMode="cover"
        />

        {/* Gradient Overlay */}
        <View style={styles.topGradient} />
        <View style={styles.bottomGradient} />

        {/* Progress Bars */}
        <View style={styles.progressContainer}>
          {storyGroup.stories.map((_, index) => (
            <View key={index} style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      index < currentIndex
                        ? '100%'
                        : index === currentIndex
                        ? progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          })
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Image
              source={{ uri: storyGroup.userPhoto || 'https://via.placeholder.com/150' }}
              style={styles.userAvatar}
            />
            <Text style={styles.userName}>{storyGroup.userName}</Text>
            <Text style={styles.timeAgo}>{getTimeAgo(currentStory.createdAt)}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Caption */}
        {currentStory.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption}>{currentStory.caption}</Text>
          </View>
        )}

        {/* Story Stats (for own stories) */}
        {storyGroup.userId === user?.uid && (
          <View style={styles.statsContainer}>
            <Ionicons name="eye-outline" size={20} color="#fff" />
            <Text style={styles.statsText}>{currentStory.views || 0}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Reply Input (for other's stories) */}
      {storyGroup.userId !== user?.uid && (
        <View style={styles.replyContainer}>
          <TextInput
            style={styles.replyInput}
            placeholder={`Reply to ${storyGroup.userName?.split(' ')[0]}...`}
            placeholderTextColor="#888"
            value={replyText}
            onChangeText={setReplyText}
            onFocus={pauseProgress}
            onBlur={resumeProgress}
          />
          <TouchableOpacity style={styles.replyBtn}>
            <Ionicons name="heart-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.replyBtn}>
            <Ionicons name="paper-plane-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyContainer: {
    flex: 1,
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  progressContainer: {
    position: 'absolute',
    top: 50,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  progressBar: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  timeAgo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginLeft: 8,
  },
  closeBtn: {
    padding: 4,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
  },
  caption: {
    color: '#fff',
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsText: {
    color: '#fff',
    fontSize: 14,
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#262626',
  },
  replyInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#363636',
    borderRadius: 22,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 14,
    marginRight: 12,
  },
  replyBtn: {
    padding: 8,
  },
});
