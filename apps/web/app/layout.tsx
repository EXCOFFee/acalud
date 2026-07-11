import type { ReactNode } from 'react';
import { Bricolage_Grotesque, Public_Sans } from 'next/font/google';
import './globals.css';

// Fuentes variables self-hosted por next/font → funcionan offline en la APK (Capacitor).
const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--fuente-display',
  display: 'swap',
});
const body = Public_Sans({
  subsets: ['latin'],
  variable: '--fuente-body',
  display: 'swap',
});

export const metadata = {
  title: 'Acalud — juegos educativos que se miden en el aula',
  description: 'Plataforma de juegos educativos para docentes e instituciones.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
