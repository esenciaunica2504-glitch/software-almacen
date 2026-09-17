import { supabaseAdmin } from '@/lib/supabase/admin';
import Link from 'next/link';

// Esto asegura que la página siempre muestre los datos frescos y no se quede pegada
export const revalidate = 0;

export default async function ClientesListaPage() {
  // Traemos todos los almacenes de la base de datos
  const { data: almacenes, error } = await supabaseAdmin
    .from('almacenes')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    return <div className="p-6 text-red-600">Error al cargar los clientes: {error.message}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 mt-8 text-black bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">Administra todos los almacenes de tu sistema.</p>
        </div>
        <Link 
          href="/superadmin/clientes/nuevo" 
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          + Nuevo Almacén
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Nombre del Local</th>
                <th className="p-4 font-semibold text-gray-600">Teléfono</th>
                <th className="p-4 font-semibold text-gray-600">Estado</th>
                <th className="p-4 font-semibold text-gray-600">Vencimiento Prueba/Susc.</th>
              </tr>
            </thead>
            <tbody>
              {almacenes && almacenes.map((almacen) => (
                <tr key={almacen.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold text-gray-800">{almacen.nombre}</td>
                  <td className="p-4 text-gray-600">{almacen.telefono || 'Sin teléfono'}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${almacen.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {almacen.estado}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600 font-medium">
                    {new Date(almacen.suscripcion_vence_el).toLocaleDateString('es-AR')}
                  </td>
                </tr>
              ))}
              
              {(!almacenes || almacenes.length === 0) && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-500">
                    <p className="text-lg font-medium mb-1">Todavía no hay clientes</p>
                    <p className="text-sm">Registra tu primer almacén para verlo aquí.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}