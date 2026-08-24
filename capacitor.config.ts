import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Used only when you wrap the built web app for the Play Store / App Store.
 * See LAUNCH.md → "Step 4: Wrap for the app stores".
 *
 * The bundle id below must match the application id you register in Google
 * Play Console and App Store Connect. Change it before your first build —
 * it can never be changed after a store release.
 */
const config: CapacitorConfig = {
  appId: 'app.nikkahpure.mobile',
  appName: 'NikkahPure',
  webDir: 'dist',
  backgroundColor: '#0D1F17',
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'always',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
