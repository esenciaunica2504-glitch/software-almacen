import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { obtenerUsuarioContexto } from '@/lib/supabase/permissions';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <DashboardContent>{children}</DashboardContent>;
}

async function DashboardContent({ children }: { children: React.ReactNode }) {
  async function cerrarSesion() {
    'use server';

    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');
  const contexto = await obtenerUsuarioContexto();
  if ('error' in contexto) redirect('/login?error=perfil');

  return (
    <>
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
        <span className="text-sm text-slate-600">
          {contexto.nombre} · <strong className="capitalize">{contexto.rol}</strong>
        </span>
        <form action={cerrarSesion}>
          <button type="submit" className="text-sm font-medium text-slate-600 hover:text-red-600">
            Cerrar sesión
          </button>
        </form>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </>
  );
}
