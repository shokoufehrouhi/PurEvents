import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/PreferencesContext';
import { minTapTarget } from '../../theme/tokens';

interface Option<T extends string | number> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string | number>({ options, value, onChange }: Props<T>) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 4 }]}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              {
                backgroundColor: selected ? colors.primary : 'transparent',
                borderRadius: radius.sm,
                paddingVertical: spacing.sm + 4,
              },
            ]}
          >
            <Text
              style={[
                typography.label,
                styles.label,
                { color: selected ? colors.onPrimary : colors.text },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row' },
  segment: { flex: 1, minHeight: minTapTarget, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
