import { Client, Storage, ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import { config, almacenamientoConfigurado } from '../config.js';

/**
 * Almacenamiento de las fotos de los carretes de los invitados.
 *
 * Toda la integración con Appwrite vive aquí: si algún día cambiamos de
 * proveedor (S3, Cloudinary…), solo hay que tocar este fichero. El resto de
 * la app solo conoce `subirFoto()`.
 *
 * Appwrite se configura con variables de entorno (APPWRITE_*). Si no están,
 * `subirFoto` lanza un error claro y la ruta de subida responde 503, sin
 * afectar al resto de la aplicación.
 */

let storage: Storage | null = null;

function getStorage(): Storage {
  if (!almacenamientoConfigurado()) {
    throw new Error('ALMACENAMIENTO_NO_CONFIGURADO');
  }
  if (!storage) {
    const client = new Client()
      .setEndpoint(config.appwrite.endpoint)
      .setProject(config.appwrite.projectId)
      .setKey(config.appwrite.apiKey);
    storage = new Storage(client);
  }
  return storage;
}

export interface FotoSubida {
  /** ID del fichero en Appwrite. */
  fileId: string;
}

/**
 * Sube una foto al bucket de Appwrite. Devuelve el ID del fichero creado.
 *
 * @param buffer   Contenido binario de la imagen.
 * @param nombre   Nombre de fichero sugerido (p. ej. "ada-3.jpg").
 */
export async function subirFoto(buffer: Buffer, nombre: string): Promise<FotoSubida> {
  const s = getStorage();
  const archivo = InputFile.fromBuffer(buffer, nombre);
  const creado = await s.createFile(config.appwrite.bucketId, ID.unique(), archivo);
  return { fileId: creado.$id };
}
