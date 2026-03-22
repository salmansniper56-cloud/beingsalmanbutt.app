import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 0,
    period: 'Free',
    features: [
      'Create up to 5 posts',
      'Basic profile',
      'View stories',
      'Chat with others',
    ],
    color: '#888',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 499,
    period: '/month',
    popular: true,
    features: [
      'Unlimited posts',
      'Verified badge ✓',
      'Priority support',
      'Analytics dashboard',
      'Hide ads',
      'Exclusive filters',
      'Story highlights',
      'Schedule posts',
    ],
    color: '#FFD700',
    gradient: ['#833AB4', '#FD1D1D', '#F77737'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 999,
    period: '/month',
    features: [
      'Everything in Premium',
      'Custom profile theme',
      'Advanced analytics',
      'Multiple accounts',
      'API access',
      'Priority listing',
      'Featured seller badge',
      'Early access features',
    ],
    color: '#0095F6',
    gradient: ['#405DE6', '#5851DB', '#833AB4'],
  },
];

export default function PremiumScreen({ navigation }) {
  const { user, userData, refreshUserData } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [processing, setProcessing] = useState(false);

  const currentPlan = userData?.subscription || 'basic';

  const handleSubscribe = async (planId) => {
    if (planId === 'basic') {
      Alert.alert('Info', 'You are already on the free plan');
      return;
    }

    if (planId === currentPlan) {
      Alert.alert('Info', 'You are already subscribed to this plan');
      return;
    }

    Alert.alert(
      'Subscribe',
      `Subscribe to ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe',
          onPress: async () => {
            setProcessing(true);
            try {
              // In production, integrate with payment gateway (Stripe, etc.)
              await updateDoc(doc(db, 'users', user.uid), {
                subscription: planId,
                isPremium: true,
                subscribedAt: new Date(),
              });

              if (refreshUserData) {
                await refreshUserData();
              }

              Alert.alert('Success', 'You are now subscribed!');
            } catch (err) {
              console.error('Error subscribing:', err);
              Alert.alert('Error', 'Failed to subscribe. Please try again.');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const renderPlan = (plan) => {
    const isSelected = selectedPlan === plan.id;
    const isCurrent = currentPlan === plan.id;

    return (
      <TouchableOpacity
        key={plan.id}
        style={[styles.planCard, isSelected && styles.planCardSelected]}
        onPress={() => setSelectedPlan(plan.id)}
      >
        {plan.popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>MOST POPULAR</Text>
          </View>
        )}

        {plan.gradient ? (
          <LinearGradient colors={plan.gradient} style={styles.planHeader}>
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceRow}>
              {plan.price > 0 && <Text style={styles.currency}>Rs.</Text>}
              <Text style={styles.price}>{plan.price || 'Free'}</Text>
              {plan.price > 0 && <Text style={styles.period}>{plan.period}</Text>}
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.planHeader, { backgroundColor: '#1a1a1a' }]}>
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{plan.price || 'Free'}</Text>
            </View>
          </View>
        )}

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color={plan.color} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.subscribeBtn,
            { backgroundColor: plan.gradient ? '#fff' : plan.color },
            isCurrent && styles.currentPlanBtn,
          ]}
          onPress={() => handleSubscribe(plan.id)}
          disabled={isCurrent || processing}
        >
          {processing && selectedPlan === plan.id ? (
            <ActivityIndicator color={plan.gradient ? '#833AB4' : '#fff'} />
          ) : (
            <Text
              style={[
                styles.subscribeBtnText,
                { color: plan.gradient ? '#833AB4' : '#fff' },
                isCurrent && styles.currentPlanText,
              ]}
            >
              {isCurrent ? 'Current Plan' : plan.price === 0 ? 'Stay Free' : 'Subscribe'}
            </Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <LinearGradient
            colors={['#833AB4', '#FD1D1D', '#F77737']}
            style={styles.heroIcon}
          >
            <Ionicons name="star" size={40} color="#fff" />
          </LinearGradient>
          <Text style={styles.heroTitle}>Upgrade to Premium</Text>
          <Text style={styles.heroSubtitle}>
            Unlock exclusive features and take your experience to the next level
          </Text>
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {PLANS.map(renderPlan)}
        </View>

        {/* FAQ */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I cancel anytime?</Text>
            <Text style={styles.faqAnswer}>
              Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do I get the verified badge?</Text>
            <Text style={styles.faqAnswer}>
              The verified badge is automatically added to your profile when you subscribe to Premium or Pro.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What payment methods are accepted?</Text>
            <Text style={styles.faqAnswer}>
              We accept all major credit/debit cards, UPI, and mobile wallets.
            </Text>
          </View>
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
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  plansContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  planCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#262626',
  },
  planCardSelected: {
    borderColor: '#FFD700',
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  popularText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },
  planHeader: {
    padding: 20,
    alignItems: 'center',
  },
  planName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  price: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  period: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginLeft: 4,
  },
  featuresContainer: {
    padding: 20,
    paddingTop: 0,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 10,
  },
  subscribeBtn: {
    margin: 20,
    marginTop: 0,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  subscribeBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentPlanBtn: {
    backgroundColor: '#262626',
  },
  currentPlanText: {
    color: '#888',
  },
  faqSection: {
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  faqTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  faqItem: {
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#262626',
  },
  faqQuestion: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  faqAnswer: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
  },
});
