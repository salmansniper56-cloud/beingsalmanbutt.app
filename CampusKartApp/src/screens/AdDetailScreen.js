import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getAd, getUser, toggleLike, isLiked, getOrCreateChat } from '../lib/firestore';

const { width } = Dimensions.get('window');

export default function AdDetailScreen({ route, navigation }) {
  const { adId } = route.params;
  const { user } = useAuth();
  const [ad, setAd] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const loadAd = async () => {
      try {
        const adData = await getAd(adId);
        if (adData) {
          setAd(adData);
          if (adData.createdBy) {
            const sellerData = await getUser(adData.createdBy);
            setSeller(sellerData);
          }
          if (user?.uid) {
            const likedStatus = await isLiked(adId, user.uid);
            setLiked(likedStatus);
          }
        }
      } catch (err) {
        console.error('Failed to load ad:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAd();
  }, [adId, user?.uid]);

  const handleLike = async () => {
    if (!user?.uid) return;
    setLiked(!liked);
    setAd(prev => ({
      ...prev,
      likeCount: (prev?.likeCount || 0) + (liked ? -1 : 1)
    }));
    try {
      await toggleLike(adId, user.uid);
    } catch (err) {
      setLiked(liked);
    }
  };

  const handleChat = async () => {
    if (!user?.uid || !ad?.createdBy) {
      Alert.alert('Error', 'Please sign in to chat');
      return;
    }
    if (user.uid === ad.createdBy) {
      Alert.alert('Info', 'This is your own listing');
      return;
    }
    try {
      const chatId = await getOrCreateChat(user.uid, ad.createdBy);
      navigation.navigate('ChatThread', {
        chatId,
        otherUserId: ad.createdBy,
        otherUserName: seller?.displayName || 'Seller',
      });
    } catch (err) {
      Alert.alert('Error', 'Could not start chat');
    }
  };

  const handleCall = () => {
    if (seller?.phone) {
      Linking.openURL(`tel:${seller.phone}`);
    } else {
      Alert.alert('Info', 'Seller has not provided a phone number');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!ad) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Ad not found</Text>
      </View>
    );
  }

  const images = ad.images || [];

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn}>
            <Ionicons name="share-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Images */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentImage(index);
          }}
          scrollEventThrottle={16}
        >
          {images.length > 0 ? (
            images.map((img, idx) => (
              <Image key={idx} source={{ uri: img }} style={styles.image} resizeMode="cover" />
            ))
          ) : (
            <View style={[styles.image, styles.placeholderImage]}>
              <Ionicons name="image-outline" size={64} color="#3d3d5c" />
            </View>
          )}
        </ScrollView>

        {/* Image indicators */}
        {images.length > 1 && (
          <View style={styles.indicators}>
            {images.map((_, idx) => (
              <View
                key={idx}
                style={[styles.indicator, currentImage === idx && styles.indicatorActive]}
              />
            ))}
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>Rs. {(ad.price || 0).toLocaleString()}</Text>
            <TouchableOpacity onPress={handleLike}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={28}
                color={liked ? '#ef4444' : '#888'}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{ad.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="pricetag-outline" size={16} color="#888" />
              <Text style={styles.metaText}>{ad.category}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color="#888" />
              <Text style={styles.metaText}>
                {ad.createdAt ? new Date(ad.createdAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{ad.description || 'No description provided'}</Text>

          {/* Seller */}
          <Text style={styles.sectionTitle}>Seller</Text>
          <View style={styles.sellerCard}>
            <Image
              source={{ uri: seller?.photoURL || 'https://via.placeholder.com/50' }}
              style={styles.sellerAvatar}
            />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{seller?.displayName || 'Seller'}</Text>
              <Text style={styles.sellerEmail}>{seller?.email}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
          <Ionicons name="call-outline" size={22} color="#fff" />
          <Text style={styles.actionBtnText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={handleChat}>
          <Ionicons name="chatbubble-outline" size={22} color="#fff" />
          <Text style={styles.actionBtnText}>Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#888',
    fontSize: 16,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width,
    height: width,
    backgroundColor: '#2d2d44',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3d3d5c',
  },
  indicatorActive: {
    backgroundColor: '#6366f1',
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10b981',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#888',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
  },
  description: {
    color: '#aaa',
    fontSize: 15,
    lineHeight: 22,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d44',
    padding: 12,
    borderRadius: 12,
  },
  sellerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3d3d5c',
  },
  sellerInfo: {
    marginLeft: 12,
  },
  sellerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  sellerEmail: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#2d2d44',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d2d44',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnPrimary: {
    backgroundColor: '#6366f1',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
