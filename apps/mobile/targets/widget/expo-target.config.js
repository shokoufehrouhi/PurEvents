/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'PuraEventsWidget',
  displayName: 'PuraEvents Countdown',
  // Matches src/theme/tokens.ts' primary accent — used as the tint color
  // when the user is editing/removing the widget from the home screen,
  // not the widget's own content color (that's read live off the shared
  // event data, see widget.swift).
  colors: {
    $accent: '#6558D9',
  },
  frameworks: ['SwiftUI', 'WidgetKit', 'AppIntents'],
  // Higher than the main app's own 16.4 (docs/PROJECT.md §5.2) —
  // AppIntentConfiguration (the "user picks which event this widget
  // shows" API, see widget.swift) requires iOS 17+. This is a normal,
  // well-understood tradeoff for a configurable widget: an extension's
  // deployment target may exceed its host app's, it just means the
  // widget itself won't be offered to a user on iOS 16.x — the main app
  // stays fully usable there regardless.
  deploymentTarget: '17.0',
  entitlements: {
    // Same App Group as app.json's ios.entitlements and
    // src/widgets/iosWidgetSync.ts's WIDGET_APP_GROUP — all three must
    // agree on this exact string or the app and the widget end up reading/
    // writing two different sandboxed containers with the same name.
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
