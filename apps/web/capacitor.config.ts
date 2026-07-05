import type { CapacitorConfig } from '@capacitor/cli';

// Empaquetado de la APK (ADR-001 / 5.3 §3): `next build` genera `out/`, luego
// `cap sync android` copia ese bundle al proyecto Android nativo para el build local.
const config: CapacitorConfig = {
  appId: 'ar.acalud.app',
  appName: 'Acalud',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
};

export default config;
