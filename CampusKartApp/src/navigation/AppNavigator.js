import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Image, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';

// Auth Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Main Screens (Instagram Style)
import InstagramFeedScreen from '../screens/InstagramFeedScreen';
import SearchExploreScreen from '../screens/SearchExploreScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import MapScreen from '../screens/MapScreen';
import ChatListScreen from '../screens/ChatListScreen';
import InstagramProfileScreen from '../screens/InstagramProfileScreen';

// Other Screens
import ChatThreadScreen from '../screens/ChatThreadScreen';
import AdDetailScreen from '../screens/AdDetailScreen';
import CreateAdScreen from '../screens/CreateAdScreen';
import InstagramCreatePostScreen from '../screens/InstagramCreatePostScreen';
import CreateStoryScreen from '../screens/CreateStoryScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PremiumScreen from '../screens/PremiumScreen';
import FollowersListScreen from '../screens/FollowersListScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { userData, user } = useAuth();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#262626',
          borderTopWidth: 0.5,
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#888',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Reels') {
            iconName = focused ? 'play-circle' : 'play-circle-outline';
          } else if (route.name === 'Shop') {
            iconName = focused ? 'bag' : 'bag-outline';
          } else if (route.name === 'Profile') {
            // Show user avatar for profile tab
            return (
              <View style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                borderWidth: focused ? 2 : 0,
                borderColor: '#fff',
                overflow: 'hidden',
              }}>
                <Image
                  source={{ uri: userData?.photoURL || user?.photoURL || 'https://via.placeholder.com/150' }}
                  style={{ width: '100%', height: '100%' }}
                />
              </View>
            );
          }
          return <Ionicons name={iconName} size={26} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={InstagramFeedScreen} />
      <Tab.Screen name="Search" component={SearchExploreScreen} />
      <Tab.Screen name="Reels" component={MarketplaceScreen} />
      <Tab.Screen name="Shop" component={MapScreen} />
      <Tab.Screen name="Profile" component={InstagramProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="AdDetail" component={AdDetailScreen} />
      <Stack.Screen name="CreateAd" component={CreateAdScreen} />
      <Stack.Screen name="CreatePost" component={InstagramCreatePostScreen} />
      <Stack.Screen name="CreateStory" component={CreateStoryScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Premium" component={PremiumScreen} />
      <Stack.Screen name="FollowersList" component={FollowersListScreen} />
      <Stack.Screen name="UserProfile" component={InstagramProfileScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return user ? <AppStack /> : <AuthStack />;
}
