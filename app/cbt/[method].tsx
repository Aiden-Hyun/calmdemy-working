/**
 * /cbt/[method] route — exercise dispatcher.
 *
 * Reads the :method param and renders the matching CBT exercise screen. All
 * five screens live in the cbt feature module; this file only dispatches and
 * applies the auth gate.
 */

import { useLocalSearchParams } from 'expo-router';
import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import {
  AbcExerciseScreen,
  SocraticExerciseScreen,
  CoreBeliefsExerciseScreen,
  DecatastrophizingExerciseScreen,
  GratitudeExerciseScreen,
} from '../../src/features/cbt';

const screens: Record<string, () => React.JSX.Element> = {
  abc: AbcExerciseScreen,
  socratic: SocraticExerciseScreen,
  'core-beliefs': CoreBeliefsExerciseScreen,
  decatastrophizing: DecatastrophizingExerciseScreen,
  gratitude: GratitudeExerciseScreen,
};

export default function CbtMethodRoute() {
  const { method } = useLocalSearchParams<{ method: string }>();
  const Screen = screens[method];
  return <ProtectedRoute>{Screen ? <Screen /> : null}</ProtectedRoute>;
}
