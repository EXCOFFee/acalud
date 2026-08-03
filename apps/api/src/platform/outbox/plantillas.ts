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
    case 'recuperacion_password': {
      const token = String(payload['token'] ?? '');
      const link = `${WEB}/restablecer?token=${encodeURIComponent(token)}`;
      return {
        asunto: 'Restablecé tu contraseña de Acalud',
        html: base(
          `<h1 style="font-size:22px;margin:0 0 12px;">Restablecer contraseña</h1>
           <p style="margin:0 0 20px;">Pediste recuperar el acceso a tu cuenta. El enlace vence en 30 minutos y se usa una sola vez.</p>
           <p style="margin:0 0 20px;">${boton(link, 'Elegir una contraseña nueva')}</p>
           <p style="color:#566661;font-size:13px;margin:0;">Si no fuiste vos, ignorá este mail: tu contraseña sigue igual.<br>Enlace directo:<br>${link}</p>`,
        ),
      };
    }
    case 'recuperacion_confirmada':
      return {
        asunto: 'Tu contraseña de Acalud fue cambiada',
        html: base(
          `<h1 style="font-size:22px;margin:0 0 12px;">Contraseña actualizada</h1>
           <p style="margin:0 0 20px;">Tu contraseña se cambió correctamente y se cerraron todas las sesiones abiertas.</p>
           <p style="margin:0;">${boton(`${WEB}/login`, 'Ingresar')}</p>
           <p style="color:#566661;font-size:13px;margin:16px 0 0;">Si no fuiste vos, recuperá el acceso de inmediato y avisanos.</p>`,
        ),
      };
    case 'confirmacion_compra': {
      const numero = String(payload['numero'] ?? '');
      const total = Number(payload['total'] ?? 0).toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
      });
      return {
        asunto: `Tu compra en Acalud (${numero})`,
        html: base(
          `<h1 style="font-size:22px;margin:0 0 12px;">¡Gracias por tu compra! 🎲</h1>
           <p style="margin:0 0 8px;">Confirmamos el pago de tu pedido <strong>${numero}</strong>.</p>
           <p style="margin:0 0 20px;">Total: <strong>${total}</strong>. Te avisamos cuando lo despachemos.</p>
           <p style="margin:0;">${boton(`${WEB}/cuenta`, 'Ver mis pedidos')}</p>`,
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
    case 'licencia-asignada': {
      // CU-26 RN-008: el docente recibe los detalles de la asignación.
      const nombre = String(payload['nombre'] ?? '');
      const producto = String(payload['producto'] ?? '');
      const cantidad = Number(payload['cantidad'] ?? 0);
      return {
        asunto: `Te asignaron licencias de ${producto}`,
        html: base(
          `<h1 style="font-size:22px;margin:0 0 12px;">Tenés nuevas licencias 🎲</h1>
           <p style="margin:0 0 8px;">Hola ${nombre}, tu institución te asignó
             <strong>${cantidad}</strong> licencia(s) de <strong>${producto}</strong>.</p>
           <p style="margin:0 0 20px;">Ya podés usarlas y cargar tus sesiones de uso.</p>
           <p style="margin:0;">${boton(`${WEB}/cuenta`, 'Ver mis licencias')}</p>`,
        ),
      };
    }
    case 'licencia-revocada': {
      // CU-27 RN-005 / p19: el docente recibe los detalles de la revocación y las razones.
      const nombre = String(payload['nombre'] ?? '');
      const producto = String(payload['producto'] ?? '');
      const cantidad = Number(payload['cantidad'] ?? 0);
      const razon = String(payload['razon'] ?? '');
      const motivo = razon !== '' ? `<p style="margin:0 0 8px;">Motivo: ${razon}</p>` : '';
      return {
        asunto: `Se revocaron licencias de ${producto}`,
        html: base(
          `<h1 style="font-size:22px;margin:0 0 12px;">Revocación de licencias</h1>
           <p style="margin:0 0 8px;">Hola ${nombre}, tu institución revocó
             <strong>${cantidad}</strong> licencia(s) de <strong>${producto}</strong> que tenías asignadas.</p>
           ${motivo}
           <p style="margin:0 0 20px;">Si tenés dudas, contactá a tu encargado institucional.</p>`,
        ),
      };
    }
    case 'propuesta-recibida': {
      // CU-15 RN-005: el equipo editorial recibe una notificación de cada propuesta nueva.
      const docente = String(payload['docente'] ?? '');
      const titulo = String(payload['titulo'] ?? '');
      return {
        asunto: `Nueva propuesta de juego: ${titulo}`,
        html: base(
          `<h1 style="font-size:22px;margin:0 0 12px;">Nueva propuesta de co-creación 💡</h1>
           <p style="margin:0 0 8px;">${docente} envió una propuesta: <strong>${titulo}</strong>.</p>
           <p style="margin:0;">${boton(`${WEB}/admin/propuestas`, 'Revisar propuesta')}</p>`,
        ),
      };
    }
    case 'propuesta-revisada': {
      // CU-21 RN-005: el docente autor recibe el nuevo estado y el feedback del admin.
      const nombre = String(payload['nombre'] ?? '');
      const titulo = String(payload['titulo'] ?? '');
      const estado = String(payload['estado'] ?? '');
      const feedback = String(payload['feedback'] ?? '');
      const bloqueFeedback =
        feedback !== '' ? `<p style="margin:0 0 8px;">Comentario del equipo: "${feedback}"</p>` : '';
      return {
        asunto: `Tu propuesta "${titulo}" fue revisada`,
        html: base(
          `<h1 style="font-size:22px;margin:0 0 12px;">Novedades sobre tu propuesta 📋</h1>
           <p style="margin:0 0 8px;">Hola ${nombre}, tu propuesta <strong>${titulo}</strong> pasó a estado <strong>${estado}</strong>.</p>
           ${bloqueFeedback}
           <p style="margin:0;">${boton(`${WEB}/cuenta/propuestas`, 'Ver mis propuestas')}</p>`,
        ),
      };
    }
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
