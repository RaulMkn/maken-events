import { useCallback, useEffect, useState } from 'react';
import {
  listarAsistentes,
  confirmarPago,
  reenviarEmail,
  logout,
  ApiError,
  type Asistente,
  type ResumenAsistentes,
} from '../api.ts';

/**
 * Panel admin: resumen + tabla de asistentes con acciones de pago/email.
 */
export default function PanelAdmin({ onLogout }: { onLogout: () => void }) {
  const [asistentes, setAsistentes] = useState<Asistente[]>([]);
  const [resumen, setResumen] = useState<ResumenAsistentes | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await listarAsistentes();
      setAsistentes(data.asistentes);
      setResumen(data.resumen);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onLogout();
        return;
      }
      setError('No se pudo cargar el listado.');
    } finally {
      setCargando(false);
    }
  }, [onLogout]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function onConfirmar(a: Asistente) {
    if (!confirm(`¿Confirmar el pago de ${a.nombre} ${a.apellidos} y enviarle la entrada?`)) {
      return;
    }
    setAccionEnCurso(a.id);
    setAviso(null);
    setError(null);
    try {
      const res = await confirmarPago(a.id);
      if (res.emailEnviado) {
        setAviso(`Pago confirmado y entrada enviada a ${a.email}.`);
      } else {
        setError(res.aviso ?? 'Pago confirmado, pero no se pudo enviar el email.');
      }
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo confirmar el pago.');
    } finally {
      setAccionEnCurso(null);
    }
  }

  async function onReenviar(a: Asistente) {
    setAccionEnCurso(a.id);
    setAviso(null);
    setError(null);
    try {
      await reenviarEmail(a.id);
      setAviso(`Entrada reenviada a ${a.email}.`);
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo reenviar el email.');
    } finally {
      setAccionEnCurso(null);
    }
  }

  async function cerrarSesion() {
    await logout().catch(() => undefined);
    onLogout();
  }

  return (
    <div className="contenedor-ancho">
      <div className="cabecera">
        <div>
          <span className="eyebrow">Panel de control</span>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}>Asistentes</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="boton boton-secundario boton-pequeno" onClick={cargar}>
            Actualizar
          </button>
          <button className="boton boton-secundario boton-pequeno" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </div>

      {resumen && (
        <div className="metricas">
          <div className="metrica">
            <div className="metrica-numero">{resumen.total}</div>
            <div className="metrica-etiqueta">Registrados</div>
          </div>
          <div className="metrica">
            <div className="metrica-numero">{resumen.pagados}</div>
            <div className="metrica-etiqueta">Pagados</div>
          </div>
          <div className="metrica">
            <div className="metrica-numero">{resumen.pendientes}</div>
            <div className="metrica-etiqueta">Pendientes</div>
          </div>
          <div className="metrica">
            <div className="metrica-numero">{resumen.entrados}</div>
            <div className="metrica-etiqueta">Ya dentro</div>
          </div>
          <div className="metrica">
            <div className="metrica-numero">{resumen.disfrazados}</div>
            <div className="metrica-etiqueta">Disfrazados</div>
          </div>
        </div>
      )}

      {aviso && <div className="aviso aviso-ok">{aviso}</div>}
      {error && <div className="aviso aviso-error">{error}</div>}

      {cargando ? (
        <p className="subtitulo">Cargando…</p>
      ) : asistentes.length === 0 ? (
        <p className="subtitulo">Todavía no hay nadie registrado.</p>
      ) : (
        agruparPorParte(asistentes).map(([grupo, lista]) => (
          <div key={grupo}>
            <div className="grupo-titulo">
              <span className="grupo-nombre">De parte de {grupo}</span>
              <span className="grupo-conteo">
                {lista.length} {lista.length === 1 ? 'persona' : 'personas'}
              </span>
            </div>
            <div className="tabla-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Disfraz</th>
                    <th>Pago</th>
                    <th>Email</th>
                    <th>Entrada</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((a) => (
                    <tr key={a.id}>
                      <td>
                        {a.nombre} {a.apellidos}
                      </td>
                      <td>{a.email}</td>
                      <td>{a.disfrazado ? (a.disfraz ?? 'Sí') : '—'}</td>
                      <td>
                        <span className={`etiqueta etiqueta-${a.estadoPago}`}>
                          {a.estadoPago === 'pagado' ? 'Pagado' : 'Pendiente'}
                        </span>
                      </td>
                      <td>{a.emailEnviado ? '✅' : '—'}</td>
                      <td>{a.haEntrado ? '🟢 Dentro' : '—'}</td>
                      <td>
                        {a.estadoPago === 'pendiente' ? (
                          <button
                            className="boton boton-pequeno"
                            onClick={() => onConfirmar(a)}
                            disabled={accionEnCurso === a.id}
                          >
                            {accionEnCurso === a.id ? '…' : 'Confirmar pago'}
                          </button>
                        ) : (
                          <button
                            className="boton boton-secundario boton-pequeno"
                            onClick={() => onReenviar(a)}
                            disabled={accionEnCurso === a.id}
                          >
                            {accionEnCurso === a.id ? '…' : 'Reenviar entrada'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/**
 * Agrupa los asistentes por "de parte de quién", ordenando los grupos
 * alfabéticamente. Los que no tengan valor se agrupan bajo "Sin especificar".
 */
function agruparPorParte(asistentes: Asistente[]): [string, Asistente[]][] {
  const grupos = new Map<string, Asistente[]>();
  for (const a of asistentes) {
    const clave = (a.deParteDe ?? '').trim() || 'Sin especificar';
    const lista = grupos.get(clave) ?? [];
    lista.push(a);
    grupos.set(clave, lista);
  }
  return [...grupos.entries()].sort((x, y) => x[0].localeCompare(y[0], 'es'));
}
