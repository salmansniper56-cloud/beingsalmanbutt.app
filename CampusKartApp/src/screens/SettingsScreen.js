import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsScreen({ navigation }) {
  const { user, userData, signOut } = useAuth();
  const [notifications, setNotifications] = React.useState(true);
  const [privateAccount, setPrivateAccount] = React.useState(false);

  const handleSignOut = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const SettingItem = ({ icon, title, onPress, value, isSwitch, danger, rightText }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={isSwitch}
    >
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color={danger ? '#ED4956' : '#fff'} />
        <Text style={[styles.settingText, danger && styles.dangerText]}>{title}</Text>
      </View>
      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: '#363636', true: '#0095F6' }}
          thumbColor="#fff"
        />
      ) : rightText ? (
        <Text style={styles.rightText}>{rightText}</Text>
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#888" />
      )}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Premium Section */}
        <TouchableOpacity style={styles.premiumBanner} onPress={() => navigation.navigate('Premium')}>
          <View style={styles.premiumLeft}>
            <Ionicons name="star" size={24} color="#FFD700" />
            <View style={styles.premiumText}>
              <Text style={styles.premiumTitle}>CampusKart Premium</Text>
              <Text style={styles.premiumSubtitle}>Unlock exclusive features</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <SectionHeader title="Account" />
        <SettingItem
          icon="person-outline"
          title="Edit Profile"
          onPress={() => navigation.navigate('EditProfile')}
        />
        <SettingItem
          icon="shield-outline"
          title="Security"
          onPress={() => {}}
        />
        <SettingItem
          icon="lock-closed-outline"
          title="Privacy"
          onPress={() => {}}
        />
        <SettingItem
          icon="lock-closed-outline"
          title="Private Account"
          isSwitch
          value={privateAccount}
          onPress={() => setPrivateAccount(!privateAccount)}
        />

        <SectionHeader title="Notifications" />
        <SettingItem
          icon="notifications-outline"
          title="Push Notifications"
          isSwitch
          value={notifications}
          onPress={() => setNotifications(!notifications)}
        />
        <SettingItem
          icon="mail-outline"
          title="Email Notifications"
          onPress={() => {}}
        />

        <SectionHeader title="Content" />
        <SettingItem
          icon="bookmark-outline"
          title="Saved"
          onPress={() => {}}
        />
        <SettingItem
          icon="archive-outline"
          title="Archive"
          onPress={() => {}}
        />
        <SettingItem
          icon="time-outline"
          title="Your Activity"
          onPress={() => {}}
        />

        <SectionHeader title="Help" />
        <SettingItem
          icon="help-circle-outline"
          title="Help Center"
          onPress={() => {}}
        />
        <SettingItem
          icon="document-text-outline"
          title="Terms of Service"
          onPress={() => {}}
        />
        <SettingItem
          icon="shield-checkmark-outline"
          title="Privacy Policy"
          onPress={() => {}}
        />
        <SettingItem
          icon="information-circle-outline"
          title="About"
          rightText="v1.0.0"
          onPress={() => {}}
        />

        <SectionHeader title="Login" />
        <SettingItem
          icon="add-circle-outline"
          title="Add Account"
          onPress={() => {}}
        />
        <SettingItem
          icon="log-out-outline"
          title="Log Out"
          danger
          onPress={handleSignOut}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>CampusKart</Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
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
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'linear-gradient(90deg, #833AB4 0%, #FD1D1D 50%, #F77737 100%)',
    backgroundColor: '#262626',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  premiumLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumText: {
    marginLeft: 12,
  },
  premiumTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  premiumSubtitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 14,
  },
  dangerText: {
    color: '#ED4956',
  },
  rightText: {
    color: '#888',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  footerText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  footerVersion: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
});
