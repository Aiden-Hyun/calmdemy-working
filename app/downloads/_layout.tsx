import { Stack } from 'expo-router';

export default function DownloadsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="player" />
    </Stack>
  );
}
