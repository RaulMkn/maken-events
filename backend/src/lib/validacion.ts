/**
 * Utilidades de validación y saneado de entrada.
 * Fastify ya valida el esquema JSON de cada ruta; aquí añadimos
 * normalización de texto y comprobaciones semánticas.
 */

/** Recorta espacios y colapsa espacios internos múltiples. */
export function limpiarTexto(valor: string): string {
  return valor.trim().replace(/\s+/g, ' ');
}

/** Normaliza un email: recorta y pasa a minúsculas. */
export function normalizarEmail(valor: string): string {
  return valor.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValido(valor: string): boolean {
  return EMAIL_RE.test(valor) && valor.length <= 254;
}
