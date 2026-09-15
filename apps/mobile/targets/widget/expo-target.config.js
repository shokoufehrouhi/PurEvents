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
  frameworks: ['SwiftUI', 'WidgetKit'],
  deploymentTarget: '16.4',
  entitlements: {
    // Same App Group as app.json's ios.entitlements and
    // src/widgets/iosWidgetSync.ts's WIDGET_APP_GROUP — all three must
    // agree on this exact string or the app and the widget end up reading/
    // writing two different sandboxed containers with the same name.
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
