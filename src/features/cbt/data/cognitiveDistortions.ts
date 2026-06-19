/**
 * ============================================================
 * features/cbt/data/cognitiveDistortions.ts — A-B-C distortion catalogue
 * ============================================================
 *
 * The ten classic cognitive distortions, shown as selectable chips in the
 * A-B-C method's distortion step. Static content.
 * ============================================================
 */

import { CognitiveDistortion } from "../types";

export const cognitiveDistortions: CognitiveDistortion[] = [
  {
    id: "all-or-nothing",
    label: "All-or-nothing thinking",
    description:
      "You see things in black-and-white categories. If a situation is anything less than perfect, you see it as a total failure.",
  },
  {
    id: "overgeneralization",
    label: "Overgeneralization",
    description: "You see a single negative event as a never-ending pattern of defeat.",
  },
  {
    id: "mental-filter",
    label: "Mental filter",
    description:
      "You pick out a single negative detail and dwell on it exclusively, so your view of reality becomes darkened.",
  },
  {
    id: "disqualifying-positive",
    label: "Disqualifying the positive",
    description:
      "You reject positive experiences by insisting they 'don't count' for some reason.",
  },
  {
    id: "jumping-to-conclusions",
    label: "Jumping to conclusions",
    description:
      "You make a negative interpretation even though there are no definite facts that convincingly support your conclusion.",
  },
  {
    id: "catastrophizing",
    label: "Catastrophizing",
    description:
      'You expect disaster. You notice or hear about a problem and immediately think "What if it happens to me?"',
  },
  {
    id: "emotional-reasoning",
    label: "Emotional reasoning",
    description:
      'You assume your negative emotions necessarily reflect the way things really are: "I feel it, therefore it must be true."',
  },
  {
    id: "should-statements",
    label: "Should statements",
    description:
      "You try to motivate yourself with shoulds and shouldn'ts. The emotional consequence is guilt.",
  },
  {
    id: "labeling",
    label: "Labeling",
    description:
      'Instead of describing your error, you attach a negative label to yourself: "I\'m a loser."',
  },
  {
    id: "personalization",
    label: "Personalization",
    description:
      "You see yourself as the cause of some negative external event for which, in fact, you were not primarily responsible.",
  },
];
