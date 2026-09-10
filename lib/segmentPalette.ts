// lib/segmentPalette.ts
//
// Fixed categorical color assignment for the 5 segments that ever appear
// together on a chart (1 baseline + 4 M&A targets). Colors are assigned in a
// fixed order and never cycled/reassigned based on filters, per the dataviz
// palette rules -- a segment keeps its color whether or not the others are
// visible. Values are the validated default palette's slots 1-5.

export interface SegmentColor {
  light: string;
  dark: string;
}

const SLOT: Record<string, SegmentColor> = {
  blue: { light: '#2a78d6', dark: '#3987e5' },
  orange: { light: '#eb6834', dark: '#d95926' },
  aqua: { light: '#1baf7a', dark: '#199e70' },
  yellow: { light: '#eda100', dark: '#c98500' },
  magenta: { light: '#e87ba4', dark: '#d55181' },
};

// Baseline is always slot 1 (blue) regardless of which owned brand is
// selected -- it plays the same visual role ("the reference line") no
// matter which segment_key backs it.
export const BASELINE_COLOR = SLOT.blue;

// Targets keep a stable color per brand so switching the baseline never
// repaints them.
export const TARGET_COLORS: Record<string, SegmentColor> = {
  cutwater: SLOT.orange,
  luxardo: SLOT.aqua,
  appleton: SLOT.yellow,
  uncle_nearest: SLOT.magenta,
};

export function colorForSegment(segmentKey: string, role: 'baseline' | 'target'): SegmentColor {
  if (role === 'baseline') return BASELINE_COLOR;
  return TARGET_COLORS[segmentKey] ?? SLOT.orange;
}

// Sequential blue ramp (palette.md) for magnitude encodings -- used by the
// similarity heatmap, where "how different" is a 0..N magnitude, not an
// identity.
export const SEQUENTIAL_BLUE = {
  light: ['#cde2fb', '#9ec5f4', '#5598e7', '#2a78d6', '#184f95'],
  dark: ['#1c355c', '#184f95', '#1c5cab', '#3987e5', '#86b6ef'],
};
