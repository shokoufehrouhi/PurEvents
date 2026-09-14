import { ScrollView, Text, View } from 'react-native';

import { useTheme } from '../src/theme/PreferencesContext';

const LAST_UPDATED = 'September 14, 2026';

// English-only, deliberately — this is a legal document, not app UI copy,
// and machine-translating GDPR/CCPA/subscription language into the app's
// other 5 locales without native-speaker legal review risks getting the
// actual obligations wrong, which a mistranslated button label never does.
// Real-world apps commonly ship legal docs in one canonical language for
// exactly this reason.
const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: '1. Summary',
    body:
      'PuraEvents is offline-first: your events, reminders, and appearance settings are stored only on this device by ' +
      "default. No account is required to use the free version, and this version doesn't run any analytics, " +
      'advertising, or crash-reporting SDK.',
  },
  {
    heading: '2. Information Stored On Your Device',
    body:
      'Events you create (title, date/time, timezone, category, notes, reminders, appearance, and any optional Share ' +
      'message or sender name), widgets you design (photos and style settings), and app preferences (theme, language, ' +
      'calendar system) are stored locally on your device. None of it leaves your device unless you explicitly export ' +
      'it yourself (see "Your Choices" below), or a Pro cloud-sync feature — once available — is turned on.',
  },
  {
    heading: '3. Photos You Add',
    body:
      "If you pick a photo from your device's photo library for a custom widget, the app copies it into its own local " +
      'storage so it keeps working after you close the picker. We never upload that photo anywhere.',
  },
  {
    heading: '4. Third-Party Services We Use',
    body:
      'Pexels API: the Events tab background photo and the Pro category-photo gallery are fetched from Pexels ' +
      "(pexels.com), using only a city name (derived from your device's timezone, not GPS — we never request " +
      "location access) or a category keyword as the search term. Notifications: reminders are scheduled locally " +
      "using your operating system's own notification system — we don't run a push server and never see or store " +
      'your reminder content remotely. App Store / Google Play: a Pro purchase is handled entirely by Apple or ' +
      "Google; we don't receive or store your payment card details.",
  },
  {
    heading: '5. Data We Do Not Collect',
    body:
      "We don't currently collect analytics, advertising identifiers, or crash reports. If that changes in a future " +
      "version, this policy — and, where required, your platform's own privacy labels — will be updated first.",
  },
  {
    heading: '6. Your Choices',
    body:
      'Export: Settings → Data & Privacy → Export shares all of your events as a file at any time. Delete: since your ' +
      'data lives only on this device, uninstalling the app deletes it; once optional cloud sync ships, an in-app ' +
      '"delete my cloud data" option will be added here. Access/correction: view and edit every event directly in ' +
      'the app at any time.',
  },
  {
    heading: "7. Children's Privacy",
    body:
      "PuraEvents isn't directed at children under 13 (or the minimum age required in your country), and we don't " +
      'knowingly collect personal information from children.',
  },
  {
    heading: '8. International Users (GDPR / CCPA)',
    body:
      "Because your data stays on your device unless you export it yourself, we don't process your personal data on " +
      'our own servers today. If you\'re in the EU/UK or California and have questions about your rights under GDPR ' +
      'or the CCPA, contact us using the details below.',
  },
  {
    heading: '9. Changes To This Policy',
    body:
      "We may update this policy as the app changes — for example when cloud sync, analytics, or new subscription " +
      'products are added. We\'ll update the date above and, for material changes, note it in the app\'s release notes.',
  },
  {
    heading: '10. Contact',
    body: 'Questions about this policy? Email shookiapps@gmail.com.',
  },
];

// TODO before App Store/Google Play submission: have this reviewed by
// counsel, confirm the contact address is live, and fill in a governing
// jurisdiction if one gets added here later (see terms.tsx's own note).
export default function PrivacyScreen() {
  const { colors, spacing, typography } = useTheme();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.md }}>
      <Text style={[typography.caption, { color: colors.secondary, marginBottom: spacing.md }]}>Last updated: {LAST_UPDATED}</Text>
      <Text style={[typography.body, { color: colors.text, lineHeight: 24, marginBottom: spacing.lg }]}>
        This Privacy Policy explains what information PuraEvents (&ldquo;the app&rdquo;, &ldquo;we&rdquo;) handles and how.
      </Text>
      {SECTIONS.map((section) => (
        <View key={section.heading} style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.bodyStrong, { color: colors.text, marginBottom: 6 }]}>{section.heading}</Text>
          <Text style={[typography.body, { color: colors.secondary, lineHeight: 22 }]}>{section.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
