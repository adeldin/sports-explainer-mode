// Formation SVG renderer — PURE (string in → SVG string out), standalone, NOT wired into the app.
// Takes a team's placed players (from layoutFormation), the formation string, and the team name, and
// draws a schematic vertical pitch: GK at the BOTTOM, attack going UP (depth y=0 = own end → bottom).
// Brand: navy #0d1b3e ground, subtle teal markings, orange player tokens.
//
// NOTE — option (b) "compaction pass" is now IMPLEMENTED in formationLayout.compactDoublePivot (the
// engine, not here): when the `formation` string's first midfield band is exactly 2 AND ESPN labelled
// both as wide mids (e.g. France's Koné/Tchouaméni as LM/RM), they're pulled to center (~0.38/0.62) so
// a double pivot doesn't render as two touchline mids with a hollow center. Genuine wide mids (a 3+
// band like 4-3-3) are untouched. This renderer just draws whatever coordinates the engine returns.

import type { PlacedPlayer } from './formationLayout';

const FONT = "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif";
const NAVY = '#0d1b3e';
const TEAL = '#14B8A6';
const ORANGE = '#E87722';
const WHITE = '#ffffff';
const MUTED = '#cbd5e1';

// geometry
// EXPL_H sized for up to 7 wrapped lines of Coach-tier text (SVG_H is derived from it → canvas
// auto-grows, nothing clips). 7 lines @ 17px from explTop+42 end at +144, inside the +170 box.
const MARGIN = 24, TITLE_H = 64, PITCH_W = 380, PITCH_H = 560, GAP = 18, EXPL_H = 170, TOP = 18;
const PAD = 34;                        // inset so circles + names stay inside the touchlines
const R = 16;                          // player token radius

const pitchLeft = MARGIN;
const pitchTop = TOP + TITLE_H;
const pitchRight = pitchLeft + PITCH_W;
const pitchBottom = pitchTop + PITCH_H;
const SVG_W = PITCH_W + MARGIN * 2;
const explTop = pitchBottom + GAP;
const SVG_H = explTop + EXPL_H + MARGIN;

const innerLeft = pitchLeft + PAD, innerRight = pitchRight - PAD;
const innerTop = pitchTop + PAD, innerBottom = pitchBottom - PAD;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const n2 = (v: number) => Math.round(v * 100) / 100;

// normalized (x = lateral 0..1, depth y = 0 own-end) → pitch pixels (own end at BOTTOM, attack UP)
function toPx(x: number, depth: number): { px: number; py: number } {
  return {
    px: innerLeft + x * (innerRight - innerLeft),
    py: innerTop + (1 - depth) * (innerBottom - innerTop),
  };
}

function pitchMarkings(): string {
  const cx = (pitchLeft + pitchRight) / 2;
  const cy = (pitchTop + pitchBottom) / 2;
  const m = (d: string) => `<path d="${d}" fill="none" stroke="${TEAL}" stroke-width="1.5" stroke-opacity="0.32"/>`;
  const boxW = PITCH_W * 0.55, boxH = PITCH_H * 0.14, boxX = cx - boxW / 2;
  const gaW = PITCH_W * 0.28, gaH = PITCH_H * 0.06, gaX = cx - gaW / 2;
  const ccR = PITCH_W * 0.13;
  return [
    // outer boundary
    `<rect x="${pitchLeft}" y="${pitchTop}" width="${PITCH_W}" height="${PITCH_H}" rx="6" fill="none" stroke="${TEAL}" stroke-width="1.5" stroke-opacity="0.4"/>`,
    // halfway line + center circle + spot
    m(`M ${pitchLeft} ${cy} H ${pitchRight}`),
    `<circle cx="${cx}" cy="${cy}" r="${n2(ccR)}" fill="none" stroke="${TEAL}" stroke-width="1.5" stroke-opacity="0.32"/>`,
    `<circle cx="${cx}" cy="${cy}" r="2" fill="${TEAL}" fill-opacity="0.4"/>`,
    // bottom penalty box (own end) + goal area
    `<rect x="${n2(boxX)}" y="${n2(pitchBottom - boxH)}" width="${n2(boxW)}" height="${n2(boxH)}" fill="none" stroke="${TEAL}" stroke-width="1.5" stroke-opacity="0.32"/>`,
    `<rect x="${n2(gaX)}" y="${n2(pitchBottom - gaH)}" width="${n2(gaW)}" height="${n2(gaH)}" fill="none" stroke="${TEAL}" stroke-width="1.5" stroke-opacity="0.32"/>`,
    // top penalty box (attacking end) + goal area
    `<rect x="${n2(boxX)}" y="${pitchTop}" width="${n2(boxW)}" height="${n2(boxH)}" fill="none" stroke="${TEAL}" stroke-width="1.5" stroke-opacity="0.32"/>`,
    `<rect x="${n2(gaX)}" y="${pitchTop}" width="${n2(gaW)}" height="${n2(gaH)}" fill="none" stroke="${TEAL}" stroke-width="1.5" stroke-opacity="0.32"/>`,
  ].join('\n  ');
}

function playerToken(p: PlacedPlayer): string {
  const { px, py } = toPx(p.x, p.y);
  const name = esc(trunc(p.shortName, 12));
  return [
    `<g>`,
    `<circle cx="${n2(px)}" cy="${n2(py)}" r="${R}" fill="${ORANGE}" stroke="${NAVY}" stroke-width="1.5"/>`,
    `<text x="${n2(px)}" y="${n2(py)}" text-anchor="middle" dominant-baseline="central" font-family="${FONT}" font-size="14" font-weight="700" fill="${WHITE}">${esc(p.jersey)}</text>`,
    `<text x="${n2(px)}" y="${n2(py + R + 11)}" text-anchor="middle" font-family="${FONT}" font-size="8.5" fill="${WHITE}">${name}</text>`,
    `</g>`,
  ].join('\n  ');
}

// Greedy word-wrap to fit the slot. When text exceeds maxLines, append "…" to the last line (trimmed
// to fit WITH the ellipsis) so over-long copy is honestly marked truncated, never cut mid-clause and
// silently. Returns [] for empty input; the slot then shows its placeholder.
export function wrap(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  let i = 0;
  while (i < words.length && lines.length < maxLines) {
    const w = words[i];
    const candidate = cur ? `${cur} ${w}` : w;
    if (candidate.length <= maxChars) { cur = candidate; i++; }        // word fits on this line
    else if (cur) { lines.push(cur); cur = ''; }                       // line full → wrap (re-try w next loop)
    else { lines.push(w.slice(0, maxChars)); i++; }                    // single word longer than a line → hard split
  }
  if (cur && lines.length < maxLines) { lines.push(cur); cur = ''; }   // flush the last partial line
  const overflow = i < words.length || cur !== '';                    // words left unplaced?
  if (overflow && lines.length > 0) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = (last.length > maxChars - 1 ? last.slice(0, maxChars - 1).trimEnd() : last) + '…';
  }
  return lines;
}

function explanationSlot(formation: string, explanation?: string): string {
  const label = `<text x="${pitchLeft + 12}" y="${explTop + 20}" font-family="${FONT}" font-size="10" font-weight="700" fill="${TEAL}" letter-spacing="1">COACH'S READ · ${esc(formation)}</text>`;
  const box = `<rect x="${pitchLeft}" y="${explTop}" width="${PITCH_W}" height="${EXPL_H}" rx="8" fill="#ffffff" fill-opacity="0.03" stroke="${TEAL}" stroke-width="1" stroke-opacity="0.3" stroke-dasharray="4 4"/>`;
  let body: string;
  if (explanation && explanation.trim()) {
    const lines = wrap(explanation, 58, 7);
    body = lines.map((ln, i) => `<text x="${pitchLeft + 12}" y="${explTop + 42 + i * 17}" font-family="${FONT}" font-size="11" fill="${MUTED}">${esc(ln)}</text>`).join('\n  ');
  } else {
    body = `<text x="${pitchLeft + 12}" y="${explTop + 46}" font-family="${FONT}" font-size="11" fill="${MUTED}" fill-opacity="0.5" font-style="italic">— explanation slot (wired in a later step) —</text>`;
  }
  return [box, label, body].join('\n  ');
}

export interface FormationSvgOpts {
  teamName: string;
  formation: string;
  players: PlacedPlayer[];
  explanation?: string;   // optional — when omitted, the slot renders empty (graceful)
}

export function renderFormationSvg(opts: FormationSvgOpts): string {
  const { teamName, formation, players, explanation } = opts;
  const title = `<text x="${pitchLeft}" y="${TOP + 30}" font-family="${FONT}" font-size="26" font-weight="700" fill="${ORANGE}">${esc(formation || '—')}</text>`;
  const sub = `<text x="${pitchLeft}" y="${TOP + 50}" font-family="${FONT}" font-size="13" fill="${MUTED}">${esc(teamName)} · starting XI</text>`;
  const tokens = players.map(playerToken).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${SVG_W} ${SVG_H}">
  <rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${NAVY}"/>
  ${title}
  ${sub}
  ${pitchMarkings()}
  ${tokens}
  ${explanationSlot(formation, explanation)}
</svg>
`;
}
