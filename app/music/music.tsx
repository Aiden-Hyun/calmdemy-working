import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { MusicListScreen } from '../../src/features/music';

export default function MusicList() {
  return (
    <ProtectedRoute>
      <MusicListScreen />
    </ProtectedRoute>
  );
}
