import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const CLOUDINARY_UPLOAD_PRESET = 'campuskart_uploads';
const CLOUDINARY_CLOUD_NAME = 'djppkdtic';

export default function EditProfileScreen({ navigation }) {
  const { user, userData, refreshUserData } = useAuth();
  const [name, setName] = useState(userData?.name || '');
  const [username, setUsername] = useState(userData?.username || '');
  const [bio, setBio] = useState(userData?.bio || '');
  const [website, setWebsite] = useState(userData?.website || '');
  const [photoURL, setPhotoURL] = useState(userData?.photoURL || user?.photoURL);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingPhoto(true);
        const imageUrl = await uploadToCloudinary(result.assets[0].uri);
        setPhotoURL(imageUrl);
        setUploadingPhoto(false);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      setUploadingPhoto(false);
    }
  };

  const uploadToCloudinary = async (uri) => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: 'profile.jpg',
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

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        username: username.trim().toLowerCase() || null,
        bio: bio.trim() || null,
        website: website.trim() || null,
        photoURL: photoURL || null,
      });

      if (refreshUserData) {
        await refreshUserData();
      }

      navigation.goBack();
    } catch (err) {
      console.error('Error saving profile:', err);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#0095F6" />
          ) : (
            <Ionicons name="checkmark" size={28} color="#0095F6" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <TouchableOpacity onPress={pickImage} disabled={uploadingPhoto}>
            {uploadingPhoto ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <Image
                source={{ uri: photoURL || 'https://via.placeholder.com/150' }}
                style={styles.avatar}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={pickImage} disabled={uploadingPhoto}>
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor="#888"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Username"
              placeholderTextColor="#888"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Bio"
              placeholderTextColor="#888"
              multiline
              maxLength={150}
            />
            <Text style={styles.charCount}>{bio.length}/150</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Website</Text>
            <TextInput
              style={styles.input}
              value={website}
              onChangeText={setWebsite}
              placeholder="Website"
              placeholderTextColor="#888"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>

        {/* Switch to Professional Account */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionItem}>
            <Text style={styles.sectionText}>Switch to Professional Account</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sectionItem}>
            <Text style={styles.sectionText}>Personal Information Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoText: {
    color: '#0095F6',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  form: {
    paddingHorizontal: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    color: '#888',
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    color: '#fff',
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    paddingVertical: 8,
  },
  bioInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  section: {
    marginTop: 24,
    borderTopWidth: 0.5,
    borderTopColor: '#262626',
    paddingTop: 16,
  },
  sectionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionText: {
    color: '#0095F6',
    fontSize: 14,
  },
});
