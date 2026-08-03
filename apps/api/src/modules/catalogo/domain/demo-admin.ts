/**
 * Demo administrada (CU-19 A8). `configJson` es el blob libre que exige RN-008 ("JSON válido");
 * la URL de Unity WebGL (A8.4) no tiene columna propia — se guarda como una clave más adentro
 * (`unity_webgl_url`), igual que `tipo`/`formato`/`contenido_ref` que consume el lado de lectura
 * (CU-06/CU-07, ver `domain/ports/demos.repository.ts`).
 */
export interface DemoAdmin {
  id: string;
  productId: string;
  configJson: Record<string, unknown>;
}
