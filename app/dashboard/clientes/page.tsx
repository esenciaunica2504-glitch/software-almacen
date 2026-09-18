import { supabaseAdmin } from '@/lib/supabase/admin';
import { obtenerUsuarioContexto, puede } from '@/lib/supabase/permissions';
import ClientesClient from './clientes-client';

export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  const contexto = await obtenerUsuarioContexto();
  if ('error' in contexto) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{contexto.error}</div>;
  }

  if (!puede(contexto, ['superadmin', 'dueno', 'vendedor', 'cajero'])) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">No tenés permisos para ver clientes.</div>;
  }

  const { data, error } = await supabaseAdmin
    .from('clientes')
    .select('id,nombre,telefono,email,notas,created_at')
    .eq('almacen_id', contexto.almacenId)
    .order('nombre');

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 text-black">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
        <p className="text-sm text-slate-500">Guardá los datos de tus clientes y asociá sus compras.</p>
      </div>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudo cargar clientes. Aplicá la migración de Supabase `20260918_customers.sql`.
        </div>
      ) : (
        <ClientesClient clientes={data ?? []} />
      )}
    </div>
  );
}
