import { useMemo } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useTheme, Theme } from '../lib/theme';
import { Play } from '../lib/api';

interface Props {
  visible: boolean;
  plays: Play[];
  loading: boolean;
  onClose: () => void;
  onSelect: (p: Play) => void;
}

const SCORING = '#ffcc00'; // gold — scannable "important moment" marker

export default function PlaysSheet({ visible, plays, loading, onClose, onSelect }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Play-by-Play</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Tap any play to explain it · ● scoring play</Text>

          {loading ? (
            <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
          ) : plays.length === 0 ? (
            <Text style={styles.empty}>No play-by-play available for this game yet.</Text>
          ) : (
            <FlatList
              data={plays}
              keyExtractor={(p) => p.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => onSelect(item)} activeOpacity={0.7}>
                  <View style={[styles.dot, { backgroundColor: item.scoring ? SCORING : theme.border }]} />
                  <View style={styles.rowText}>
                    <Text style={[styles.playText, item.scoring && styles.playTextScoring]} numberOfLines={3}>
                      {item.text}
                    </Text>
                    {!!item.period && <Text style={styles.period}>{item.period}</Text>}
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: t.scrim },
  backdropTouch: { ...StyleSheet.absoluteFillObject },
  sheet: {
    maxHeight: '78%',
    backgroundColor: t.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: t.border,
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: t.border, marginTop: 10, marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: t.textPrimary, fontSize: 20, fontWeight: '900' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: t.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  close: { color: t.textPrimary, fontSize: 15 },
  hint: { color: t.textMuted, fontSize: 12, marginTop: 4, marginBottom: 10 },
  empty: { color: t.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: t.border },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 5 },
  rowText: { flex: 1 },
  playText: { color: t.textPrimary, fontSize: 14, lineHeight: 20 },
  playTextScoring: { fontWeight: '800' },
  period: { color: t.textMuted, fontSize: 11, marginTop: 3, fontWeight: '600' },
});
