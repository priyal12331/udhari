import { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Api } from "@/src/api";
import { Session } from "@/src/session";
import { Colors, Font, Radius, Spacing } from "@/src/theme";

export default function SetupScreen() {
  const router = useRouter();
  const [shopName, setShopName] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [seedDemo, setSeedDemo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  const onSave = async () => {
    setErr("");
    if (!shopName.trim()) return setErr("Dukaan ka naam likhein");
    if (pin.length < 4) return setErr("PIN kam se kam 4 digit ka ho");
    if (pin !== confirm) return setErr("PIN match nahi ho raha");
    try {
      setBusy(true);
      await Api.postSetup(shopName.trim(), pin);
      if (seedDemo) {
        try { await Api.seed(); } catch {}
      }
      await Session.unlock();
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.iconWrap}>
            <Ionicons name="storefront" size={36} color={Colors.brand} />
          </View>
          <Text style={styles.title} testID="setup-title">Dukaan setup karein</Text>
          <Text style={styles.subtitle}>Apni dukaan ka naam aur ek PIN choose karein</Text>

          <Text style={styles.label}>Dukaan ka naam · Shop name</Text>
          <TextInput
            testID="setup-shop-input"
            value={shopName}
            onChangeText={setShopName}
            placeholder="e.g. Sharma Kirana Store"
            placeholderTextColor={Colors.muted}
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Text style={styles.label}>4-digit PIN</Text>
          <TextInput
            testID="setup-pin-input"
            value={pin}
            onChangeText={(v) => setPin(v.replace(/[^0-9]/g, "").slice(0, 6))}
            placeholder="••••"
            placeholderTextColor={Colors.muted}
            style={styles.input}
            keyboardType="number-pad"
            secureTextEntry
          />

          <Text style={styles.label}>PIN dobara · Confirm</Text>
          <TextInput
            testID="setup-pin-confirm"
            value={confirm}
            onChangeText={(v) => setConfirm(v.replace(/[^0-9]/g, "").slice(0, 6))}
            placeholder="••••"
            placeholderTextColor={Colors.muted}
            style={styles.input}
            keyboardType="number-pad"
            secureTextEntry
          />

          <Pressable
            testID="setup-seed-toggle"
            onPress={() => setSeedDemo((v) => !v)}
            style={[styles.checkboxRow, seedDemo && { borderColor: Colors.brand }]}
          >
            <View style={[styles.checkbox, seedDemo && { backgroundColor: Colors.brand, borderColor: Colors.brand }]}>
              {seedDemo && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkboxTitle}>Sample data load karein</Text>
              <Text style={styles.checkboxSub}>5 demo customers + transactions</Text>
            </View>
          </Pressable>

          {!!err && <Text style={styles.err} testID="setup-error">{err}</Text>}
        </ScrollView>
        <View style={styles.bottomBar}>
          <Pressable
            testID="setup-save-button"
            onPress={onSave}
            disabled={busy}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }, busy && { opacity: 0.6 }]}
          >
            <Text style={styles.primaryBtnText}>{busy ? "Save kar rahe..." : "Shuru karein"}</Text>
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
  checkboxRow: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    padding: Spacing.lg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border,
    marginTop: Spacing.xl,
  },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Colors.borderStrong, alignItems: "center", justifyContent: "center" },
  checkboxTitle: { fontSize: Font.size.lg, fontWeight: Font.weight.semibold, color: Colors.onSurface },
  checkboxSub: { fontSize: Font.size.sm, color: Colors.muted, marginTop: 2 },
  err: { color: Colors.udhaar, marginTop: Spacing.lg, fontWeight: Font.weight.semibold },
  bottomBar: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.divider, backgroundColor: Colors.surface },
  primaryBtn: { backgroundColor: Colors.brand, borderRadius: Radius.md, paddingVertical: 18, alignItems: "center" },
  primaryBtnText: { color: Colors.onBrandPrimary || "#fff", fontSize: Font.size.lg, fontWeight: Font.weight.bold },
});
