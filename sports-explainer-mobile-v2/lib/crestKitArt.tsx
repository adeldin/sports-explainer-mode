import React, { useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

// ============================================================================
// Crest Rush / Kit Clash — ART MODULE. Every presentational piece of the two
// live-data games (the crest hero card, the crest answer tiles, the color
// swatches) lives HERE and only here (build doc §0.4: art is a placeholder,
// swappable in ONE file). The game component passes URLs/hex strings and knows
// nothing about sizes, crops, or panels; designers replace this whole file
// without touching data or game logic.
//
// Conventions (matching readTheScoreArt / FieldEngine):
// - A crest panel is LIGHT in every app theme (like a field is green in every
//   theme) — ESPN crests are authored against light backgrounds, and several
//   (Yankees navy, All Blacks fern) vanish on dark. Fixed palette, not tokens.
// - Remote images render with the bare <Image source={{ uri }}> pattern proven
//   in components/GameCard.tsx. onError is surfaced so the game can skip a
//   round whose crest never arrives (offline mid-session, CDN hiccup).
// ============================================================================

const ART = {
  panel: '#f4f6fa',       // light crest backdrop (fixed in every theme)
  panelBorder: '#d9dfe8',
  ink: '#8a94a6',         // placeholder glyph color
};

// ── Crest hero (the question: one big crest) ────────────────────────────────
// `zoom` (expert tier) shows only a CROP of the mark: the image is scaled up
// inside an overflow-hidden window and shoved toward a corner picked
// deterministically from `seed` (the team id), so the same team always crops
// the same way but different teams crop differently.
export function CrestHero({ uri, zoom, seed = 0, onError }: {
  uri?: string;
  zoom?: boolean;
  seed?: number;
  onError?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const corner = Math.abs(seed) % 4; // 0 TL · 1 TR · 2 BL · 3 BR
  const dx = (corner % 2 === 0 ? 1 : -1) * 26;
  const dy = (corner < 2 ? 1 : -1) * 26;

  return (
    <View style={s.heroCard}>
      {!uri || failed ? (
        <Text style={s.placeholder}>🛡️</Text>
      ) : zoom ? (
        <View style={s.zoomWindow}>
          <Image
            source={{ uri }}
            style={[s.zoomImage, { transform: [{ scale: 2.6 }, { translateX: dx }, { translateY: dy }] }]}
            resizeMode="contain"
            onError={() => { setFailed(true); onError?.(); }}
          />
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={s.heroImage}
          resizeMode="contain"
          onError={() => { setFailed(true); onError?.(); }}
        />
      )}
    </View>
  );
}

// ── Crest answer tile (name → pick the crest; rendered inside a touchable) ──
export function CrestChoice({ uri }: { uri?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={s.choiceCard}>
      {!uri || failed ? (
        <Text style={s.choicePlaceholder}>🛡️</Text>
      ) : (
        <Image
          source={{ uri }}
          style={s.choiceImage}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

// ── Kit swatches (the question: two brand colors, ZERO text) ────────────────
export function KitSwatches({ primary, alt }: { primary?: string; alt?: string }) {
  return (
    <View style={s.heroCard}>
      <View style={s.swatchRow}>
        <View style={[s.swatch, { backgroundColor: primary || ART.panel }]} />
        <View style={[s.swatch, { backgroundColor: alt || ART.panel }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  heroCard: {
    backgroundColor: ART.panel,
    borderColor: ART.panelBorder,
    borderWidth: 1,
    borderRadius: 18,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: { width: 150, height: 150 },
  zoomWindow: {
    width: 150,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: ART.panelBorder,
  },
  zoomImage: { width: 150, height: 150 },
  placeholder: { fontSize: 64, color: ART.ink },
  choiceCard: {
    backgroundColor: ART.panel,
    borderRadius: 12,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceImage: { width: 68, height: 68 },
  choicePlaceholder: { fontSize: 34, color: ART.ink },
  swatchRow: { flexDirection: 'row', gap: 18 },
  swatch: {
    width: 96,
    height: 128,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: ART.panelBorder, // keeps a white/near-white kit visible on the panel
  },
});
