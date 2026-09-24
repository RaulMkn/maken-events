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

const partyName = 'Fiesta de Halloween';
const nombreCompleto = 'Ada Lovelace';

// QR de ejemplo (contenido cualquiera) como data URL para la vista previa.
const qrDataUrl = await qrcode.toDataURL('ENTRADA-DE-EJEMPLO-PARA-PREVIEW', {
  errorCorrectionLevel: 'M',
  margin: 2,
  width: 320,
});

const html = `
<!doctype html>
<html lang="es">
<body style="margin:0; padding:0; background-color:#0a0710;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0710; padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background:#150e22; border:1px solid #33254d; border-radius:16px; overflow:hidden;">
          <tr><td style="height:4px; background:#ff7a18; line-height:4px; font-size:4px;">&nbsp;</td></tr>
          <tr>
            <td style="padding:36px 32px 8px 32px; text-align:center;">
              <div style="font-size:13px; letter-spacing:3px; text-transform:uppercase; color:#ffa04d; font-family:Arial,Helvetica,sans-serif; font-weight:bold;">
                Entrada confirmada
              </div>
              <h1 style="margin:12px 0 0 0; font-family:Georgia,'Times New Roman',serif; font-size:30px; color:#ff7a18;">
                ${partyName}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0 32px; font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:1.6; color:#f4eefb;">
              <p style="margin:0 0 8px 0;">Hola <strong>${nombreCompleto}</strong>,</p>
              <p style="margin:0; color:#b3a4cc;">Tu pago está confirmado. Esta es tu entrada: enséñala en la puerta.</p>
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
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0710; border:1px solid #33254d; border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#f4eefb; line-height:1.7;">
                    <strong style="color:#ffa04d;">📅 Cuándo:</strong> Viernes 31 de octubre, de 22:00 a 04:00<br>
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
              Si tienes cualquier problema con tu entrada, habla con maken.<br>
              Nos vemos en la noche más terrorífica del año. 🎃
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
