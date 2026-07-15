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

// ── Context marks: the ORIENTING layer (owner feedback pass) ────────────────
// Marks are non-interactive scene furniture drawn BEHIND the tappable regions so the
// scene matches the prompt's words: a ball at the spot the prompt references ("corner
// from the TOP corner" → ball at that corner), and the context players that make a
// positional question judgeable (the offense/defense/fielders that define the space).
// Pure data here; the ART for each kind lives in the component's mark renderer
// (swappable by a designer without touching any bank).
//
// AUTHORING RULES (applied across every bank — keep them when adding scenarios):
//  · Never draw the player/object the prompt asks the user to LOCATE.
//  · Don't place a context player inside a candidate ring, EXCEPT when the scene is
//    the point (defenders massed in "the box", the keeper on his line) — truthful
//    occupation of a region beats an implausibly empty field.
//  · Team semantics: 'att' = the team the prompt frames as "you"/the attack;
//    'def' = the opposition. Fielding sides (baseball/cricket) are 'def'.
export type ZoneMark =
  | { kind: 'ball'; x: number; y: number }                                      // sport-styled ball/puck at a referenced spot
  | { kind: 'player'; x: number; y: number; side: 'att' | 'def'; label?: string } // context player dot (optional tiny label)
  | { kind: 'flag'; x: number; y: number }                                      // small pennant (golf pin positions etc.)
  | { kind: 'guide'; x1: number; y1: number; x2: number; y2: number; arrow?: boolean }; // dashed reference line (wind, entry path)

export interface ZoneScenario {
  id: string;            // unique within the bank, e.g. 'mlb-kid-1'
  level: Level;          // the tier this scenario BELONGS to (content is tiered, not just points)
  prompt: string;        // "Tap where the shortstop stands."
  spots: ZoneSpot[];     // 2–5 tappable regions on the surface
  answer: string;        // key of the correct spot
  marks?: ZoneMark[];    // optional context layer, rendered UNDER the tappable spots
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

// Context-mark helpers (same compactness idea, for the marks layer).
export const ball = (x: number, y: number): ZoneMark => ({ kind: 'ball', x, y });
export const att = (x: number, y: number, label?: string): ZoneMark => ({ kind: 'player', x, y, side: 'att', label });
export const def = (x: number, y: number, label?: string): ZoneMark => ({ kind: 'player', x, y, side: 'def', label });
export const flag = (x: number, y: number): ZoneMark => ({ kind: 'flag', x, y });
export const guide = (x1: number, y1: number, x2: number, y2: number, arrow = false): ZoneMark =>
  ({ kind: 'guide', x1, y1, x2, y2, arrow });

// Geometric center of a region — where the component anchors bursts/rings.
export function regionCenter(r: ZoneRegion): [number, number] {
  return r.kind === 'circle' ? [r.cx, r.cy] : [r.x + r.w / 2, r.y + r.h / 2];
}
