import { cerrarCaja, obtenerResumenCaja } from './actions';

function formatearPesos(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
}

export default async function CajaPage() {
  const resumen = await obtenerResumenCaja();

  if (!resumen.ok || !resumen.resumen) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6 text-black">
        <h1 className="text-2xl font-bold text-slate-800">Caja</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {resumen.error ?? 'No se pudo cargar la caja.'}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 text-black">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Caja y cierre</h1>
          <p className="text-sm text-slate-500">Resumen del día y movimientos de cobro.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ventas del día</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-800">{formatearPesos(resumen.resumen.totalVentasHoy)}</h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Efectivo</p>
          <h2 className="mt-3 text-3xl font-bold text-emerald-700">{formatearPesos(resumen.resumen.totalEfectivo)}</h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Tarjetas y débito</p>
          <h2 className="mt-3 text-3xl font-bold text-indigo-700">{formatearPesos(resumen.resumen.totalTarjeta + resumen.resumen.totalDebito + resumen.resumen.totalLectorUniversal)}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Efectivo</p>
          <p className="mt-2 text-xl font-bold text-slate-800">{formatearPesos(resumen.resumen.totalEfectivo)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Tarjeta</p>
          <p className="mt-2 text-xl font-bold text-slate-800">{formatearPesos(resumen.resumen.totalTarjeta)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Débito</p>
          <p className="mt-2 text-xl font-bold text-slate-800">{formatearPesos(resumen.resumen.totalDebito)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Transferencia</p>
          <p className="mt-2 text-xl font-bold text-slate-800">{formatearPesos(resumen.resumen.totalTransferencia)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Lector universal</p>
          <p className="mt-2 text-xl font-bold text-slate-800">{formatearPesos(resumen.resumen.totalLectorUniversal)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Ventas del día</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3">Hora</th>
                  <th className="p-3">Método</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {resumen.resumen.ventas.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-gray-500">Todavía no hay ventas hoy.</td>
                  </tr>
                )}
                {resumen.resumen.ventas.map((venta) => (
                  <tr key={venta.id} className="border-t border-gray-200">
                    <td className="p-3 text-slate-700">{new Date(venta.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-3 text-slate-700">{venta.metodo_pago}</td>
                    <td className="p-3 text-right font-semibold text-slate-800">{formatearPesos(venta.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">Cierre de caja</h2>
          <form
            action={async (formData) => {
              'use server';
              await cerrarCaja(formData);
            }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Efectivo real en caja</label>
              <input name="monto_efectivo_real" type="number" min="0" step="0.01" className="w-full rounded-lg border p-2 text-sm" placeholder="0" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Observaciones</label>
              <textarea name="observaciones" rows={3} className="w-full rounded-lg border p-2 text-sm" placeholder="Ej. faltante por cambio, cierre normal..." />
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <div className="flex justify-between"><span>Esperado:</span><strong>{formatearPesos(resumen.resumen.totalEfectivo)}</strong></div>
              <div className="mt-1 flex justify-between"><span>Último cierre:</span><strong>{resumen.resumen.cierre ? formatearPesos(resumen.resumen.cierre.monto_efectivo_real) : 'Sin cierre'}</strong></div>
            </div>
            <button type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700">Registrar cierre</button>
          </form>
        </div>
      </div>
    </div>
  );
}
