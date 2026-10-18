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

/**
 * Valida la forma de un email troceando por '@' y '.' (O(n)), evitando una
 * regex con cuantificadores solapados que podría disparar backtracking (ReDoS).
 */
export function emailValido(valor: string): boolean {
  if (valor.length < 3 || valor.length > 254) return false;

  const partes = valor.split('@');
  if (partes.length !== 2) return false;

  const [local, dominio] = partes;
  if (local.length === 0 || dominio.length === 0) return false;

  const etiquetas = dominio.split('.');
  if (etiquetas.length < 2) return false;
  if (etiquetas.some((e) => e.length === 0)) return false;

  if (/\s/.test(valor)) return false;

  return true;
}
