'use client';

import { useState } from 'react';
import { validarLogin } from './actions';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const res = await validarLogin(formData);

    if (res.ok) {
      // Si la contraseña es correcta, lo mandamos a su panel
      router.push('/dashboard');
    } else {
      setError(res.mensaje);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-black">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 border border-gray-200">
        <h1 className="text-2xl font-bold text-center mb-2">Ingresar al Sistema</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Accede al panel de control de tu almacén.</p>

        {error && (
          <div className="bg-red-100 text-red-800 text-sm p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase mb-1">Email</label>
            <input required type="email" name="email" placeholder="tu@correo.com" className="w-full border rounded-lg p-2.5 text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1">Contraseña</label>
            <input required type="password" name="password" placeholder="******" className="w-full border rounded-lg p-2.5 text-sm outline-none" />
          </div>
          
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 mt-2">
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}