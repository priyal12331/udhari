import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Api, Customer } from "@/src/api";
import { Colors, Font, Radius, Spacing } from "@/src/theme";
import { CustomerRow } from "@/src/components/CustomerRow";

type Filter = "all" | "pending" | "cleared" | "risky";

export default function CustomersTab() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    try {
      const cs = await Api.listCustomers();
      setCustomers(cs);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    let list = customers;
    if (q.trim()) {
      const ql = q.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(ql) || c.phone.includes(q));
    }
    if (filter === "pending") list = list.filter(c => c.balance > 0);
    if (filter === "cleared") list = list.filter(c => c.balance <= 0);
    if (filter === "risky") list = list.filter(c => c.risk === "red" || c.risk === "yellow");
    return list;
  }, [customers, q, filter]);

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "Sab" },
    { id: "pending", label: "Pending" },
    { id: "risky", label: "Risky" },
    { id: "cleared", label: "Cleared" },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title} testID="customers-title">Customers</Text>
        <Pressable
          onPress={() => router.push("/add-customer")}
          testID="customers-add-btn"
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={Colors.muted} />
        <TextInput
          testID="customers-search"
          value={q}
          onChangeText={setQ}
          placeholder="Naam ya phone search karein"
          placeholderTextColor={Colors.muted}
          style={styles.search}
        />
      </View>
      <View style={styles.chipsRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={chips}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.lg }}
          renderItem={({ item }) => {
            const active = filter === item.id;
            return (
              <Pressable
                testID={`chip-${item.id}`}
                onPress={() => setFilter(item.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}><ActivityIndicator color={Colors.brand} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <CustomerRow customer={item} onPress={() => router.push(`/customer/${item.id}`)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={Colors.borderStrong} />
              <Text style={styles.emptyText}>Koi customer match nahi</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  title: { fontSize: Font.size.xxl, fontWeight: Font.weight.black, color: Colors.onSurface },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.brand,
    borderRadius: Radius.pill, paddingHorizontal: Spacing.lg, paddingVertical: 10 },
  addBtnText: { color: "#fff", fontWeight: Font.weight.bold, fontSize: Font.size.base },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    marginHorizontal: Spacing.lg, paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, height: 48,
  },
  search: { flex: 1, fontSize: Font.size.base, color: Colors.onSurface },
  chipsRow: { height: 56, justifyContent: "center" },
  chip: {
    height: 36, paddingHorizontal: Spacing.lg, borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  chipActive: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  chipText: { fontSize: Font.size.base, fontWeight: Font.weight.semibold, color: Colors.onSurfaceSecondary },
  chipTextActive: { color: "#fff" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingTop: Spacing.xxxl, gap: Spacing.md },
  emptyText: { fontSize: Font.size.lg, color: Colors.muted },
});
