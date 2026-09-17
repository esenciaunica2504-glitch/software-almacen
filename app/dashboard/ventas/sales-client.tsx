'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearVenta, type VentaResult } from './actions';

type Producto = { id: string; nombre: string; precio: number; stock: number };

type CartLine = { id: string; nombre: string; precio: number; cantidad: number };

type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'debito' | 'lector_universal';

const opcionesPago = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'debito', label: 'Tarjeta de débito' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'lector_universal', label: 'Lector universal' },
] as const;

export default function SalesClient({ productos }: { productos: Producto[] }) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [mensaje, setMensaje] = useState<VentaResult | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('tarjeta');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [referencia, setReferencia] = useState('');
  const [lector, setLector] = useState('');
  const [ultimoRecibo, setUltimoRecibo] = useState<null | { total: number; metodoPago: string; vuelto: number; fecha: string; cart: CartLine[] }>(null);

  const visibles = useMemo(() => productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase())), [productos, busqueda]);

  function agregar(p: Producto) {
    setCart((c) => {
      const found = c.find((x) => x.id === p.id);
      if (found) return c.map((x) => (x.id === p.id ? { ...x, cantidad: Math.min(x.cantidad + 1, p.stock) } : x));
      return [...c, { id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1 }];
    });
  }

  function cambiarCantidad(id: string, cantidad: number) {
    setCart((c) => c.map((x) => (x.id === id ? { ...x, cantidad: Math.max(1, cantidad) } : x)));
  }

  function quitar(id: string) {
    setCart((c) => c.filter((x) => x.id !== id));
  }

  async function checkout() {
    if (cart.length === 0) return setMensaje({ ok: false, mensaje: 'El carrito está vacío.' });

    const body = new FormData();
    const cartPayload = cart.map(({ id, cantidad, precio }) => ({ id, cantidad, precio }));
    body.append('cart', JSON.stringify(cartPayload));
    body.append('paymentMethod', metodoPago);
    if (metodoPago === 'efectivo') body.append('montoRecibido', String(Number(montoRecibido || 0)));
    if (metodoPago === 'transferencia') body.append('referencia', referencia);
    if (metodoPago === 'lector_universal') body.append('lector', lector || 'Lector universal');

    try {
      const res = await crearVenta(body as any);
      setMensaje(res);
      if (res.ok) {
        const recibo = {
          total: subtotal,
          metodoPago: opcionesPago.find((option) => option.value === metodoPago)?.label ?? 'Tarjeta',
          vuelto: metodoPago === 'efectivo' ? Math.max(0, Number(montoRecibido || 0) - subtotal) : 0,
          fecha: new Date().toLocaleString('es-AR'),
          cart: cart.map((line) => ({ ...line })),
        };
        setUltimoRecibo(recibo);
        setCart([]);
        setMontoRecibido('');
        setReferencia('');
        setLector('');
        router.refresh();
      }
    } catch (err: any) {
      setMensaje({ ok: false, mensaje: err?.message ?? 'Error en servidor' });
    }
  }

  const subtotal = cart.reduce((s, it) => s + it.precio * it.cantidad, 0);
  const vuelto = metodoPago === 'efectivo' ? Math.max(0, Number(montoRecibido || 0) - subtotal) : 0;

  return (
    <div className="space-y-6">
      {mensaje && (
        <div className={`rounded-xl border p-4 text-sm ${mensaje.ok ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {mensaje.mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar producto..." className="flex-1 rounded-lg border p-2 text-sm" />
          </div>
          <div className="space-y-2">
            {visibles.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b py-2">
                <div>
                  <div className="font-medium">{p.nombre}</div>
                  <div className="text-sm text-slate-500">${p.precio} • {p.stock}u</div>
                </div>
                <div>
                  <button onClick={() => agregar(p)} disabled={p.stock === 0} className="rounded bg-indigo-600 px-3 py-1 text-white disabled:opacity-50">Agregar</button>
                </div>
              </div>
            ))}
            {visibles.length === 0 && <div className="p-4 text-sm text-gray-500">No hay productos.</div>}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-2 font-bold">Carrito</h3>
          <div className="space-y-2">
            {cart.length === 0 && <div className="text-sm text-gray-500">Carrito vacío</div>}
            {cart.map((line) => (
              <div key={line.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{line.nombre}</div>
                  <div className="text-sm text-slate-500">${line.precio}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} value={line.cantidad} onChange={(e) => cambiarCantidad(line.id, Number(e.target.value))} className="w-16 rounded border p-1 text-sm" />
                  <button onClick={() => quitar(line.id)} className="text-red-600">Quitar</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t pt-3">
            <div className="flex justify-between font-medium"><span>Total</span><span>${subtotal}</span></div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase text-slate-500">Método de pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {opcionesPago.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMetodoPago(option.value)}
                      className={`rounded-lg border px-3 py-2 text-sm ${metodoPago === option.value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {metodoPago === 'efectivo' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Monto recibido</label>
                  <input value={montoRecibido} onChange={(e) => setMontoRecibido(e.target.value)} type="number" min={0} step="0.01" placeholder="Ej: 2500" className="w-full rounded-lg border p-2 text-sm" />
                  {Number(montoRecibido || 0) >= subtotal && (
                    <div className="mt-2 text-sm text-emerald-700">Vuelto estimado: ${vuelto}</div>
                  )}
                </div>
              )}

              {metodoPago === 'transferencia' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Referencia / comprobante</label>
                  <input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="CBU, alias, número, etc." className="w-full rounded-lg border p-2 text-sm" />
                </div>
              )}

              {metodoPago === 'lector_universal' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">Tipo de lector</label>
                  <input value={lector} onChange={(e) => setLector(e.target.value)} placeholder="USB, Bluetooth, serial, terminal" className="w-full rounded-lg border p-2 text-sm" />
                  <p className="mt-2 text-xs text-slate-500">Compatible con lectores universales de tarjeta: USB, Bluetooth, serial o terminal POS.</p>
                </div>
              )}
            </div>

            <div className="mt-4">
              <button onClick={checkout} className="w-full rounded bg-green-600 px-4 py-2 text-white">Confirmar Venta</button>
            </div>
          </div>
        </div>
      </div>

      {ultimoRecibo && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">Comprobante de venta</h3>
              <p className="text-xs text-emerald-700">{ultimoRecibo.fecha}</p>
            </div>
            <span className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-medium text-white">{ultimoRecibo.metodoPago}</span>
          </div>

          <div className="space-y-2 border-t border-emerald-200 pt-3">
            {ultimoRecibo.cart.map((item) => (
              <div key={item.id} className="flex justify-between gap-3">
                <span>{item.nombre} x {item.cantidad}</span>
                <span>${item.precio * item.cantidad}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 border-t border-emerald-200 pt-3">
            <div className="flex justify-between font-bold"><span>Total</span><span>${ultimoRecibo.total}</span></div>
            {ultimoRecibo.vuelto > 0 && (
              <div className="flex justify-between text-emerald-800"><span>Vuelto</span><span>${ultimoRecibo.vuelto}</span></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
