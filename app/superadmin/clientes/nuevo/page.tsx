'use client';

import { useState } from 'react';
import { crearClienteAlmacen } from '../actions';

export default function NuevoClientePage() {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMensaje(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const res = await crearClienteAlmacen(formData);

    if (res.ok) {
      setMensaje({ tipo: 'ok', texto: res.mensaje });
      form.reset();
    } else {
      setMensaje({ tipo: 'error', texto: res.mensaje });
    }
    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-200 mt-8 text-black">
      <h1 className="text-2xl font-bold mb-2">Dar de alta nuevo Almacén</h1>
      <p className="text-sm text-gray-500 mb-6">Crea el comercio y asigna las credenciales de acceso iniciales para el dueño.</p>

      {mensaje && (
        <div className={`p-4 mb-6 rounded-lg text-sm font-medium ${mensaje.tipo === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase mb-1">Nombre del Almacén</label>
            <input required name="nombreAlmacen" placeholder="Ej: Almacén Don Pepe" className="w-full border rounded-lg p-2 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1">Teléfono</label>
            <input name="telefono" placeholder="+54 9 ..." className="w-full border rounded-lg p-2 text-sm outline-none" />
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <h2 className="text-sm font-bold mb-3">Credenciales de Acceso</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase mb-1">Dueño</label>
              <input required name="nombreDueno" placeholder="José Pérez" className="w-full border rounded-lg p-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase mb-1">Email</label>
              <input required type="email" name="email" placeholder="cliente@correo.com" className="w-full border rounded-lg p-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase mb-1">Contraseña</label>
              <input required type="password" name="password" minLength={6} placeholder="******" className="w-full border rounded-lg p-2 text-sm outline-none" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 mt-4">
          {loading ? 'Creando...' : 'Registrar Almacén'}
        </button>
      </form>
    </div>
  );
}