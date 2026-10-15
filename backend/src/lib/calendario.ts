import { config } from '../config.js';

/**
 * Genera un fichero iCalendar (.ics) con el evento de la fiesta, para que el
 * invitado lo añada a su calendario con un toque desde el email.
 *
 * Las horas van en UTC (sufijo Z). La fiesta es el sábado 31 de octubre de
 * 2026, de 23:00 a 04:00 hora de Madrid. El cambio a horario de invierno es
 * el 25/10/2026, así que el 31 ya es CET (UTC+1) -> 22:00 a 03:00 UTC.
 */

const INICIO_UTC = '20261031T220000Z';
const FIN_UTC = '20261101T030000Z';

export function generarIcs(): string {
  const ahora = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const descripcion =
    'Tu entrada llega por email con un QR. La dirección exacta va en ese correo.';

  // CRLF obligatorio según la especificación iCalendar (RFC 5545).
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
