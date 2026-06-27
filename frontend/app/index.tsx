import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Api } from "@/src/api";
import { Session } from "@/src/session";
import { Colors } from "@/src/theme";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const setup = await Api.getSetup();
        if (!setup.has_pin || !setup.shop_name) {
          router.replace("/setup");
          return;
        }
        const unlocked = await Session.isUnlocked();
        if (!unlocked) {
          router.replace("/lock");
          return;
        }
        router.replace("/(tabs)");
      } catch (e) {
        // If backend down, fall through to setup
        router.replace("/setup");
      }
    })();
  }, []);

  return (
    <View style={styles.container} testID="splash-screen">
      <ActivityIndicator size="large" color={Colors.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.surface },
});
