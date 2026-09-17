'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { obtenerUsuarioContexto, puede } from '@/lib/supabase/permissions';

export type InventarioResult = {
  ok: boolean;
  mensaje: string;
};

async function obtenerAlmacenDelUsuario(): Promise<{ error: string } | { almacenId: string }> {
  const contexto = await obtenerUsuarioContexto();
  if ('error' in contexto) return contexto;
  return { almacenId: contexto.almacenId };
}

function leerProducto(formData: FormData): { error: string } | { producto: { nombre: string; precio: number; stock: number } } {
  const nombre = String(formData.get('nombre') ?? '').trim();
  const precio = Number(formData.get('precio'));
  const stock = Number(formData.get('stock'));

  if (!nombre || nombre.length > 120) {
    return { error: 'El nombre es obligatorio y no puede superar 120 caracteres.' };
  }
  if (!Number.isFinite(precio) || precio < 0) {
    return { error: 'El precio debe ser un número mayor o igual a cero.' };
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return { error: 'El stock debe ser un número entero mayor o igual a cero.' };
  }

  return { producto: { nombre, precio, stock } };
}

export async function guardarProducto(formData: FormData): Promise<InventarioResult> {
  const valores = leerProducto(formData);
  if ('error' in valores) return { ok: false, mensaje: valores.error };

  const contexto = await obtenerUsuarioContexto();
  if ('error' in contexto) return { ok: false, mensaje: contexto.error };
  if (!puede(contexto, ['superadmin', 'dueno'])) return { ok: false, mensaje: 'Tu rol no puede crear productos.' };

  const { error } = await supabaseAdmin.from('productos').insert({
    almacen_id: contexto.almacenId,
    ...valores.producto,
    categoria: 'General',
  });

  if (error) return { ok: false, mensaje: `No se pudo guardar: ${error.message}` };

  revalidatePath('/dashboard/inventario');
  return { ok: true, mensaje: 'Producto guardado correctamente.' };
}

export async function actualizarProducto(formData: FormData): Promise<InventarioResult> {
  const id = String(formData.get('id') ?? '');
  if (!id) return { ok: false, mensaje: 'Producto inválido.' };

  const valores = leerProducto(formData);
  if ('error' in valores) return { ok: false, mensaje: valores.error };

  const contexto = await obtenerUsuarioContexto();
  if ('error' in contexto) return { ok: false, mensaje: contexto.error };
  if (!puede(contexto, ['superadmin', 'dueno'])) return { ok: false, mensaje: 'Tu rol no puede editar productos.' };

  const { error } = await supabaseAdmin
    .from('productos')
    .update(valores.producto)
    .eq('id', id)
    .eq('almacen_id', contexto.almacenId);

  if (error) return { ok: false, mensaje: `No se pudo actualizar: ${error.message}` };

  revalidatePath('/dashboard/inventario');
  return { ok: true, mensaje: 'Producto actualizado correctamente.' };
}

export async function eliminarProducto(id: string): Promise<InventarioResult> {
  if (!id) return { ok: false, mensaje: 'Producto inválido.' };

  const contexto = await obtenerUsuarioContexto();
  if ('error' in contexto) return { ok: false, mensaje: contexto.error };
  if (!puede(contexto, ['superadmin', 'dueno'])) return { ok: false, mensaje: 'Tu rol no puede eliminar productos.' };

  const { error } = await supabaseAdmin
    .from('productos')
    .delete()
    .eq('id', id)
    .eq('almacen_id', contexto.almacenId);

  if (error) return { ok: false, mensaje: `No se pudo eliminar: ${error.message}` };

  revalidatePath('/dashboard/inventario');
  return { ok: true, mensaje: 'Producto eliminado correctamente.' };
}
