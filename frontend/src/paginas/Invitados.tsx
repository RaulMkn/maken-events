import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  comprobarSesionStaff,
  listarInvitados,
  logoutStaff,
  ApiError,
  type Invitado,
} from '../api.ts';
import LoginStaff from '../componentes/LoginStaff.tsx';
import { agruparPorParteInteligente, tokensParte } from '../utils/agruparParte.ts';

/**
 * Página de validación en puerta. Muestra SOLO el nombre de cada invitado y
 * de parte de quién viene: lo justo para comprobar quién puede pasar y quién
 * no, sin exponer emails ni estado de pago.
 *
 * Protegida con la misma contraseña del staff (equipo de puerta).
 */
export default function Invitados() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);

  useEffect(() => {
    comprobarSesionStaff()
      .then((r) => setAutenticado(r.autenticado))
      .catch(() => setAutenticado(false));
  }, []);

  if (autenticado === null) {
    return (
      <div className="contenedor centrado">
        <p className="subtitulo" style={{ marginTop: 48 }}>
          Cargando…
        </p>
      </div>
    );
  }

  if (!autenticado) {
    return <LoginStaff onLogin={() => setAutenticado(true)} />;
  }

  return <ListaInvitados onLogout={() => setAutenticado(false)} />;
}

function ListaInvitados({ onLogout }: { onLogout: () => void }) {
  const [invitados, setInvitados] = useState<Invitado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await listarInvitados();
      setInvitados(data.invitados);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onLogout();
        return;
      }
      setError('No se pudo cargar la lista de invitados.');
    } finally {
      setCargando(false);
    }
  }, [onLogout]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function cerrarSesion() {
    await logoutStaff().catch(() => undefined);
    onLogout();
  }

  // Filtro por nombre o por de parte de quién. Insensible a acentos/mayúsculas.
  const filtrados = useMemo(() => {
    const q = tokensParte(busqueda);
    if (q.length === 0) return invitados;
    return invitados.filter((i) => {
      const campos = tokensParte(`${i.nombre} ${i.deParteDe ?? ''}`);
      return q.every((t) => campos.some((c) => c.includes(t)));
    });
  }, [invitados, busqueda]);

  const grupos = useMemo(
    () => agruparPorParteInteligente(filtrados, (i) => i.deParteDe),
    [filtrados],
  );

  return (
    <div className="contenedor-ancho">
      <div className="cabecera">
        <div>
          <span className="eyebrow">Equipo de puerta</span>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}>Lista de invitados</h1>
          <p className="subtitulo" style={{ marginTop: 8 }}>
            Nombre y de parte de quién viene cada persona. Agrupados por quien invita.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/staff" className="boton boton-secundario boton-pequeno">
            Escáner QR
          </Link>
          <button className="boton boton-secundario boton-pequeno" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="admin-controles">
        <input
          type="search"
          className="buscador-invitados"
          placeholder="Buscar por nombre o por quién invita…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar invitado"
        />
        <button className="boton boton-secundario boton-pequeno" onClick={cargar}>
          Actualizar
        </button>
      </div>

      {error && <div className="aviso aviso-error">{error}</div>}

      {cargando ? (
        <p className="subtitulo">Cargando…</p>
      ) : invitados.length === 0 ? (
        <p className="subtitulo">Todavía no hay nadie registrado.</p>
      ) : filtrados.length === 0 ? (
        <p className="subtitulo">Nadie coincide con «{busqueda}».</p>
      ) : (
        grupos.map((grupo) => (
          <div key={grupo.nombre}>
            <div className="grupo-titulo">
              <span className="grupo-nombre">De parte de {grupo.nombre}</span>
              <span className="grupo-conteo">
                {grupo.elementos.length}{' '}
                {grupo.elementos.length === 1 ? 'persona' : 'personas'}
              </span>
            </div>
            <div className="tabla-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>De parte de</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.elementos.map((inv, idx) => (
                    <tr key={`${inv.nombre}-${idx}`}>
                      <td>{inv.nombre}</td>
                      <td>{inv.deParteDe?.trim() || '—'}</td>
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
