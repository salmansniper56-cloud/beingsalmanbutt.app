import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

const CLOUDINARY_UPLOAD_PRESET = 'campuskart_uploads';
const CLOUDINARY_CLOUD_NAME = 'djppkdtic';

export default function CreateStoryScreen({ navigation }) {
  const { user, userData } = useAuth();
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickImage = async (useCamera = false) => {
    try {
      let result;
      
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [9, 16],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Gallery permission is required');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [9, 16],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadToCloudinary = async (uri) => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: 'story.jpg',
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

  const handleShare = async () => {
    if (!image) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setUploading(true);
    try {
      // Upload image to Cloudinary
      const imageUrl = await uploadToCloudinary(image);

      // Create story document
      await addDoc(collection(db, 'stories'), {
        userId: user.uid,
        userName: userData?.name || user.displayName || 'User',
        userPhoto: userData?.photoURL || user.photoURL,
        imageUrl,
        caption: caption.trim(),
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        views: 0,
        viewedBy: [],
        likes: [],
      });

      navigation.goBack();
    } catch (err) {
      console.error('Error creating story:', err);
      Alert.alert('Error', 'Failed to create story. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!image) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add to Story</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.pickerContainer}>
          <TouchableOpacity style={styles.pickerOption} onPress={() => pickImage(true)}>
            <View style={styles.pickerIcon}>
              <Ionicons name="camera" size={40} color="#fff" />
            </View>
            <Text style={styles.pickerText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pickerOption} onPress={() => pickImage(false)}>
            <View style={styles.pickerIcon}>
              <Ionicons name="images" size={40} color="#fff" />
            </View>
            <Text style={styles.pickerText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentContainer}>
          <Text style={styles.recentTitle}>Create a Story</Text>
          <Text style={styles.recentSubtitle}>
            Share photos and videos that disappear after 24 hours
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Preview */}
      <Image source={{ uri: image }} style={styles.preview} resizeMode="cover" />

      {/* Header */}
      <View style={styles.previewHeader}>
        <TouchableOpacity onPress={() => setImage(null)}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="text" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="happy-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn}>
            <Ionicons name="brush-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Caption Input */}
      <View style={styles.captionContainer}>
        <TextInput
          style={styles.captionInput}
          placeholder="Add a caption..."
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={200}
        />
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.shareBtn, uploading && styles.shareBtnDisabled]}
          onPress={handleShare}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.shareBtnText}>Share to Story</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
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
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  pickerContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 60,
  },
  pickerOption: {
    alignItems: 'center',
  },
  pickerIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  recentContainer: {
    paddingHorizontal: 32,
    paddingBottom: 100,
    alignItems: 'center',
  },
  recentTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  recentSubtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  preview: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captionContainer: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
  },
  captionInput: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
  },
  shareBtn: {
    backgroundColor: '#0095F6',
    borderRadius: 25,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareBtnDisabled: {
    opacity: 0.6,
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
