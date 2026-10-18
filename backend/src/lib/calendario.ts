import { config } from '../config.js';

/**
 * Genera el .ics del evento. Las horas van en UTC: el 31/10/2026 ya es CET
 * (el cambio a horario de invierno es el 25/10), así que 23:00-04:00 Madrid
 * equivale a 22:00-03:00 UTC.
 */

const INICIO_UTC = '20261031T220000Z';
const FIN_UTC = '20261101T030000Z';

export function generarIcs(): string {
  const ahora = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const descripcion =
    'Tu entrada llega por email con un QR. La dirección exacta va en ese correo.';

  // CRLF obligatorio según iCalendar (RFC 5545).
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Maken Events//Fiesta//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:fiesta-${INICIO_UTC}@maken-events.app`,
    `DTSTAMP:${ahora}`,
    `DTSTART:${INICIO_UTC}`,
    `DTEND:${FIN_UTC}`,
    `SUMMARY:${escaparIcs(config.partyName)}`,
    'LOCATION:C. Toledo 36, Local 5, 28981 Parla (Madrid)',
    `DESCRIPTION:${escaparIcs(descripcion)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lineas.join('\r\n');
}

/** Escapa los caracteres especiales de iCalendar en texto libre. */
function escaparIcs(texto: string): string {
  return texto
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
