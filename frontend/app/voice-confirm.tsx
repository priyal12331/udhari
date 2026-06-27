import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

// Lightweight bridge: just forward to add-transaction with prefilled values + chosen customer.
export default function VoiceConfirm() {
  const router = useRouter();
  const p = useLocalSearchParams<{
    matched_customer_id?: string;
    name?: string;
    amount?: string;
    type?: string;
  }>();

  useEffect(() => {
    if (p.matched_customer_id) {
      router.replace({
        pathname: "/add-transaction",
        params: {
          customer_id: p.matched_customer_id,
          initial_type: p.type || "credit",
          initial_amount: p.amount || "",
        },
      });
    } else {
      // No match — open add transaction without customer selected (user picks)
      router.replace({
        pathname: "/add-transaction",
        params: {
          initial_type: p.type || "credit",
          initial_amount: p.amount || "",
        },
      });
    }
  }, []);

  return null;
}
