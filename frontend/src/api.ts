/**
 * Cliente HTTP mínimo para hablar con el backend.
 * Todas las llamadas usan el mismo origen (el backend sirve la API y el
 * frontend). Incluimos credentials para que viaje la cookie de sesión.
 */

export interface Asistente {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  disfrazado: boolean;
  disfraz: string | null;
  deParteDe: string | null;
  estadoPago: 'pendiente' | 'pagado';
  emailEnviado: boolean;
  haEntrado: boolean;
  creadoEn: string;
  pagadoEn: string | null;
  validadoLista: boolean;
}

export interface ResumenAsistentes {
  total: number;
  pagados: number;
  pendientes: number;
  disfrazados: number;
  entrados: number;
  validados: number;
}

export interface DatosRegistro {
  nombre: string;
  apellidos?: string;
  email: string;
  disfrazado: boolean;
  disfraz?: string;
  deParteDe: string;
  aceptaCondiciones: boolean;
}

export interface Gasto {
  id: string;
  concepto: string;
  importeCentimos: number;
  creadoEn: string;
}

export interface Finanzas {
  ingresosCentimos: number;
  gastosCentimos: number;
  beneficioCentimos: number;
  precioEntradaCentimos: number;
}

export interface Invitado {
  id: string;
  nombre: string;
  deParteDe: string | null;
  validado: boolean;
}

export interface ResultadoVerificacion {
  resultado: 'valida' | 'ya_entro' | 'invalida';
  nombre?: string;
  motivo?: string;
  disfrazado?: boolean;
  disfraz?: string | null;
  deParteDe?: string | null;
  entradoEn?: string | null;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  // Solo declaramos Content-Type JSON si de verdad enviamos cuerpo. Si no,
  // Fastify rechaza (400) una petición con content-type JSON y body vacío.
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (options.body != null) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers,
  });

  const texto = await res.text();
  const data = texto ? JSON.parse(texto) : null;

  if (!res.ok) {
    const mensaje = data?.error ?? 'Ha ocurrido un error. Inténtalo de nuevo.';
    throw new ApiError(res.status, mensaje);
  }

  return data as T;
}

// ---- Público ----
export function registrar(datos: DatosRegistro): Promise<{ ok: true; mensaje: string }> {
  return request('/api/registro', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

// ---- Admin ----
export function login(usuario: string, password: string, totp: string): Promise<{ ok: true }> {
  return request('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ usuario, password, totp }),
  });
}

export function logout(): Promise<{ ok: true }> {
  return request('/api/admin/logout', { method: 'POST' });
}

export function comprobarSesion(): Promise<{ autenticado: boolean; usuario?: string }> {
  return request('/api/admin/sesion');
}

export function listarAsistentes(): Promise<{
  resumen: ResumenAsistentes;
  asistentes: Asistente[];
}> {
  return request('/api/admin/asistentes');
}

export function confirmarPago(
  id: string,
): Promise<{ ok: true; emailEnviado: boolean; aviso?: string }> {
  return request(`/api/admin/asistentes/${id}/confirmar-pago`, { method: 'POST' });
}

export function reenviarEmail(id: string): Promise<{ ok: true; emailEnviado: boolean }> {
  return request(`/api/admin/asistentes/${id}/reenviar-email`, { method: 'POST' });
}

export function eliminarAsistente(id: string): Promise<{ ok: true }> {
  return request(`/api/admin/asistentes/${id}`, { method: 'DELETE' });
}

// ---- Admin: dashboard financiero ----
export function obtenerFinanzas(): Promise<Finanzas> {
  return request('/api/admin/finanzas');
}

export function fijarPrecio(
  precioEntradaCentimos: number,
): Promise<{ ok: true; precioEntradaCentimos: number }> {
  return request('/api/admin/ajustes', {
    method: 'PUT',
    body: JSON.stringify({ precioEntradaCentimos }),
  });
}

export function listarGastos(): Promise<{ gastos: Gasto[] }> {
  return request('/api/admin/gastos');
}

export function crearGasto(
  concepto: string,
  importeCentimos: number,
): Promise<{ ok: true; id: string }> {
  return request('/api/admin/gastos', {
    method: 'POST',
    body: JSON.stringify({ concepto, importeCentimos }),
  });
}

export function borrarGasto(id: string): Promise<{ ok: true }> {
  return request(`/api/admin/gastos/${id}`, { method: 'DELETE' });
}

// ---- Staff (puerta) ----
export function loginStaff(password: string): Promise<{ ok: true }> {
  return request('/api/staff/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export function logoutStaff(): Promise<{ ok: true }> {
  return request('/api/staff/logout', { method: 'POST' });
}

export function comprobarSesionStaff(): Promise<{ autenticado: boolean }> {
  return request('/api/staff/sesion');
}

export function verificarEntrada(token: string): Promise<ResultadoVerificacion> {
  return request('/api/staff/verificar', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export function listarInvitados(): Promise<{ total: number; invitados: Invitado[] }> {
  return request('/api/staff/invitados');
}

export function validarInvitado(
  id: string,
  validado: boolean,
): Promise<{ ok: true; id: string; validado: boolean }> {
  return request('/api/staff/invitados/validar', {
    method: 'POST',
    body: JSON.stringify({ id, validado }),
  });
}

// ---- Carrete de fotos (público, por token) ----
export interface EstadoCarrete {
  nombre: string;
  usadas: number;
  maximo: number;
  almacenamientoListo: boolean;
}

export function estadoCarrete(token: string): Promise<EstadoCarrete> {
  return request(`/api/carrete/${encodeURIComponent(token)}`);
}

/**
 * Sube una foto (Blob/File ya comprimido) al carrete. Usa multipart, por eso
 * no pasa por el helper `request` (que es solo para JSON).
 */
export async function subirFotoCarrete(
  token: string,
  foto: Blob,
): Promise<{ ok: true; usadas: number; maximo: number }> {
  const form = new FormData();
  form.append('foto', foto, 'foto.jpg');

  const res = await fetch(`/api/carrete/${encodeURIComponent(token)}/foto`, {
    method: 'POST',
    credentials: 'same-origin',
    body: form,
  });

  const texto = await res.text();
  const data = texto ? JSON.parse(texto) : null;
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? 'No se pudo subir la foto.');
  }
  return data;
}

export { ApiError };
