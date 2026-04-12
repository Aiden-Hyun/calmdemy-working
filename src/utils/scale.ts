import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const BASE_WIDTH = 393; // iPhone 14/15 design base

/**
 * Scale a value proportionally to screen width.
 * Use for spacing, dimensions, and layout sizes.
 */
export function scale(size: number): number {
  return Math.round(size * (width / BASE_WIDTH));
}

/**
 * Scale with a dampening factor (default 0.5).
 * Use for font sizes and line heights where extreme scaling looks wrong.
 * factor=0 means no scaling, factor=1 means full proportional scaling.
 */
export function moderateScale(size: number, factor: number = 0.5): number {
  return Math.round(size + (scale(size) - size) * factor);
}
