// Read-the-play quiz generator — produces QuizQuestion-shaped items from the 12 canonical formations,
// scaled by difficulty. Lower tiers (kid/beginner) = NAME-THE-FORMATION (diagram with the label hidden);
// higher tiers (intermediate/expert) = WEAKNESS (labeled diagram, "what's its main weakness?"). Each
// question carries its `formation` key so the card renders the synthetic diagram as the question visual.
// Pure (no RN) — safe to unit-test in tsx.

import { Level } from './api';
import { FormationKey, FORMATION_EXPLANATIONS } from './formationExplanations';

export interface FormationQuizQuestion {
  q: string;
  options: string[];
  answer: number;          // index into options of the correct answer (the card shuffles + remaps)
  explanation: string;     // the full read, revealed on answer
  difficulty: Level;
  formation: FormationKey; // which canonical diagram the card renders above the options
  showLabel: boolean;      // true = show the formation name on the diagram (weakness Qs); false = hide (name Qs)
}

const ALL_FORMATIONS = Object.keys(FORMATION_EXPLANATIONS) as FormationKey[];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Curated weakness phrases (Fix 1) — ONE short, uniform phrase per formation (~4–5 words, same register
// and length) so ALL four options match in style. The earlier mined sentences made the correct answer
// the longest option = a gameable tell; a curated map removes that. Used for BOTH the correct answer and
// the distractors. The FULL FORMATION_EXPLANATIONS read stays the reveal/explanation (unchanged).
export const FORMATION_WEAKNESS: Record<FormationKey, string> = {
  '4-3-3':   'Fullbacks exposed in wide areas',
  '4-2-3-1': 'Striker cut off from support',
  '4-4-2':   'Outnumbered in central midfield',
  '4-1-4-1': 'Lone striker isolated up top',
  '4-5-1':   'Little attacking support up front',
  '3-5-2':   'Space in behind the wing-backs',
  '3-4-3':   'Thin in central midfield',
  '5-3-2':   'Cedes territory and wide areas',
  '4-4-1-1': 'Striker isolated if support drops',
  '5-4-1':   'Very little attacking threat',
  '4-2-2-2': 'No natural width out wide',
  '3-4-1-2': 'Vulnerable in wide transitions',
};

export function weaknessPhrase(formation: FormationKey): string {
  return FORMATION_WEAKNESS[formation];
}

// Defenders = the formation string's first number ('4-3-3' → 4, '3-5-2' → 3, '5-3-2' → 5).
const defCount = (f: FormationKey): number => parseInt(f.split('-')[0], 10);

function nameQuestion(formation: FormationKey, level: Level): FormationQuizQuestion {
  // Fix 2: prefer distractors with the SAME back-line count (tests shape recognition, not just counting
  // defenders), then fall back to other counts to always fill 3.
  const others = ALL_FORMATIONS.filter((f) => f !== formation);
  const sameBack = shuffle(others.filter((f) => defCount(f) === defCount(formation)));
  const otherBack = shuffle(others.filter((f) => defCount(f) !== defCount(formation)));
  const distractors = [...sameBack, ...otherBack].slice(0, 3) as string[];
  return {
    q: 'What formation is this?',
    options: [formation as string, ...distractors],   // correct first; card shuffles
    answer: 0,
    explanation: FORMATION_EXPLANATIONS[formation][level],
    difficulty: level,
    formation,
    showLabel: false,
  };
}

function weaknessQuestion(formation: FormationKey, level: Level): FormationQuizQuestion {
  const correct = weaknessPhrase(formation);
  const seen = new Set([correct]);
  const distractors: string[] = [];
  for (const f of shuffle(ALL_FORMATIONS.filter((x) => x !== formation))) {
    if (distractors.length >= 3) break;
    const p = weaknessPhrase(f);
    if (p && !seen.has(p)) { seen.add(p); distractors.push(p); }  // de-dup; never repeat the correct one
  }
  return {
    q: "What's this formation's main weakness?",
    options: [correct, ...distractors],
    answer: 0,
    explanation: FORMATION_EXPLANATIONS[formation][level],
    difficulty: level,
    formation,
    showLabel: true,
  };
}

// Difficulty scales the QUESTION TYPE: kid/beginner → name-the-formation; intermediate/expert → weakness.
export function generateFormationQuestion(formation: FormationKey, level: Level): FormationQuizQuestion {
  const nameType = level === 'kid' || level === 'beginner';
  return nameType ? nameQuestion(formation, level) : weaknessQuestion(formation, level);
}

// One question per formation at the given level (12), shuffled — the card's cycling pool.
export function buildFormationQuestionPool(level: Level): FormationQuizQuestion[] {
  return shuffle(ALL_FORMATIONS.map((f) => generateFormationQuestion(f, level)));
}
