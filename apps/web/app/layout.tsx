import type { ReactNode } from 'react';

export const metadata = {
  title: 'Acalud',
  description: 'Plataforma de juegos educativos',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
