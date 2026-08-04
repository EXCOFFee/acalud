'use client';

import { useId, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Boton } from './button';
import { IconoDocumento } from './icon';

interface SubirArchivoProps {
  etiqueta: string;
  /** Valor del `accept` del input nativo, ej: "image/png,image/jpeg,image/webp". */
  aceptar: string;
  tamanioMaximoMB: number;
  /** Valor actual del campo (imagen_url o url) — vacío si no hay nada cargado. */
  valor: string;
  onCambiar: (valor: string) => void;
  /** Sube el archivo al backend y devuelve el nuevo valor a guardar en el campo. */
  onSubir: (archivo: File) => Promise<string>;
  tipoPreview: 'imagen' | 'archivo';
  /** Si además de subir un archivo se puede pegar una URL externa a mano. Default: true. */
  permitirUrlManual?: boolean;
}

/**
 * CU-19 ("subida de archivo"): reemplaza el campo de texto libre por un selector de
 * archivo con drag-and-drop. El `<input type="file">` real siempre está presente y es el que
 * recibe foco/activación por teclado — el área de arrastre es una mejora progresiva encima,
 * nunca un reemplazo (accessibility: preferir el control nativo).
 */
export function SubirArchivo({
  etiqueta,
  aceptar,
  tamanioMaximoMB,
  valor,
  onCambiar,
  onSubir,
  tipoPreview,
  permitirUrlManual = true,
}: SubirArchivoProps) {
  const idInput = useId();
  const idEstado = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [modo, setModo] = useState<'archivo' | 'url'>('archivo');
  const [arrastrando, setArrastrando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tiposAceptados = aceptar.split(',').map((t) => t.trim());

  async function manejarArchivo(archivo: File): Promise<void> {
    setError(null);
    if (!tiposAceptados.includes(archivo.type)) {
      setError('Ese tipo de archivo no está permitido.');
      return;
    }
    if (archivo.size > tamanioMaximoMB * 1024 * 1024) {
      setError(`El archivo no puede superar los ${tamanioMaximoMB} MB.`);
      return;
    }
    setSubiendo(true);
    try {
      const nuevoValor = await onSubir(archivo);
      onCambiar(nuevoValor);
    } catch {
      setError('No pudimos subir el archivo. Probá de nuevo.');
    } finally {
      setSubiendo(false);
    }
  }

  function alSeleccionar(e: ChangeEvent<HTMLInputElement>): void {
    const archivo = e.target.files?.[0];
    if (archivo) void manejarArchivo(archivo);
    e.target.value = ''; // permite volver a elegir el mismo archivo si hace falta
  }

  function alSoltar(e: DragEvent<HTMLLabelElement>): void {
    e.preventDefault();
    setArrastrando(false);
    const archivo = e.dataTransfer.files?.[0];
    if (archivo) void manejarArchivo(archivo);
  }

  return (
    <div className="campo">
      <span className="campo__label" id={`${idInput}-etiqueta`}>
        {etiqueta}
      </span>

      {permitirUrlManual ? (
        <div className="subir-archivo__alternar" role="group" aria-labelledby={`${idInput}-etiqueta`}>
          <Boton
            variante={modo === 'archivo' ? 'primario' : 'fantasma'}
            type="button"
            onClick={() => setModo('archivo')}
            aria-pressed={modo === 'archivo'}
          >
            Subir archivo
          </Boton>
          <Boton
            variante={modo === 'url' ? 'primario' : 'fantasma'}
            type="button"
            onClick={() => setModo('url')}
            aria-pressed={modo === 'url'}
          >
            Pegar URL externa
          </Boton>
        </div>
      ) : null}

      {modo === 'archivo' ? (
        <>
          <label
            htmlFor={idInput}
            className={`subir-archivo${arrastrando ? ' subir-archivo--arrastrando' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={alSoltar}
          >
            <input
              ref={inputRef}
              id={idInput}
              type="file"
              className="subir-archivo__input"
              accept={aceptar}
              onChange={alSeleccionar}
              aria-describedby={idEstado}
            />
            {subiendo ? (
              <span>Subiendo…</span>
            ) : valor && tipoPreview === 'imagen' ? (
              <span className="subir-archivo__preview-imagen">
                <img src={valor} alt="Vista previa de la imagen cargada" />
                <span>Cambiar imagen (click o arrastrá otra acá)</span>
              </span>
            ) : valor ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <IconoDocumento size={18} /> Archivo cargado — click o arrastrá otro para reemplazarlo
              </span>
            ) : (
              <span>Arrastrá un archivo acá, o hacé click para elegirlo</span>
            )}
          </label>
          <span id={idEstado} role="status" className="campo__ayuda">
            {error ? '' : `Máximo ${tamanioMaximoMB} MB.`}
          </span>
          {error ? (
            <span className="campo__error" role="alert">
              {error}
            </span>
          ) : null}
        </>
      ) : (
        <input
          id={idInput}
          type="url"
          className="campo__input"
          placeholder="https://…"
          value={valor}
          onChange={(e) => onCambiar(e.target.value)}
        />
      )}
    </div>
  );
}
