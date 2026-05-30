/**
 * ============================================================
 * guestNickname.ts — Consistent nickname generator for anonymous users
 * ============================================================
 *
 * Generates a friendly, deterministic display name like "Calm Panda"
 * from a Firebase UID. The same UID always produces the same name, so
 * the user sees a stable identity across sessions without ever providing
 * one. Used on the home and profile screens to greet anonymous users.
 *
 * Deterministic via a simple character-sum hash modded into the
 * adjective and animal lists. The hash multiplies by 7 before the
 * animal lookup so adjacent UIDs don't collide into the same pair.
 * ============================================================
 */

const ADJECTIVES = [
  'Calm', 'Peaceful', 'Serene', 'Gentle', 'Mindful', 'Tranquil', 'Zen',
  'Cozy', 'Dreamy', 'Blissful', 'Mellow', 'Quiet', 'Still', 'Soft',
  'Happy', 'Bright', 'Sunny', 'Warm', 'Kind', 'Sweet', 'Lovely',
];

const ANIMALS = [
  'Panda', 'Koala', 'Bunny', 'Owl', 'Fox', 'Bear', 'Deer', 'Dove',
  'Swan', 'Cloud', 'Moon', 'Star', 'Wave', 'Breeze', 'Leaf', 'Lotus',
  'Butterfly', 'Dolphin', 'Seal', 'Otter', 'Sloth', 'Cat', 'Penguin',
];

/**
 * Generate a consistent, friendly nickname from a user's UID.
 *
 * @param uid - Firebase Auth UID
 * @returns Two-word nickname like "Calm Panda" (always the same for a given UID)
 */
export function generateGuestNickname(uid: string): string {
  const hash = uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const adjIndex = hash % ADJECTIVES.length;
  const animalIndex = (hash * 7) % ANIMALS.length;
  return `${ADJECTIVES[adjIndex]} ${ANIMALS[animalIndex]}`;
}
