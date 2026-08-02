import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

/**
 * A module that throws must not take the app down with it.
 *
 * Coach's Corner / Academy pieces are self-contained: each one owns its own geometry,
 * its own animation loop and its own authored data. A bad coordinate or a missing field
 * in ONE piece is a bug in that piece — it is not a reason for the user to lose the app.
 * This boundary catches the throw, keeps the host chrome (back button) alive, and shows
 * what actually happened so a tester can report something better than "it crashed."
 *
 * Deliberately NOT a silent fallback: the error text is on screen. A screenshot of this
 * card is a bug report. Silent recovery would hide exactly the failures we most need to
 * see while the field modules are new.
 */
type Props = { children: React.ReactNode; title?: string };
type State = { error: Error | null };

export default class GameErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Console is the dev-build path; the on-screen card below is the TestFlight path.
    console.error(`[Coach's Corner] ${this.props.title ?? 'module'} crashed:`, error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return <>{this.props.children}</>;

    return (
      <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
        <Text style={styles.icon}>🛠️</Text>
        <Text style={styles.title}>This one's broken</Text>
        <Text style={styles.blurb}>
          {this.props.title ? `"${this.props.title}" ` : 'This module '}
          hit an error and stopped. The rest of the app is fine — tap back to keep going.
        </Text>
        <View style={styles.errBox}>
          <Text style={styles.errLabel}>WHAT WENT WRONG</Text>
          <Text style={styles.errText} selectable>{error.message || String(error)}</Text>
        </View>
        <Text style={styles.hint}>Screenshot this and send it over — the text above says exactly what to fix.</Text>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0d1b3e' },
  content: { padding: 24, alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  icon: { fontSize: 40, marginBottom: 12 },
  title: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  blurb: { color: '#aab4cb', fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  errBox: { alignSelf: 'stretch', backgroundColor: '#14181f', borderRadius: 12, borderWidth: 1, borderColor: '#2b3340', padding: 14, marginBottom: 16 },
  errLabel: { color: '#5a6b7a', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 8 },
  errText: { color: '#ff8a80', fontSize: 12, fontWeight: '600', fontFamily: 'Courier', lineHeight: 18 },
  hint: { color: '#5a6b7a', fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
