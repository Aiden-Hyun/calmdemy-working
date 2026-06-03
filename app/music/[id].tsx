import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { SoundPlayerScreen } from '../../src/features/music';

export default function SoundPlayerPage() {
  return (
    <ProtectedRoute>
      <SoundPlayerScreen />
    </ProtectedRoute>
  );
}
