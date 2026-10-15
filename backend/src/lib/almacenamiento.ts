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

export interface FotoListada {
  fileId: string;
  creadoEn: string;
}

/**
 * Lista las fotos del bucket, de la más reciente a la más antigua.
 * Requiere que la API key tenga scope de lectura (files.read).
 */
export async function listarFotos(limite = 100): Promise<FotoListada[]> {
  const s = getStorage();
  // Query en formato del SDK: orden descendente por fecha de creación.
  const res = await s.listFiles(config.appwrite.bucketId, [
    `limit(${Math.max(1, Math.min(limite, 100))})`,
    'orderDesc("$createdAt")',
  ]);
  return res.files.map((f) => ({ fileId: f.$id, creadoEn: f.$createdAt }));
}

/** Descarga el contenido binario de una foto (para servirla desde el backend). */
export async function obtenerFoto(fileId: string): Promise<Buffer> {
  const s = getStorage();
  const datos = await s.getFileView(config.appwrite.bucketId, fileId);
  return Buffer.from(datos);
}
