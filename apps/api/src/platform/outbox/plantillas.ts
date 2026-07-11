export interface Plantilla {
  asunto: string;
  html: string;
}

function base(contenido: string): string {
  // Estilos inline: los clientes de email ignoran <style>.
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f3f1ea;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#22302d;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fffdf8;border:1px solid #e4dfd1;border-radius:16px;overflow:hidden;">
      <tr><td style="background:#234a43;padding:18px 28px;color:#fbf7ee;font-weight:700;font-size:18px;">Acalud</td></tr>
      <tr><td style="padding:28px;line-height:1.55;">${contenido}</td></tr>
    </table>
    <p style="color:#8a938c;font-size:12px;margin:16px 0 0;">Acalud · juegos educativos</p>
  </td></tr></table></body></html>`;
}

function boton(href: string, texto: string): string {
  return `<a href="${href}" style="display:inline-block;background:#2f5d54;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:9px;">${texto}</a>`;
}

const WEB = process.env.WEB_BASE_URL ?? 'http://localhost:3001';

/** Renderiza el email según su tipo + payload; null si el tipo no tiene plantilla. */
export function renderizar(tipo: string, payload: Record<string, unknown>): Plantilla | null {
  switch (tipo) {
    case 'verificacion_email': {
      const token = String(payload['token'] ?? '');
      const link = `${WEB}/verificar?token=${encodeURIComponent(token)}`;
      return {
        asunto: 'Verificá tu cuenta en Acalud',
        html: base(
          `<h1 style="font-size:22px;margin:0 0 12px;">Bienvenido/a a Acalud</h1>
           <p style="margin:0 0 20px;">Confirmá tu email para activar tu cuenta de docente.</p>
           <p style="margin:0 0 20px;">${boton(link, 'Verificar mi cuenta')}</p>
           <p style="color:#566661;font-size:13px;margin:0;">Si el botón no anda, pegá este enlace en el navegador:<br>${link}</p>`,
        ),
      };
    }
    case 'cuenta-existente':
      return {
        asunto: 'Ya tenés una cuenta en Acalud',
        html: base(
          `<h1 style="font-size:22px;margin:0 0 12px;">Ya existe una cuenta con este email</h1>
           <p style="margin:0 0 20px;">Alguien intentó registrarse con tu email. Si fuiste vos, ingresá con tu contraseña.</p>
           <p style="margin:0;">${boton(`${WEB}/login`, 'Ingresar')}</p>`,
        ),
      };
    case 'aviso-bloqueo':
      return {
        asunto: 'Alerta de seguridad en tu cuenta de Acalud',
        html: base(
          `<h1 style="font-size:22px;margin:0 0 12px;">Actividad inusual en tu cuenta</h1>
           <p style="margin:0;">Detectamos varios intentos fallidos de inicio de sesión. Por seguridad, tu cuenta se bloqueó temporalmente (15 minutos). Si no fuiste vos, cambiá tu contraseña al recuperar el acceso.</p>`,
        ),
      };
    default:
      return null;
  }
}
