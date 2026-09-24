import nodemailer, { type Transporter } from 'nodemailer';
import qrcode from 'qrcode';
import { config } from '../config.js';

/**
 * Envío del email de entrada con el QR embebido, vía SMTP (Gmail).
 *
 * Para Gmail hace falta una "contraseña de aplicación" (App Password):
 * se genera en la cuenta de Google con la verificación en dos pasos activa,
 * y se pone en SMTP_PASS. La contraseña normal de la cuenta NO funciona.
 *
 * El QR se genera como PNG y se incrusta inline en el cuerpo vía cid.
 */

interface DatosEntrada {
  nombre: string;
  apellidos: string;
  email: string;
  tokenQr: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!config.email.smtpUser || !config.email.smtpPass) {
    throw new Error(
      'El SMTP no está configurado (SMTP_USER / SMTP_PASS); no se puede enviar el email.',
    );
  }
  // Reutilizamos el transporter entre envíos.
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.smtpHost,
      port: config.email.smtpPort,
      secure: config.email.smtpSecure,
      auth: {
        user: config.email.smtpUser,
        pass: config.email.smtpPass,
      },
    });
  }
  return transporter;
}

export async function enviarEmailEntrada(datos: DatosEntrada): Promise<void> {
  const transport = getTransporter();

  // Generamos el QR como PNG (buffer) a partir del token firmado.
  const qrBuffer = await qrcode.toBuffer(datos.tokenQr, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  });

  const nombreCompleto = `${datos.nombre} ${datos.apellidos}`.trim();
  const asunto = `🎟️ Tu entrada para ${config.partyName}`;
  // Si no se define EMAIL_FROM, usamos la propia cuenta SMTP como remitente.
  const remitente = `${config.partyName} <${config.email.from || config.email.smtpUser}>`;

  // Email en HTML basado en tablas + estilos inline: es la forma fiable de que
  // se vea bien en Gmail, Outlook, Apple Mail, etc. (no soportan CSS moderno).
  const html = `
  <!doctype html>
  <html lang="es">
  <body style="margin:0; padding:0; background-color:#0a0710;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0710; padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background:#150e22; border:1px solid #33254d; border-radius:16px; overflow:hidden;">
            <!-- Franja superior de color -->
            <tr><td style="height:4px; background:#ff7a18; line-height:4px; font-size:4px;">&nbsp;</td></tr>

            <tr>
              <td style="padding:36px 32px 8px 32px; text-align:center;">
                <div style="font-size:13px; letter-spacing:3px; text-transform:uppercase; color:#ffa04d; font-family:Arial,Helvetica,sans-serif; font-weight:bold;">
                  Entrada confirmada
                </div>
                <h1 style="margin:12px 0 0 0; font-family:Georgia,'Times New Roman',serif; font-size:30px; color:#ff7a18;">
                  ${escaparHtml(config.partyName)}
                </h1>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 32px 0 32px; font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:1.6; color:#f4eefb;">
                <p style="margin:0 0 8px 0;">Hola <strong>${escaparHtml(nombreCompleto)}</strong>,</p>
                <p style="margin:0; color:#b3a4cc;">Tu pago está confirmado. Esta es tu entrada: enséñala en la puerta.</p>
              </td>
            </tr>

            <!-- QR -->
            <tr>
              <td align="center" style="padding:28px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#ffffff; border-radius:14px; padding:14px;">
                      <img src="cid:entrada-qr" alt="Codigo QR de tu entrada" width="220" height="220" style="display:block; width:220px; height:220px;" />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Datos de la fiesta -->
            <tr>
              <td style="padding:0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0710; border:1px solid #33254d; border-radius:12px;">
                  <tr>
                    <td style="padding:16px 18px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#f4eefb; line-height:1.7;">
                      <strong style="color:#ffa04d;">📅 Cuándo:</strong> Viernes 31 de octubre, de 23:00 a 04:00<br>
                      <strong style="color:#ffa04d;">📍 Dónde:</strong> C. Toledo, 36 · Local 5 · 28981 Parla (Madrid)
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px 36px 32px; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.6; color:#6d5f88; text-align:center;">
                Guarda este correo. Tu entrada es personal e intransferible.<br>
                <strong style="color:#ffa04d;">El QR solo sirve una vez:</strong> al escanearlo en la puerta queda usado.<br>
                Si tienes cualquier problema con tu entrada, habla con la organizacion.<br>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  // Versión en texto plano por si el cliente no muestra HTML.
  const texto = `Entrada confirmada para ${config.partyName}.
Hola ${nombreCompleto}, tu pago está confirmado.
Cuándo: viernes 31 de octubre, de 22:00 a 04:00.
Dónde: C. Toledo, 36, Local 5, 28981 Parla (Madrid).
Enseña el código QR adjunto en la puerta. Es personal e intransferible.
El QR solo sirve una vez: al escanearlo queda usado. Ante cualquier problema, habla con maken.`;

  await transport.sendMail({
    from: remitente,
    to: datos.email,
    subject: asunto,
    text: texto,
    html,
    attachments: [
      {
        filename: 'entrada-qr.png',
        content: qrBuffer,
        // En el HTML lo referenciamos con src="cid:entrada-qr".
        cid: 'entrada-qr',
      },
    ],
  });
}

/** Escapa caracteres HTML para evitar inyección en el cuerpo del email. */
function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
