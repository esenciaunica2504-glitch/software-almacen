'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { obtenerUsuarioContexto, puede } from '@/lib/supabase/permissions';

export type ClienteResult = { ok: boolean; mensaje: string };

async function obtenerContextoCliente() {
  const contexto = await obtenerUsuarioContexto();
  if ('error' in contexto) return { error: contexto.error };
  if (!puede(contexto, ['superadmin', 'dueno', 'vendedor', 'cajero'])) {
    return { error: 'Tu rol no puede administrar clientes.' };
  }
  return contexto;
}

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? '').trim();
}

export async function crearCliente(formData: FormData): Promise<ClienteResult> {
  const contexto = await obtenerContextoCliente();
  if ('error' in contexto) return { ok: false, mensaje: contexto.error };

  const nombre = texto(formData, 'nombre');
  const telefono = texto(formData, 'telefono');
  const email = texto(formData, 'email');
  const notas = texto(formData, 'notas');

  if (nombre.length < 2) return { ok: false, mensaje: 'Ingresá el nombre del cliente.' };

  const { error } = await supabaseAdmin.from('clientes').insert({
    almacen_id: contexto.almacenId,
    nombre,
    telefono: telefono || null,
    email: email || null,
    notas: notas || null,
  });

  if (error) return { ok: false, mensaje: `No se pudo guardar el cliente: ${error.message}` };

  revalidatePath('/dashboard/clientes');
  revalidatePath('/dashboard/ventas');
  return { ok: true, mensaje: 'Cliente guardado correctamente.' };
}

export async function eliminarCliente(id: string): Promise<ClienteResult> {
  const contexto = await obtenerContextoCliente();
  if ('error' in contexto) return { ok: false, mensaje: contexto.error };

  const { error } = await supabaseAdmin
    .from('clientes')
    .delete()
    .eq('id', id)
    .eq('almacen_id', contexto.almacenId);

  if (error) return { ok: false, mensaje: `No se pudo eliminar el cliente: ${error.message}` };

  revalidatePath('/dashboard/clientes');
  return { ok: true, mensaje: 'Cliente eliminado.' };
}
