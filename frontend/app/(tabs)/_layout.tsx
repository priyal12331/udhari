import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Font } from "@/src/theme";
import { Platform } from "react-native";
import { useLocale } from "@/src/i18n/LocaleContext";

export default function TabsLayout() {
  const { t, locale } = useLocale();

  return (
    <Tabs
      key={locale}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.brand,
        tabBarInactiveTintColor: Colors.muted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.divider,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: Font.size.sm, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabHome'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          tabBarButtonTestID: "tab-home",
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: t('tabCustomers'),
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
          tabBarButtonTestID: "tab-customers",
        }}
      />
      <Tabs.Screen
        name="voice"
        options={{
          title: t('tabVoice'),
          tabBarIcon: ({ color, size }) => <Ionicons name="mic" size={size} color={color} />,
          tabBarButtonTestID: "tab-voice",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabSettings'),
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
          tabBarButtonTestID: "tab-settings",
        }}
      />
    </Tabs>
  );
}
