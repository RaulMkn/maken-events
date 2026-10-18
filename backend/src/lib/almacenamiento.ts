import { Client, Storage, ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import { config, almacenamientoConfigurado } from '../config.js';

/**
 * Integración con Appwrite aislada aquí para poder cambiar de proveedor sin
 * tocar el resto de la app. Si no está configurado, lanza un error que la ruta
 * traduce a un 503 sin afectar al resto.
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
  fileId: string;
}

/** Sube una foto al bucket de Appwrite y devuelve el ID del fichero creado. */
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

/** Lista las fotos del bucket, de la más reciente a la más antigua. */
export async function listarFotos(limite = 100): Promise<FotoListada[]> {
  const s = getStorage();
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
