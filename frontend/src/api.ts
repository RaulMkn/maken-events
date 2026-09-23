/**
 * Cliente HTTP mínimo para hablar con el backend.
 * Todas las llamadas usan el mismo origen (Caddy hace de proxy de /api).
 * Incluimos credentials para que viaje la cookie de sesión admin.
 */

export interface Asistente {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  disfrazado: boolean;
  disfraz: string | null;
  estadoPago: 'pendiente' | 'pagado';
  emailEnviado: boolean;
  creadoEn: string;
  pagadoEn: string | null;
}

export interface ResumenAsistentes {
  total: number;
  pagados: number;
  pendientes: number;
  disfrazados: number;
}

export interface DatosRegistro {
  nombre: string;
  apellidos: string;
  email: string;
  disfrazado: boolean;
  disfraz?: string;
  aceptaCondiciones: boolean;
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
  const res = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
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

export { ApiError };
