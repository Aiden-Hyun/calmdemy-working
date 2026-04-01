import { Stack } from 'expo-router';

export default function AlbumLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="track" />
    </Stack>
  );
}

