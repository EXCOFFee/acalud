/**
 * 📧 SERVICIO DE EMAIL - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Servicio responsable del envío de emails del sistema:
 * - Recuperación de contraseñas
 * - Verificación de email
 * - Notificaciones del sistema
 * - Respuestas automáticas
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de envío de emails
 * - OCP: Extensible para nuevos tipos de email
 * - LSP: Implementa contratos bien definidos
 * - ISP: Interfaces específicas por tipo de email
 * - DIP: Depende de abstracciones (configuraciones, plantillas)
 */

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { User } from '../../users/user.entity';

/**
 * Interface para configuración de email
 */
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

/**
 * Interface para datos de email genérico
 */
interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Interface para datos de recuperación de contraseña
 */
interface PasswordResetEmailData {
  user: User;
  token: string;
  resetUrl: string;
  expirationMinutes: number;
}

/**
 * Interface para datos de verificación de email
 */
interface EmailVerificationData {
  user: User;
  verificationUrl: string;
}

interface ClassroomInvitationEmailData {
  email: string;
  classroomName: string;
  teacherName?: string;
  inviteLink: string;
  expiresAt?: Date | string | null;
  message?: string;
}

/**
 * Servicio de email que maneja toda la lógica de envío de correos
 * 
 * @description Este servicio implementa el envío de emails usando Nodemailer
 * con plantillas HTML responsivas y configuración flexible.
 * 
 * @example
 * ```typescript
 * await emailService.sendPasswordResetEmail({
 *   user,
 *   token: 'secure-token',
 *   resetUrl: 'https://app.acalud.edu/reset-password?token=secure-token',
 *   expirationMinutes: 60
 * });
 * ```
 */
@Injectable()
export class EmailService {
  /**
   * Logger para registrar operaciones de email
   */
  private readonly logger = new Logger(EmailService.name);

  /**
   * Transporter de Nodemailer
   */
  private transporter: Transporter;

  /**
   * Configuración de email
   */
  private emailConfig: EmailConfig;

  constructor(private readonly configService: ConfigService) {
    this.initializeEmailConfig();
    this.createTransporter();
  }

  /**
   * Inicializa la configuración de email desde variables de entorno
   */
  private initializeEmailConfig(): void {
    this.emailConfig = {
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.configService.get<string>('SMTP_USER', ''),
        pass: this.configService.get<string>('SMTP_PASS', ''),
      },
      from: this.configService.get<string>('SMTP_FROM', 'noreply@acalud.edu'),
    };

    this.logger.log(`📧 Configuración de email inicializada para: ${this.emailConfig.host}`);
  }

  /**
   * Crea el transporter de Nodemailer
   */
  private createTransporter(): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.secure,
        auth: this.emailConfig.auth,
        tls: {
          rejectUnauthorized: false, // Para desarrollo
        },
      });

      this.logger.log('✅ Transporter de email creado exitosamente');
    } catch (error) {
      this.logger.error(`❌ Error creando transporter de email: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error configurando servicio de email');
    }
  }

  /**
   * Verifica la conexión con el servidor de email
   * 
   * @returns Promise<boolean> true si la conexión es exitosa
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('✅ Conexión con servidor de email verificada');
      return true;
    } catch (error) {
      this.logger.error(`❌ Error verificando conexión de email: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Envía email de recuperación de contraseña
   * 
   * @param data Datos para el email de recuperación
   * @returns Promise<boolean> true si el email se envió exitosamente
   * 
   * @example
   * ```typescript
   * const success = await emailService.sendPasswordResetEmail({
   *   user: userEntity,
   *   token: 'abc123',
   *   resetUrl: 'https://app.acalud.edu/reset?token=abc123',
   *   expirationMinutes: 60
   * });
   * ```
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    this.logger.log(`📧 Enviando email de recuperación a: ${data.user.email}`);

    try {
      const html = this.generatePasswordResetTemplate(data);
      const text = this.generatePasswordResetTextVersion(data);

      const emailData: EmailData = {
        to: data.user.email,
        subject: '🔐 Recuperación de Contraseña - AcaLud',
        html,
        text,
      };

      const result = await this.sendEmail(emailData);
      
      if (result) {
        this.logger.log(`✅ Email de recuperación enviado exitosamente a: ${data.user.email}`);
      }

      return result;

    } catch (error) {
      this.logger.error(`❌ Error enviando email de recuperación: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Envía email de verificación de cuenta
   * 
   * @param data Datos para el email de verificación
   * @returns Promise<boolean> true si el email se envió exitosamente
   */
  async sendEmailVerification(data: EmailVerificationData): Promise<boolean> {
    this.logger.log(`📧 Enviando email de verificación a: ${data.user.email}`);

    try {
      const html = this.generateEmailVerificationTemplate(data);
      const text = this.generateEmailVerificationTextVersion(data);

      const emailData: EmailData = {
        to: data.user.email,
        subject: '✅ Verifica tu cuenta - AcaLud',
        html,
        text,
      };

      const result = await this.sendEmail(emailData);
      
      if (result) {
        this.logger.log(`✅ Email de verificación enviado exitosamente a: ${data.user.email}`);
      }

      return result;

    } catch (error) {
      this.logger.error(`❌ Error enviando email de verificación: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Envía email de invitación a un aula
   */
  async sendClassroomInvitationEmail(data: ClassroomInvitationEmailData): Promise<boolean> {
    this.logger.log(`📧 Enviando invitación de aula a: ${data.email}`);

    try {
      const html = this.generateClassroomInvitationTemplate(data);
      const text = this.generateClassroomInvitationTextVersion(data);

      const emailData: EmailData = {
        to: data.email,
        subject: `📚 Invitación al aula ${data.classroomName} - AcaLud`,
        html,
        text,
      };

      const result = await this.sendEmail(emailData);

      if (result) {
        this.logger.log(`✅ Invitación enviada exitosamente a: ${data.email}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`❌ Error enviando invitación de aula: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Envía email genérico
   * 
   * @param data Datos del email
   * @returns Promise<boolean> true si el email se envió exitosamente
   */
  private async sendEmail(data: EmailData): Promise<boolean> {
    try {
      // Verificar configuración mínima
      if (!this.emailConfig.auth.user || !this.emailConfig.auth.pass) {
        this.logger.warn('⚠️ Configuración de email incompleta, simulando envío');
        return true; // En desarrollo, simular envío exitoso
      }

      const info = await this.transporter.sendMail({
        from: this.emailConfig.from,
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
      });

      this.logger.log(`📤 Email enviado: ${info.messageId}`);
      return true;

    } catch (error) {
      this.logger.error(`❌ Error enviando email: ${error.message}`, error.stack);
      return false;
    }
  }

  // =============================================================================
  // PLANTILLAS DE EMAIL
  // =============================================================================

  /**
   * Genera plantilla HTML para recuperación de contraseña
   */
  private generatePasswordResetTemplate(data: PasswordResetEmailData): string {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de Contraseña - AcaLud</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 300;
            }
            .content {
                padding: 40px 30px;
            }
            .greeting {
                font-size: 18px;
                margin-bottom: 20px;
                color: #555;
            }
            .message {
                font-size: 16px;
                margin-bottom: 30px;
                line-height: 1.8;
            }
            .button-container {
                text-align: center;
                margin: 40px 0;
            }
            .reset-button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                padding: 15px 40px;
                border-radius: 50px;
                font-size: 16px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 1px;
                transition: transform 0.3s ease;
            }
            .reset-button:hover {
                transform: translateY(-2px);
            }
            .expiration {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                font-size: 14px;
                color: #856404;
            }
            .security-notice {
                background-color: #f8f9fa;
                border-left: 4px solid #6c757d;
                padding: 15px;
                margin: 20px 0;
                font-size: 14px;
                color: #6c757d;
            }
            .footer {
                background-color: #f8f9fa;
                padding: 20px 30px;
                text-align: center;
                font-size: 12px;
                color: #6c757d;
                border-top: 1px solid #dee2e6;
            }
            .footer a {
                color: #667eea;
                text-decoration: none;
            }
            @media (max-width: 600px) {
                .container {
                    margin: 10px;
                }
                .content {
                    padding: 20px;
                }
                .header {
                    padding: 20px;
                }
                .header h1 {
                    font-size: 24px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 AcaLud</h1>
                <p>Recuperación de Contraseña</p>
            </div>
            
            <div class="content">
                <div class="greeting">
                    Hola ${data.user.name || data.user.email},
                </div>
                
                <div class="message">
                    Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en AcaLud.
                    Si fuiste tú quien solicitó este cambio, haz clic en el botón de abajo para crear una nueva contraseña.
                </div>
                
                <div class="button-container">
                    <a href="${data.resetUrl}" class="reset-button">
                        Restablecer Contraseña
                    </a>
                </div>
                
                <div class="expiration">
                    ⏰ <strong>Importante:</strong> Este enlace expirará en ${data.expirationMinutes} minutos.
                    Si no completas el proceso antes de ese tiempo, deberás solicitar un nuevo enlace.
                </div>
                
                <div class="security-notice">
                    🛡️ <strong>Aviso de Seguridad:</strong><br>
                    • Si no solicitaste este cambio, puedes ignorar este email de forma segura.<br>
                    • Nunca compartas este enlace con otras personas.<br>
                    • Tu contraseña actual permanecerá sin cambios hasta que completes el proceso.
                </div>
                
                <div class="message">
                    Si tienes problemas con el botón, también puedes copiar y pegar el siguiente enlace en tu navegador:
                </div>
                
                <div style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
                    ${data.resetUrl}
                </div>
            </div>
            
            <div class="footer">
                <p>
                    Este email fue enviado por <strong>AcaLud</strong><br>
                    Si necesitas ayuda, contacta a nuestro equipo en <a href="mailto:soporte@acalud.edu">soporte@acalud.edu</a>
                </p>
                <p>
                    © 2023 AcaLud - Plataforma Educativa. Todos los derechos reservados.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Genera versión de texto plano para recuperación de contraseña
   */
  private generatePasswordResetTextVersion(data: PasswordResetEmailData): string {
    return `
AcaLud - Recuperación de Contraseña

Hola ${data.user.name || data.user.email},

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en AcaLud.

Para crear una nueva contraseña, visita el siguiente enlace:
${data.resetUrl}

IMPORTANTE: Este enlace expirará en ${data.expirationMinutes} minutos.

AVISO DE SEGURIDAD:
- Si no solicitaste este cambio, puedes ignorar este email.
- Nunca compartas este enlace con otras personas.
- Tu contraseña actual permanecerá sin cambios hasta que completes el proceso.

Si necesitas ayuda, contacta a nuestro equipo en soporte@acalud.edu

© 2023 AcaLud - Plataforma Educativa
    `;
  }

  /**
   * Genera plantilla HTML para verificación de email
   */
  private generateEmailVerificationTemplate(data: EmailVerificationData): string {
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verifica tu cuenta - AcaLud</title>
        <style>
            /* Estilos similares al template de recuperación */
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 300;
            }
            .content {
                padding: 40px 30px;
            }
            .greeting {
                font-size: 18px;
                margin-bottom: 20px;
                color: #555;
            }
            .message {
                font-size: 16px;
                margin-bottom: 30px;
                line-height: 1.8;
            }
            .button-container {
                text-align: center;
                margin: 40px 0;
            }
            .verify-button {
                display: inline-block;
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                text-decoration: none;
                padding: 15px 40px;
                border-radius: 50px;
                font-size: 16px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 1px;
                transition: transform 0.3s ease;
            }
            .verify-button:hover {
                transform: translateY(-2px);
            }
            .footer {
                background-color: #f8f9fa;
                padding: 20px 30px;
                text-align: center;
                font-size: 12px;
                color: #6c757d;
                border-top: 1px solid #dee2e6;
            }
            .footer a {
                color: #28a745;
                text-decoration: none;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ AcaLud</h1>
                <p>Verificación de Cuenta</p>
            </div>
            
            <div class="content">
                <div class="greeting">
                    ¡Bienvenido/a ${data.user.name || data.user.email}!
                </div>
                
                <div class="message">
                    Gracias por registrarte en AcaLud. Para completar el proceso de registro y
                    activar tu cuenta, necesitamos verificar tu dirección de email.
                </div>
                
                <div class="button-container">
                    <a href="${data.verificationUrl}" class="verify-button">
                        Verificar Cuenta
                    </a>
                </div>
                
                <div class="message">
                    Una vez que verifiques tu cuenta, podrás acceder a todas las funcionalidades
                    de nuestra plataforma educativa.
                </div>
                
                <div class="message">
                    Si tienes problemas con el botón, también puedes copiar y pegar el siguiente enlace en tu navegador:
                </div>
                
                <div style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
                    ${data.verificationUrl}
                </div>
            </div>
            
            <div class="footer">
                <p>
                    Este email fue enviado por <strong>AcaLud</strong><br>
                    Si necesitas ayuda, contacta a nuestro equipo en <a href="mailto:soporte@acalud.edu">soporte@acalud.edu</a>
                </p>
                <p>
                    © 2023 AcaLud - Plataforma Educativa. Todos los derechos reservados.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Genera versión de texto plano para verificación de email
   */
  private generateEmailVerificationTextVersion(data: EmailVerificationData): string {
    return `
AcaLud - Verificación de Cuenta

¡Bienvenido/a ${data.user.name || data.user.email}!

Gracias por registrarte en AcaLud. Para completar el proceso de registro,
necesitamos verificar tu dirección de email.

Para verificar tu cuenta, visita el siguiente enlace:
${data.verificationUrl}

Una vez que verifiques tu cuenta, podrás acceder a todas las funcionalidades
de nuestra plataforma educativa.

Si necesitas ayuda, contacta a nuestro equipo en soporte@acalud.edu

© 2023 AcaLud - Plataforma Educativa
    `;
  }

  private generateClassroomInvitationTemplate(data: ClassroomInvitationEmailData): string {
  const teacherName = data.teacherName || 'Tu docente en AcaLud';
  const expiresAt = this.formatExpiration(data.expiresAt);
  const messageSection = data.message
    ? `<div class="message">
      <strong>Mensaje del docente:</strong><br/>
      <em>${data.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</em>
     </div>`
    : '';
  const expirationBlock = expiresAt
    ? `<div class="expiration">
      ⏰ <strong>Importante:</strong> Esta invitación vence el ${expiresAt}.
     </div>`
    : '';

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitación al aula ${data.classroomName} - AcaLud</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f4f4f4;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 0 20px rgba(0,0,0,0.1);
      }
      .header {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        padding: 30px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        font-size: 26px;
        font-weight: 600;
      }
      .content {
        padding: 35px 30px;
      }
      .greeting {
        font-size: 18px;
        margin-bottom: 20px;
        color: #555;
      }
      .message {
        font-size: 16px;
        margin-bottom: 25px;
        line-height: 1.7;
      }
      .classroom-card {
        background-color: #f8fafc;
        border-radius: 12px;
        padding: 20px;
        border: 1px solid #e2e8f0;
        margin-bottom: 30px;
      }
      .classroom-card h2 {
        margin: 0 0 10px 0;
        font-size: 22px;
        color: #4338ca;
      }
      .teacher {
        font-size: 15px;
        color: #4b5563;
      }
      .button-container {
        text-align: center;
        margin: 35px 0;
      }
      .action-button {
        display: inline-block;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        text-decoration: none;
        padding: 14px 38px;
        border-radius: 40px;
        font-size: 16px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        transition: transform 0.3s ease;
      }
      .action-button:hover {
        transform: translateY(-2px);
      }
      .expiration {
        background-color: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 8px;
        padding: 15px;
        margin: 20px 0;
        font-size: 14px;
        color: #856404;
      }
      .footer {
        background-color: #f1f5f9;
        padding: 20px 30px;
        text-align: center;
        font-size: 12px;
        color: #64748b;
        border-top: 1px solid #e2e8f0;
      }
      .footer a {
        color: #6366f1;
        text-decoration: none;
      }
      @media (max-width: 600px) {
        .container {
          margin: 10px;
        }
        .content {
          padding: 20px;
        }
        .header {
          padding: 20px;
        }
        .header h1 {
          font-size: 22px;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Invitación a un aula AcaLud</h1>
      </div>
      <div class="content">
        <div class="greeting">
          Hola,
        </div>
        <div class="message">
          ${teacherName} te invitó a unirte al aula <strong>${data.classroomName}</strong> en AcaLud.
          Acepta la invitación y participa en actividades, recursos y seguimiento personalizado.
        </div>
        <div class="classroom-card">
          <h2>${data.classroomName}</h2>
          <div class="teacher">Docente: ${teacherName}</div>
        </div>
        ${messageSection}
        <div class="button-container">
          <a href="${data.inviteLink}" class="action-button">Aceptar invitación</a>
        </div>
        ${expirationBlock}
        <div class="message">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
          <div style="word-break: break-all; background-color: #f8fafc; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 12px; margin-top: 10px;">
            ${data.inviteLink}
          </div>
        </div>
      </div>
      <div class="footer">
        <p>
          Este email fue enviado por <strong>AcaLud</strong>.<br/>
          Si necesitas ayuda, contáctanos en <a href="mailto:soporte@acalud.edu">soporte@acalud.edu</a>
        </p>
        <p>© 2023 AcaLud - Plataforma Educativa. Todos los derechos reservados.</p>
      </div>
    </div>
  </body>
  </html>
  `;
  }

  private generateClassroomInvitationTextVersion(data: ClassroomInvitationEmailData): string {
  const teacherName = data.teacherName || 'tu docente en AcaLud';
  const expiresAt = this.formatExpiration(data.expiresAt);
  const messageBlock = data.message ? `\nMensaje del docente:\n${data.message}\n` : '';
  const expirationBlock = expiresAt ? `\nIMPORTANTE: Esta invitación vence el ${expiresAt}.` : '';

  return `
AcaLud - Invitación a aula

Hola,

${teacherName} te invitó a unirte al aula "${data.classroomName}" en AcaLud.
Acepta la invitación usando el siguiente enlace:
${data.inviteLink}
${messageBlock}
${expirationBlock}

Si necesitas ayuda, contacta a soporte@acalud.edu

© 2023 AcaLud - Plataforma Educativa
  `;
  }

  private formatExpiration(value?: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  try {
    return date.toLocaleString('es-PE', {
    dateStyle: 'long',
    timeStyle: 'short',
    });
  } catch (error) {
    return date.toISOString();
  }
  }
}