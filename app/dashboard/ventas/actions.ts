'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { obtenerUsuarioContexto, puede } from '@/lib/supabase/permissions';

export type VentaResult = { ok: boolean; mensaje: string };

type CartItem = { id: string; cantidad: number; precio: number };

type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'debito' | 'lector_universal';

async function obtenerAlmacenDelUsuario(): Promise<{ error: string } | { almacenId: string }> {
  const contexto = await obtenerUsuarioContexto();
  if ('error' in contexto) return contexto;
  if (!puede(contexto, ['superadmin', 'dueno', 'vendedor', 'cajero'])) {
    return { error: 'Tu rol no puede registrar ventas.' };
  }
  return { almacenId: contexto.almacenId };
}

export async function crearVenta(formData: FormData): Promise<VentaResult> {
  const cartJson = String(formData.get('cart') ?? '[]');
  const paymentMethod = String(formData.get('paymentMethod') ?? 'efectivo') as MetodoPago;
  const montoRecibido = Number(formData.get('montoRecibido') ?? 0);
  const referencia = String(formData.get('referencia') ?? '').trim();
  const lector = String(formData.get('lector') ?? '').trim();

  let cart: CartItem[] = [];
  try {
    cart = JSON.parse(cartJson);
  } catch {
    return { ok: false, mensaje: 'Carrito inválido.' };
  }

  if (!Array.isArray(cart) || cart.length === 0) return { ok: false, mensaje: 'El carrito está vacío.' };

  const contexto = await obtenerUsuarioContexto();
  if ('error' in contexto) return { ok: false, mensaje: contexto.error };
  if (!puede(contexto, ['superadmin', 'dueno', 'vendedor', 'cajero'])) {
    return { ok: false, mensaje: 'Tu rol no puede registrar ventas.' };
  }
  const almacen = { almacenId: contexto.almacenId };

  const total = cart.reduce((s, it) => s + it.precio * it.cantidad, 0);

  if (paymentMethod === 'efectivo' && (!Number.isFinite(montoRecibido) || montoRecibido < total)) {
    return { ok: false, mensaje: 'Para efectivo, el monto recibido debe ser mayor o igual al total.' };
  }

  if (paymentMethod === 'transferencia' && !referencia) {
    return { ok: false, mensaje: 'Para transferencia, dejá la referencia o comprobante.' };
  }

  if (paymentMethod === 'lector_universal' && !lector) {
    return { ok: false, mensaje: 'Indicá el lector universal o el tipo de terminal asociado.' };
  }

  // Validate stock
  const ids = cart.map((i) => i.id);
  const { data: productos } = await supabaseAdmin.from('productos').select('id,precio,stock').in('id', ids).eq('almacen_id', almacen.almacenId);

  const falta = cart.find((it) => {
    const p = (productos ?? []).find((x: any) => x.id === it.id);
    return !p || p.stock < it.cantidad;
  });

  if (falta) return { ok: false, mensaje: `Stock insuficiente para el producto ${falta.id}.` };

  // Decrement stock
  for (const item of cart) {
    const p = (productos ?? []).find((x: any) => x.id === item.id);
    if (!p) {
      return { ok: false, mensaje: `Producto ${item.id} no encontrado al actualizar stock.` };
    }

    const nuevo = Number(p.stock) - item.cantidad;
    const { error } = await supabaseAdmin.from('productos').update({ stock: nuevo }).eq('id', item.id).eq('almacen_id', almacen.almacenId);
    if (error) return { ok: false, mensaje: `Error actualizando stock: ${error.message}` };
  }

  // Try to record sale (optional)
  const vuelto = paymentMethod === 'efectivo' ? Math.max(0, montoRecibido - total) : 0;
  const metodoLabel = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
    debito: 'Débito',
    lector_universal: 'Lector universal',
  }[paymentMethod];

  try {
    const payload: Record<string, any> = {
      almacen_id: almacen.almacenId,
      created_by: contexto.userId,
      total,
      metodo_pago: metodoLabel,
    };

    if (paymentMethod === 'efectivo') payload.monto_recibido = montoRecibido;
    if (paymentMethod === 'efectivo') payload.vuelto = vuelto;
    if (paymentMethod === 'transferencia' && referencia) payload.referencia = referencia;
    if (paymentMethod === 'lector_universal' && lector) payload.lector = lector;

    const { data: venta, error: ventaError } = await supabaseAdmin
      .from('ventas')
      .insert(payload)
      .select('id')
      .single();

    if (ventaError && !ventaError.message.toLowerCase().includes('does not exist') && !ventaError.message.toLowerCase().includes('column')) {
      throw new Error(ventaError.message);
    }

    if (venta && venta.id) {
      const detalles = cart.map((it) => ({ venta_id: venta.id, producto_id: it.id, cantidad: it.cantidad, precio: it.precio }));
      const { error: detalleError } = await supabaseAdmin.from('detalle_ventas').insert(detalles);
      if (detalleError) {
        throw new Error(detalleError.message);
      }
    }
  } catch (err: any) {
    const message = err?.message ?? String(err);
    const warning = paymentMethod === 'efectivo' && montoRecibido >= total ? ` Venta registrada con pago en ${metodoLabel} y vuelto $${vuelto}.` : ` Venta registrada con pago en ${metodoLabel}.`;
    return { ok: true, mensaje: `Venta registrada correctamente.${warning} No se pudo guardar el historial de pago/detalle: ${message}` };
  }

  revalidatePath('/dashboard/inventario');
  revalidatePath('/dashboard/ventas');

  if (paymentMethod === 'efectivo') {
    return { ok: true, mensaje: `Venta registrada correctamente. Cobro en efectivo: recibiste $${montoRecibido} y tu vuelto es $${vuelto}.` };
  }

  if (paymentMethod === 'transferencia') {
    return { ok: true, mensaje: `Venta registrada correctamente. Pago por transferencia con referencia: ${referencia}.` };
  }

  if (paymentMethod === 'lector_universal') {
    return { ok: true, mensaje: `Venta registrada correctamente. Cobro con lector universal (${lector}).` };
  }

  return { ok: true, mensaje: `Venta registrada correctamente. Pago con ${metodoLabel}.` };
}
