/**
 * Agrupa por «de parte de quién» uniendo variantes de la misma persona
 * (mayúsculas, acentos, uno o dos apellidos…).
 *
 * Estrategia: se normaliza cada valor a tokens ("José Pérez-García" ->
 * ["jose","perez","garcia"]); dos valores son el mismo grupo si los tokens de
 * uno están contenidos en los del otro. El nombre visible es la variante más
 * completa (más tokens; a igualdad, más larga).
 */

/** Quita acentos/diacríticos de una cadena. */
function sinAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Convierte un «de parte de» en tokens normalizados. Devuelve [] si no hay nada aprovechable. */
export function tokensParte(valor: string | null | undefined): string[] {
  if (!valor) return [];
  return sinAcentos(valor)
    .toLowerCase()
    // Separa por cualquier cosa que no sea letra o número.
    .split(/[^a-z0-9ñ]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** ¿Son `a` los tokens un subconjunto de `b`? (todos los de `a` están en `b`) */
function esSubconjunto(a: string[], b: string[]): boolean {
  if (a.length === 0) return false;
  return a.every((t) => b.includes(t));
}

/**
 * ¿Dos conjuntos de tokens son la misma persona? Cierto cuando uno está
 * contenido en el otro, así "Ana García" une a "Ana" pero no a "Ana López".
 */
export function mismaPersona(a: string[], b: string[]): boolean {
  return esSubconjunto(a, b) || esSubconjunto(b, a);
}

export interface GrupoParte<T> {
  /** Nombre canónico (la variante más completa encontrada). */
  nombre: string;
  /** Elementos que caen en este grupo. */
  elementos: T[];
}

interface GrupoInterno<T> {
  canonico: string;
  canonicoTokens: string[];
  variantes: Set<string>;
  elementos: T[];
}

/** Agrupa elementos por su «de parte de»; los que no lo tienen van a "Sin especificar". */
export function agruparPorParteInteligente<T>(
  elementos: T[],
  getParte: (e: T) => string | null | undefined,
): GrupoParte<T>[] {
  const grupos: GrupoInterno<T>[] = [];
  const sinEspecificar: T[] = [];

  for (const el of elementos) {
    const bruto = (getParte(el) ?? '').trim();
    const tokens = tokensParte(bruto);

    if (tokens.length === 0) {
      sinEspecificar.push(el);
      continue;
    }

    const grupo = grupos.find((g) => mismaPersona(g.canonicoTokens, tokens));

    if (!grupo) {
      grupos.push({
        canonico: bruto,
        canonicoTokens: tokens,
        variantes: new Set([bruto]),
        elementos: [el],
      });
      continue;
    }

    grupo.elementos.push(el);
    grupo.variantes.add(bruto);

    // Si esta variante es más completa (más tokens, o más larga a igualdad),
    // pasa a ser el nombre canónico del grupo.
    const esMasCompleta =
      tokens.length > grupo.canonicoTokens.length ||
      (tokens.length === grupo.canonicoTokens.length && bruto.length > grupo.canonico.length);
    if (esMasCompleta) {
      grupo.canonico = bruto;
      grupo.canonicoTokens = tokens;
    }
  }

  const resultado: GrupoParte<T>[] = grupos
    .map((g) => ({ nombre: g.canonico, elementos: g.elementos }))
    .sort((x, y) => y.elementos.length - x.elementos.length || x.nombre.localeCompare(y.nombre, 'es'));

  if (sinEspecificar.length > 0) {
    resultado.push({ nombre: 'Sin especificar', elementos: sinEspecificar });
  }

  return resultado;
}
