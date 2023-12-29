/**
 * @module utils
 */

import { AnsiColor } from './interface';

export function toUint8(uint8: number): number {
  return uint8 & 0xff;
}

// Index 16..231 : RGB 6x6x6
// https://gist.github.com/jasonm23/2868981
const COLOR_SEEDS = [0, 95, 135, 175, 215, 255];

// Colors 256 bit 16..255
export const COLORS256_FIXED: AnsiColor[] = [];

for (let r = 0; r < 6; ++r) {
  for (let g = 0; g < 6; ++g) {
    for (let b = 0; b < 6; ++b) {
      COLORS256_FIXED.push([COLOR_SEEDS[r], COLOR_SEEDS[g], COLOR_SEEDS[b]]);
    }
  }
}

// Index 232..255 : Grayscale
let grayscale = 8;

for (let i = 0; i < 24; ++i, grayscale += 10) {
  COLORS256_FIXED.push([grayscale, grayscale, grayscale]);
}

export function getThemeColor(defaultColor: AnsiColor, color?: AnsiColor): AnsiColor {
  if (color) {
    const [r, g, b] = color;

    return [toUint8(r), toUint8(g), toUint8(b)];
  }

  return defaultColor;
}
