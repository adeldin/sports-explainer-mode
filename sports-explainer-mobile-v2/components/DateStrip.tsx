import { ScrollView, TouchableOpacity, View, Text, StyleSheet, Dimensions } from 'react-native';
import { useMemo, useRef, useEffect } from 'react';
import { useTheme, Theme } from '../lib/theme';

// Event-model date strip — a horizontal row of the current sport's GAME-DAYS (from
// discoverGameDays), mounted below SportStrip. Days may be non-consecutive: the gaps ARE the
// signal (a World Cup rest day, an MLB off-day), so we render exactly the game-days rather than a
// consecutive calendar. Presentational only — the caller owns the day set, the selection, and what
// a tap does (setSelectedDate → refetch). Mirrors SportStrip's navy card + orange-accent-active.
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CELL_W = 64;
const GAP = 8;

export interface DateStripProps {
  days: string[];        // sorted dashed YYYY-MM-DD — the sport's game-days (+ today as the home anchor)
  selectedDay: string;   // the active dashed day (accented)
  todayDay: string;      // dashed today — labeled "TODAY" and centered on mount
  onSelect: (day: string) => void;
  marginBottom?: number;
}

export default function DateStrip({ days, selectedDay, todayDay, onSelect, marginBottom = 10 }: DateStripProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const scrollRef = useRef<ScrollView>(null);

  // Center the selected (or today) cell when the strip mounts or the day set changes. Fixed cell
  // width makes the offset exact; a 0ms defer lets layout settle before scrolling.
  useEffect(() => {
    const idx = days.indexOf(selectedDay);
    if (idx < 0) return;
    const viewport = Dimensions.get('window').width;
    const x = Math.max(0, idx * (CELL_W + GAP) - (viewport - CELL_W) / 2);
    const t = setTimeout(() => scrollRef.current?.scrollTo({ x, animated: false }), 0);
    return () => clearTimeout(t);
  }, [days, selectedDay]);

  const parse = (day: string) => {
    const [y, m, d] = day.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12);
    return { wd: WEEKDAYS[dt.getDay()], label: `${MONTHS[dt.getMonth()]} ${dt.getDate()}` };
  };

  return (
    <View style={[styles.container, { marginBottom }]}>
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {days.map(day => {
          const active = day === selectedDay;
          const { wd, label } = parse(day);
          return (
            <TouchableOpacity
              key={day}
              style={[styles.cell, active && styles.cellActive]}
              activeOpacity={0.2}
              onPress={() => onSelect(day)}>
              <Text style={[styles.top, active && styles.topActive]}>{day === todayDay ? 'TODAY' : wd}</Text>
              <Text style={[styles.bottom, active && styles.bottomActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { height: 58 },
  content: { paddingHorizontal: 16, gap: GAP },
  cell: { width: CELL_W, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 12, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  cellActive: { backgroundColor: t.surfaceActive, borderColor: t.accent },
  top: { color: t.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  topActive: { color: t.accentText },
  bottom: { color: t.textPrimary, fontSize: 13, fontWeight: '800', marginTop: 2 },
  bottomActive: { color: t.accentText },
});
