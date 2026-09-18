'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearCliente, eliminarCliente, type ClienteResult } from './actions';

type Cliente = { id: string; nombre: string; telefono: string | null; email: string | null; notas: string | null };

export default function ClientesClient({ clientes }: { clientes: Cliente[] }) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState<ClienteResult | null>(null);
  const [pendiente, startTransition] = useTransition();
  const visibles = useMemo(
    () => clientes.filter((cliente) => `${cliente.nombre} ${cliente.telefono ?? ''} ${cliente.email ?? ''}`.toLowerCase().includes(busqueda.toLowerCase())),
    [clientes, busqueda],
  );

  function guardar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formulario = event.currentTarget;
    startTransition(async () => {
      const resultado = await crearCliente(new FormData(formulario));
      setMensaje(resultado);
      if (resultado.ok) {
        formulario.reset();
        router.refresh();
      }
    });
  }

  function borrar(id: string) {
    if (!window.confirm('¿Eliminar este cliente?')) return;
    startTransition(async () => {
      const resultado = await eliminarCliente(id);
      setMensaje(resultado);
      if (resultado.ok) router.refresh();
    });
  }

  return (
    <>
      {mensaje && <div className={`rounded-xl border p-4 text-sm ${mensaje.ok ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{mensaje.mensaje}</div>}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-slate-700">Nuevo cliente</h2>
        <form onSubmit={guardar} className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
          <label className="text-xs font-semibold uppercase text-slate-500">Nombre
            <input required name="nombre" className="mt-1 w-full rounded-lg border p-2 text-sm" />
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500">Teléfono
            <input name="telefono" className="mt-1 w-full rounded-lg border p-2 text-sm" />
          </label>
          <label className="text-xs font-semibold uppercase text-slate-500">Email
            <input name="email" type="email" className="mt-1 w-full rounded-lg border p-2 text-sm" />
          </label>
          <button disabled={pendiente} type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {pendiente ? 'Guardando...' : 'Guardar cliente'}
          </button>
          <label className="text-xs font-semibold uppercase text-slate-500 md:col-span-4">Notas
            <textarea name="notas" rows={2} className="mt-1 w-full rounded-lg border p-2 text-sm" />
          </label>
        </form>
      </div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-bold text-slate-700">Clientes registrados ({visibles.length})</h2>
        <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar cliente..." className="rounded-lg border p-2 text-sm" />
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-slate-500">
            <tr><th className="p-4">Cliente</th><th className="p-4">Contacto</th><th className="p-4">Notas</th><th className="p-4">Acciones</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {visibles.map((cliente) => (
              <tr key={cliente.id}>
                <td className="p-4 font-medium">{cliente.nombre}</td>
                <td className="p-4">{cliente.telefono || 'Sin teléfono'}{cliente.email && <div className="text-slate-500">{cliente.email}</div>}</td>
                <td className="p-4 text-slate-500">{cliente.notas || '-'}</td>
                <td className="p-4"><button disabled={pendiente} onClick={() => borrar(cliente.id)} className="text-red-600 disabled:opacity-50">Eliminar</button></td>
              </tr>
            ))}
            {visibles.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">No hay clientes registrados.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
