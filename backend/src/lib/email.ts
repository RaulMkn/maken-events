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
  const asunto = `Tu entrada para ${config.partyName} 🎃`;
  // Si no se define EMAIL_FROM, usamos la propia cuenta SMTP como remitente.
  const remitente = config.email.from || config.email.smtpUser;

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h1 style="color: #ff6b00;">¡Pago confirmado! 🎃</h1>
      <p>Hola ${escaparHtml(nombreCompleto)},</p>
      <p>Tu entrada para <strong>${escaparHtml(config.partyName)}</strong> está confirmada.</p>
      <p>Muestra este código QR en la puerta:</p>
      <div style="text-align: center; margin: 24px 0;">
        <img src="cid:entrada-qr" alt="Código QR de tu entrada" width="240" height="240" style="border: 8px solid #fff; border-radius: 8px;" />
      </div>
      <p style="color: #666; font-size: 13px;">Guarda este correo. El QR es personal e intransferible.</p>
    </div>
  `;

  await transport.sendMail({
    from: remitente,
    to: datos.email,
    subject: asunto,
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
