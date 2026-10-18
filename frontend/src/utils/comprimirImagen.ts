/**
 * Comprime y redimensiona una imagen en el navegador antes de subirla, para
 * ahorrar espacio y datos. Si algo falla, devuelve el fichero original para
 * no bloquear la subida.
 */

const LADO_MAXIMO = 1600;
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

/** Carga el fichero como bitmap, con fallback para navegadores sin createImageBitmap. */
async function crearBitmap(archivo: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    return await createImageBitmap(archivo);
  }
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
