import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '../src/contexts/AuthContext';
import AppNavigator from '../src/navigation/AppNavigator';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppNavigator />
      <StatusBar style="light" />
    </AuthProvider>
  );
}
