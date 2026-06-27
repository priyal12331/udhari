import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocale } from '@/src/i18n/LocaleContext';
import { LOCALE_LABELS, Locale } from '@/src/i18n/strings';
import { Colors, Font, Radius, Spacing } from '@/src/theme';

type Props = {
  compact?: boolean;
  testID?: string;
};

export function LanguageToggle({ compact, testID = 'language-toggle' }: Props) {
  const { locale, setLocale } = useLocale();
  const options: Locale[] = ['hi', 'en'];

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]} testID={testID}>
      {options.map((opt) => {
        const active = locale === opt;
        return (
          <Pressable
            key={opt}
            testID={`${testID}-${opt}`}
            onPress={() => setLocale(opt)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {LOCALE_LABELS[opt]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: Spacing.sm },
  wrapCompact: { alignSelf: 'center' },
  chip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: Colors.brand, borderColor: Colors.brand },
  chipText: { fontSize: Font.size.base, fontWeight: Font.weight.semibold, color: Colors.onSurface },
  chipTextActive: { color: '#fff' },
});
