import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Api } from "@/src/api";
import { Colors, Font, Radius, Spacing } from "@/src/theme";

export default function AddCustomer() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setErr("");
    if (!name.trim()) return setErr("Naam likhein");
    if (!phone.trim()) return setErr("Phone likhein");
    setBusy(true);
    try {
      const c = await Api.createCustomer(name.trim(), phone.trim());
      router.replace(`/customer/${c.id}`);
    } catch (e: any) { setErr(e?.message || "Error"); } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} testID="addcust-close" hitSlop={10}>
            <Ionicons name="close" size={26} color={Colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Naya Customer</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.body}>
          <Text style={styles.label}>Naam · Name</Text>
          <TextInput
            testID="addcust-name"
            value={name} onChangeText={setName}
            placeholder="e.g. Ramesh Kumar"
            placeholderTextColor={Colors.muted}
            style={styles.input}
            autoFocus
          />
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            testID="addcust-phone"
            value={phone} onChangeText={setPhone}
            placeholder="+91 98xxxxxxxx"
            placeholderTextColor={Colors.muted}
            style={styles.input}
            keyboardType="phone-pad"
          />
          {!!err && <Text style={styles.err} testID="addcust-error">{err}</Text>}
        </View>
        <View style={styles.bottomBar}>
          <Pressable testID="addcust-save" onPress={save} disabled={busy} style={[styles.btn, busy && { opacity: 0.5 }]}>
            <Text style={styles.btnText}>{busy ? "Save..." : "Save Customer"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: Spacing.lg },
  title: { fontSize: Font.size.xl, fontWeight: Font.weight.black, color: Colors.onSurface },
  body: { flex: 1, padding: Spacing.lg, gap: Spacing.xs },
  label: { fontSize: Font.size.base, color: Colors.onSurfaceSecondary, fontWeight: Font.weight.semibold, marginTop: Spacing.lg },
  input: { backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: 16, fontSize: Font.size.lg, color: Colors.onSurface, borderWidth: 1, borderColor: Colors.border },
  err: { color: Colors.udhaar, fontWeight: Font.weight.semibold, marginTop: Spacing.md },
  bottomBar: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.divider },
  btn: { backgroundColor: Colors.brand, borderRadius: Radius.md, paddingVertical: 18, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: Font.weight.bold, fontSize: Font.size.lg },
});
