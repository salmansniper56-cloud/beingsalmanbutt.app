import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { createPost, updatePostMedia } from '../lib/firestore';

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/djppkdtic/image/upload';
const CLOUDINARY_PRESET = 'campuskart_uploads';

export default function CreatePostScreen({ navigation }) {
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    if (images.length >= 10) {
      Alert.alert('Limit', 'Maximum 10 images allowed');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const uploadToCloudinary = async (uri) => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: 'upload.jpg',
    });
    formData.append('upload_preset', CLOUDINARY_PRESET);

    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    return data.secure_url;
  };

  const handleSubmit = async () => {
    if (!caption.trim() && images.length === 0) {
      Alert.alert('Error', 'Add a caption or image');
      return;
    }

    setLoading(true);
    try {
      // Create post first
      const postId = await createPost({
        caption: caption.trim(),
        createdBy: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        userPhotoURL: user.photoURL || '',
      });

      // Upload images
      if (images.length > 0) {
        const uploadedUrls = await Promise.all(images.map(uploadToCloudinary));
        await updatePostMedia(postId, uploadedUrls);
      }

      Alert.alert('Success', 'Post created!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Create post error:', err);
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.postBtn, loading && styles.postBtnDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.postBtnText}>Share</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info */}
        <View style={styles.userRow}>
          <Image
            source={{ uri: user?.photoURL || 'https://via.placeholder.com/40' }}
            style={styles.avatar}
          />
          <Text style={styles.userName}>
            {user?.displayName || user?.email?.split('@')[0] || 'User'}
          </Text>
        </View>

        {/* Caption */}
        <TextInput
          style={styles.captionInput}
          placeholder="What's on your mind?"
          placeholderTextColor="#888"
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={2000}
        />

        {/* Images */}
        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
            {images.map((uri, idx) => (
              <View key={idx} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.image} />
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(idx)}>
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.actionItem} onPress={pickImage}>
          <Ionicons name="image-outline" size={24} color="#10b981" />
          <Text style={styles.actionText}>Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem}>
          <Ionicons name="videocam-outline" size={24} color="#6366f1" />
          <Text style={styles.actionText}>Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem}>
          <Ionicons name="location-outline" size={24} color="#ef4444" />
          <Text style={styles.actionText}>Location</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d44',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  postBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  postBtnDisabled: {
    opacity: 0.6,
  },
  postBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3d3d5c',
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  captionInput: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 26,
    minHeight: 100,
  },
  imagesRow: {
    marginTop: 16,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#2d2d44',
  },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    color: '#888',
    fontSize: 14,
  },
});
