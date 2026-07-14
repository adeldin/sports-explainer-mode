import React, { useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

// ============================================================================
// Higher or Lower — ART MODULE. Every presentational piece of the standings
// game (the two team cards, the VS badge, the revealed stat chip) lives HERE
// and only here (build doc §0.4: art is a placeholder, swappable in ONE file).
// The game component passes names/URLs/strings and knows nothing about sizes
// or panels; designers replace this whole file without touching game logic.
//
// Conventions (matching crestKitArt.tsx):
// - A crest panel is LIGHT in every app theme — ESPN crests are authored
//   against light backgrounds (Yankees navy, All Blacks fern vanish on dark).
//   Fixed palette, not theme tokens.
// - Remote images render with the bare <Image source={{ uri }}> pattern proven
//   in components/GameCard.tsx; a failed crest falls back to a placeholder
//   glyph and the card stays fully playable (the name carries the round).
// ============================================================================

const ART = {
  panel: '#f4f6fa',       // light crest backdrop (fixed in every theme)
  panelBorder: '#d9dfe8',
  ink: '#242b38',         // team name on the light panel
  inkSoft: '#8a94a6',     // placeholder glyph / abbr
  correct: '#34C759',
  wrong: '#FF3B30',
  chipBg: '#242b38',
  chipText: '#ffffff',
};

// One tappable side of the comparison. `judged` reveals the live stat value in
// a chip and paints the verdict border; before judgment the card shows ONLY
// crest + name (that's the whole game).
export function TeamStatCard({ name, abbr, logo, judged, isAnswer, isChosen, statValue }: {
  name: string;
  abbr?: string;
  logo?: string;
  judged: boolean;
  isAnswer: boolean;   // this side holds the correct answer
  isChosen: boolean;   // the player tapped this side
  statValue?: string;  // live display value ("+44", ".596") — shown once judged
}) {
  const [failed, setFailed] = useState(false);
  const border =
    judged && isAnswer ? ART.correct
    : judged && isChosen ? ART.wrong
    : ART.panelBorder;
  return (
    <View style={[s.card, { borderColor: border }, judged && (isAnswer || isChosen) && s.cardJudged]}>
      <View style={s.crestBox}>
        {!logo || failed ? (
          <Text style={s.placeholder}>🛡️</Text>
        ) : (
          <Image
            source={{ uri: logo }}
            style={s.crest}
            resizeMode="contain"
            onError={() => setFailed(true)}
          />
        )}
      </View>
      <Text style={s.name} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>{name}</Text>
      {!!abbr && <Text style={s.abbr}>{abbr}</Text>}
      {/* The reveal: the live number, colored by verdict. Reserved height so the
          card doesn't jump when the chip appears. */}
      <View style={s.chipSlot}>
        {judged && statValue !== undefined && (
          <View style={[s.chip, isAnswer ? s.chipCorrect : s.chipPlain]}>
            <Text style={s.chipText}>{statValue}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// The little separator between the two cards.
export function VsBadge() {
  return (
    <View style={s.vs}>
      <Text style={s.vsText}>VS</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: ART.panel,
    borderWidth: 2.5,
    borderColor: ART.panelBorder,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  cardJudged: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  crestBox: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  crest: { width: 80, height: 80 },
  placeholder: { fontSize: 44, color: ART.inkSoft },
  name: {
    color: ART.ink, fontSize: 15, fontWeight: '800', textAlign: 'center',
    marginTop: 8, minHeight: 38,
  },
  abbr: { color: ART.inkSoft, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  chipSlot: { height: 34, marginTop: 8, justifyContent: 'center' },
  chip: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 },
  chipPlain: { backgroundColor: ART.chipBg },
  chipCorrect: { backgroundColor: ART.correct },
  chipText: { color: ART.chipText, fontSize: 16, fontWeight: '900' },
  vs: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: ART.chipBg,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
  },
  vsText: { color: ART.chipText, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
});
