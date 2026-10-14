/**
 * Agrupación "inteligente" por «de parte de quién».
 *
 * Problema: la gente escribe el nombre de quien les invita de formas
 * distintas: con mayúsculas o minúsculas, con acentos o sin ellos, con los
 * dos apellidos o solo uno, o solo con el nombre. Queremos juntar a todos los
 * que, en realidad, vienen de parte de la misma persona.
 *
 * Estrategia:
 *  1. Normalizamos cada valor: minúsculas, sin acentos, sin signos y en
 *     tokens (palabras). "José  Pérez-García" -> ["jose", "perez", "garcia"].
 *  2. Dos valores pertenecen al mismo grupo si los tokens de uno están
 *     contenidos en los del otro (p. ej. "garcia" ⊂ "ana garcia", o
 *     "ana" ⊂ "ana garcia"). Es decir, uno es una forma "más corta" del otro.
 *  3. El nombre visible del grupo es la variante más completa (más tokens);
 *     a igualdad, la que tenga más caracteres (suele estar mejor escrita).
 */

/** Quita acentos/diacríticos de una cadena. */
function sinAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Convierte un «de parte de» en una lista de tokens normalizados.
 * Devuelve [] si no hay nada aprovechable.
 */
export function tokensParte(valor: string | null | undefined): string[] {
  if (!valor) return [];
  return sinAcentos(valor)
    .toLowerCase()
    // Cualquier cosa que no sea letra o número (incluye guiones, puntos…) separa.
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
 * ¿Dos conjuntos de tokens se refieren (probablemente) a la misma persona?
 * Es cierto cuando uno está contenido en el otro: así "Ana" o "García" se
 * unen a "Ana García", pero "Ana López" y "Ana García" NO se mezclan (ninguno
 * está contenido en el otro: comparten "ana" pero difieren en el apellido).
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

/**
 * Agrupa una lista de elementos por su «de parte de», uniendo variantes de la
 * misma persona. `getParte` extrae el texto de cada elemento.
 *
 * Los elementos sin «de parte de» van a un grupo final "Sin especificar".
 */
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

    // Buscamos un grupo existente cuya forma canónica case con esta variante.
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
