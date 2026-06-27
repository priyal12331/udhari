import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Api, Dashboard } from "@/src/api";
import { Colors, Font, formatINR, Radius, Spacing } from "@/src/theme";
import { CustomerRow } from "@/src/components/CustomerRow";

export default function HomeTab() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shopName, setShopName] = useState("");

  const load = useCallback(async () => {
    try {
      const [dash, setup] = await Promise.all([Api.getDashboard(), Api.getSetup()]);
      setData(dash);
      setShopName(setup.shop_name);
    } catch (e) {
      // noop
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Namaste 🙏</Text>
          <Text style={styles.shop} numberOfLines={1} testID="home-shop-name">{shopName}</Text>
        </View>
        <Pressable
          testID="home-add-customer-btn"
          onPress={() => router.push("/add-customer")}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="person-add" size={22} color={Colors.onSurface} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}><ActivityIndicator color={Colors.brand} /></View>
      ) : (
        <FlatList
          data={data?.customers || []}
          keyExtractor={(c) => c.id}
          ListHeaderComponent={
            <View style={styles.heroWrap}>
              <View style={styles.hero} testID="home-hero-card">
                <Text style={styles.heroLabel}>Total Udhaar (Outstanding)</Text>
                <Text style={styles.heroAmount} testID="home-total-outstanding">
                  {formatINR(data?.total_outstanding || 0)}
                </Text>
                <View style={styles.heroStatsRow}>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatNum}>{data?.total_customers || 0}</Text>
                    <Text style={styles.heroStatLabel}>Customers</Text>
                  </View>
                  <View style={styles.heroDivider} />
                  <View style={styles.heroStat}>
                    <Text style={[styles.heroStatNum, { color: Colors.udhaar }]}>
                      {data?.customers_with_dues || 0}
                    </Text>
                    <Text style={styles.heroStatLabel}>Dues pending</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.sectionTitle}>Saare customers</Text>
            </View>
          }
          renderItem={({ item }) => (
            <CustomerRow customer={item} onPress={() => router.push(`/customer/${item.id}`)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty} testID="home-empty">
              <Ionicons name="storefront-outline" size={56} color={Colors.borderStrong} />
              <Text style={styles.emptyTitle}>Koi customer nahi</Text>
              <Text style={styles.emptySub}>Pehla customer add karein</Text>
              <Pressable
                onPress={() => router.push("/add-customer")}
                style={styles.emptyBtn}
                testID="home-empty-add"
              >
                <Text style={styles.emptyBtnText}>+ Add Customer</Text>
              </Pressable>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.brand} />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <Pressable
        testID="home-voice-fab"
        onPress={() => router.push("/voice")}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="mic" size={26} color="#fff" />
        <Text style={styles.fabText}>Voice Add</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  greeting: { fontSize: Font.size.base, color: Colors.muted, fontWeight: Font.weight.semibold },
  shop: { fontSize: Font.size.xl, fontWeight: Font.weight.black, color: Colors.onSurface, maxWidth: 240 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
  },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  hero: {
    backgroundColor: Colors.surfaceInverse, borderRadius: Radius.lg, padding: Spacing.xl,
  },
  heroLabel: { fontSize: Font.size.base, color: "#A1A1AA", fontWeight: Font.weight.semibold },
  heroAmount: {
    fontSize: 44, fontWeight: Font.weight.black, color: "#fff",
    marginTop: Spacing.sm, letterSpacing: -1,
  },
  heroStatsRow: {
    flexDirection: "row", marginTop: Spacing.xl, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: Radius.md, padding: Spacing.md,
  },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatNum: { fontSize: Font.size.xxl, fontWeight: Font.weight.black, color: "#fff" },
  heroStatLabel: { fontSize: Font.size.sm, color: "#A1A1AA", marginTop: 2 },
  heroDivider: { width: 1, alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.12)" },
  sectionTitle: {
    fontSize: Font.size.lg, fontWeight: Font.weight.bold, color: Colors.onSurface,
    marginTop: Spacing.xl, marginBottom: Spacing.sm,
  },
  empty: { alignItems: "center", paddingTop: Spacing.xxxl, paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  emptyTitle: { fontSize: Font.size.xl, fontWeight: Font.weight.bold, color: Colors.onSurface, marginTop: Spacing.md },
  emptySub: { fontSize: Font.size.base, color: Colors.muted },
  emptyBtn: { marginTop: Spacing.lg, backgroundColor: Colors.brand, borderRadius: Radius.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  emptyBtnText: { color: "#fff", fontWeight: Font.weight.bold, fontSize: Font.size.lg },
  fab: {
    position: "absolute", right: Spacing.lg, bottom: Spacing.lg,
    backgroundColor: Colors.brand, borderRadius: Radius.pill, paddingHorizontal: Spacing.xl, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  fabText: { color: "#fff", fontWeight: Font.weight.bold, fontSize: Font.size.lg },
});
