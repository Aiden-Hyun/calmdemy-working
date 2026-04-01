import { Stack } from 'expo-router';

export default function MusicLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="white-noise" />
      <Stack.Screen name="nature-sounds" />
      <Stack.Screen name="music" />
      <Stack.Screen name="asmr" />
    </Stack>
  );
}

