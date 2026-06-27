import { useEffect, useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Api, Customer } from "@/src/api";
import { useLocale } from "@/src/i18n/LocaleContext";
import { Colors, Font, Radius, Spacing } from "@/src/theme";

export default function AddTransaction() {
  const router = useRouter();
  const { t } = useLocale();
  const params = useLocalSearchParams<{
    customer_id?: string;
    initial_type?: string;
    initial_amount?: string;
  }>();
  const [type, setType] = useState<"credit" | "payment">(
    (params.initial_type as any) === "payment" ? "payment" : "credit"
  );
  const [amount, setAmount] = useState(params.initial_amount || "");
  const [note, setNote] = useState("");
  const [customerId, setCustomerId] = useState<string>(params.customer_id || "");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    Api.listCustomers().then(setCustomers).catch(() => {});
  }, []);

  const selected = customers.find((c) => c.id === customerId);

  const save = async () => {
    setErr("");
    if (!customerId) return setErr(t('addTxCustomerRequired'));
    const num = parseFloat(amount);
    if (!num || num <= 0) return setErr(t('addTxAmountInvalid'));
    setBusy(true);
    try {
      const tx = await Api.addTx(customerId, { type, amount: num, note });
      router.replace({ pathname: `/customer/${customerId}`, params: { notify_tx: tx.id } });
    } catch (e: any) { setErr(e?.message || t('error')); } finally { setBusy(false); }
  };

  const isCredit = type === "credit";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} testID="addtx-close">
            <Ionicons name="close" size={26} color={Colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>{t('addTxTitle')}</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={styles.body}>
          <Pressable
            testID="addtx-customer-picker"
            onPress={() => setShowPicker(v => !v)}
            style={styles.pickerBox}
          >
            <View>
              <Text style={styles.pickerLabel}>{t('addTxCustomer')}</Text>
              <Text style={styles.pickerValue}>{selected?.name || t('addTxChoose')}</Text>
            </View>
            <Ionicons name={showPicker ? "chevron-up" : "chevron-down"} size={20} color={Colors.onSurface} />
          </Pressable>
          {showPicker && (
            <View style={styles.pickerList}>
              <FlatList
                data={customers} keyExtractor={(c) => c.id}
                style={{ maxHeight: 200 }}
                renderItem={({ item }) => (
                  <Pressable
                    testID={`addtx-pick-${item.id}`}
                    onPress={() => { setCustomerId(item.id); setShowPicker(false); }}
                    style={styles.pickerItem}
                  >
                    <Text style={styles.pickerItemText}>{item.name}</Text>
                    <Text style={styles.pickerItemSub}>{item.phone}</Text>
                  </Pressable>
                )}
              />
            </View>
          )}

          <View style={styles.seg}>
            <Pressable
              testID="addtx-type-credit"
              onPress={() => setType("credit")}
              style={[styles.segBtn, isCredit && { backgroundColor: Colors.udhaar }]}
            >
              <Text style={[styles.segText, isCredit && { color: "#fff" }]}>{t('addTxCredit')}</Text>
              <Text style={[styles.segSub, isCredit && { color: "rgba(255,255,255,0.85)" }]}>{t('addTxCreditSub')}</Text>
            </Pressable>
            <Pressable
              testID="addtx-type-payment"
              onPress={() => setType("payment")}
              style={[styles.segBtn, !isCredit && { backgroundColor: Colors.jama }]}
            >
              <Text style={[styles.segText, !isCredit && { color: "#fff" }]}>{t('addTxPayment')}</Text>
              <Text style={[styles.segSub, !isCredit && { color: "rgba(255,255,255,0.85)" }]}>{t('addTxPaymentSub')}</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>{t('addTxAmount')}</Text>
          <TextInput
            testID="addtx-amount"
            value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))}
            placeholder="0"
            placeholderTextColor={Colors.muted}
            style={[styles.amountInput, { color: isCredit ? Colors.udhaar : Colors.jama }]}
            keyboardType="decimal-pad"
            autoFocus
          />

          <Text style={styles.label}>{t('addTxNote')}</Text>
          <TextInput
            testID="addtx-note"
            value={note} onChangeText={setNote}
            placeholder={t('addTxNotePlaceholder')}
            placeholderTextColor={Colors.muted}
            style={styles.noteInput}
            multiline
          />

          {!!err && <Text style={styles.err} testID="addtx-error">{err}</Text>}
        </View>

        <View style={styles.bottomBar}>
          <Pressable
            testID="addtx-save"
            onPress={save} disabled={busy}
            style={[styles.btn, { backgroundColor: isCredit ? Colors.udhaar : Colors.jama }, busy && { opacity: 0.6 }]}
          >
            <Text style={styles.btnText}>
              {busy ? t('addTxSaving') : (isCredit ? t('addTxSaveCredit') : t('addTxSavePayment'))}
            </Text>
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
  body: { flex: 1, padding: Spacing.lg, gap: Spacing.sm },
  pickerBox: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, padding: Spacing.lg,
  },
  pickerLabel: { fontSize: Font.size.sm, color: Colors.muted, fontWeight: Font.weight.semibold },
  pickerValue: { fontSize: Font.size.lg, fontWeight: Font.weight.bold, color: Colors.onSurface, marginTop: 2 },
  pickerList: { backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, marginTop: -Spacing.xs },
  pickerItem: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  pickerItemText: { fontSize: Font.size.lg, color: Colors.onSurface, fontWeight: Font.weight.semibold },
  pickerItemSub: { fontSize: Font.size.sm, color: Colors.muted },
  seg: {
    flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md,
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, padding: 4,
  },
  segBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.sm, alignItems: "center" },
  segText: { fontSize: Font.size.lg, fontWeight: Font.weight.bold, color: Colors.onSurface },
  segSub: { fontSize: Font.size.sm, color: Colors.muted, marginTop: 2 },
  label: { fontSize: Font.size.base, color: Colors.onSurfaceSecondary, fontWeight: Font.weight.semibold, marginTop: Spacing.lg },
  amountInput: { fontSize: 56, fontWeight: Font.weight.black, paddingVertical: Spacing.md, textAlign: "center" },
  noteInput: {
    backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: 14,
    fontSize: Font.size.base, color: Colors.onSurface, minHeight: 60, borderWidth: 1, borderColor: Colors.border,
  },
  err: { color: Colors.udhaar, fontWeight: Font.weight.semibold, marginTop: Spacing.md },
  bottomBar: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.divider },
  btn: { borderRadius: Radius.md, paddingVertical: 18, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: Font.weight.bold, fontSize: Font.size.lg },
});
