import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CrestProvider } from '../lib/CrestContext';

export default function RootLayout() {
  return (
    <CrestProvider>
      {/* Light status bar (white icons/text) on both iOS and Android */}
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} initialRouteName="(tabs)">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </CrestProvider>
  );
}
