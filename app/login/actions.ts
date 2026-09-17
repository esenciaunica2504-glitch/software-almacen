'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function validarLogin(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { ok: false, mensaje: 'Ingresa tu correo y contraseña.' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { ok: false, mensaje: 'Correo o contraseña incorrectos.' };
  }

  return { ok: true, mensaje: '¡Inicio de sesión exitoso!' };
}