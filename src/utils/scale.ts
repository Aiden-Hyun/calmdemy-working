import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const BASE_WIDTH = 393; // iPhone 14/15 design base
const DENSITY = 0.75;

export function scale(size: number): number {
  return Math.round(size * (width / BASE_WIDTH) * DENSITY);
}

export function moderateScale(size: number, factor: number = 0.5): number {
  return Math.round((size + (scale(size) - size) * factor) * DENSITY);
}
