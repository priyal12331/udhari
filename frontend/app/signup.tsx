import { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Api } from "@/src/api";
import { Auth } from "@/src/auth";
import { LanguageToggle } from "@/src/components/LanguageToggle";
import { useLocale } from "@/src/i18n/LocaleContext";
import { Colors, Font, Radius, Spacing } from "@/src/theme";

export default function SignupScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onSignup = async () => {
    setErr("");
    const user = username.trim().toLowerCase();
    if (user.length < 3) return setErr(t('signupUsernameShort'));
    if (!/^[a-z0-9_]+$/.test(user)) return setErr(t('signupUsernameChars'));
    if (password.length < 4) return setErr(t('signupPasswordShort'));
    if (password !== confirm) return setErr(t('signupPasswordMismatch'));
    try {
      setBusy(true);
      await Api.signup(user, password);
      await Auth.save(user, password);
      router.replace("/");
    } catch (e: any) {
      const msg = e?.message || t('signupFailed');
      if (msg.includes("409")) setErr(t('signupUsernameTaken'));
      else if (msg.includes("400")) setErr(t('signupInvalid'));
      else setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LanguageToggle compact testID="signup-language-toggle" />
          <View style={styles.iconWrap}>
            <Ionicons name="person-add" size={36} color={Colors.brand} />
          </View>
          <Text style={styles.title} testID="signup-title">{t('signupTitle')}</Text>
          <Text style={styles.subtitle}>{t('signupSubtitle')}</Text>

          <Text style={styles.label}>{t('username')}</Text>
          <TextInput
            testID="signup-username-input"
            value={username}
            onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder={t('signupUsernamePlaceholder')}
            placeholderTextColor={Colors.muted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.label}>{t('password')}</Text>
          <TextInput
            testID="signup-password-input"
            value={password}
            onChangeText={setPassword}
            placeholder={t('password')}
            placeholderTextColor={Colors.muted}
            style={styles.input}
            secureTextEntry
            returnKeyType="next"
          />

          <Text style={styles.label}>{t('signupConfirmPassword')}</Text>
          <TextInput
            testID="signup-confirm-input"
            value={confirm}
            onChangeText={setConfirm}
            placeholder={t('password')}
            placeholderTextColor={Colors.muted}
            style={styles.input}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={onSignup}
          />

          {!!err && <Text style={styles.err} testID="signup-error">{err}</Text>}

          <Pressable testID="signup-go-login" onPress={() => router.replace("/login")} style={styles.linkRow}>
            <Text style={styles.linkText}>{t('signupHasAccount')}</Text>
            <Text style={styles.linkAction}>{t('signupLoginLink')}</Text>
          </Pressable>
        </ScrollView>
        <View style={styles.bottomBar}>
          <Pressable
            testID="signup-submit-button"
            onPress={onSignup}
            disabled={busy}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }, busy && { opacity: 0.6 }]}
          >
            <Text style={styles.primaryBtnText}>{busy ? t('signupBusy') : t('signup')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  iconWrap: {
    width: 64, height: 64, borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceSecondary, alignItems: "center", justifyContent: "center",
    marginBottom: Spacing.lg, marginTop: Spacing.lg,
  },
  title: { fontSize: Font.size.xxl + 4, fontWeight: Font.weight.black, color: Colors.onSurface },
  subtitle: { fontSize: Font.size.lg, color: Colors.muted, marginTop: Spacing.xs, marginBottom: Spacing.xl },
  label: { fontSize: Font.size.base, color: Colors.onSurfaceSecondary, marginTop: Spacing.lg, marginBottom: Spacing.sm, fontWeight: Font.weight.semibold },
  input: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: 14, fontSize: Font.size.lg,
    color: Colors.onSurface, borderWidth: 1, borderColor: Colors.border,
  },
  err: { color: Colors.udhaar, marginTop: Spacing.lg, fontWeight: Font.weight.semibold },
  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: Spacing.xl },
  linkText: { fontSize: Font.size.base, color: Colors.muted },
  linkAction: { fontSize: Font.size.base, color: Colors.brand, fontWeight: Font.weight.bold },
  bottomBar: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.divider, backgroundColor: Colors.surface },
  primaryBtn: { backgroundColor: Colors.brand, borderRadius: Radius.md, paddingVertical: 18, alignItems: "center" },
  primaryBtnText: { color: Colors.onBrandPrimary || "#fff", fontSize: Font.size.lg, fontWeight: Font.weight.bold },
});
