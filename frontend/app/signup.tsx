import { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Api } from "@/src/api";
import { Auth } from "@/src/auth";
import { Colors, Font, Radius, Spacing } from "@/src/theme";

export default function SignupScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onSignup = async () => {
    setErr("");
    const user = username.trim().toLowerCase();
    if (user.length < 3) return setErr("Username kam se kam 3 characters ka ho");
    if (!/^[a-z0-9_]+$/.test(user)) return setErr("Sirf letters, numbers, underscore use karein");
    if (password.length < 4) return setErr("Password kam se kam 4 characters ka ho");
    if (password !== confirm) return setErr("Password match nahi ho raha");
    try {
      setBusy(true);
      await Api.signup(user, password);
      await Auth.save(user, password);
      router.replace("/");
    } catch (e: any) {
      const msg = e?.message || "Signup failed";
      if (msg.includes("409")) setErr("Username pehle se use ho raha hai");
      else if (msg.includes("400")) setErr("Username ya password sahi nahi hai");
      else setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.iconWrap}>
            <Ionicons name="person-add" size={36} color={Colors.brand} />
          </View>
          <Text style={styles.title} testID="signup-title">Account banayein</Text>
          <Text style={styles.subtitle}>Naya account banao aur apni dukaan track karo</Text>

          <Text style={styles.label}>Username</Text>
          <TextInput
            testID="signup-username-input"
            value={username}
            onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="e.g. sharma_kirana"
            placeholderTextColor={Colors.muted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            testID="signup-password-input"
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={Colors.muted}
            style={styles.input}
            secureTextEntry
            returnKeyType="next"
          />

          <Text style={styles.label}>Password dobara · Confirm</Text>
          <TextInput
            testID="signup-confirm-input"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Password"
            placeholderTextColor={Colors.muted}
            style={styles.input}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={onSignup}
          />

          {!!err && <Text style={styles.err} testID="signup-error">{err}</Text>}

          <Pressable testID="signup-go-login" onPress={() => router.replace("/login")} style={styles.linkRow}>
            <Text style={styles.linkText}>Pehle se account hai? </Text>
            <Text style={styles.linkAction}>Login karein</Text>
          </Pressable>
        </ScrollView>
        <View style={styles.bottomBar}>
          <Pressable
            testID="signup-submit-button"
            onPress={onSignup}
            disabled={busy}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }, busy && { opacity: 0.6 }]}
          >
            <Text style={styles.primaryBtnText}>{busy ? "Ban raha hai..." : "Sign up"}</Text>
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
    marginBottom: Spacing.lg,
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
