import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../src/components/ui/Button';
import { useTheme } from '../src/theme/PreferencesContext';

type PlanId = 'monthly' | 'yearly' | 'lifetime';

const PLANS: { id: PlanId; price: string; sub?: string }[] = [
  { id: 'monthly', price: '$2.99' },
  { id: 'yearly', price: '$14.99', sub: '$1.25/mo · Save 58%' },
  { id: 'lifetime', price: '$29.99' },
];

const FEATURES = [
  ['infinite', 'featureUnlimitedEvents'],
  ['grid', 'featureAllWidgets'],
  ['notifications', 'featureUnlimitedReminders'],
  ['color-palette', 'featureCustomThemes'],
  ['cloud', 'featureCloudSync'],
] as const;

// Paywall marketing screen. Purchases aren't wired to a store yet — see
// docs/PROJECT.md §5.1/§9 for the RevenueCat + IAP plan (Phase 3).
export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<PlanId>('yearly');

  function handleStart() {
    Alert.alert('Not wired up yet', 'In-app purchases go live once RevenueCat is integrated (Phase 3).');
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.md, paddingTop: insets.top + spacing.md }}
    >
      <Pressable onPress={() => router.back()} style={styles.close} hitSlop={12}>
        <Ionicons name="close" size={20} color={colors.text} />
      </Pressable>

      <View style={[styles.iconWrap, { backgroundColor: colors.primary, borderRadius: radius.md }]}>
        <Ionicons name="calendar" size={28} color={colors.onPrimary} />
      </View>

      <Text style={[typography.title, { color: colors.text, textAlign: 'center', marginTop: spacing.md, fontSize: 26 }]}>
        {t('paywall.title')}
      </Text>
      <Text style={[typography.body, { color: colors.secondary, textAlign: 'center', marginTop: spacing.xs }]}>
        {t('paywall.subtitle')}
      </Text>

      <View style={[styles.featureCard, { backgroundColor: colors.surface, borderRadius: radius.lg, marginTop: spacing.lg }]}>
        {FEATURES.map(([icon, key], i) => (
          <View
            key={key}
            style={[
              styles.featureRow,
              { padding: spacing.sm + 4, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderColor: colors.outline },
            ]}
          >
            <Ionicons name={icon as never} size={20} color={colors.primary} style={{ width: 28 }} />
            <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{t(`paywall.${key}`)}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.plans, { marginTop: spacing.lg }]}>
        {PLANS.map((p) => {
          const selected = plan === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => setPlan(p.id)}
              style={[
                styles.planTile,
                {
                  borderColor: selected ? colors.primary : colors.outline,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              {p.id === 'yearly' ? (
                <View style={[styles.bestBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[typography.caption, { color: colors.onPrimary, fontSize: 10 }]}>
                    {t('paywall.bestValue')}
                  </Text>
                </View>
              ) : null}
              <Text style={[typography.label, { color: colors.text }]}>{t(`paywall.${p.id}`)}</Text>
              <Text style={[typography.bodyStrong, { color: colors.text, marginTop: 4 }]}>{p.price}</Text>
              {p.sub ? <Text style={[typography.caption, { color: colors.secondary }]}>{p.sub}</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <Button label={t('paywall.startTrial')} onPress={handleStart} style={{ marginTop: spacing.lg }} />
      <Text style={[typography.caption, { color: colors.secondary, textAlign: 'center', marginTop: spacing.xs }]}>
        {t('paywall.noChargeToday')}
      </Text>

      <View style={styles.linksRow}>
        <Text style={[typography.caption, { color: colors.primary }]} onPress={handleStart}>
          {t('paywall.restorePurchases')}
        </Text>
        <Text style={[typography.caption, { color: colors.primary }]} onPress={() => Linking.openURL('https://example.com/terms')}>
          {t('paywall.terms')}
        </Text>
        <Text style={[typography.caption, { color: colors.primary }]} onPress={() => router.push('/privacy')}>
          {t('paywall.privacyLink')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  close: { alignSelf: 'flex-start' },
  iconWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 8 },
  featureCard: { overflow: 'hidden' },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  plans: { flexDirection: 'row', gap: 8 },
  planTile: { flex: 1, borderWidth: 2, padding: 12, alignItems: 'center' },
  bestBadge: { position: 'absolute', top: -8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  linksRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 16 },
});
