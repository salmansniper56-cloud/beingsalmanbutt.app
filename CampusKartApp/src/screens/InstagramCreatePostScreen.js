import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const CLOUDINARY_UPLOAD_PRESET = 'campuskart_uploads';
const CLOUDINARY_CLOUD_NAME = 'djppkdtic';

export default function CreatePostScreen({ navigation }) {
  const { user, userData } = useAuth();
  const [images, setImages] = useState([]);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [posting, setPosting] = useState(false);
  const [currentStep, setCurrentStep] = useState('select'); // 'select', 'edit', 'caption'

  const pickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery permission is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        setImages(result.assets.map(a => a.uri));
        setCurrentStep('edit');
      }
    } catch (err) {
      console.error('Error picking images:', err);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImages([result.assets[0].uri]);
        setCurrentStep('edit');
      }
    } catch (err) {
      console.error('Error taking photo:', err);
    }
  };

  const addLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (address) {
        setLocation(`${address.city || ''}, ${address.country || ''}`);
      }
    } catch (err) {
      console.error('Error getting location:', err);
    }
  };

  const uploadToCloudinary = async (uri) => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: 'post.jpg',
    });
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();
    return data.secure_url;
  };

  const handlePost = async () => {
    if (images.length === 0) {
      Alert.alert('Error', 'Please select at least one image');
      return;
    }

    setPosting(true);
    try {
      // Upload all images
      const imageUrls = await Promise.all(images.map(uploadToCloudinary));

      // Create post
      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        userName: userData?.name || user.displayName || 'User',
        userPhoto: userData?.photoURL || user.photoURL,
        isPremium: userData?.isPremium || false,
        imageUrl: imageUrls[0], // Primary image
        images: imageUrls,
        caption: caption.trim(),
        location: location.trim() || null,
        likes: [],
        savedBy: [],
        commentsCount: 0,
        createdAt: serverTimestamp(),
      });

      // Update user's posts count
      await updateDoc(doc(db, 'users', user.uid), {
        postsCount: increment(1),
      });

      navigation.goBack();
    } catch (err) {
      console.error('Error creating post:', err);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  // Step 1: Select Images
  if (currentStep === 'select') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Post</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.selectContainer}>
          <TouchableOpacity style={styles.selectOption} onPress={pickImages}>
            <View style={styles.selectIcon}>
              <Ionicons name="images" size={48} color="#0095F6" />
            </View>
            <Text style={styles.selectTitle}>Select from Gallery</Text>
            <Text style={styles.selectSubtitle}>Choose photos from your library</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.selectOption} onPress={takePhoto}>
            <View style={styles.selectIcon}>
              <Ionicons name="camera" size={48} color="#0095F6" />
            </View>
            <Text style={styles.selectTitle}>Take a Photo</Text>
            <Text style={styles.selectSubtitle}>Use your camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 2: Edit/Preview
  if (currentStep === 'edit') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentStep('select')}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit</Text>
          <TouchableOpacity onPress={() => setCurrentStep('caption')}>
            <Text style={styles.nextBtn}>Next</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {images.map((uri, index) => (
            <View key={index} style={styles.imagePreviewContainer}>
              <Image source={{ uri }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImage}
                onPress={() => {
                  const newImages = images.filter((_, i) => i !== index);
                  if (newImages.length === 0) {
                    setCurrentStep('select');
                  }
                  setImages(newImages);
                }}
              >
                <Ionicons name="close-circle" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {images.length > 1 && (
          <View style={styles.pageIndicator}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === 0 && styles.activeDot]}
              />
            ))}
          </View>
        )}

        <View style={styles.editActions}>
          <TouchableOpacity style={styles.editBtn}>
            <Ionicons name="color-filter-outline" size={24} color="#fff" />
            <Text style={styles.editBtnText}>Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn}>
            <Ionicons name="crop-outline" size={24} color="#fff" />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 3: Caption
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentStep('edit')}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity onPress={handlePost} disabled={posting}>
          {posting ? (
            <ActivityIndicator color="#0095F6" />
          ) : (
            <Text style={styles.shareBtn}>Share</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.captionContainer}>
        <View style={styles.captionHeader}>
          <Image source={{ uri: images[0] }} style={styles.captionThumb} />
          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption..."
            placeholderTextColor="#888"
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={2200}
          />
        </View>

        <TouchableOpacity style={styles.optionRow} onPress={addLocation}>
          <Ionicons name="location-outline" size={24} color="#fff" />
          <Text style={styles.optionText}>
            {location || 'Add location'}
          </Text>
          {location && (
            <TouchableOpacity onPress={() => setLocation('')}>
              <Ionicons name="close" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionRow}>
          <Ionicons name="person-outline" size={24} color="#fff" />
          <Text style={styles.optionText}>Tag people</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionRow}>
          <Ionicons name="musical-notes-outline" size={24} color="#fff" />
          <Text style={styles.optionText}>Add music</Text>
        </TouchableOpacity>

        <View style={styles.charCount}>
          <Text style={styles.charCountText}>{caption.length}/2,200</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  nextBtn: {
    color: '#0095F6',
    fontSize: 16,
    fontWeight: '600',
  },
  shareBtn: {
    color: '#0095F6',
    fontSize: 16,
    fontWeight: '600',
  },
  selectContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  selectOption: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
  },
  selectIcon: {
    marginBottom: 16,
  },
  selectTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectSubtitle: {
    color: '#888',
    fontSize: 14,
  },
  imagePreviewContainer: {
    width: width,
    aspectRatio: 1,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImage: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#444',
  },
  activeDot: {
    backgroundColor: '#0095F6',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 40,
    borderTopWidth: 0.5,
    borderTopColor: '#262626',
  },
  editBtn: {
    alignItems: 'center',
  },
  editBtnText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 6,
  },
  captionContainer: {
    flex: 1,
  },
  captionHeader: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
  },
  captionThumb: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  captionInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
    maxHeight: 100,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
  },
  optionText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 16,
  },
  charCount: {
    padding: 16,
  },
  charCountText: {
    color: '#888',
    fontSize: 12,
  },
});
