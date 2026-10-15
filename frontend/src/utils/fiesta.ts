/**
 * Datos de la fiesta compartidos por el frontend.
 *
 * La fecha/hora de inicio se usa para la cuenta atrás de la landing. Está en
 * hora de Madrid (CET/CEST); el offset +01:00 corresponde al 31 de octubre
 * (el cambio a horario de invierno es el 25/10/2026, así que el 31 ya es
 * CET, UTC+1).
 */
export const INICIO_FIESTA = new Date('2026-10-31T23:00:00+01:00');
