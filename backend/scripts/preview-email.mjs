/**
 * Genera una vista previa del email de entrada como fichero HTML,
 * con datos de ejemplo y un QR real embebido (base64), para abrirlo
 * en el navegador sin necesidad de enviar nada ni configurar SMTP.
 *
 * Uso:  node scripts/preview-email.mjs
 * Resultado: crea preview-email.html en la raíz del backend.
 */
import qrcode from 'qrcode';
import { writeFileSync } from 'node:fs';

const partyName = 'Halloween 4.0';
const nombre = 'Ada';

// QR de ejemplo (contenido cualquiera) como data URL para la vista previa.
const qrDataUrl = await qrcode.toDataURL('ENTRADA-DE-EJEMPLO-PARA-PREVIEW', {
  errorCorrectionLevel: 'M',
  margin: 2,
  width: 320,
});

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
                Maken Events te invita a
              </div>
              <h1 style="margin:12px 0 0 0; font-family:Georgia,'Times New Roman',serif; font-size:30px; color:#ffc24d;">
                ${partyName}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0 32px; font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:1.6; color:#f4eefb;">
              <p style="margin:0 0 12px 0;">¡Hola <strong>${nombre}</strong>! 👋</p>
              <p style="margin:0 0 8px 0;">Ya está todo listo</p>
              <p style="margin:0; color:#b3a4cc;">Aquí tienes tu entrada, enseñala en la puerta .</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#ffffff; border-radius:14px; padding:14px;">
                    <img src="${qrDataUrl}" alt="Codigo QR de tu entrada" width="220" height="220" style="display:block; width:220px; height:220px;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
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
          <tr>
            <td style="padding:16px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1230; border:1px solid #3d3159; border-radius:12px;">
                <tr>
                  <td style="padding:18px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#f4eefb; line-height:1.6; text-align:center;">
                    <div style="font-size:22px; margin-bottom:6px;">📸</div>
                    <strong style="color:#ffc24d;">Tu carrete de la noche</strong><br>
                    <span style="color:#b3a4cc;">Tienes 10 fotos para inmortalizar la fiesta. Se guardan automáticamente.</span>
                    <div style="margin-top:14px;">
                      <a href="https://maken-events.app/halloween/carrete/EJEMPLO" style="display:inline-block; background:#f4a613; color:#150e00; text-decoration:none; font-weight:bold; padding:11px 22px; border-radius:999px;">Abrir mi carrete</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1230; border:1px solid #3d3159; border-radius:12px;">
                <tr>
                  <td style="padding:18px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#f4eefb; line-height:1.6; text-align:center;">
                    <div style="font-size:22px; margin-bottom:6px;">🖼️</div>
                    <strong style="color:#ffc24d;">La galería de la noche</strong><br>
                    <span style="color:#b3a4cc;">Mira todas las fotos que subáis entre todos, en directo.</span>
                    <div style="margin-top:14px;">
                      <a href="https://maken-events.app/halloween/galeria?token=EJEMPLO" style="display:inline-block; background:transparent; color:#ffc24d; text-decoration:none; font-weight:bold; padding:10px 22px; border-radius:999px; border:1px solid #ffc24d;">Ver la galería</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
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

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px; background:#120d22; border:1px solid #2a2140; border-radius:9px;">
                      <tr>
                        <td width="52" style="padding:12px 0 12px 14px; vertical-align:middle;">
                          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="34" height="34" align="center" valign="middle" style="width:34px; height:34px; background:#f6d365; background-image:linear-gradient(150deg, #f6d365, #d4982a); border-radius:50%; color:#1a0e00; font-family:Georgia,serif; font-weight:bold; font-size:16px;">1</td></tr></table>
                        </td>
                        <td style="padding:12px 14px 12px 12px; vertical-align:middle; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#f4eefb; line-height:1.5;"><strong>Primer puesto</strong> &mdash; elige la botella que quiera entre las tres.</td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px; background:#120d22; border:1px solid #2a2140; border-radius:9px;">
                      <tr>
                        <td width="52" style="padding:12px 0 12px 14px; vertical-align:middle;">
                          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="34" height="34" align="center" valign="middle" style="width:34px; height:34px; background:#d8d8e0; background-image:linear-gradient(150deg, #d8d8e0, #9a9aab); border-radius:50%; color:#1a0e00; font-family:Georgia,serif; font-weight:bold; font-size:16px;">2</td></tr></table>
                        </td>
                        <td style="padding:12px 14px 12px 12px; vertical-align:middle; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#f4eefb; line-height:1.5;"><strong>Segundo puesto</strong> &mdash; se lleva una de las dos que queden.</td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px; background:#120d22; border:1px solid #2a2140; border-radius:9px;">
                      <tr>
                        <td width="52" style="padding:12px 0 12px 14px; vertical-align:middle;">
                          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="34" height="34" align="center" valign="middle" style="width:34px; height:34px; background:#d99a6c; background-image:linear-gradient(150deg, #d99a6c, #a9663b); border-radius:50%; color:#1a0e00; font-family:Georgia,serif; font-weight:bold; font-size:16px;">3</td></tr></table>
                        </td>
                        <td style="padding:12px 14px 12px 12px; vertical-align:middle; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#f4eefb; line-height:1.5;"><strong>Tercer puesto</strong> &mdash; se queda con la botella restante.</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
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
          </tr>
          <tr>
            <td style="padding:24px 32px 36px 32px; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.6; color:#6d5f88; text-align:center;">
              Guarda este correo: tu entrada es personal e intransferible.<br>
              <strong style="color:#ffc24d;">El QR solo sirve una vez:</strong> al escanearlo en la puerta queda usado.<br>
              ¿Alguna duda? Escríbenos, estamos para ayudarte.<br>
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

writeFileSync('preview-email.html', html, 'utf8');
console.log('Vista previa creada: backend/preview-email.html');
