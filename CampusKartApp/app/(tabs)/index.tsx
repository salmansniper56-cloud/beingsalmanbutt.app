import { Redirect } from 'expo-router';

export default function Index() {
  // This file is not used because _layout.tsx handles all navigation
  // Redirect to avoid any conflicts
  return <Redirect href="/" />;
}
