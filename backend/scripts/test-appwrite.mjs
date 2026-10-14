/**
 * Prueba aislada de Appwrite Storage: sube una imagen pequeña al bucket para
 * confirmar que endpoint + project id + bucket id + API key funcionan juntos.
 *
 * NO guarda la API key en ningún sitio: la lee de variables de entorno que
 * le pasas en el momento. Uso:
 *
 *   APPWRITE_PROJECT_ID=... APPWRITE_BUCKET_ID=... APPWRITE_API_KEY=... \
 *     node scripts/test-appwrite.mjs
 *
 * (APPWRITE_ENDPOINT es opcional; por defecto https://cloud.appwrite.io/v1)
 */
import { Client, Storage, ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID;
const bucketId = process.env.APPWRITE_BUCKET_ID;
const apiKey = process.env.APPWRITE_API_KEY;

if (!projectId || !bucketId || !apiKey) {
  console.error('Faltan variables: APPWRITE_PROJECT_ID, APPWRITE_BUCKET_ID y/o APPWRITE_API_KEY.');
  process.exit(1);
}

// PNG 1x1 transparente (contenido mínimo válido) para no depender de ficheros.
const pngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const buffer = Buffer.from(pngBase64, 'base64');

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const storage = new Storage(client);

try {
  console.log(`Subiendo imagen de prueba al bucket ${bucketId}…`);
  const creado = await storage.createFile(
    bucketId,
    ID.unique(),
    InputFile.fromBuffer(buffer, 'prueba-maken.png'),
  );
  console.log('✅ Subida correcta. File ID:', creado.$id);
  console.log('Puedes borrar esta imagen de prueba desde la consola de Appwrite.');
} catch (err) {
  console.error('❌ Falló la subida:', err?.message ?? err);
  console.error('Revisa: scope files.write en la API key, bucket id correcto y permisos del bucket.');
  process.exit(1);
}
