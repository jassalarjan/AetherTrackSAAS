import { CapacitorConfig } from '@capacitor/cli'; 
 
const config: CapacitorConfig = { 
  appId: 'com.aethertrack.app', 
  appName: 'AetherTrack', 
  webDir: 'frontend/dist', 
  bundledWebRuntime: false, 
 
  server: { 
    // Remote-load SaaS deployment so users get web updates without APK reinstall 
    url: process.env.CAP_SERVER_URL ? process.env.CAP_SERVER_URL : 'https://aethertrack.arjansinghjassal.xyz', 
    cleartext: false, 
    allowNavigation: [ 
      'https://aethertrack.arjansinghjassal.xyz', 
      'https://*.arjansinghjassal.xyz', 
      'https://fcm.googleapis.com', 
      'https://*.googleapis.com', 
      'wss://aethertrack.arjansinghjassal.xyz', 
    ], 
    androidScheme: 'https', 
    hostname: 'aethertrack.arjansinghjassal.xyz', 
  }, 
 
  android: { 
    buildOptions: { 
      keystorePath: 'android/aethertrack.keystore', 
      keystoreAlias: 'aethertrack', 
    }, 
    appendUserAgent: 'AetherTrackApp/1.0', 
    backgroundColor: '#120E08', 
    allowMixedContent: false, 
    captureInput: true, 
    webContentsDebuggingEnabled: false, 
    useLegacyBridge: false, 
  }, 
 
  plugins: { 
    SplashScreen: { 
      launchShowDuration: 2000, 
      launchAutoHide: true, 
      backgroundColor: '#120E08', 
      androidSplashResourceName: 'splash', 
      androidScaleType: 'CENTER_CROP', 
      showSpinner: false, 
      splashFullScreen: true, 
      splashImmersive: true, 
    }, 
    StatusBar: { 
      style: 'DARK', 
      backgroundColor: '#120E08', 
    }, 
    PushNotifications: { 
      presentationOptions: ['badge', 'sound', 'alert'], 
    }, 
    LocalNotifications: { 
      smallIcon: 'ic_stat_icon', 
      iconColor: '#D4905A', 
      sound: 'default', 
    }, 
    Geolocation: { 
      androidPermissions: [ 
        'android.permission.ACCESS_COARSE_LOCATION', 
        'android.permission.ACCESS_FINE_LOCATION', 
      ], 
    }, 
    Camera: { 
      permissions: ['camera', 'photos'], 
    }, 
    CapacitorHttp: { enabled: true }, 
    CapacitorSecureStorage: { keychainService: 'AetherTrackKeychain' }, 
    Preferences: { group: 'AetherTrackApp' }, 
  }, 
}; 
 
export default config;