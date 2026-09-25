/**
 * Genera las credenciales del admin:
 *  - hash argon2 de la contraseña
 *  - secreto TOTP (base32) + URL otpauth para enrolar Google Authenticator / Authy
 *
 * Uso:
 *   npm run gen-admin -- "MiContraseñaSegura"
 * o de forma interactiva:
 *   npm run gen-admin
 *
 * Copia los valores mostrados a tu fichero .env:
 *   ADMIN_PASSWORD_HASH=...
 *   ADMIN_TOTP_SECRET=...
 * y escanea el QR / URL con tu app de autenticación.
 */
import { hash } from '@node-rs/argon2';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

async function pedirPassword(): Promise<string> {
  const argv = process.argv.slice(2);
  if (argv[0]) return argv[0];

  const rl = createInterface({ input: stdin, output: stdout });
  const password = await rl.question('Introduce la contraseña del admin: ');
  rl.close();
  return password;
}

async function main(): Promise<void> {
  const password = (await pedirPassword()).trim();
  if (password.length < 10) {
    console.error('\n⚠  Usa una contraseña de al menos 10 caracteres.\n');
    process.exit(1);
  }

  const usuario = process.env.ADMIN_USER ?? 'admin';
  const nombreApp = process.env.PARTY_NAME ?? 'Fiesta de Halloween';

  // Hash de la contraseña (parámetros por defecto de @node-rs/argon2 = argon2id).
  const passwordHashRaw = await hash(password);
  // Lo codificamos en base64 con prefijo "b64:" para que el valor no contenga
  // los '$' del hash argon2, que algunos gestores de variables de entorno
  // (.env, config vars) interpretarían como interpolación.
  const passwordHash = `b64:${Buffer.from(passwordHashRaw, 'utf8').toString('base64')}`;

  // Secreto TOTP.
  const totpSecret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(usuario, nombreApp, totpSecret);

  console.log('\n============================================================');
  console.log(' Credenciales del admin — copia esto a tu fichero .env');
  console.log('============================================================\n');
  console.log(`ADMIN_USER=${usuario}`);
  console.log(`ADMIN_PASSWORD_HASH=${passwordHash}`);
  console.log(`ADMIN_TOTP_SECRET=${totpSecret}`);
  console.log('\n------------------------------------------------------------');
  console.log(' Enrola tu app de autenticación (Google Authenticator/Authy)');
  console.log(' escaneando este QR o usando la URL de debajo:');
  console.log('------------------------------------------------------------\n');

  // QR en ASCII para escanear directamente desde la terminal.
  const qrAscii = await qrcode.toString(otpauth, { type: 'terminal', small: true });
  console.log(qrAscii);
  console.log(`URL otpauth: ${otpauth}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
