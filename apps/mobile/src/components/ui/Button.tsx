import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../../theme/PreferencesContext';
import { minTapTarget } from '../../theme/tokens';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Primary/secondary/danger button with pressed + disabled states, matching
// the design system's COMPONENTS/STATES tokens.
export function Button({ label, onPress, variant = 'primary', disabled, style }: Props) {
  const { colors, radius, spacing, typography } = useTheme();

  const bg = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : 'transparent';
  const border = variant === 'secondary' ? colors.outline : 'transparent';
  const textColor = variant === 'secondary' ? colors.text : colors.onPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth * 2 : 0,
          borderRadius: radius.md,
          paddingVertical: spacing.md - 2,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.label, typography.bodyStrong, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {},
});
