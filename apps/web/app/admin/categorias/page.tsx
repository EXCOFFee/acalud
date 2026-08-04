'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alerta,
  Boton,
  Campo,
  Dialogo,
  EstadoCarga,
  EstadoError,
  EstadoVacio,
  IconoCarpeta,
  Tabla,
  useToast,
  type ColumnaTabla,
} from '@/components/ui';
import { SiteNav } from '@/components/site-nav';
import { api, ApiError, type CategoriaAdmin } from '@/lib/api';

export default function AdminCategoriasPage() {
  const router = useRouter();
  const { notificar } = useToast();
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null);
  const [categorias, setCategorias] = useState<CategoriaAdmin[] | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  const [edicion, setEdicion] = useState<CategoriaAdmin | 'nueva' | null>(null);
  const [nombre, setNombre] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [aEliminar, setAEliminar] = useState<CategoriaAdmin | null>(null);
  const [eliminando, setEliminando] = useState(false);

  function cargar(): void {
    setEstado('cargando');
    api
      .listarCategoriasAdmin()
      .then((r) => {
        setCategorias(r);
        setEstado('ok');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/admin/categorias');
        else setEstado('error');
      });
  }

  useEffect(() => {
    api
      .me()
      .then((p) => {
        setEsAdmin(p.es_admin);
        if (p.es_admin) cargar();
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login?volver=/admin/categorias');
        else setEsAdmin(false);
      });
  }, [router]);

  function abrirNueva(): void {
    setEdicion('nueva');
    setNombre('');
    setFormError(null);
  }

  function abrirEditar(cat: CategoriaAdmin): void {
    setEdicion(cat);
    setNombre(cat.nombre);
    setFormError(null);
  }

  async function guardar(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!nombre.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    setFormError(null);
    setGuardando(true);
    try {
      if (edicion === 'nueva') {
        await api.crearCategoriaAdmin(nombre.trim());
        notificar('Categoría creada.', 'ok');
      } else if (edicion) {
        await api.actualizarCategoriaAdmin(edicion.id, nombre.trim());
        notificar('Categoría actualizada.', 'ok');
      }
      setEdicion(null);
      cargar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/admin/categorias');
        return;
      }
      if (err instanceof ApiError && (err.status === 409 || err.status === 404)) {
        setFormError(err.problema.detail ?? 'No pudimos guardar la categoría.');
      } else {
        setFormError('No pudimos conectar. Revisá tu conexión.');
      }
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar(): Promise<void> {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await api.eliminarCategoriaAdmin(aEliminar.id);
      notificar('Categoría eliminada.', 'ok');
      setAEliminar(null);
      cargar();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login?volver=/admin/categorias');
        return;
      }
      notificar(err instanceof ApiError ? (err.problema.detail ?? 'No pudimos eliminar la categoría.') : 'No pudimos conectar.', 'error');
      setAEliminar(null);
    } finally {
      setEliminando(false);
    }
  }

  const columnas: ColumnaTabla<CategoriaAdmin>[] = [
    { clave: 'nombre', encabezado: 'Nombre', render: (c) => c.nombre },
    {
      clave: 'acciones',
      encabezado: '',
      render: (c) => (
        <span style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Boton variante="fantasma" onClick={() => abrirEditar(c)}>
            Editar
          </Boton>
          <Boton variante="peligro" onClick={() => setAEliminar(c)}>
            Eliminar
          </Boton>
        </span>
      ),
    },
  ];

  return (
    <>
      <SiteNav />
      <main className="contenedor" style={{ paddingTop: '2.2rem' }}>
        <p className="eyebrow">Administración</p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', margin: '0.3rem 0 1.2rem' }}>
          Categorías del catálogo
        </h1>

        {esAdmin === false ? (
          <Alerta tipo="aviso">No tenés permisos de administrador para acceder a esta sección.</Alerta>
        ) : null}

        {esAdmin ? (
          <>
            {estado === 'cargando' ? <EstadoCarga>Cargando categorías…</EstadoCarga> : null}
            {estado === 'error' ? (
              <EstadoError titulo="No pudimos cargar las categorías">
                <Boton variante="primario" onClick={cargar}>
                  Reintentar
                </Boton>
              </EstadoError>
            ) : null}

            {estado === 'ok' ? (
              <div style={{ marginBottom: '1rem' }}>
                <Boton variante="primario" onClick={abrirNueva}>
                  + Nueva categoría
                </Boton>
              </div>
            ) : null}

            {estado === 'ok' && categorias && categorias.length === 0 ? (
              <EstadoVacio icono={<IconoCarpeta size={40} />} titulo="Todavía no hay categorías">
                Creá la primera con el botón de arriba.
              </EstadoVacio>
            ) : null}

            {estado === 'ok' && categorias && categorias.length > 0 ? (
              <Tabla columnas={columnas} filas={categorias} claveFila={(c) => c.id} />
            ) : null}
          </>
        ) : null}
      </main>

      <Dialogo
        abierto={edicion !== null}
        onCerrar={() => setEdicion(null)}
        titulo={edicion === 'nueva' ? 'Nueva categoría' : 'Editar categoría'}
      >
        <form onSubmit={guardar} noValidate>
          {formError ? <Alerta tipo="error">{formError}</Alerta> : null}
          <Campo id="nombre-categoria" etiqueta="Nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <div className="dialogo__acciones">
            <Boton variante="fantasma" type="button" onClick={() => setEdicion(null)} disabled={guardando}>
              Cancelar
            </Boton>
            <Boton variante="primario" type="submit" cargando={guardando}>
              Guardar
            </Boton>
          </div>
        </form>
      </Dialogo>

      <Dialogo
        abierto={aEliminar !== null}
        onCerrar={() => setAEliminar(null)}
        titulo="¿Eliminar categoría?"
        acciones={
          <>
            <Boton variante="fantasma" onClick={() => setAEliminar(null)} disabled={eliminando}>
              No, cancelar
            </Boton>
            <Boton variante="peligro" onClick={confirmarEliminar} cargando={eliminando}>
              Sí, eliminar
            </Boton>
          </>
        }
      >
        <p>
          Vas a eliminar <strong>{aEliminar?.nombre}</strong>. Los productos que la tengan
          asignada quedarán sin categoría.
        </p>
      </Dialogo>
    </>
  );
}
