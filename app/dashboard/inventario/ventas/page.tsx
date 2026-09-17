import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import InventoryClient from './inventory-client';

type Producto = {
  id: string | number;
  nombre: string;
  precio: number;
  stock: number;
};

export default async function InventarioPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let productos: Producto[] = [];
  let error: string | null = null;

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

      const result = await supabaseAdmin
        .from('productos')
        .select('id, nombre, precio, stock')
        .eq('almacen_id', perfil.almacen_id)
        .order('creado_el', { ascending: false });
      productos = (result.data ?? []) as Producto[];
      error = error ?? result.error?.message ?? null;
    } else {
      error = 'Tu usuario no tiene un almacén asociado.';
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 text-black">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Inventario y Stock</h1>
        <p className="text-sm text-slate-500">Registra y administra los productos de tu almacén.</p>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Error al cargar inventario: {error}</div>}
      <InventoryClient productos={productos} />
    </div>
  );
}
