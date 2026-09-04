import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/PreferencesContext';

interface Props {
  title?: string;
  children: ReactNode;
}

// Grouped card of Rows with a small uppercase section header, like the
// Settings screen's PREFERENCES / NOTIFICATIONS / ABOUT groups.
export function Section({ title, children }: Props) {
  const { colors, spacing, radius, typography } = useTheme();
  const items = Children.toArray(children);

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {title ? (
        <Text
          style={[
            typography.label,
            { color: colors.secondary, marginBottom: spacing.xs, marginLeft: spacing.md, letterSpacing: 0.5 },
          ]}
        >
          {title.toUpperCase()}
        </Text>
      ) : null}
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' }}>
        {items.map((child, i: number) => (
          <Fragment key={i}>
            {child}
            {i < items.length - 1 ? (
              <View style={[styles.divider, { backgroundColor: colors.outline, marginLeft: spacing.md + 26 }]} />
            ) : null}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth },
});
