'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alerta, Boton, Campo, Dialogo } from '@/components/ui';
import { SiteNav } from '@/components/site-nav';
import { api, ApiError, type PerfilPropio } from '@/lib/api';

export default function CuentaPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<PerfilPropio | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    nivel_educativo: '',
    materia: '',
    institucion: '',
  });

  const [cambioAbierto, setCambioAbierto] = useState(false);
  const [cambioForm, setCambioForm] = useState({ nuevo_email: '', contrasena: '' });
  const [cambioError, setCambioError] = useState<string | null>(null);
  const [cambioEnviando, setCambioEnviando] = useState(false);
  const [cambioMensaje, setCambioMensaje] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    api
      .me()
      .then((p) => {
        if (!vivo) return;
        setPerfil(p);
        setForm({
          nombre: p.nombre,
          apellido: p.apellido,
          nivel_educativo: p.nivel_educativo ?? '',
          materia: p.materia ?? '',
          institucion: p.institucion ?? '',
        });
        setEstado('listo');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) router.replace('/login');
        else if (vivo) setEstado('error');
      });
    return () => {
      vivo = false;
    };
  }, [router]);

  async function guardarPerfil(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setGuardando(true);
    try {
      const actualizado = await api.actualizarPerfil({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        nivel_educativo: form.nivel_educativo.trim() || null,
        materia: form.materia.trim() || null,
        institucion: form.institucion.trim() || null,
      });
      setPerfil(actualizado);
      setForm({
        nombre: actualizado.nombre,
        apellido: actualizado.apellido,
        nivel_educativo: actualizado.nivel_educativo ?? '',
        materia: actualizado.materia ?? '',
        institucion: actualizado.institucion ?? '',
      });
    } finally {
      setGuardando(false);
    }
  }

  function abrirCambioCorreo(): void {
    setCambioForm({ nuevo_email: '', contrasena: '' });
    setCambioError(null);
    setCambioAbierto(true);
  }

  async function solicitarCambioCorreo(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setCambioError(null);
    setCambioEnviando(true);
    try {
      const r = await api.cambioCorreo(cambioForm.nuevo_email, cambioForm.contrasena);
      setCambioMensaje(r.mensaje);
      setCambioAbierto(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) setCambioError('Contraseña incorrecta.');
        else if (err.status === 422) setCambioError(err.problema.detail ?? 'No pudimos procesar el cambio.');
        else setCambioError('No pudimos procesar el cambio. Intentá de nuevo.');
      } else {
        setCambioError('No pudimos conectar. Revisá tu conexión.');
      }
    } finally {
      setCambioEnviando(false);
    }
  }

  return (
    <>
      <SiteNav />

      <div className="contenedor">
        {estado === 'cargando' ? (
          <p style={{ color: 'var(--tinta-suave)' }}>Cargando tu cuenta…</p>
        ) : null}

        {estado === 'error' ? (
          <Alerta tipo="error">
            No pudimos cargar tu cuenta. <Link href="/login">Volvé a ingresar</Link>.
          </Alerta>
        ) : null}

        {estado === 'listo' && perfil ? (
          <>
            <p className="eyebrow">Tu cuenta</p>
            <h1 style={{ fontSize: '2.2rem', margin: '0.2rem 0 1.4rem' }}>Hola, {perfil.nombre}</h1>
            {perfil.capacidades_limitadas ? (
              <Alerta tipo="aviso">
                Verificá tu email para habilitar compras y recursos licenciados.
              </Alerta>
            ) : null}
            {cambioMensaje ? <Alerta tipo="ok">{cambioMensaje}</Alerta> : null}
            <p style={{ margin: '0 0 1.2rem' }}>
              <Link className="boton boton--fantasma" href="/cuenta/pedidos">
                📦 Ver mis pedidos
              </Link>
            </p>
            <form className="tarjeta" onSubmit={guardarPerfil}>
              <div className="dato">
                <span className="dato__k">Nombre</span>
                <input
                  className="campo__input"
                  value={form.nombre}
                  onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
                  required
                />
              </div>
              <div className="dato">
                <span className="dato__k">Apellido</span>
                <input
                  className="campo__input"
                  value={form.apellido}
                  onChange={(e) => setForm((prev) => ({ ...prev, apellido: e.target.value }))}
                  required
                />
              </div>
              <div className="dato">
                <span className="dato__k">Email</span>
                <span className="dato__v" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {perfil.email}
                  <Boton variante="fantasma" type="button" onClick={abrirCambioCorreo}>
                    Cambiar
                  </Boton>
                </span>
              </div>
              <div className="dato">
                <span className="dato__k">Estado</span>
                <span className="dato__v">
                  {perfil.estado === 'verificada' ? 'Verificada' : 'Sin verificar'}
                </span>
              </div>
              <div className="dato">
                <span className="dato__k">Nivel educativo</span>
                <input
                  className="campo__input"
                  value={form.nivel_educativo}
                  onChange={(e) => setForm((prev) => ({ ...prev, nivel_educativo: e.target.value }))}
                />
              </div>
              <div className="dato">
                <span className="dato__k">Materia</span>
                <input
                  className="campo__input"
                  value={form.materia}
                  onChange={(e) => setForm((prev) => ({ ...prev, materia: e.target.value }))}
                />
              </div>
              <div className="dato">
                <span className="dato__k">Institución</span>
                <input
                  className="campo__input"
                  value={form.institucion}
                  onChange={(e) => setForm((prev) => ({ ...prev, institucion: e.target.value }))}
                />
              </div>
              <button className="boton boton--primario" type="submit" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </form>
          </>
        ) : null}
      </div>

      <Dialogo
        abierto={cambioAbierto}
        onCerrar={() => setCambioAbierto(false)}
        titulo="Cambiar correo electrónico"
      >
        <form onSubmit={solicitarCambioCorreo} noValidate>
          {cambioError ? <Alerta tipo="error">{cambioError}</Alerta> : null}
          <p style={{ color: 'var(--tinta-suave)', marginTop: 0 }}>
            Te vamos a enviar un enlace de verificación al correo nuevo. Tu correo actual sigue
            funcionando hasta que confirmes el cambio.
          </p>
          <Campo
            id="nuevo-email"
            etiqueta="Nuevo correo electrónico"
            type="email"
            autoComplete="email"
            required
            value={cambioForm.nuevo_email}
            onChange={(e) => setCambioForm((f) => ({ ...f, nuevo_email: e.target.value }))}
          />
          <Campo
            id="contrasena-vigente"
            etiqueta="Contraseña vigente"
            type="password"
            autoComplete="current-password"
            required
            value={cambioForm.contrasena}
            onChange={(e) => setCambioForm((f) => ({ ...f, contrasena: e.target.value }))}
          />
          <div className="dialogo__acciones">
            <Boton variante="fantasma" type="button" onClick={() => setCambioAbierto(false)} disabled={cambioEnviando}>
              Cancelar
            </Boton>
            <Boton variante="primario" type="submit" cargando={cambioEnviando}>
              Enviar solicitud
            </Boton>
          </div>
        </form>
      </Dialogo>
    </>
  );
}
