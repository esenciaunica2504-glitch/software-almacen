'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function crearClienteAlmacen(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, mensaje: 'Tu sesión expiró. Inicia sesión nuevamente.' };

  const { data: perfil, error: perfilError } = await supabaseAdmin
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (perfilError || perfil?.rol !== 'superadmin') {
    return { ok: false, mensaje: 'Solo un superadministrador puede crear almacenes y usuarios.' };
  }

  const nombreAlmacen = formData.get('nombreAlmacen') as string;
  const telefono = formData.get('telefono') as string;
  const nombreDueno = formData.get('nombreDueno') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const costoSuscripcion = parseFloat(formData.get('costoSuscripcion') as string) || 0;
  const costoMantenimiento = parseFloat(formData.get('costoMantenimiento') as string) || 0;
  const diasPrueba = parseInt(formData.get('diasPrueba') as string) || 30;

  const fechaVencimiento = new Date();
  fechaVencimiento.setDate(fechaVencimiento.getDate() + diasPrueba);

  try {
    const { data: almacen, error: errAlmacen } = await supabaseAdmin
      .from('almacenes')
      .insert({
        nombre: nombreAlmacen,
        telefono,
        costo_suscripcion: costoSuscripcion,
        costo_mantenimiento: costoMantenimiento,
        suscripcion_vence_el: fechaVencimiento.toISOString(),
        mantenimiento_vence_el: fechaVencimiento.toISOString(),
        estado: 'activo',
      })
      .select()
      .single();

    if (errAlmacen) throw new Error(`Error al crear almacén: ${errAlmacen.message}`);

    const { data: authUser, error: errAuth } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre_completo: nombreDueno },
    });

    if (errAuth) {
      await supabaseAdmin.from('almacenes').delete().eq('id', almacen.id);
      throw new Error(`Error al crear credenciales: ${errAuth.message}`);
    }

    const { error: errPerfil } = await supabaseAdmin
      .from('perfiles')
      .insert({
        id: authUser.user.id,
        almacen_id: almacen.id,
        nombre_completo: nombreDueno,
        rol: 'dueno',
        activo: true,
      });

    if (errPerfil) throw new Error(`Error al crear perfil: ${errPerfil.message}`);

    revalidatePath('/superadmin/clientes/nuevo');
    return { ok: true, mensaje: '¡Almacén y cuenta creados con éxito!' };
  } catch (error: any) {
    return { ok: false, mensaje: error.message };
  }
}