import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

// Onboarding temporarily disabled — access it manually via Profile > Preview Onboarding.
export default function Index() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return null;
  }

  return user ? <Redirect href="/(tabs)/home" /> : <Redirect href="/login" />;
}
