declare global {
  interface Window {
    __ACALUD_API_URL__?: string;
  }
}

if (typeof window !== 'undefined') {
  // Vite inyecta variables de entorno en build; las exponemos para capas que no usan import.meta
  window.__ACALUD_API_URL__ =
    window.__ACALUD_API_URL__ ?? (import.meta.env?.VITE_API_URL ?? '');
}

export {};
