import { useCallback, useEffect, useState } from 'react';
import {
  listarAsistentes,
  confirmarPago,
  reenviarEmail,
  eliminarAsistente,
  rechazarAsistente,
  logout,
  ApiError,
  type Asistente,
  type ResumenAsistentes,
} from '../api.ts';
import DashboardFinanzas from './DashboardFinanzas.tsx';
import { agruparPorParteInteligente } from '../utils/agruparParte.ts';

type Pestana = 'asistentes' | 'finanzas';

export default function PanelAdmin({ onLogout }: { onLogout: () => void }) {
  const [pestana, setPestana] = useState<Pestana>('asistentes');
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

  async function onRechazar(a: Asistente) {
    const nombre = `${a.nombre} ${a.apellidos}`.trim();
    if (
      !confirm(
        `¿Rechazar a ${nombre}? Se le enviará un email avisando de que no se pudo confirmar su invitación y se eliminará del listado.`,
      )
    ) {
      return;
    }
    setAccionEnCurso(a.id);
    setAviso(null);
    setError(null);
    try {
      await rechazarAsistente(a.id);
      setAviso(`${nombre} rechazado: se le avisó por email y se eliminó del listado.`);
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo rechazar.');
    } finally {
      setAccionEnCurso(null);
    }
  }

  async function onEliminar(a: Asistente) {
    const nombre = `${a.nombre} ${a.apellidos}`.trim();
    if (
      !confirm(
        `¿Eliminar a ${nombre} del listado? No se le enviará ningún email. Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setAccionEnCurso(a.id);
    setAviso(null);
    setError(null);
    try {
      await eliminarAsistente(a.id);
      setAviso(`${nombre} eliminado del listado.`);
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar.');
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
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}>Administración</h1>
        </div>
        <button className="boton boton-secundario boton-pequeno" onClick={cerrarSesion}>
          Cerrar sesión
        </button>
      </div>

      <div className="admin-controles">
        <select className="select-fiesta" defaultValue="halloween" aria-label="Fiesta">
          <option value="halloween">🎃 Fiesta de Halloween</option>
          <option value="carnaval" disabled>
            🎭 Carnaval (próximamente)
          </option>
        </select>

        <div className="tabs" role="tablist">
          <button
            className={`tab ${pestana === 'asistentes' ? 'tab--activa' : ''}`}
            onClick={() => setPestana('asistentes')}
            role="tab"
            aria-selected={pestana === 'asistentes'}
          >
            Asistentes
          </button>
          <button
            className={`tab ${pestana === 'finanzas' ? 'tab--activa' : ''}`}
            onClick={() => setPestana('finanzas')}
            role="tab"
            aria-selected={pestana === 'finanzas'}
          >
            Finanzas
          </button>
        </div>

        {pestana === 'asistentes' && (
          <>
            <button className="boton boton-secundario boton-pequeno" onClick={cargar}>
              Actualizar
            </button>
            <a
              className="boton boton-secundario boton-pequeno"
              href="/api/admin/asistentes.csv"
              download
            >
              Exportar CSV
            </a>
          </>
        )}
      </div>

      {pestana === 'finanzas' ? (
        <DashboardFinanzas onNoAuth={onLogout} />
      ) : (
        <>
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
        agruparPorParteInteligente(asistentes, (a) => a.deParteDe).map((grupo) => {
          const lista = grupo.elementos;
          return (
          <div key={grupo.nombre}>
            <div className="grupo-titulo">
              <span className="grupo-nombre">De parte de {grupo.nombre}</span>
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
                        <div className="acciones-fila">
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
                          <button
                            className="boton boton-secundario boton-pequeno"
                            onClick={() => onRechazar(a)}
                            disabled={accionEnCurso === a.id}
                            aria-label={`Rechazar a ${a.nombre} ${a.apellidos}`}
                          >
                            Rechazar
                          </button>
                          <button
                            className="boton boton-peligro boton-pequeno"
                            onClick={() => onEliminar(a)}
                            disabled={accionEnCurso === a.id}
                            aria-label={`Eliminar a ${a.nombre} ${a.apellidos}`}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          );
        })
      )}
        </>
      )}
    </div>
  );
}
