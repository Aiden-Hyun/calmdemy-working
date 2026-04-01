import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return null; // Could add loading spinner here
  }
  
  return user ? <Redirect href="/(tabs)/home" /> : <Redirect href="/login" />;
}
