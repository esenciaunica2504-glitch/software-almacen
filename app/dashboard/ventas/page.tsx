import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import SalesClient from './sales-client';

type Producto = { id: string; nombre: string; precio: number; stock: number };
type Cliente = { id: string; nombre: string; telefono: string | null };

export default async function VentasPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  let productos: Producto[] = [];
  let error: string | null = null;
  let clientes: Cliente[] = [];

  if (user) {
    const { data: perfil } = await supabaseAdmin.from('perfiles').select('almacen_id').eq('id', user.id).single();
    if (perfil?.almacen_id) {
      const { error: migracionError } = await supabaseAdmin
        .from('productos')
        .update({ almacen_id: perfil.almacen_id })
        .is('almacen_id', null);

      if (migracionError) {
        error = `No se pudieron corregir productos huérfanos: ${migracionError.message}`;
      }

      const res = await supabaseAdmin
        .from('productos')
        .select('id,nombre,precio,stock')
        .eq('almacen_id', perfil.almacen_id)
        .order('creado_el', { ascending: false });
      productos = (res.data ?? []) as Producto[];
      error = error ?? res.error?.message ?? null;
      const clientesRes = await supabaseAdmin
        .from('clientes')
        .select('id,nombre,telefono')
        .eq('almacen_id', perfil.almacen_id)
        .order('nombre');
      clientes = (clientesRes.data ?? []) as Cliente[];
    } else {
      error = 'Tu usuario no tiene un almacén asociado.';
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 text-black">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Nueva Venta</h1>
        <p className="text-sm text-slate-500">Seleccioná los productos y confirmá la venta.</p>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Error: {error}</div>}
      <SalesClient productos={productos} clientes={clientes} />
    </div>
  );
}
