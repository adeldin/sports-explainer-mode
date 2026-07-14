// Zone Tap — region model + authoring helpers. Split OUT of lib/zoneTap.ts so the
// per-sport banks can import these without a cycle: zoneTap.ts imports the banks at its
// top, so a bank importing helpers back from zoneTap.ts would hit them before they're
// initialized (TDZ crash at module load). Import graph is strictly one-way:
//   zoneTap.ts → zoneTapBank/*.ts → zoneTapRegions.ts
// PURE DATA LIB: zero react-native imports.
import type { Level } from './api';

// ── The answer model: TAPPED REGIONS, not multiple choice ──────────────────
// A region is a target in the surface's viewBox coordinates (see the coordinate
// contract in lib/zoneTap.ts). The component renders every spot as a visible marker
// with an OVERSIZED transparent hit target behind it (the two-circle pattern from
// Where's the Play); exactly one spot is the answer.
export type ZoneRegion =
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number };

export interface ZoneSpot {
  key: string;        // unique within the scenario
  region: ZoneRegion; // viewBox coords of the sport's surface
}

export interface ZoneScenario {
  id: string;            // unique within the bank, e.g. 'mlb-kid-1'
  level: Level;          // the tier this scenario BELONGS to (content is tiered, not just points)
  prompt: string;        // "Tap where the shortstop stands."
  spots: ZoneSpot[];     // 2–5 tappable regions on the surface
  answer: string;        // key of the correct spot
  title: string;         // verdict headline shown after the tap
  // The teaching beat — the same spot re-explained at all four depths (the
  // exp: Record<Level, string> pattern from lib/boxCount.ts; VerdictCard's
  // tabs let the user re-read at any depth).
  exp: Record<Level, string>;
}

// Authoring helpers (used by every bank — keeps 240 scenario literals compact).
export const circle = (key: string, cx: number, cy: number, r: number): ZoneSpot =>
  ({ key, region: { kind: 'circle', cx, cy, r } });
export const rectSpot = (key: string, x: number, y: number, w: number, h: number): ZoneSpot =>
  ({ key, region: { kind: 'rect', x, y, w, h } });

// Geometric center of a region — where the component anchors bursts/rings.
export function regionCenter(r: ZoneRegion): [number, number] {
  return r.kind === 'circle' ? [r.cx, r.cy] : [r.x + r.w / 2, r.y + r.h / 2];
}
