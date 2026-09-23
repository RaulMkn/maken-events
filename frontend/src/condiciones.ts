/**
 * Condiciones de asistencia a la fiesta que el usuario debe aceptar
 * antes de registrarse. Texto editable libremente.
 */
export const CONDICIONES: string[] = [
  'La entrada está reservada a personas mayores de 18 años. Se podrá solicitar el DNI en la puerta y no se permitirá el acceso a menores de edad.',
  'Se espera una conducta responsable y respetuosa con el resto de asistentes, y con el local.',
  'La organización (maken) se reserva el derecho de expulsar (cruelmente) de la fiesta, sin derecho a devolución, a quien no cumpla estas normas.',
  'Cada asistente es responsable de sus objetos personales y de su propio consumo (si te desaparece el alcohol es cosa tuya).',
  'En caso de no poder ir a la fiesta y querer traspasar tu entrada hablar con la organización (maken)',
];

/** Devuelve las condiciones como HTML (lista) para mostrarlas en un modal. */
export function condicionesHtml(): string {
  const items = CONDICIONES.map((c) => `<li style="margin-bottom:8px;">${c}</li>`).join('');
  return `<ul style="text-align:left; padding-left:20px; line-height:1.5;">${items}</ul>`;
}

/**
 * Versión de las condiciones dentro de un contenedor con scroll, pensada
 * para el modal de aceptación: el usuario debe desplazarse hasta el final
 * (leerlas) antes de poder aceptar. El contenedor tiene id "condiciones-scroll".
 */
export function condicionesHtmlScrollable(): string {
  const items = CONDICIONES.map((c) => `<li style="margin-bottom:12px;">${c}</li>`).join('');
  return `
    <div id="condiciones-scroll"
         style="max-height:240px; overflow-y:auto; text-align:left; padding:8px 16px;
                border:1px solid #2e2340; border-radius:8px; line-height:1.55;">
      <ul style="padding-left:20px; margin:0;">${items}</ul>
    </div>
    <p id="condiciones-hint" style="font-size:0.85rem; color:#b9aecd; margin-top:10px;">
      Desplázate hasta el final para poder aceptar.
    </p>`;
}
