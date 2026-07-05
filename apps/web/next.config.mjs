/** @type {import('next').NextConfig} */
const nextConfig = {
  // Export estático: el mismo bundle se sirve en Vercel y se empaqueta como APK
  // con Capacitor (ADR-001). El contenido dinámico se hidrata client-side.
  output: 'export',
  // El optimizador de imágenes de Next requiere servidor; con export estático se desactiva.
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
