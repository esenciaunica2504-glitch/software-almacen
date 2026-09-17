'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { obtenerUsuarioContexto, puede } from '@/lib/supabase/permissions';

export type ResumenCaja = {
  totalVentasHoy: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalDebito: number;
  totalTransferencia: number;
  totalLectorUniversal: number;
  ventas: Array<{ id: string; total: number; metodo_pago: string; created_at: string }>;
  cierre: { monto_efectivo_real: number; monto_efectivo_esperado: number; diferencia: number; observaciones: string | null } | null;
};

async function obtenerAlmacenDelUsuario(): Promise<{ error: string } | { almacenId: string }> {
  const contexto = await obtenerUsuarioContexto();
  if ('error' in contexto) return contexto;
  if (!puede(contexto, ['superadmin', 'dueno', 'cajero', 'auditor'])) {
    return { error: 'Tu rol no puede acceder a la caja.' };
  }
  return { almacenId: contexto.almacenId };
}

function normalizarMetodoPago(valor: string | null | undefined) {
  const text = String(valor ?? '').trim().toLowerCase();
  if (['efectivo', 'cash', 'dinero'].includes(text)) return 'Efectivo';
  if (['tarjeta', 'card'].includes(text)) return 'Tarjeta';
  if (['debito', 'débito', 'debit'].includes(text)) return 'Débito';
  if (['transferencia', 'transfer', 'bank'].includes(text)) return 'Transferencia';
  if (['lector universal', 'lector_universal', 'universal', 'lector'].includes(text)) return 'Lector universal';
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Efectivo';
}

export async function obtenerResumenCaja(): Promise<{ ok: boolean; error?: string; resumen?: ResumenCaja }> {
  const almacen = await obtenerAlmacenDelUsuario();
  if ('error' in almacen) return { ok: false, error: almacen.error };

  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);

  const { data, error } = await supabaseAdmin
    .from('ventas')
    .select('id, total, metodo_pago, created_at')
    .eq('almacen_id', almacen.almacenId)
    .gte('created_at', inicio.toISOString())
    .lt('created_at', fin.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes('does not exist') || message.includes('could not find the table')) {
      return {
        ok: false,
        error: 'La tabla de ventas aún no existe. Ejecutá el SQL de migración antes de usar el cierre de caja.',
      };
    }
    return { ok: false, error: error.message };
  }

  const ventas = (data ?? []).map((v) => ({
    id: String(v.id),
    total: Number(v.total ?? 0),
    metodo_pago: normalizarMetodoPago(v.metodo_pago),
    created_at: String(v.created_at),
  }));

  const totalVentasHoy = ventas.reduce((sum, item) => sum + Number(item.total ?? 0), 0);
  const totalEfectivo = ventas.filter((v) => v.metodo_pago === 'Efectivo').reduce((sum, item) => sum + Number(item.total ?? 0), 0);
  const totalTarjeta = ventas.filter((v) => v.metodo_pago === 'Tarjeta').reduce((sum, item) => sum + Number(item.total ?? 0), 0);
  const totalDebito = ventas.filter((v) => v.metodo_pago === 'Débito').reduce((sum, item) => sum + Number(item.total ?? 0), 0);
  const totalTransferencia = ventas.filter((v) => v.metodo_pago === 'Transferencia').reduce((sum, item) => sum + Number(item.total ?? 0), 0);
  const totalLectorUniversal = ventas.filter((v) => v.metodo_pago === 'Lector universal').reduce((sum, item) => sum + Number(item.total ?? 0), 0);

  const { data: cierreData, error: cierreError } = await supabaseAdmin
    .from('cierre_caja')
    .select('monto_efectivo_real, monto_efectivo_esperado, diferencia, observaciones')
    .eq('almacen_id', almacen.almacenId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let cierre = null;
  if (!cierreError && cierreData) {
    cierre = {
      monto_efectivo_real: Number(cierreData.monto_efectivo_real ?? 0),
      monto_efectivo_esperado: Number(cierreData.monto_efectivo_esperado ?? 0),
      diferencia: Number(cierreData.diferencia ?? 0),
      observaciones: cierreData.observaciones ?? null,
    };
  }

  if (cierreError && !cierreError.message.toLowerCase().includes('does not exist') && !cierreError.message.toLowerCase().includes('could not find the table')) {
    return { ok: false, error: cierreError.message };
  }

  return {
    ok: true,
    resumen: {
      totalVentasHoy,
      totalEfectivo,
      totalTarjeta,
      totalDebito,
      totalTransferencia,
      totalLectorUniversal,
      ventas,
      cierre,
    },
  };
}

export async function cerrarCaja(formData: FormData): Promise<{ ok: boolean; mensaje: string }> {
  const contexto = await obtenerUsuarioContexto();
  if ('error' in contexto) return { ok: false, mensaje: contexto.error };
  if (!puede(contexto, ['superadmin', 'dueno', 'cajero'])) {
    return { ok: false, mensaje: 'Tu rol no puede cerrar la caja.' };
  }

  const almacen = await obtenerAlmacenDelUsuario();
  if ('error' in almacen) return { ok: false, mensaje: almacen.error };

  const montoReal = Number(formData.get('monto_efectivo_real') ?? 0);
  const observaciones = String(formData.get('observaciones') ?? '').trim();
  const resumen = await obtenerResumenCaja();

  if (!resumen.ok || !resumen.resumen) {
    return { ok: false, mensaje: resumen.error ?? 'No se pudo leer el resumen de caja.' };
  }

  const montoEsperado = resumen.resumen.totalEfectivo;
  const diferencia = montoReal - montoEsperado;

  const { error } = await supabaseAdmin.from('cierre_caja').insert({
    almacen_id: almacen.almacenId,
    fecha: new Date().toISOString().slice(0, 10),
    monto_efectivo_esperado: montoEsperado,
    monto_efectivo_real: montoReal,
    diferencia,
    observaciones: observaciones || null,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('does not exist') || msg.includes('could not find the table')) {
      return {
        ok: false,
        mensaje: 'La tabla de cierre de caja aún no existe. Ejecutá el SQL de migración para habilitarla.',
      };
    }
    return { ok: false, mensaje: `No se pudo registrar el cierre: ${error.message}` };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/caja');

  const diferenciaTexto = diferencia >= 0 ? `Hay un sobrante de $${Number(diferencia).toFixed(2)}.` : `Hay un faltante de $${Math.abs(Number(diferencia)).toFixed(2)}.`;
  return { ok: true, mensaje: `Cierre de caja registrado. ${diferenciaTexto}` };
}
