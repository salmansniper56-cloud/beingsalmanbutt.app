import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function StoryBar({ onAddStory, onViewStory }) {
  const { user, userData } = useAuth();
  const [stories, setStories] = useState([]);
  const [myStory, setMyStory] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Get stories from last 24 hours
    const twentyFourHoursAgo = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    
    const q = query(
      collection(db, 'stories'),
      where('createdAt', '>=', twentyFourHoursAgo),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storyData = {};
      
      snapshot.docs.forEach((doc) => {
        const story = { id: doc.id, ...doc.data() };
        const userId = story.userId;
        
        if (!storyData[userId]) {
          storyData[userId] = {
            userId,
            userName: story.userName,
            userPhoto: story.userPhoto,
            stories: [],
            hasUnviewed: false,
          };
        }
        storyData[userId].stories.push(story);
        
        // Check if user has viewed this story
        if (!story.viewedBy?.includes(user?.uid)) {
          storyData[userId].hasUnviewed = true;
        }
      });

      // Separate my story from others
      const myStoryData = storyData[user?.uid];
      delete storyData[user?.uid];

      setMyStory(myStoryData || null);
      setStories(Object.values(storyData));
      setError(false);
    }, (err) => {
      console.log('Stories query needs index, showing add story only');
      setError(true);
    });

    return () => unsubscribe();
  }, [user]);

  const handleMyStoryPress = () => {
    if (myStory && myStory.stories.length > 0) {
      onViewStory(myStory);
    } else {
      onAddStory();
    }
  };

  const userPhoto = userData?.photoURL || user?.photoURL || 'https://via.placeholder.com/150';

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* My Story / Add Story */}
        <TouchableOpacity style={styles.storyItem} onPress={handleMyStoryPress}>
          <View style={styles.myStoryContainer}>
            {myStory ? (
              <LinearGradient
                colors={['#833AB4', '#FD1D1D', '#F77737']}
                style={styles.storyRing}
              >
                <View style={styles.storyImageContainer}>
                  <Image
                    source={{ uri: myStory.userPhoto || userPhoto }}
                    style={styles.storyImage}
                  />
                </View>
              </LinearGradient>
            ) : (
              <View style={styles.addStoryContainer}>
                <Image
                  source={{ uri: userPhoto }}
                  style={styles.storyImage}
                />
                <View style={styles.addBadge}>
                  <Ionicons name="add" size={14} color="#fff" />
                </View>
              </View>
            )}
            {/* Add more button if has story */}
            {myStory && (
              <TouchableOpacity style={styles.addMoreBtn} onPress={onAddStory}>
                <Ionicons name="add" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.storyName} numberOfLines={1}>
            {myStory ? 'Your Story' : 'Add Story'}
          </Text>
        </TouchableOpacity>

        {/* Other Users Stories */}
        {stories.map((storyGroup) => (
          <TouchableOpacity
            key={storyGroup.userId}
            style={styles.storyItem}
            onPress={() => onViewStory(storyGroup)}
          >
            {storyGroup.hasUnviewed ? (
              <LinearGradient
                colors={['#833AB4', '#FD1D1D', '#F77737']}
                style={styles.storyRing}
              >
                <View style={styles.storyImageContainer}>
                  <Image
                    source={{ uri: storyGroup.userPhoto || 'https://via.placeholder.com/150' }}
                    style={styles.storyImage}
                  />
                </View>
              </LinearGradient>
            ) : (
              <View style={[styles.storyRing, styles.viewedRing]}>
                <View style={styles.storyImageContainer}>
                  <Image
                    source={{ uri: storyGroup.userPhoto || 'https://via.placeholder.com/150' }}
                    style={styles.storyImage}
                  />
                </View>
              </View>
            )}
            <Text style={styles.storyName} numberOfLines={1}>
              {storyGroup.userName?.split(' ')[0] || 'User'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  storyItem: {
    alignItems: 'center',
    marginHorizontal: 6,
    width: 72,
  },
  myStoryContainer: {
    position: 'relative',
  },
  storyRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewedRing: {
    backgroundColor: '#262626',
  },
  storyImageContainer: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  addStoryContainer: {
    position: 'relative',
  },
  addBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0095F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  addMoreBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0095F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  storyName: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
});
