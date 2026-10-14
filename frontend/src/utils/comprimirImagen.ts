/**
 * Comprime y redimensiona una imagen en el navegador antes de subirla.
 *
 * Objetivo: fotos de móvil pueden pesar varios MB; reducirlas ahorra espacio
 * en el almacenamiento y datos del invitado, manteniendo buena calidad para
 * recuerdos de fiesta.
 *
 * Devuelve un Blob JPEG. Si algo falla (navegador raro), devuelve el fichero
 * original para no bloquear la subida.
 */

const LADO_MAXIMO = 1600; // px: suficiente para ver bien, poco peso.
const CALIDAD = 0.8;

export async function comprimirImagen(archivo: File): Promise<Blob> {
  try {
    const bitmap = await crearBitmap(archivo);

    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) return archivo;
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', CALIDAD),
    );
    return blob ?? archivo;
  } catch {
    return archivo;
  }
}

/** Carga el fichero como bitmap. Usa createImageBitmap si está disponible. */
async function crearBitmap(archivo: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    return await createImageBitmap(archivo);
  }
  // Fallback para navegadores sin createImageBitmap.
  return await new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen'));
    };
    img.src = url;
  });
}
