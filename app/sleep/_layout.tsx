import { Stack } from 'expo-router';

export default function SleepLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
      <Stack.Screen name="bedtime-stories" options={{ headerShown: false }} />
      <Stack.Screen name="sleep-meditations" options={{ headerShown: false }} />
      <Stack.Screen name="meditation/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

