import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Font, Radius, Spacing } from "@/src/theme";
import { Customer } from "@/src/api";
import { formatINR } from "@/src/theme";

type Props = {
  customer: Customer;
  onPress: () => void;
};

export function CustomerRow({ customer, onPress }: Props) {
  const owes = customer.balance > 0;
  const cleared = customer.balance <= 0;
  const balanceColor = owes ? Colors.udhaar : Colors.jama;
  const riskColor =
    customer.risk === "red" ? Colors.riskRed : customer.risk === "yellow" ? Colors.riskYellow : Colors.riskGreen;

  const initials = customer.name
    .split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Pressable
      testID={`customer-row-${customer.id}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
        <View style={[styles.riskDot, { backgroundColor: riskColor }]} />
      </View>
      <View style={styles.middle}>
        <Text style={styles.name} numberOfLines={1}>{customer.name}</Text>
        <Text style={styles.phone} numberOfLines={1}>{customer.phone}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.balance, { color: balanceColor }]} testID={`customer-balance-${customer.id}`}>
          {cleared && customer.balance === 0 ? formatINR(0) : formatINR(customer.balance)}
        </Text>
        <Text style={[styles.balanceLabel, { color: balanceColor }]}>
          {owes ? "Udhaar baaki" : "Hisaab clear"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.borderStrong} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  pressed: { backgroundColor: Colors.surfaceSecondary },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center", position: "relative",
  },
  avatarText: { fontSize: Font.size.lg, fontWeight: Font.weight.bold, color: Colors.onSurface },
  riskDot: {
    position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: Colors.surface,
  },
  middle: { flex: 1, minWidth: 0 },
  name: { fontSize: Font.size.lg, fontWeight: Font.weight.bold, color: Colors.onSurface },
  phone: { fontSize: Font.size.sm, color: Colors.muted, marginTop: 2 },
  right: { alignItems: "flex-end", minWidth: 90 },
  balance: { fontSize: Font.size.xl, fontWeight: Font.weight.black },
  balanceLabel: { fontSize: 11, fontWeight: Font.weight.semibold, marginTop: 2 },
});
