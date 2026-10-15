/**
 * Sistema de iconos de línea, dibujados a mano con un trazo coherente
 * (24x24, stroke 1.6, remates redondeados). Sustituyen a los emoji del
 * sistema, que no forman un set tipográficamente consistente.
 *
 * El color y el grosor se heredan por CSS (stroke: currentColor), así que
 * cada icono se tiñe según su contexto.
 */
import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement>;

const base: Props = {
  viewBox: '0 0 24 24',
  width: 24,
  height: 24,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export function IconoCalendario(p: Props) {
  return (
    <svg {...base} {...p}>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

export function IconoUbicacion(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function IconoEntrada(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h15A1.5 1.5 0 0 1 21 8.5v2a2 2 0 0 0 0 4v2a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-2a2 2 0 0 0 0-4Z" />
      <path d="M14 7v10" strokeDasharray="2 2.5" />
    </svg>
  );
}

export function IconoCopa(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M6 3h12l-1.2 7a4.8 4.8 0 0 1-9.6 0Z" />
      <path d="M12 17v4M8.5 21h7" />
    </svg>
  );
}

export function IconoCamara(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.3-2h6.4L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5Z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

export function IconoGaleria(p: Props) {
  return (
    <svg {...base} {...p}>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="m4 17 4.5-4.5 3.5 3.5 3-3L20 16" />
    </svg>
  );
}

export function IconoNota(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M9 17.5V5l10-2v12" />
      <circle cx="6.5" cy="17.5" r="2.5" />
      <circle cx="16.5" cy="15" r="2.5" />
    </svg>
  );
}

export function IconoCandado(p: Props) {
  return (
    <svg {...base} {...p}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <circle cx="12" cy="15" r="1.2" />
    </svg>
  );
}

export function IconoCheck(p: Props) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.8 2.8L16 9.5" />
    </svg>
  );
}

export function IconoAviso(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M12 3.5 21 19H3Z" />
      <path d="M12 10v4M12 16.6v.01" />
    </svg>
  );
}

export function IconoProhibido(p: Props) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function IconoFantasma(p: Props) {
  return (
    <svg {...base} {...p}>
      <path d="M5 20V11a7 7 0 0 1 14 0v9l-2.3-1.6L14.4 20l-2.4-1.6L9.6 20l-2.3-1.6Z" />
      <path d="M9.5 10v.01M14.5 10v.01" />
    </svg>
  );
}
