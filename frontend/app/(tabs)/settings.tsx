import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Api } from "@/src/api";
import { Auth } from "@/src/auth";
import { Session } from "@/src/session";
import { Colors, Font, Radius, Spacing } from "@/src/theme";

export default function SettingsTab() {
  const router = useRouter();
  const [shopName, setShopName] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useFocusEffect(useCallback(() => {
    Api.getSetup().then(s => setShopName(s.shop_name)).catch(() => {});
  }, []));

  const saveName = async () => {
    if (!shopName.trim()) return;
    setBusy(true);
    try {
      await Api.updateShopName(shopName.trim());
      setEditing(false);
      setMsg("Saved");
      setTimeout(() => setMsg(""), 1500);
    } catch {} finally { setBusy(false); }
  };

  const reseed = async () => {
    setBusy(true); setMsg("");
    try {
      await Api.seed();
      setMsg("Sample data load ho gaya");
      setTimeout(() => setMsg(""), 2000);
    } catch (e: any) { setMsg(e?.message || "Error"); } finally { setBusy(false); }
  };

  const lock = async () => {
    await Session.lock();
    router.replace("/lock");
  };

  const logout = async () => {
    await Session.lock();
    await Auth.clear();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.sectionLabel}>Dukaan ka naam</Text>
        <View style={styles.card}>
          {editing ? (
            <View style={{ gap: Spacing.md }}>
              <TextInput
                testID="settings-shop-input"
                value={shopName} onChangeText={setShopName}
                style={styles.input} placeholder="Shop name"
                placeholderTextColor={Colors.muted}
              />
              <View style={{ flexDirection: "row", gap: Spacing.sm }}>
                <Pressable onPress={() => setEditing(false)} style={[styles.btn, styles.btnGhost]}>
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </Pressable>
                <Pressable testID="settings-save-shop" onPress={saveName} style={[styles.btn, styles.btnPrimary]} disabled={busy}>
                  <Text style={styles.btnPrimaryText}>{busy ? "..." : "Save"}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.cardValue} testID="settings-shop-name">{shopName || "—"}</Text>
              <Pressable testID="settings-edit-shop" onPress={() => setEditing(true)}>
                <Ionicons name="pencil" size={20} color={Colors.brand} />
              </Pressable>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>Data</Text>
        <Pressable testID="settings-reseed" onPress={reseed} style={styles.actionRow} disabled={busy}>
          <Ionicons name="refresh" size={22} color={Colors.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Sample data reset</Text>
            <Text style={styles.actionSub}>5 demo customers re-load karega</Text>
          </View>
          {busy ? <ActivityIndicator color={Colors.brand} /> : <Ionicons name="chevron-forward" size={18} color={Colors.muted} />}
        </Pressable>

        <Text style={styles.sectionLabel}>Security</Text>
        <Pressable testID="settings-lock" onPress={lock} style={styles.actionRow}>
          <Ionicons name="lock-closed" size={22} color={Colors.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>App lock karein</Text>
            <Text style={styles.actionSub}>PIN dobara maanga jaayega</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
        </Pressable>

        <Pressable testID="settings-logout" onPress={logout} style={styles.actionRow}>
          <Ionicons name="log-out" size={22} color={Colors.udhaar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>Logout</Text>
            <Text style={styles.actionSub}>Server login clear karega</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
        </Pressable>

        {!!msg && <Text style={styles.msg} testID="settings-msg">{msg}</Text>}

        <Text style={styles.footer}>Kirana Udhaar Tracker · Made for Indian shops</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  title: { fontSize: Font.size.xxl, fontWeight: Font.weight.black, color: Colors.onSurface },
  sectionLabel: { fontSize: Font.size.sm, color: Colors.muted, fontWeight: Font.weight.semibold, textTransform: "uppercase", letterSpacing: 0.5, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, padding: Spacing.lg },
  cardValue: { fontSize: Font.size.lg, fontWeight: Font.weight.bold, color: Colors.onSurface, flex: 1 },
  input: { backgroundColor: Colors.surface, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: Font.size.base, color: Colors.onSurface, borderWidth: 1, borderColor: Colors.border },
  actionRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.sm },
  actionTitle: { fontSize: Font.size.lg, fontWeight: Font.weight.semibold, color: Colors.onSurface },
  actionSub: { fontSize: Font.size.sm, color: Colors.muted, marginTop: 2 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: Radius.md, alignItems: "center" },
  btnPrimary: { backgroundColor: Colors.brand },
  btnPrimaryText: { color: "#fff", fontWeight: Font.weight.bold },
  btnGhost: { backgroundColor: Colors.surfaceTertiary },
  btnGhostText: { color: Colors.onSurface, fontWeight: Font.weight.semibold },
  msg: { marginTop: Spacing.lg, color: Colors.jama, fontWeight: Font.weight.semibold, textAlign: "center" },
  footer: { textAlign: "center", color: Colors.muted, marginTop: Spacing.xxxl, fontSize: Font.size.sm },
});
