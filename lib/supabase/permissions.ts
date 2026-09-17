import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type Rol = 'superadmin' | 'dueno' | 'vendedor' | 'cajero' | 'auditor';

export type UsuarioContexto = {
  userId: string;
  almacenId: string;
  rol: Rol;
  nombre: string;
};

const rolesValidos: Rol[] = ['superadmin', 'dueno', 'vendedor', 'cajero', 'auditor'];

export async function obtenerUsuarioContexto(): Promise<{ error: string } | UsuarioContexto> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Tu sesión expiró. Inicia sesión nuevamente.' };

  const { data: perfil, error } = await supabaseAdmin
    .from('perfiles')
    .select('almacen_id, rol, nombre_completo')
    .eq('id', user.id)
    .single();

  if (error || !perfil?.almacen_id) {
    return { error: 'Tu usuario no tiene un almacén asociado.' };
  }

  const rol = String(perfil.rol ?? '').toLowerCase() as Rol;
  if (!rolesValidos.includes(rol)) {
    return { error: 'Tu usuario tiene un rol inválido. Contactá al administrador.' };
  }

  return {
    userId: user.id,
    almacenId: String(perfil.almacen_id),
    rol,
    nombre: String(perfil.nombre_completo ?? user.email ?? 'Usuario'),
  };
}

export function puede(contexto: UsuarioContexto, roles: Rol[]) {
  return roles.includes(contexto.rol);
}
