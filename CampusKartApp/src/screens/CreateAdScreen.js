import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { createAd, updateAdImages } from '../lib/firestore';

const CATEGORIES = [
  { id: 'books', name: 'Books', icon: '📚' },
  { id: 'electronics', name: 'Electronics', icon: '📱' },
  { id: 'clothing', name: 'Clothing', icon: '👕' },
  { id: 'services', name: 'Services', icon: '💼' },
  { id: 'other', name: 'Other', icon: '📦' },
];

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/djppkdtic/image/upload';
const CLOUDINARY_PRESET = 'campuskart_uploads';

export default function CreateAdScreen({ navigation }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [images, setImages] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert('Limit', 'Maximum 5 images allowed');
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

  const getLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission', 'Location permission is required');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
    } catch (err) {
      Alert.alert('Error', 'Could not get location');
    } finally {
      setGettingLocation(false);
    }
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
    if (!title || !price || !category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Create ad first
      const adId = await createAd({
        title,
        description,
        price: parseFloat(price),
        category,
        createdBy: user.uid,
        lat: location?.lat || null,
        lng: location?.lng || null,
      });

      // Upload images
      if (images.length > 0) {
        const uploadedUrls = await Promise.all(images.map(uploadToCloudinary));
        await updateAdImages(adId, uploadedUrls);
      }

      Alert.alert('Success', 'Ad created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Create ad error:', err);
      Alert.alert('Error', 'Failed to create ad');
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
        <Text style={styles.headerTitle}>Create Listing</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.postBtn, loading && styles.postBtnDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.postBtnText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Images */}
        <Text style={styles.label}>Photos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
          {images.map((uri, idx) => (
            <View key={idx} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.image} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(idx)}>
                <Ionicons name="close-circle" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 5 && (
            <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
              <Ionicons name="camera-outline" size={32} color="#888" />
              <Text style={styles.addImageText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Title */}
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="What are you selling?"
          placeholderTextColor="#888"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        {/* Price */}
        <Text style={styles.label}>Price (Rs.) *</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor="#888"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        {/* Category */}
        <Text style={styles.label}>Category *</Text>
        <View style={styles.categoriesRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, category === cat.id && styles.categoryChipActive]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={[styles.categoryText, category === cat.id && styles.categoryTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your item..."
          placeholderTextColor="#888"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={1000}
        />

        {/* Location */}
        <Text style={styles.label}>Location</Text>
        <TouchableOpacity style={styles.locationBtn} onPress={getLocation} disabled={gettingLocation}>
          {gettingLocation ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <>
              <Ionicons name="location-outline" size={20} color={location ? '#10b981' : '#888'} />
              <Text style={[styles.locationText, location && styles.locationTextActive]}>
                {location ? 'Location added ✓' : 'Add your location'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
    padding: 16,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  imagesRow: {
    flexDirection: 'row',
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 100,
    height: 100,
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
  addImageBtn: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#2d2d44',
    borderWidth: 2,
    borderColor: '#3d3d5c',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageText: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#2d2d44',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#3d3d5c',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#6366f1',
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryText: {
    color: '#888',
    fontSize: 14,
  },
  categoryTextActive: {
    color: '#fff',
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  locationText: {
    color: '#888',
    fontSize: 16,
  },
  locationTextActive: {
    color: '#10b981',
  },
  bottomPadding: {
    height: 100,
  },
});
