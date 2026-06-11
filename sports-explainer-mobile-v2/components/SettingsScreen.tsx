import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Animated, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Level } from '../lib/api';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  level: Level;
  autoRefresh: boolean;
  notificationsEnabled: boolean;
  onClose: () => void;
  onLevelChange: (l: Level) => void;
  onAutoRefreshChange: (val: boolean) => void;
  onNotificationsToggle: (val: boolean) => void;
}

const LEVELS: { key: Level; label: string; desc: string }[] = [
  { key: 'kid', label: '🧒 Kid Mode', desc: 'Simple analogies, zero jargon' },
  { key: 'beginner', label: '👋 Beginner', desc: 'New fan friendly' },
  { key: 'intermediate', label: '📺 Intermediate', desc: 'Regular viewer' },
  { key: 'expert', label: '🎓 Expert', desc: 'Coaching-level analysis' },
];

export default function SettingsScreen({ 
  visible, 
  level, 
  autoRefresh, 
  notificationsEnabled,
  onClose, 
  onLevelChange, 
  onAutoRefreshChange,
  onNotificationsToggle
}: Props) {
  const translateX = useRef(new Animated.Value(width)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateX, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: width, duration: 250, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>EXPERTISE LEVEL</Text>
            {LEVELS.map(l => (
              <TouchableOpacity
                key={l.key}
                style={[styles.levelRow, level === l.key && styles.levelRowActive]}
                onPress={() => onLevelChange(l.key)}>
                <View style={styles.levelInfo}>
                  <Text style={styles.levelLabel}>{l.label}</Text>
                  <Text style={styles.levelDesc}>{l.desc}</Text>
                </View>
                {level === l.key && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionLabel, { marginTop: 30 }]}>PREFERENCES</Text>
            
            {/* Auto-Refresh Toggle */}
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleLabel}>Auto-Refresh</Text>
                <Text style={styles.toggleDesc}>Update every 60 seconds</Text>
              </View>
              <Switch
                value={autoRefresh}
                onValueChange={onAutoRefreshChange}
                trackColor={{ false: '#333', true: '#0055ff' }}
                thumbColor="#fff"
              />
            </View>

            {/* Notifications Toggle */}
            <View style={[styles.toggleRow, { marginTop: 12 }]}>
              <View>
                <Text style={styles.toggleLabel}>Game Alerts</Text>
                <Text style={styles.toggleDesc}>Notify me when favorite teams play</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={onNotificationsToggle}
                trackColor={{ false: '#333', true: '#0055ff' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.versionBox}>
              <Text style={styles.versionText}>Sports Explainer v1.0</Text>
              <Text style={styles.versionText}>Powered by Groq + ESPN</Text>
            </View>
          </ScrollView>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)' },
  panel: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '82%', overflow: 'hidden', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.08)' },
  content: { flex: 1, padding: 24, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  closeText: { color: '#fff', fontSize: 16 },
  sectionLabel: { color: '#555', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  levelRow: { padding: 16, borderRadius: 12, backgroundColor: '#111', marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  levelRowActive: { borderColor: '#0055ff', backgroundColor: '#001133' },
  levelInfo: { flex: 1 },
  levelLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  levelDesc: { color: '#666', fontSize: 12, marginTop: 2 },
  checkmark: { color: '#0055ff', fontSize: 18, fontWeight: '900' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#222' },
  toggleLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  toggleDesc: { color: '#666', fontSize: 12, marginTop: 2 },
  versionBox: { marginTop: 40, alignItems: 'center', gap: 4 },
  versionText: { color: '#333', fontSize: 12 },
});