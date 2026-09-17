import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, precio, stock, categoria } = body;

    // Buscamos el almacén activo
    const { data: almacenes, error: errorAlmacen } = await supabaseAdmin.from('almacenes').select('id').limit(1);

    if (errorAlmacen || !almacenes || almacenes.length === 0) {
      return NextResponse.json({ ok: false, mensaje: 'No hay almacenes registrados.' }, { status: 400 });
    }

    const almacen_id = almacenes[0].id;

    // Insertamos en la tabla productos
    const { error } = await supabaseAdmin.from('productos').insert([
      {
        almacen_id,
        nombre,
        precio: Number(precio),
        stock: Number(stock),
        categoria,
      }
    ]);

    if (error) {
      return NextResponse.json({ ok: false, mensaje: 'Error de BD: ' + error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, mensaje: 'Error del servidor: ' + err.message }, { status: 500 });
  }
}