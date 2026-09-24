import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  obtenerFinanzas,
  fijarPrecio,
  listarGastos,
  crearGasto,
  borrarGasto,
  ApiError,
  type Finanzas,
  type Gasto,
} from '../api.ts';

/** Formatea céntimos como euros: 700 -> "7,00 €". */
function euros(centimos: number): string {
  return (centimos / 100).toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
}

/** Convierte un texto de euros ("7", "7,50", "7.50") a céntimos enteros. */
function aCentimos(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '') return null;
  const n = Number(limpio);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export default function DashboardFinanzas({ onNoAuth }: { onNoAuth: () => void }) {
  const [finanzas, setFinanzas] = useState<Finanzas | null>(null);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formularios
  const [precioInput, setPrecioInput] = useState('');
  const [conceptoInput, setConceptoInput] = useState('');
  const [importeInput, setImporteInput] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [fin, gs] = await Promise.all([obtenerFinanzas(), listarGastos()]);
      setFinanzas(fin);
      setGastos(gs.gastos);
      setPrecioInput((fin.precioEntradaCentimos / 100).toString().replace('.', ','));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onNoAuth();
        return;
      }
      setError('No se pudieron cargar los datos financieros.');
    } finally {
      setCargando(false);
    }
  }, [onNoAuth]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function onGuardarPrecio(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const centimos = aCentimos(precioInput);
    if (centimos === null) {
      setError('El precio no es válido.');
      return;
    }
    setGuardando(true);
    try {
      await fijarPrecio(centimos);
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el precio.');
    } finally {
      setGuardando(false);
    }
  }

  async function onAnadirGasto(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const centimos = aCentimos(importeInput);
    if (conceptoInput.trim() === '' || centimos === null) {
      setError('Escribe un concepto y un importe válido.');
      return;
    }
    setGuardando(true);
    try {
      await crearGasto(conceptoInput.trim(), centimos);
      setConceptoInput('');
      setImporteInput('');
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo añadir el gasto.');
    } finally {
      setGuardando(false);
    }
  }

  async function onBorrarGasto(id: string) {
    if (!confirm('¿Borrar este gasto?')) return;
    setError(null);
    try {
      await borrarGasto(id);
      await cargar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo borrar el gasto.');
    }
  }

  if (cargando) {
    return <p className="subtitulo">Cargando datos financieros…</p>;
  }

  return (
    <div>
      {error && <div className="aviso aviso-error">{error}</div>}

      {finanzas && (
        <div className="finanzas-grid">
          <div className="finanza-card">
            <div className="finanza-valor" style={{ color: 'var(--naranja)' }}>
              {euros(finanzas.ingresosCentimos)}
            </div>
            <div className="finanza-etiqueta">Ingresos (pagos confirmados)</div>
          </div>
          <div className="finanza-card">
            <div className="finanza-valor" style={{ color: 'var(--texto)' }}>
              {euros(finanzas.gastosCentimos)}
            </div>
            <div className="finanza-etiqueta">Gastos</div>
          </div>
          <div className="finanza-card">
            <div
              className={`finanza-valor ${
                finanzas.beneficioCentimos >= 0
                  ? 'finanza-valor--positivo'
                  : 'finanza-valor--negativo'
              }`}
            >
              {euros(finanzas.beneficioCentimos)}
            </div>
            <div className="finanza-etiqueta">Beneficio neto</div>
          </div>
        </div>
      )}

      {/* Precio de entrada */}
      <section className="tarjeta" style={{ marginBottom: 20 }}>
        <h2>Precio de la entrada</h2>
        <p className="subtitulo" style={{ fontSize: '0.9rem', marginBottom: 8 }}>
          Cada persona que confirmes de ahora en adelante contará con este precio. Los ya
          confirmados mantienen el precio al que se registraron.
        </p>
        <form className="precio-form" onSubmit={onGuardarPrecio}>
          <div className="campo" style={{ marginBottom: 0 }}>
            <label htmlFor="precio">Precio (€)</label>
            <input
              id="precio"
              type="text"
              inputMode="decimal"
              value={precioInput}
              onChange={(e) => setPrecioInput(e.target.value)}
              placeholder="7,00"
              style={{ maxWidth: 140 }}
            />
          </div>
          <button type="submit" className="boton" disabled={guardando}>
            Guardar precio
          </button>
        </form>
      </section>

      {/* Gastos */}
      <section className="tarjeta">
        <h2>Gastos</h2>
        {gastos.length === 0 ? (
          <p className="subtitulo" style={{ fontSize: '0.9rem' }}>
            Todavía no has añadido gastos.
          </p>
        ) : (
          <div>
            {gastos.map((g) => (
              <div className="gasto-fila" key={g.id}>
                <span>{g.concepto}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="gasto-importe">{euros(g.importeCentimos)}</span>
                  <button
                    className="boton boton-secundario boton-pequeno"
                    onClick={() => onBorrarGasto(g.id)}
                    aria-label={`Borrar gasto ${g.concepto}`}
                  >
                    Borrar
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}

        <form className="form-inline" onSubmit={onAnadirGasto}>
          <div className="campo">
            <label htmlFor="concepto">Concepto</label>
            <input
              id="concepto"
              type="text"
              value={conceptoInput}
              onChange={(e) => setConceptoInput(e.target.value)}
              placeholder="Ej. hielo, vasos, decoración…"
              maxLength={120}
            />
          </div>
          <div className="campo" style={{ maxWidth: 140 }}>
            <label htmlFor="importe">Importe (€)</label>
            <input
              id="importe"
              type="text"
              inputMode="decimal"
              value={importeInput}
              onChange={(e) => setImporteInput(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <button type="submit" className="boton" disabled={guardando}>
            Añadir gasto
          </button>
        </form>
      </section>
    </div>
  );
}
