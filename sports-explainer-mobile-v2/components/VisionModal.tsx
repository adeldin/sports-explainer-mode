import { useMemo, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, Image, TextInput, ScrollView,
  ActivityIndicator, StyleSheet, Linking, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTheme, Theme } from '../lib/theme';
import { Sport, Level, Language, VisionGameContext, VisionResponse, fetchVision } from '../lib/api';
import { UI_STRINGS } from '../lib/strings';
import GlossaryText from './GlossaryText';

// "Analyze what's on screen" (premium #2). Full-screen modal hosting the whole flow:
//   free → locked preview (no capture, no vision call) → onUnlock(presentPaywall)
//   Pro  → source → permission → resize → preview → analyze → result + ask-about-image
// The model/provider swap is entirely backend; nothing here changes when it does.
type Phase = 'source' | 'preview' | 'analyzing' | 'result';

interface Props {
  visible: boolean;
  onClose: () => void;
  isPro: boolean;
  sport: Sport;
  level: Level;
  language: Language;
  gameContext?: VisionGameContext;
  onUnlock: () => void;
}

export default function VisionModal({ visible, onClose, isPro, sport, level, language, gameContext, onUnlock }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const S = UI_STRINGS[language];

  const [phase, setPhase] = useState<Phase>('source');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [result, setResult] = useState<VisionResponse | null>(null);
  const [asks, setAsks] = useState<{ id: number; q: string; a: string | null }[]>([]);
  const [askText, setAskText] = useState('');
  const [asking, setAsking] = useState(false);
  const [permDenied, setPermDenied] = useState(false);
  const [error, setError] = useState(false);
  const [openTerm, setOpenTerm] = useState<{ term: string; def: string } | null>(null);
  const toggleGlossaryTerm = (t: { term: string; def: string }) =>
    setOpenTerm(prev => (prev && prev.term === t.term ? null : t));

  const reset = () => {
    setPhase('source'); setImageUri(null); setImageBase64(null); setResult(null);
    setAsks([]); setAskText(''); setAsking(false); setPermDenied(false); setError(false); setOpenTerm(null);
  };
  const close = () => { reset(); onClose(); };

  // Pick from camera or library → resize/compress → base64 (kept under the 4MB ceiling and
  // fast/cheap to upload, regardless of which provider the backend swaps in).
  const pick = async (source: 'camera' | 'library') => {
    setPermDenied(false); setError(false);
    try {
      const perm = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { setPermDenied(true); return; }
      const res = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const manipulated = await ImageManipulator.manipulateAsync(
        res.assets[0].uri,
        [{ resize: { width: 1280 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      setImageUri(manipulated.uri);
      setImageBase64(manipulated.base64 || null);
      setPhase('preview');
    } catch (e) {
      console.error('Vision capture error:', e);
      setError(true);
    }
  };

  const analyze = async () => {
    if (!imageBase64) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('analyzing'); setError(false);
    try {
      const r = await fetchVision(imageBase64, 'explain', '', level, language, gameContext);
      setResult(r); setPhase('result');
    } catch (e) {
      console.error('Vision analyze error:', e);
      setError(true); setPhase('preview');
    }
  };

  const ask = async () => {
    const q = askText.trim();
    if (!q || !imageBase64 || asking) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const id = asks.length + 1; // sequential; asks are only appended, never removed
    setAskText(''); setAsking(true);
    setAsks(prev => [...prev, { id, q, a: null }]);
    try {
      const r = await fetchVision(imageBase64, 'ask', q, level, language, gameContext);
      setAsks(prev => prev.map(x => (x.id === id ? { ...x, a: r.text || S.visionError } : x)));
    } catch (e) {
      console.error('Vision ask error:', e);
      setAsks(prev => prev.map(x => (x.id === id ? { ...x, a: S.visionError } : x)));
    } finally {
      setAsking(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>📸 {S.visionTitle}</Text>
          <TouchableOpacity onPress={close} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {!isPro ? (
            // FREE — locked preview. Shows the value; NO capture, NO vision call.
            <View style={styles.lockedCard}>
              <Text style={styles.lockedEmoji}>📸</Text>
              <Text style={styles.lockedTitle}>{S.visionLockedTitle}</Text>
              <Text style={styles.lockedBody}>{S.visionLockedBody}</Text>
              <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85}
                onPress={() => { Haptics.selectionAsync(); onUnlock(); }}>
                <Text style={styles.primaryBtnText}>{S.visionUnlock}</Text>
              </TouchableOpacity>
            </View>
          ) : permDenied ? (
            <View style={styles.lockedCard}>
              <Text style={styles.lockedBody}>{S.visionPermissionDenied}</Text>
              <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85}
                onPress={() => Linking.openSettings()}>
                <Text style={styles.primaryBtnText}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPermDenied(false)}>
                <Text style={styles.secondaryBtnText}>{S.visionRetake}</Text>
              </TouchableOpacity>
            </View>
          ) : phase === 'source' ? (
            <View style={styles.sourceWrap}>
              <Text style={styles.lockedBody}>{S.visionLockedBody}</Text>
              <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={() => pick('camera')}>
                <Text style={styles.primaryBtnText}>{S.visionTakePhoto}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.85} onPress={() => pick('library')}>
                <Text style={styles.secondaryBtnText}>{S.visionChoosePhoto}</Text>
              </TouchableOpacity>
              {error && <Text style={styles.errorText}>{S.visionError}</Text>}
            </View>
          ) : (
            <>
              {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />}

              {phase === 'preview' && (
                <View>
                  <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={analyze}>
                    <Text style={styles.primaryBtnText}>{S.visionAnalyze}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={reset}>
                    <Text style={styles.secondaryBtnText}>{S.visionRetake}</Text>
                  </TouchableOpacity>
                  {error && <Text style={styles.errorText}>{S.visionError}</Text>}
                </View>
              )}

              {phase === 'analyzing' && (
                <View style={styles.analyzing}>
                  <ActivityIndicator color={theme.accent} />
                  <Text style={styles.analyzingText}>{S.visionAnalyzing}</Text>
                </View>
              )}

              {phase === 'result' && result && (
                <View style={styles.resultCard}>
                  <GlossaryText text={result.text} sport={sport} baseStyle={styles.resultText}
                    language={language} styles={styles} onToggleTerm={toggleGlossaryTerm} />

                  {asks.map(item => (
                    <View key={item.id} style={styles.askBlock}>
                      <Text style={styles.askQ}>{item.q}</Text>
                      {item.a === null
                        ? <Text style={styles.analyzingText}>{S.visionAnalyzing}</Text>
                        : <GlossaryText text={item.a} sport={sport} baseStyle={styles.askA}
                            language={language} styles={styles} onToggleTerm={toggleGlossaryTerm} />}
                    </View>
                  ))}

                  {openTerm && (
                    <View style={styles.glossaryDefBox}>
                      <View style={styles.glossaryDefHeader}>
                        <Text style={styles.glossaryDefTerm}>{openTerm.term}</Text>
                        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setOpenTerm(null); }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Text style={styles.glossaryDefClose}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.glossaryDefText}>{openTerm.def}</Text>
                    </View>
                  )}

                  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={styles.askRow}>
                      <TextInput
                        style={styles.askInput}
                        value={askText}
                        onChangeText={setAskText}
                        placeholder={S.visionAskPlaceholder}
                        placeholderTextColor={theme.placeholderText}
                        returnKeyType="send"
                        onSubmitEditing={ask}
                        editable={!asking}
                      />
                      <TouchableOpacity style={[styles.askSend, (!askText.trim() || asking) && styles.askSendDisabled]}
                        onPress={ask} disabled={!askText.trim() || asking}>
                        <Text style={styles.askSendText}>↑</Text>
                      </TouchableOpacity>
                    </View>
                  </KeyboardAvoidingView>

                  <TouchableOpacity style={styles.secondaryBtn} onPress={reset}>
                    <Text style={styles.secondaryBtnText}>{S.visionRetake}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.border },
  title: { color: t.textPrimary, fontSize: 18, fontWeight: '800' },
  close: { color: t.textMuted, fontSize: 20, fontWeight: '700' },
  body: { padding: 16, gap: 12 },
  lockedCard: { backgroundColor: t.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, borderLeftColor: t.accent, alignItems: 'center', gap: 12 },
  lockedEmoji: { fontSize: 44 },
  lockedTitle: { color: t.textPrimary, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  lockedBody: { color: t.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  sourceWrap: { gap: 12 },
  primaryBtn: { backgroundColor: t.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', alignSelf: 'stretch', marginTop: 8 },
  primaryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', alignSelf: 'stretch', borderWidth: 1, borderColor: t.borderStrong, marginTop: 8 },
  secondaryBtnText: { color: t.textPrimary, fontSize: 15, fontWeight: '700' },
  errorText: { color: t.warn, fontSize: 13, textAlign: 'center', marginTop: 10 },
  preview: { width: '100%', height: 240, borderRadius: 14, backgroundColor: t.surface, marginBottom: 8 },
  analyzing: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  analyzingText: { color: t.textMuted, fontSize: 14, fontStyle: 'italic', marginTop: 8 },
  resultCard: { backgroundColor: t.explanationBg, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, borderLeftColor: t.stripe },
  resultText: { color: t.textPrimary, fontSize: 16, fontWeight: '500', lineHeight: 24 },
  askBlock: { marginTop: 14, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 12 },
  askQ: { color: t.accentText, fontSize: 13, fontWeight: '800', marginBottom: 6 },
  askA: { color: t.textPrimary, fontSize: 15, lineHeight: 23 },
  askRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  askInput: { flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: t.textPrimary, fontSize: 14 },
  askSend: { width: 40, height: 40, borderRadius: 20, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' },
  askSendDisabled: { backgroundColor: t.border },
  askSendText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  // Glossary (mirrors PlayCard/RecapCard)
  glossaryTerm: { color: t.accent, textDecorationLine: 'underline', textDecorationStyle: 'solid' },
  glossaryDefBox: { marginTop: 14, padding: 14, backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, borderLeftColor: t.accent },
  glossaryDefHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  glossaryDefTerm: { color: t.accentText, fontSize: 15, fontWeight: '800', flex: 1 },
  glossaryDefClose: { color: t.textMuted, fontSize: 16, fontWeight: '700', paddingHorizontal: 4 },
  glossaryDefText: { color: t.textPrimary, fontSize: 14, lineHeight: 21 },
});
