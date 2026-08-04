import type { ReactNode } from 'react';
import { Fraunces, IBM_Plex_Mono, Public_Sans } from 'next/font/google';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

// Fuentes variables self-hosted por next/font → funcionan offline en la APK (Capacitor).
// Fraunces: serif cálida de contraste suave, para momentos de firma (hero, títulos grandes) —
// deliberadamente no una serif de alto contraste ni una grotesque genérica.
const display = Fraunces({
  subsets: ['latin'],
  axes: ['opsz', 'SOFT', 'WONK'],
  variable: '--fuente-display',
  display: 'swap',
});
const body = Public_Sans({
  subsets: ['latin'],
  variable: '--fuente-body',
  display: 'swap',
});
// Utilitaria: precios, KPIs, puntajes — la marca es "se mide en el aula", los números se leen
// como datos, no como prosa.
const utilitaria = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--fuente-utilitaria',
  display: 'swap',
});

export const metadata = {
  title: 'Acalud — juegos educativos que se miden en el aula',
  description: 'Plataforma de juegos educativos para docentes e instituciones.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR" className={`${display.variable} ${body.variable} ${utilitaria.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
