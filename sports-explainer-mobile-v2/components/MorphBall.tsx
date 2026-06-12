import Animated, {
  useAnimatedProps,
  interpolateColor,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path, Line, G } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

export const BALL_SIZE = 160;
const C = BALL_SIZE / 2; // center (80)

/**
 * Every ball silhouette shares ONE topology: a closed path of 4 cubic Béziers
 * (top→right→bottom→left). Only these 4 scalars differ per sport, so we can
 * linearly interpolate between sports with plain arithmetic — no morph library.
 *   [Rx, Ry, handleX, handleY]
 * Small handleY at the side anchors = sharp points (football / rugby tips).
 *
 * Order chosen so consecutive shapes morph smoothly (3 circles, then 2 ovals):
 *   0 baseball · 1 basketball · 2 soccer · 3 football · 4 rugby (settle)
 */
const SHAPES: number[][] = [
  [46, 46, 25.4, 25.4], // baseball   (circle)
  [46, 46, 25.4, 25.4], // basketball (circle)
  [46, 46, 25.4, 25.4], // soccer     (circle)
  [56, 34, 30, 8],      // football   (pointed oval)
  [60, 33, 33, 6],      // rugby      (longer, sharper oval)
];

function buildPath(rx: number, ry: number, kx: number, ky: number): string {
  'worklet';
  const top = C - ry;
  const bot = C + ry;
  const left = C - rx;
  const right = C + rx;
  return (
    `M ${C} ${top} ` +
    `C ${C + kx} ${top} ${right} ${C - ky} ${right} ${C} ` +
    `C ${right} ${C + ky} ${C + kx} ${bot} ${C} ${bot} ` +
    `C ${C - kx} ${bot} ${left} ${C + ky} ${left} ${C} ` +
    `C ${left} ${C - ky} ${C - kx} ${top} ${C} ${top} Z`
  );
}

function silhouetteProps(m: number) {
  'worklet';
  const i = Math.min(Math.max(Math.floor(m), 0), SHAPES.length - 2);
  const t = m - i;
  const a = SHAPES[i];
  const b = SHAPES[i + 1];
  return {
    d: buildPath(
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
      a[3] + (b[3] - a[3]) * t,
    ),
    stroke: interpolateColor(m, [0, 2, 4], ['#4dff95', '#2ee6b0', '#22d3ee']),
  };
}

// ── Interior markings — what actually makes each ball legible ──
// Each set inherits stroke color + width from its wrapping <G>; no own stroke.
function MarksBaseball() {
  return (
    <>
      <Path d="M 66 44 Q 86 80 66 116" />
      <Path d="M 94 44 Q 74 80 94 116" />
      <Line x1="69" y1="56" x2="91" y2="60" />
      <Line x1="73" y1="70" x2="87" y2="66" />
      <Line x1="73" y1="90" x2="87" y2="94" />
      <Line x1="69" y1="104" x2="91" y2="100" />
    </>
  );
}
function MarksBasketball() {
  return (
    <>
      <Path d="M 80 34 Q 70 80 80 126" />
      <Path d="M 35 80 Q 80 92 125 80" />
      <Path d="M 52 40 Q 70 80 52 120" />
      <Path d="M 108 40 Q 90 80 108 120" />
    </>
  );
}
function MarksSoccer() {
  return (
    <>
      <Path d="M 80 64 L 95 75 L 89 93 L 71 93 L 65 75 Z" />
      <Line x1="80" y1="64" x2="80" y2="48" />
      <Line x1="95" y1="75" x2="110" y2="68" />
      <Line x1="89" y1="93" x2="98" y2="110" />
      <Line x1="71" y1="93" x2="62" y2="110" />
      <Line x1="65" y1="75" x2="50" y2="68" />
    </>
  );
}
function MarksFootball() {
  return (
    <>
      <Line x1="56" y1="80" x2="104" y2="80" />
      <Line x1="68" y1="74" x2="68" y2="86" />
      <Line x1="74" y1="73" x2="74" y2="87" />
      <Line x1="80" y1="72" x2="80" y2="88" />
      <Line x1="86" y1="73" x2="86" y2="87" />
      <Line x1="92" y1="74" x2="92" y2="86" />
    </>
  );
}
function MarksRugby() {
  return (
    <>
      <Line x1="36" y1="80" x2="124" y2="80" />
      <Path d="M 62 56 Q 54 80 62 104" />
      <Path d="M 98 56 Q 106 80 98 104" />
    </>
  );
}

const MARKS = [MarksBaseball, MarksBasketball, MarksSoccer, MarksFootball, MarksRugby];

// Fixed neon color for markings this step (animated green→cyan comes at wire-up).
const MARK_GLOW = '#46e3bf';
const MARK_CORE = '#d6fff4';

/**
 * Neon line-art ball that morphs through baseball → basketball → soccer →
 * football → rugby. Silhouette is a true continuous morph; interior markings
 * cross-fade (tent function of `morph`). Glow is faked with stacked strokes.
 * Driven by the `morph` shared value (0..4) owned by the parent.
 */
export default function MorphBall({ morph }: { morph: SharedValue<number> }) {
  const glowProps = useAnimatedProps(() => silhouetteProps(morph.value));
  const lineProps = useAnimatedProps(() => silhouetteProps(morph.value));

  // One tent-opacity per sport: peaks at its index, fades to 0 one step away.
  const t0 = useAnimatedProps(() => ({ opacity: Math.min(Math.max(1 - Math.abs(morph.value - 0), 0), 1) }));
  const t1 = useAnimatedProps(() => ({ opacity: Math.min(Math.max(1 - Math.abs(morph.value - 1), 0), 1) }));
  const t2 = useAnimatedProps(() => ({ opacity: Math.min(Math.max(1 - Math.abs(morph.value - 2), 0), 1) }));
  const t3 = useAnimatedProps(() => ({ opacity: Math.min(Math.max(1 - Math.abs(morph.value - 3), 0), 1) }));
  const t4 = useAnimatedProps(() => ({ opacity: Math.min(Math.max(1 - Math.abs(morph.value - 4), 0), 1) }));
  const tents = [t0, t1, t2, t3, t4];

  return (
    <Svg width={BALL_SIZE} height={BALL_SIZE} viewBox={`0 0 ${BALL_SIZE} ${BALL_SIZE}`}>
      {/* silhouette — neon dual stroke, animated green→cyan (proven in step 1) */}
      <AnimatedPath
        animatedProps={glowProps}
        fill="none"
        strokeWidth={7}
        strokeOpacity={0.22}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <AnimatedPath
        animatedProps={lineProps}
        fill="none"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* interior markings — each sport cross-fades via its tent opacity */}
      {MARKS.map((Marks, i) => (
        <AnimatedG
          key={i}
          animatedProps={tents[i]}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <G stroke={MARK_GLOW} strokeWidth={6} strokeOpacity={0.16}>
            <Marks />
          </G>
          <G stroke={MARK_CORE} strokeWidth={2} strokeOpacity={0.95}>
            <Marks />
          </G>
        </AnimatedG>
      ))}
    </Svg>
  );
}
