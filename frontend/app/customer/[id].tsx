import { useCallback, useState, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Linking, ActivityIndicator, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Api, Customer, Transaction } from "@/src/api";
import { Colors, Font, formatINR, Radius, Spacing } from "@/src/theme";

function fmtDate(d: Date, withTime = false): string {
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
  if (withTime) {
    return d.toLocaleString("en-IN", { ...opts, hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-IN", opts);
}

export default function CustomerDetail() {
  const { id, notify_tx } = useLocalSearchParams<{ id: string; notify_tx?: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopName, setShopName] = useState("");
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [c, t, s] = await Promise.all([Api.getCustomer(id), Api.listTx(id), Api.getSetup()]);
      setCustomer(c); setTxs(t); setShopName(s.shop_name);
    } catch {} finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const justAddedTx = useMemo(
    () => txs.find((t) => t.id === notify_tx && !t.notified_at),
    [txs, notify_tx]
  );

  const buildReminderMessage = (cust: Customer): string => {
    const amount = Math.max(0, Math.round(cust.balance));
    return `Namaste ${cust.name}, aapka ₹${amount} udhaar pending hai. - ${shopName || "Aapki Dukaan"}`;
  };

  const buildReceiptMessage = (cust: Customer, tx: Transaction): string => {
    const amount = Math.round(tx.amount);
    const dstr = fmtDate(new Date(tx.date));
    const sn = shopName || "Aapki Dukaan";
    if (tx.type === "credit") {
      return `Namaste! Aapne aaj ${sn} se ₹${amount} udhaar liya hai ${dstr} ko. Yeh aapki receipt hai. - ${sn}`;
    }
    return `Namaste ${cust.name}, aapka ₹${amount} payment ${sn} ne ${dstr} ko receive kar liya hai. Dhanyavaad! - ${sn}`;
  };

  const openWhatsAppWith = async (phone: string, message: string): Promise<boolean> => {
    const clean = phone.replace(/[^0-9]/g, "");
    const url = `whatsapp://send?phone=${clean}&text=${encodeURIComponent(message)}`;
    const webUrl = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
    try {
      if (Platform.OS !== "web") {
        const supported = await Linking.canOpenURL(url);
        if (supported) { await Linking.openURL(url); return true; }
      }
      await Linking.openURL(webUrl);
      return true;
    } catch { return false; }
  };

  const sendReminder = async () => {
    if (!customer) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await openWhatsAppWith(customer.phone, buildReminderMessage(customer));
  };

  const sendReceipt = async (tx: Transaction) => {
    if (!customer) return;
    setSendingId(tx.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const ok = await openWhatsAppWith(customer.phone, buildReceiptMessage(customer, tx));
    if (ok) {
      try {
        const r = await Api.notifyTx(tx.id);
        setTxs((prev) => prev.map((t) => t.id === tx.id ? { ...t, notified_at: r.notified_at } : t));
        if (notify_tx === tx.id) setDismissedBanner(true);
      } catch {}
    }
    setSendingId(null);
  };

  const removeCustomer = async () => {
    if (!customer) return;
    await Api.deleteCustomer(customer.id);
    router.back();
  };

  if (loading || !customer) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}><ActivityIndicator color={Colors.brand} /></View>
      </SafeAreaView>
    );
  }

  const owes = customer.balance > 0;
  const showBanner = !!justAddedTx && !dismissedBanner;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="detail-back">
          <Ionicons name="chevron-back" size={26} color={Colors.onSurface} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{customer.name}</Text>
        <Pressable onPress={removeCustomer} hitSlop={10} testID="detail-delete">
          <Ionicons name="trash-outline" size={22} color={Colors.udhaar} />
        </Pressable>
      </View>

      <View style={styles.balanceCard} testID="detail-balance-card">
        <Text style={styles.balanceLabel}>{owes ? "Outstanding Udhaar" : "Hisaab"}</Text>
        <Text style={[styles.balanceAmount, { color: owes ? Colors.udhaar : Colors.jama }]} testID="detail-balance">
          {formatINR(Math.abs(customer.balance))}
        </Text>
        <View style={styles.phoneRow}>
          <Ionicons name="call" size={14} color={Colors.muted} />
          <Text style={styles.phoneText}>{customer.phone}</Text>
          <View style={[styles.riskPill, { backgroundColor:
            customer.risk === "red" ? Colors.riskRed : customer.risk === "yellow" ? Colors.riskYellow : Colors.riskGreen }]}>
            <Text style={styles.riskPillText}>
              {customer.risk === "red" ? "30+ days" : customer.risk === "yellow" ? "15-30 days" : "Recent"}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={txs}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={
          <View>
            {showBanner && justAddedTx && (
              <View style={styles.banner} testID="receipt-banner">
                <View style={styles.bannerIcon}>
                  <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerTitle}>Receipt WhatsApp pe bhejein?</Text>
                  <Text style={styles.bannerSub} numberOfLines={2}>
                    {justAddedTx.type === "credit" ? "Customer ko ₹" + Math.round(justAddedTx.amount) + " udhaar ka digital proof bhej dein" : "Payment ki rasid customer ko bhej dein"}
                  </Text>
                </View>
                <View style={styles.bannerActions}>
                  <Pressable
                    testID="receipt-banner-send"
                    onPress={() => sendReceipt(justAddedTx)}
                    disabled={sendingId === justAddedTx.id}
                    style={[styles.bannerSendBtn, sendingId === justAddedTx.id && { opacity: 0.6 }]}
                  >
                    {sendingId === justAddedTx.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.bannerSendText}>Bhejo</Text>
                    )}
                  </Pressable>
                  <Pressable
                    testID="receipt-banner-skip"
                    hitSlop={10}
                    onPress={() => setDismissedBanner(true)}
                  >
                    <Ionicons name="close" size={20} color={Colors.muted} />
                  </Pressable>
                </View>
              </View>
            )}
            <Text style={styles.section}>Transaction History</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isCredit = item.type === "credit";
          const color = isCredit ? Colors.udhaar : Colors.jama;
          const date = new Date(item.date);
          const dstr = fmtDate(date);
          const notified = !!item.notified_at;
          return (
            <View style={styles.txRow} testID={`tx-${item.id}`}>
              <View style={[styles.txIcon, { backgroundColor: color + "1A" }]}>
                <Ionicons name={isCredit ? "arrow-up" : "arrow-down"} size={18} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txTitle}>{isCredit ? "Udhaar diya" : "Payment mila"}</Text>
                {!!item.note && <Text style={styles.txNote} numberOfLines={1}>{item.note}</Text>}
                <View style={styles.txMetaRow}>
                  <Text style={styles.txDate}>{dstr}</Text>
                  {notified && (
                    <View style={styles.notifiedPill} testID={`tx-notified-${item.id}`}>
                      <Ionicons name="checkmark-circle" size={11} color="#25D366" />
                      <Text style={styles.notifiedText}>
                        Sent {fmtDate(new Date(item.notified_at!))}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={[styles.txAmount, { color }]}>{isCredit ? "+" : "-"}{formatINR(item.amount)}</Text>
                <Text style={styles.txRunning}>Bal {formatINR(item.running_balance)}</Text>
              </View>
              <Pressable
                testID={`tx-send-receipt-${item.id}`}
                disabled={sendingId === item.id}
                onPress={() => sendReceipt(item)}
                hitSlop={6}
                style={[styles.txWaBtn, notified && styles.txWaBtnSent]}
              >
                {sendingId === item.id ? (
                  <ActivityIndicator color={notified ? "#25D366" : "#fff"} size="small" />
                ) : (
                  <Ionicons name="logo-whatsapp" size={18} color={notified ? "#25D366" : "#fff"} />
                )}
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={48} color={Colors.borderStrong} />
            <Text style={styles.emptyText}>Koi transaction nahi</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 180 }}
      />

      <View style={styles.bottomBar}>
        <Pressable
          testID="detail-whatsapp"
          onPress={sendReminder}
          disabled={!owes}
          style={[styles.waBtn, !owes && { opacity: 0.4 }]}
        >
          <Ionicons name="logo-whatsapp" size={22} color="#fff" />
          <Text style={styles.waBtnText}>Reminder</Text>
        </Pressable>
        <Pressable
          testID="detail-add-tx"
          onPress={() => router.push({ pathname: "/add-transaction", params: { customer_id: customer.id } })}
          style={styles.addTxBtn}
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addTxText}>Add Entry</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: Spacing.lg },
  title: { flex: 1, fontSize: Font.size.xl, fontWeight: Font.weight.black, color: Colors.onSurface, marginHorizontal: Spacing.md },
  balanceCard: {
    backgroundColor: Colors.surfaceSecondary, marginHorizontal: Spacing.lg, borderRadius: Radius.lg, padding: Spacing.xl,
    alignItems: "center", marginBottom: Spacing.lg,
  },
  balanceLabel: { fontSize: Font.size.base, color: Colors.muted, fontWeight: Font.weight.semibold },
  balanceAmount: { fontSize: 48, fontWeight: Font.weight.black, marginTop: 4, letterSpacing: -1 },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: Spacing.md, flexWrap: "wrap", justifyContent: "center" },
  phoneText: { fontSize: Font.size.base, color: Colors.onSurfaceSecondary, fontWeight: Font.weight.semibold },
  riskPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, marginLeft: 8 },
  riskPillText: { color: "#fff", fontSize: 11, fontWeight: Font.weight.bold },
  banner: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md, padding: Spacing.md,
    backgroundColor: "rgba(37, 211, 102, 0.08)", borderRadius: Radius.md,
    borderWidth: 1, borderColor: "rgba(37, 211, 102, 0.25)",
  },
  bannerIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  bannerTitle: { fontSize: Font.size.base, fontWeight: Font.weight.bold, color: Colors.onSurface },
  bannerSub: { fontSize: Font.size.sm, color: Colors.onSurfaceSecondary, marginTop: 2 },
  bannerActions: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  bannerSendBtn: { backgroundColor: "#25D366", borderRadius: Radius.pill, paddingHorizontal: Spacing.lg, paddingVertical: 8, minWidth: 64, alignItems: "center" },
  bannerSendText: { color: "#fff", fontWeight: Font.weight.bold, fontSize: Font.size.base },
  section: { fontSize: Font.size.lg, fontWeight: Font.weight.bold, color: Colors.onSurface, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  txRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  txTitle: { fontSize: Font.size.base, fontWeight: Font.weight.bold, color: Colors.onSurface },
  txNote: { fontSize: Font.size.sm, color: Colors.onSurfaceSecondary, marginTop: 2 },
  txMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" },
  txDate: { fontSize: 11, color: Colors.muted },
  notifiedPill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(37, 211, 102, 0.12)",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.pill,
  },
  notifiedText: { fontSize: 10, color: "#15803D", fontWeight: Font.weight.semibold },
  txAmount: { fontSize: Font.size.lg, fontWeight: Font.weight.black },
  txRunning: { fontSize: 11, color: Colors.muted },
  txWaBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "#25D366",
    alignItems: "center", justifyContent: "center", marginLeft: 4,
  },
  txWaBtnSent: { backgroundColor: "rgba(37, 211, 102, 0.15)" },
  empty: { alignItems: "center", paddingTop: Spacing.xxxl, gap: Spacing.md },
  emptyText: { fontSize: Font.size.lg, color: Colors.muted },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0, padding: Spacing.lg,
    borderTopWidth: 1, borderTopColor: Colors.divider, flexDirection: "row", gap: Spacing.md,
    backgroundColor: Colors.surface, paddingBottom: Platform.OS === 'ios' ? 28 : Spacing.lg,
  },
  waBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#25D366", borderRadius: Radius.md, paddingVertical: 16 },
  waBtnText: { color: "#fff", fontWeight: Font.weight.bold, fontSize: Font.size.lg },
  addTxBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.brand, borderRadius: Radius.md, paddingVertical: 16 },
  addTxText: { color: "#fff", fontWeight: Font.weight.bold, fontSize: Font.size.lg },
});
