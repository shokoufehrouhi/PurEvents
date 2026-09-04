import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/PreferencesContext';
import { minTapTarget } from '../../theme/tokens';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: 3 }]}>
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
                paddingVertical: spacing.xs + 2,
              },
            ]}
          >
            <Text
              style={[
                typography.label,
                { color: selected ? colors.onPrimary : colors.text, textAlign: 'center' },
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
  segment: { flex: 1, minHeight: minTapTarget - 12, alignItems: 'center', justifyContent: 'center' },
});
