import { useEffect, useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, TextInput, KeyboardAvoidingView, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AudioModule, useAudioRecorder, RecordingPresets } from "expo-audio";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence } from "react-native-reanimated";
import { Api, VoiceParse } from "@/src/api";
import { useLocale } from "@/src/i18n/LocaleContext";
import { Colors, Font, Radius, Spacing } from "@/src/theme";

export default function VoiceTab() {
  const router = useRouter();
  const { t } = useLocale();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [permission, setPermission] = useState<boolean | null>(null);
  const [result, setResult] = useState<VoiceParse | null>(null);
  const [err, setErr] = useState("");
  const [manualText, setManualText] = useState("");
  const pulse = useSharedValue(1);

  useEffect(() => {
    (async () => {
      const p = await AudioModule.requestRecordingPermissionsAsync();
      setPermission(p.granted);
    })();
  }, []);

  useEffect(() => {
    if (recording) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.18, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1, false
      );
    } else {
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [recording]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const start = async () => {
    setErr(""); setResult(null);
    if (Platform.OS === "web") {
      setErr(t('voiceWebHint'));
      return;
    }
    if (!permission) {
      const p = await AudioModule.requestRecordingPermissionsAsync();
      if (!p.granted) { setErr(t('voiceMicRequired')); return; }
      setPermission(true);
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      // Fix: Set audio mode for iOS recording BEFORE prepareToRecordAsync
      await AudioModule.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
    } catch (e: any) {
      setErr(e?.message || "Recording failed");
    }
  };

  const stop = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      await recorder.stop();
      setRecording(false);

      // Fix: Reset audio mode after recording stops
      await AudioModule.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recorder.uri;
      if (!uri) { setErr(t('voiceCaptureFailed')); return; }
      setProcessing(true);
      const r = await Api.parseVoice(uri);
      setResult(r);
      setProcessing(false);
      if (r.amount && r.type) goConfirm(r);
    } catch (e: any) {
      setProcessing(false);
      setErr(e?.message || t('voiceTranscribeFailed'));
    }
  };

  const parseText = async () => {
    setErr(""); setResult(null);
    if (!manualText.trim()) return;
    try {
      setProcessing(true);
      const r = await Api.parseVoiceText(manualText.trim());
      setResult(r);
      setProcessing(false);
      if (r.amount && r.type) goConfirm(r);
    } catch (e: any) {
      setProcessing(false); setErr(e?.message || t('voiceParseFailed'));
    }
  };

  const goConfirm = (r: VoiceParse) => {
    router.push({
      pathname: "/voice-confirm",
      params: {
        transcript: r.transcript,
        name: r.name || "",
        amount: String(r.amount || ""),
        type: r.type || "",
        matched_customer_id: r.matched_customer_id || "",
        matched_customer_name: r.matched_customer_name || "",
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <Text style={styles.title} testID="voice-title">{t('voiceTitle')}</Text>
          <Text style={styles.subtitle}>{t('voiceSubtitle')}</Text>

          <View style={styles.center}>
            <Animated.View style={[styles.micRing, recording && styles.micRingActive, pulseStyle]}>
              <Pressable
                testID="voice-mic-btn"
                onPress={recording ? stop : start}
                disabled={processing}
                style={[styles.mic, recording && styles.micActive]}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <Ionicons name={recording ? "stop" : "mic"} size={56} color="#fff" />
                )}
              </Pressable>
            </Animated.View>
            <Text style={styles.status} testID="voice-status">
              {processing ? t('voiceProcessing') : recording ? t('voiceListening') : t('voiceTap')}
            </Text>
            {!!err && <Text style={styles.err} testID="voice-error">{err}</Text>}
            {!!result?.transcript && (
              <View style={styles.transcriptBox} testID="voice-transcript-box">
                <Text style={styles.transcriptLabel}>{t('voiceYouSaid')}</Text>
                <Text style={styles.transcriptText}>"{result.transcript}"</Text>
                {result.amount && result.type && (
                  <Text style={styles.parsedHint}>
                    {result.matched_customer_name || result.name || "—"} · ₹{result.amount} · {result.type}
                  </Text>
                )}
                {(!result.amount || !result.type) && (
                  <Text style={[styles.parsedHint, { color: Colors.udhaar }]}>
                    {t('voiceParseError')}
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.manualBox}>
            <Text style={styles.manualLabel}>{t('voiceManualLabel')}</Text>
            <View style={styles.manualRow}>
              <TextInput
                testID="voice-manual-input"
                value={manualText}
                onChangeText={setManualText}
                placeholder={t('voiceManualPlaceholder')}
                placeholderTextColor={Colors.muted}
                style={styles.manualInput}
              />
              <Pressable
                testID="voice-manual-submit"
                onPress={parseText}
                style={({ pressed }) => [styles.manualBtn, pressed && { opacity: 0.8 }]}
              >
                <Ionicons name="arrow-forward" size={22} color="#fff" />
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  title: { fontSize: Font.size.xxl, fontWeight: Font.weight.black, color: Colors.onSurface, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  subtitle: { fontSize: Font.size.base, color: Colors.muted, paddingHorizontal: Spacing.lg, marginTop: Spacing.xs },
  center: { alignItems: "center", paddingVertical: Spacing.xxxl, gap: Spacing.lg },
  micRing: { width: 180, height: 180, borderRadius: 90, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(220,38,38,0.08)" },
  micRingActive: { backgroundColor: "rgba(220,38,38,0.18)" },
  mic: { width: 140, height: 140, borderRadius: 70, backgroundColor: Colors.brand, alignItems: "center", justifyContent: "center" },
  micActive: { backgroundColor: Colors.udhaar },
  status: { fontSize: Font.size.lg, color: Colors.onSurface, fontWeight: Font.weight.semibold },
  err: { fontSize: Font.size.base, color: Colors.udhaar, paddingHorizontal: Spacing.xl, textAlign: "center" },
  transcriptBox: {
    marginHorizontal: Spacing.xl, padding: Spacing.lg, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary, alignSelf: "stretch",
  },
  transcriptLabel: { fontSize: Font.size.sm, color: Colors.muted, fontWeight: Font.weight.semibold },
  transcriptText: { fontSize: Font.size.lg, color: Colors.onSurface, fontWeight: Font.weight.semibold, marginTop: 4 },
  parsedHint: { marginTop: Spacing.sm, fontSize: Font.size.base, fontWeight: Font.weight.semibold, color: Colors.jama },
  manualBox: { padding: Spacing.lg, gap: Spacing.sm },
  manualLabel: { fontSize: Font.size.sm, color: Colors.muted, fontWeight: Font.weight.semibold },
  manualRow: { flexDirection: "row", gap: Spacing.sm, alignItems: "center" },
  manualInput: {
    flex: 1, backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 14, fontSize: Font.size.base, color: Colors.onSurface,
  },
  manualBtn: { width: 52, height: 52, borderRadius: Radius.md, backgroundColor: Colors.brand, alignItems: "center", justifyContent: "center" },
});
