import { verify as verifyArgon2 } from '@node-rs/argon2';
import { authenticator } from 'otplib';
import { config } from '../config.js';

/**
 * Verificación de credenciales del admin: contraseña (argon2) + TOTP.
 * El secreto TOTP y el hash de la contraseña viven en variables de entorno,
 * generadas con scripts/gen-admin.ts.
 */

// Ventana de tolerancia de 1 paso (±30s) para el reloj del móvil.
authenticator.options = { window: 1 };

export async function verificarPassword(passwordPlano: string): Promise<boolean> {
  if (!config.admin.passwordHash) return false;
  try {
    return await verifyArgon2(config.admin.passwordHash, passwordPlano);
  } catch {
    return false;
  }
}

export function verificarTotp(codigo: string): boolean {
  if (!config.admin.totpSecret) return false;
  // Normalizamos: quitamos espacios que algunos apps añaden.
  const limpio = codigo.replace(/\s+/g, '');
  try {
    return authenticator.verify({ token: limpio, secret: config.admin.totpSecret });
  } catch {
    return false;
  }
}

export function usuarioValido(usuario: string): boolean {
  return usuario === config.admin.user;
}
