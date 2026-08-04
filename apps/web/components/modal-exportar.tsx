'use client';

import { useState } from 'react';
import { Alerta, Boton, Dialogo } from '@/components/ui';

export type FormatoExportacion = 'excel' | 'pdf';

interface ModalExportarProps {
  abierto: boolean;
  onCerrar: () => void;
  onExportar: (formato: FormatoExportacion) => void;
  cargando: boolean;
  error: string | null;
  titulo: string;
  descripcionExcel: string;
  descripcionPdf: string;
  periodoTexto: string;
}

/**
 * CU-32 pasos 3-6 (reusado por CU-33 A9): modal de exportación con selector de formato
 * (Excel/PDF) — compartido entre `/institucion/reportes` y `/institucion/dashboard`, mismo
 * flujo de exportación en ambos.
 */
export function ModalExportar({
  abierto,
  onCerrar,
  onExportar,
  cargando,
  error,
  titulo,
  descripcionExcel,
  descripcionPdf,
  periodoTexto,
}: ModalExportarProps) {
  const [formato, setFormato] = useState<FormatoExportacion>('excel');

  return (
    <Dialogo
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={titulo}
      acciones={
        <>
          <Boton variante="fantasma" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </Boton>
          <Boton variante="primario" onClick={() => onExportar(formato)} cargando={cargando}>
            Exportar
          </Boton>
        </>
      }
    >
      {error ? <Alerta tipo="error">{error}</Alerta> : null}

      <div className="campo">
        <span className="campo__label" id="formato-export-label">
          Formato
        </span>
        <div
          role="group"
          aria-labelledby="formato-export-label"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
        >
          <label
            className="tarjeta"
            style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.7rem 1rem', cursor: 'pointer' }}
          >
            <input type="radio" name="formato_export" checked={formato === 'excel'} onChange={() => setFormato('excel')} />
            <span>
              <strong>Excel</strong>
              <br />
              <span style={{ fontSize: '0.85rem', color: 'var(--tinta-suave)' }}>{descripcionExcel}</span>
            </span>
          </label>
          <label
            className="tarjeta"
            style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.7rem 1rem', cursor: 'pointer' }}
          >
            <input type="radio" name="formato_export" checked={formato === 'pdf'} onChange={() => setFormato('pdf')} />
            <span>
              <strong>PDF</strong>
              <br />
              <span style={{ fontSize: '0.85rem', color: 'var(--tinta-suave)' }}>{descripcionPdf}</span>
            </span>
          </label>
        </div>
      </div>

      <p style={{ margin: '0.8rem 0 0', fontSize: '0.85rem', color: 'var(--tinta-suave)' }}>{periodoTexto}</p>
    </Dialogo>
  );
}
