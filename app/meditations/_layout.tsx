import { Stack } from 'expo-router';

export default function MeditationsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="techniques" />
      <Stack.Screen name="technique" />
    </Stack>
  );
}
