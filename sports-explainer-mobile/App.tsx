import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, TextInput
} from 'react-native';
import { fetchExplanation, askQuestion, Sport, Level, ExplanationResponse } from './lib/api';

const SPORTS: Sport[] = ['nfl', 'nba', 'mlb', 'nhl'];
const LEVELS: Level[] = ['beginner', 'intermediate', 'expert'];
const FOLLOW_UPS = [
  'Why did that matter?',
  'Explain the rule',
  "Explain like I'm new",
  'What should I watch for next?',
];

export default function HomeScreen() {
  const [sport, setSport] = useState<Sport>('nfl');
  const [level, setLevel] = useState<Level>('beginner');
  const [result, setResult] = useState<ExplanationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [followUpAnswer, setFollowUpAnswer] = useState<string | null>(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [activeChip, setActiveChip] = useState<string | null>(null);

  async function handleFetch() {
    setLoading(true);
    setFollowUpAnswer(null);
    setActiveChip(null);
    try {
      const data = await fetchExplanation(sport, level);
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleFollowUp(question: string) {
    if (!result) return;
    setActiveChip(question);
    setFollowUpLoading(true);
    setFollowUpAnswer(null);
    try {
      const context = `${result.simple} ${result.whyItMatters || ''} ${result.ruleDetail || ''}`;
      const answer = await askQuestion(question, sport, level, context);
      setFollowUpAnswer(answer);
    } catch (e) {
      console.error(e);
      setFollowUpAnswer('Sorry, something went wrong. Try again.');
    } finally {
      setFollowUpLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🏆 Sports Explainer</Text>

      <Text style={styles.label}>Sport</Text>
      <View style={styles.row}>
        {SPORTS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, sport === s && styles.chipActive]}
            onPress={() => setSport(s)}>
            <Text style={styles.chipText}>{s.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Level</Text>
      <View style={styles.row}>
        {LEVELS.map(l => (
          <TouchableOpacity
            key={l}
            style={[styles.chip, level === l && styles.chipActive]}
            onPress={() => setLevel(l)}>
            <Text style={styles.chipText}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleFetch}>
        <Text style={styles.buttonText}>Explain a Play</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />}

      {result && (
        <View style={styles.card}>

          {/* Game Context Header */}
          <View style={styles.contextHeader}>
            <Text style={styles.matchup}>
              {result.awayTeam && result.homeTeam
                ? `${result.awayTeam} vs ${result.homeTeam}`
                : sport.toUpperCase()}
            </Text>
            <Text style={styles.lastUpdated}>
              Last updated: {new Date().toLocaleTimeString()}
            </Text>
          </View>

          {/* Source Play */}
          {result.playType ? (
            <View style={styles.sourcePill}>
              <Text style={styles.sourceText}>▶ {result.playType}</Text>
            </View>
          ) : null}

          {/* Explanation */}
          <Text style={styles.cardText}>{result.simple}</Text>

          {result.whyItMatters && (
            <>
              <Text style={styles.cardLabel}>Why it matters:</Text>
              <Text style={styles.cardText}>{result.whyItMatters}</Text>
            </>
          )}

          {result.ruleDetail && (
            <>
              <Text style={styles.cardLabel}>Rule detail:</Text>
              <Text style={styles.cardText}>{result.ruleDetail}</Text>
            </>
          )}

          {/* Follow-up Chips */}
          <Text style={styles.cardLabel}>Ask a follow-up:</Text>
          <View style={styles.chipsWrap}>
            {FOLLOW_UPS.map(q => (
              <TouchableOpacity
                key={q}
                style={[styles.chip, activeChip === q && styles.chipActive]}
                onPress={() => handleFollowUp(q)}>
                <Text style={styles.chipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Follow-up Answer */}
          {followUpLoading && (
            <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 12 }} />
          )}
          {followUpAnswer && (
            <View style={styles.answerBox}>
              <Text style={styles.answerLabel}>💬 {activeChip}</Text>
              <Text style={styles.cardText}>{followUpAnswer}</Text>
            </View>
          )}

        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60, backgroundColor: '#0a0a0a' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 24 },
  label: { color: '#aaa', fontSize: 14, marginBottom: 8, marginTop: 16 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chipsWrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#222' },
  chipActive: { backgroundColor: '#007AFF' },
  chipText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  button: { marginTop: 28, backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  card: { marginTop: 24, backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 40 },
  contextHeader: { marginBottom: 12 },
  matchup: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  lastUpdated: { color: '#666', fontSize: 11, marginTop: 2 },
  sourcePill: { backgroundColor: '#222', borderRadius: 8, padding: 8, marginBottom: 12 },
  sourceText: { color: '#aaa', fontSize: 13 },
  cardLabel: { color: '#007AFF', fontSize: 13, fontWeight: '600', marginTop: 12 },
  cardText: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  answerBox: { marginTop: 16, backgroundColor: '#111', borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: '#007AFF' },
  answerLabel: { color: '#007AFF', fontSize: 13, fontWeight: '600', marginBottom: 6 },
});