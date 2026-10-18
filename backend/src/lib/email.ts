import { Resend } from 'resend';
import qrcode from 'qrcode';
import { config } from '../config.js';
import { generarIcs } from './calendario.js';

/**
 * Envío del email de entrada vía Resend con dominio propio verificado
 * (SPF/DKIM para evitar spam). El QR se incrusta inline por cid.
 */

interface DatosEntrada {
  nombre: string;
  apellidos: string;
  email: string;
  tokenQr: string;
  tokenCarrete?: string | null;
}

let resend: Resend | null = null;

function getResend(): Resend {
  if (!config.email.resendApiKey) {
    throw new Error('RESEND_API_KEY no está configurada; no se puede enviar el email.');
  }
  if (!resend) {
    resend = new Resend(config.email.resendApiKey);
  }
  return resend;
}

export async function enviarEmailEntrada(datos: DatosEntrada): Promise<void> {
  const cliente = getResend();

  // Corrección de errores alta (H) para que el QR tolere reflejos de pantalla.
  const qrBuffer = await qrcode.toBuffer(datos.tokenQr, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 360,
  });

  const asunto = `🎟️ Maken Events te invita a ${config.partyName}`;
  const remitente = config.email.from || 'entradas@maken-events.app';

  const urlCarrete = datos.tokenCarrete
    ? `${config.appUrl}/halloween/carrete/${datos.tokenCarrete}`
    : null;

  const urlGaleria = config.galeriaToken
    ? `${config.appUrl}/halloween/galeria?token=${encodeURIComponent(config.galeriaToken)}`
    : null;

  const bloqueCarrete = urlCarrete
    ? `
            <tr>
              <td style="padding:16px 32px 0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1230; border:1px solid #3d3159; border-radius:12px;">
                  <tr>
                    <td style="padding:18px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#f4eefb; line-height:1.6; text-align:center;">
                      <div style="font-size:22px; margin-bottom:6px;">📸</div>
                      <strong style="color:#ffc24d;">Tu carrete de la noche</strong><br>
                      <span style="color:#b3a4cc;">Tienes ${config.maxFotosCarrete} fotos para inmortalizar la fiesta. Se guardan automáticamente.</span>
                      <div style="margin-top:14px;">
                        <a href="${urlCarrete}" style="display:inline-block; background:#f4a613; color:#150e00; text-decoration:none; font-weight:bold; padding:11px 22px; border-radius:999px;">Abrir mi carrete</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
    : '';

  const bloquePlaylist = config.spotifyPlaylistUrl
    ? `
            <tr>
              <td style="padding:16px 32px 0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0c2016; border:1px solid #1db95433; border-radius:12px;">
                  <tr>
                    <td style="padding:18px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#f4eefb; line-height:1.6; text-align:center;">
                      <div style="font-size:22px; margin-bottom:6px;">🎵</div>
                      <strong style="color:#1ed760;">Que nadie se queje de la musica pls</strong><br>
                      <span style="color:#b3a4cc;">La administración (Maken) se reserva el derecho a eliminar canciones que no sean de fiesta.</span>
                      <div style="margin-top:14px;">
                        <a href="${config.spotifyPlaylistUrl}" style="display:inline-block; background:#1ed760; color:#06220f; text-decoration:none; font-weight:bold; padding:11px 22px; border-radius:999px;">Abrir la playlist</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
    : '';

  const bloqueGaleria = urlGaleria
    ? `
            <tr>
              <td style="padding:16px 32px 0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1230; border:1px solid #3d3159; border-radius:12px;">
                  <tr>
                    <td style="padding:18px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#f4eefb; line-height:1.6; text-align:center;">
                      <div style="font-size:22px; margin-bottom:6px;">🖼️</div>
                      <strong style="color:#ffc24d;">La galería de la noche</strong><br>
                      <span style="color:#b3a4cc;">Mira todas las fotos que subáis entre todos, en directo.</span>
                      <div style="margin-top:14px;">
                        <a href="${urlGaleria}" style="display:inline-block; background:transparent; color:#ffc24d; text-decoration:none; font-weight:bold; padding:10px 22px; border-radius:999px; border:1px solid #ffc24d;">Ver la galería</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
    : '';

  const bloqueConcurso = `
            <tr>
              <td style="padding:16px 32px 0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1230; border:1px solid #3d3159; border-radius:12px;">
                  <tr>
                    <td style="padding:20px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#f4eefb; line-height:1.6;">
                      <strong style="color:#ffc24d; font-size:16px;">Concurso de disfraces</strong><br>
                      <span style="color:#b3a4cc;">Un jurado elige a los tres mejores disfraces de la noche. En juego:</span>

                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                        <tr>
                          <td style="background:#1f1636; padding:14px 6px; text-align:center; font-family:Arial,Helvetica,sans-serif; font-weight:bold; color:#ffc24d; font-size:12px; border:1px solid #3d3159; border-radius:9px;">Tequila<br>de fresa</td>
                          <td style="width:8px;">&nbsp;</td>
                          <td style="background:#1f1636; padding:14px 6px; text-align:center; font-family:Arial,Helvetica,sans-serif; font-weight:bold; color:#ffc24d; font-size:12px; border:1px solid #3d3159; border-radius:9px;">Licor 43</td>
                          <td style="width:8px;">&nbsp;</td>
                          <td style="background:#1f1636; padding:14px 6px; text-align:center; font-family:Arial,Helvetica,sans-serif; font-weight:bold; color:#ffc24d; font-size:12px; border:1px solid #3d3159; border-radius:9px;">Baileys</td>
                        </tr>
                      </table>
                      ${filaPremio('1', '#f6d365', '#d4982a', 'Primer puesto', 'elige la botella que quiera entre las tres.')}
                      ${filaPremio('2', '#d8d8e0', '#9a9aab', 'Segundo puesto', 'se lleva una de las dos que queden.')}
                      ${filaPremio('3', '#d99a6c', '#a9663b', 'Tercer puesto', 'se queda con la botella restante.')}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`;

  const bloqueCalendario = `
            <tr>
              <td style="padding:16px 32px 0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#080611; border:1px solid #2a2140; border-radius:12px;">
                  <tr>
                    <td style="padding:16px 18px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#b3a4cc; line-height:1.6; text-align:center;">
                      🗓️ <strong style="color:#ffc24d;">No se te olvide:</strong> abre el archivo adjunto
                      <em>fiesta.ics</em> para añadir la fiesta a tu calendario.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`;

  const html = `
  <!doctype html>
  <html lang="es">
  <body style="margin:0; padding:0; background-color:#080611;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#080611; padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background:#150f28; border:1px solid #2a2140; border-radius:16px; overflow:hidden;">
            <!-- Franja superior de color -->
            <tr><td style="height:3px; background:#f4a613; line-height:3px; font-size:3px;">&nbsp;</td></tr>

            <tr>
              <td style="padding:36px 32px 8px 32px; text-align:center;">
                <div style="font-size:12px; letter-spacing:2px; text-transform:uppercase; color:#a99fc4; font-family:Arial,Helvetica,sans-serif; font-weight:bold;">
                  Maken Events te invita a
                </div>
                <h1 style="margin:12px 0 0 0; font-family:Georgia,'Times New Roman',serif; font-size:30px; color:#ffc24d;">
                  ${escaparHtml(config.partyName)}
                </h1>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 32px 0 32px; font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:1.6; color:#f4eefb;">
                <p style="margin:0 0 12px 0;">Hellou hellou <strong>${escaparHtml(datos.nombre)}</strong></p>
                <p style="margin:0; color:#b3a4cc;">El pago esta confirmado, aquí tienes tu entrada (enseñala en la puerta).</p>
              </td>
            </tr>

            <!-- QR -->
            <tr>
              <td align="center" style="padding:28px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#ffffff; border-radius:14px; padding:14px;">
                      <img src="cid:entrada-qr" alt="Codigo QR de tu entrada" width="240" height="240" style="display:block; width:240px; height:240px;" />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Datos de la fiesta -->
            <tr>
              <td style="padding:0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#080611; border:1px solid #2a2140; border-radius:12px;">
                  <tr>
                    <td style="padding:16px 18px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#f4eefb; line-height:1.7;">
                      <strong style="color:#ffc24d;">📅 Cuándo:</strong> Sábado 31 de octubre, de 23:00 a 04:00<br>
                      <strong style="color:#ffc24d;">📍 Dónde:</strong> C. Toledo, 36 · Local 5 · 28981 Parla (Madrid)
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
${bloqueCarrete}
${bloqueGaleria}
${bloqueConcurso}
${bloquePlaylist}
${bloqueCalendario}
            <tr>
              <td style="padding:24px 32px 36px 32px; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.6; color:#6d5f88; text-align:center;">
                Guarda este correo: tu entrada es personal e intransferible.<br>
                <strong style="color:#ffc24d;">El QR solo sirve una vez:</strong> al escanearlo en la puerta queda usado.<br>
                <span style="color:#8a7aa8;">Espero un chupito de cortesía. — El equipo de Maken Events</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const texto = `Maken Events te invita a ${config.partyName}.

Hellou hellou ${datos.nombre}
El pago esta confirmado, aquí tienes tu entrada (enseñala en la puerta)

Cuándo: sábado 31 de octubre, de 23:00 a 04:00.
Dónde: C. Toledo, 36, Local 5, 28981 Parla (Madrid).

Enseña el código QR adjunto en la puerta. Es personal e intransferible.
El QR solo sirve una vez: al escanearlo queda usado.
${urlCarrete ? `\nTu carrete de fotos (${config.maxFotosCarrete} fotos, se activa al entrar): ${urlCarrete}` : ''}${config.spotifyPlaylistUrl ? `\nPlaylist colaborativa: ${config.spotifyPlaylistUrl}` : ''}

Concurso de disfraces: el jurado premia a los tres mejores. En juego, una botella de tequila de fresa, una de Licor 43 y una de Baileys. El 1.º elige, el 2.º escoge entre las dos que queden y el 3.º se lleva la restante.

Añade la fiesta a tu calendario con el archivo adjunto fiesta.ics.

Espero un chupito de cortesia. — El equipo de Maken Events`;

  const resultado = await cliente.emails.send({
    from: `Maken Events <${remitente}>`,
    to: datos.email,
    subject: asunto,
    html,
    text: texto,
    attachments: [
      {
        filename: 'entrada-qr.png',
        content: qrBuffer.toString('base64'),
        // Referenciado en el HTML con src="cid:entrada-qr".
        inlineContentId: 'entrada-qr',
      },
      {
        filename: 'fiesta.ics',
        content: Buffer.from(generarIcs(), 'utf8').toString('base64'),
        contentType: 'text/calendar',
      },
    ],
  });

  if (resultado.error) {
    throw new Error(`Resend devolvió un error: ${resultado.error.message}`);
  }
}

/** Escapa caracteres HTML para evitar inyección en el cuerpo del email. */
interface DatosRechazo {
  nombre: string;
  email: string;
}

/**
 * Email de rechazo: se envía al no poder confirmar quién invitó a la persona.
 * Explica que, al ser una fiesta privada, en principio no puede asistir, e
 * invita a contactar con la organización si cree que es un error.
 */
export async function enviarEmailRechazo(datos: DatosRechazo): Promise<void> {
  const cliente = getResend();
  const remitente = config.email.from || 'entradas@maken-events.app';
  const asunto = `Sobre tu registro para ${config.partyName}`;

  const html = `
  <!doctype html>
  <html lang="es">
  <body style="margin:0; padding:0; background-color:#080611;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#080611; padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background:#150f28; border:1px solid #2a2140; border-radius:16px; overflow:hidden;">
            <tr><td style="height:3px; background:#f4a613; line-height:3px; font-size:3px;">&nbsp;</td></tr>
            <tr>
              <td style="padding:36px 32px 8px 32px; text-align:center;">
                <div style="font-size:12px; letter-spacing:2px; text-transform:uppercase; color:#a99fc4; font-family:Arial,Helvetica,sans-serif; font-weight:bold;">
                  Maken Events
                </div>
                <h1 style="margin:12px 0 0 0; font-family:Georgia,'Times New Roman',serif; font-size:26px; color:#ffc24d;">
                  ${escaparHtml(config.partyName)}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px 32px; font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:1.65; color:#efeafc;">
                <p style="margin:0 0 12px 0;">Hola ${escaparHtml(datos.nombre)},</p>
                <p style="margin:0 0 12px 0; color:#b3a4cc;">
                  Gracias por tu interés en la fiesta, desafortunadamente no hemos podido confirmar quién te ha invitado y,
                  al tratarse de un evento privado, en principio no puedes asistir.
                </p>
                <p style="margin:0; color:#b3a4cc;">
                  Si crees que se trata de un error, por favor, ponte en contacto con quien te invito o con la organización (maken)
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 36px 32px; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.6; color:#6d5f88; text-align:center;">
                — El equipo de Maken Events
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const texto = `Maken Events — ${config.partyName}

Hola ${datos.nombre},

Gracias por tu interés en la fiesta. No hemos podido confirmar quién te invita y, al tratarse de un evento privado, en principio no podrás asistir.

Si crees que es un error, escríbenos y lo revisamos: contacta con la organización (maken) y lo vemos juntos.

— El equipo de Maken Events`;

  const resultado = await cliente.emails.send({
    from: `Maken Events <${remitente}>`,
    to: datos.email,
    subject: asunto,
    html,
    text: texto,
  });

  if (resultado.error) {
    throw new Error(`Resend devolvió un error: ${resultado.error.message}`);
  }
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Fila de premio con tablas (en vez de CSS) para que funcione en clientes de correo. */
function filaPremio(
  numero: string,
  colorA: string,
  colorB: string,
  titulo: string,
  detalle: string,
): string {
  return `
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px; background:#120d22; border:1px solid #2a2140; border-radius:9px;">
                        <tr>
                          <td width="52" style="padding:12px 0 12px 14px; vertical-align:middle;">
                            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                              <td width="34" height="34" align="center" valign="middle" style="width:34px; height:34px; background:${colorA}; background-image:linear-gradient(150deg, ${colorA}, ${colorB}); border-radius:50%; color:#1a0e00; font-family:Georgia,serif; font-weight:bold; font-size:16px;">${numero}</td>
                            </tr></table>
                          </td>
                          <td style="padding:12px 14px 12px 12px; vertical-align:middle; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#f4eefb; line-height:1.5;">
                            <strong>${titulo}</strong> &mdash; ${detalle}
                          </td>
                        </tr>
                      </table>`;
}
