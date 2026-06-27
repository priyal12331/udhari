import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Api } from "@/src/api";
import { Session } from "@/src/session";
import { Colors, Font, Radius, Spacing } from "@/src/theme";

export default function LockScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shopName, setShopName] = useState("");

  useEffect(() => {
    Api.getSetup().then((s) => setShopName(s.shop_name)).catch(() => {});
  }, []);

  useEffect(() => {
    if (pin.length >= 4) {
      verify(pin);
    }
  }, [pin]);

  const verify = async (p: string) => {
    try {
      const r = await Api.verifyPin(p);
      if (r.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        await Session.unlock();
        router.replace("/(tabs)");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setError(true);
        setTimeout(() => { setPin(""); setError(false); }, 500);
      }
    } catch {
      setError(true);
      setTimeout(() => { setPin(""); setError(false); }, 500);
    }
  };

  const press = (n: string) => {
    Haptics.selectionAsync().catch(() => {});
    if (n === "del") return setPin((p) => p.slice(0, -1));
    if (pin.length < 6) setPin((p) => p + n);
  };

  const keys = ["1","2","3","4","5","6","7","8","9","","0","del"];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.top}>
        <View style={styles.iconWrap}><Ionicons name="lock-closed" size={28} color={Colors.brand} /></View>
        <Text style={styles.title} testID="lock-title">{shopName || "Welcome"}</Text>
        <Text style={styles.subtitle}>PIN daalein · Enter PIN</Text>
        <View style={styles.dots} testID="lock-dots">
          {[0,1,2,3].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                pin.length > i && styles.dotFilled,
                error && styles.dotError,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.pad}>
        {keys.map((k, idx) => (
          <Pressable
            key={idx}
            testID={k ? `pin-key-${k}` : undefined}
            disabled={!k}
            onPress={() => k && press(k)}
            style={({ pressed }) => [styles.key, !k && { opacity: 0 }, pressed && k && styles.keyPressed]}
          >
            {k === "del" ? (
              <Ionicons name="backspace-outline" size={26} color={Colors.onSurface} />
            ) : (
              <Text style={styles.keyText}>{k}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface, justifyContent: "space-between" },
  top: { alignItems: "center", paddingTop: Spacing.xxl, gap: Spacing.md },
  iconWrap: {
    width: 56, height: 56, borderRadius: Radius.lg, backgroundColor: Colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: Font.size.xxl, fontWeight: Font.weight.black, color: Colors.onSurface },
  subtitle: { fontSize: Font.size.lg, color: Colors.muted },
  dots: { flexDirection: "row", gap: Spacing.lg, marginTop: Spacing.lg },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.borderStrong, backgroundColor: "transparent" },
  dotFilled: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  dotError: { backgroundColor: Colors.udhaar, borderColor: Colors.udhaar },
  pad: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "center",
    paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl, gap: Spacing.md,
  },
  key: {
    width: "30%", aspectRatio: 1.6, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md,
  },
  keyPressed: { backgroundColor: Colors.surfaceTertiary },
  keyText: { fontSize: 32, fontWeight: Font.weight.bold, color: Colors.onSurface },
});
