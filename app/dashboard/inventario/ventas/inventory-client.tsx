'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { actualizarProducto, eliminarProducto, guardarProducto, type InventarioResult } from './actions';

type Producto = {
  id: string | number;
  nombre: string;
  precio: number;
  stock: number;
};

export default function InventoryClient({ productos }: { productos: Producto[] }) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<string | number | null>(null);
  const [mensaje, setMensaje] = useState<InventarioResult | null>(null);
  const [pendiente, startTransition] = useTransition();

  const visibles = useMemo(
    () => productos.filter((producto) => producto.nombre.toLowerCase().includes(busqueda.toLowerCase())),
    [productos, busqueda],
  );

  function ejecutar(operacion: () => Promise<InventarioResult>, despues?: () => void) {
    startTransition(() => {
      operacion()
        .then((resultado) => {
          setMensaje(resultado);
          if (resultado.ok) {
            despues?.();
            setEditando(null);
            router.refresh();
          }
        })
        .catch((error: unknown) => {
          setMensaje({
            ok: false,
            mensaje: error instanceof Error ? error.message : 'No se pudo completar la operación.',
          });
        });
    });
  }

  function guardar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formulario = event.currentTarget;
    ejecutar(() => guardarProducto(new FormData(formulario)), () => formulario.reset());
  }

  function actualizar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ejecutar(() => actualizarProducto(new FormData(event.currentTarget)));
  }

  return (
    <>
      {mensaje && (
        <div className={`rounded-xl border p-4 text-sm ${mensaje.ok ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {mensaje.mensaje}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-slate-700">Nuevo Producto</h2>
        <form onSubmit={guardar} className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
          <label className="text-xs font-semibold uppercase text-slate-500">Nombre
            <input required name="nombre" type="text" className="mt-1 w-full rounded-lg border p-2 text-sm" />
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500">Precio
            <input required min="0" name="precio" type="number" step="0.01" className="mt-1 w-full rounded-lg border p-2 text-sm" />
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500">Stock
            <input required min="0" name="stock" type="number" className="mt-1 w-full rounded-lg border p-2 text-sm" />
          </label>
          <button disabled={pendiente} type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {pendiente ? 'Guardando...' : 'Guardar Producto'}
          </button>
        </form>
      </div>

      <div className="flex items-center justify-between gap-4">
        <h2 className="font-bold text-slate-700">Productos</h2>
        <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar producto..." className="rounded-lg border p-2 text-sm" />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-slate-500">
            <tr><th className="p-4">Producto</th><th className="p-4">Precio</th><th className="p-4">Stock</th><th className="p-4">Acciones</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {visibles.map((producto) => editando === producto.id ? (
              <tr key={producto.id}>
                <td colSpan={4} className="p-4">
                  <form onSubmit={actualizar} className="grid grid-cols-1 gap-2 md:grid-cols-4">
                    <input type="hidden" name="id" value={producto.id} />
                    <input required name="nombre" defaultValue={producto.nombre} className="rounded border p-2" />
                    <input required min="0" name="precio" type="number" step="0.01" defaultValue={producto.precio} className="rounded border p-2" />
                    <input required min="0" name="stock" type="number" defaultValue={producto.stock} className="rounded border p-2" />
                    <div className="flex gap-2"><button disabled={pendiente} className="rounded bg-indigo-600 px-3 py-2 text-white">Guardar</button><button type="button" onClick={() => setEditando(null)} className="rounded border px-3 py-2">Cancelar</button></div>
                  </form>
                </td>
              </tr>
            ) : (
              <tr key={producto.id}>
                <td className="p-4 font-medium">{producto.nombre}</td><td className="p-4">${producto.precio}</td>
                <td className={`p-4 font-semibold ${producto.stock <= 5 ? 'text-red-600' : 'text-emerald-600'}`}>{producto.stock} unidades</td>
                <td className="flex gap-3 p-4"><button onClick={() => setEditando(producto.id)} className="text-indigo-600">Editar</button><button onClick={() => { if (window.confirm('¿Eliminar este producto?')) ejecutar(() => eliminarProducto(String(producto.id))); }} className="text-red-600">Eliminar</button></td>
              </tr>
            ))}
            {visibles.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">No hay productos que coincidan.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
