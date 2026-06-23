'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Ban, Plus, Beer, CalendarX2 } from 'lucide-react';
import { api } from '../../../../../../lib/api';
import { useAuth } from '../../../../../../lib/store';
import type { EventItem } from '../../../../../../lib/types';
import { ConfirmDialog } from '../../../../../../components/confirm-dialog';

const CATEGORIES = ['musica', 'teatro', 'deporte', 'festival', 'fiesta'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toLocalParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

interface DateForm {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  capacity: string;
  price: string;
}

function emptyDateForm(): DateForm {
  return { startDate: '', startTime: '', endDate: '', endTime: '', capacity: '', price: '' };
}

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: CATEGORIES[0],
    venueName: '',
    venueAddress: '',
    city: '',
    country: '',
  });
  const [dateForms, setDateForms] = useState<Record<string, DateForm>>({});
  const [newDate, setNewDate] = useState(emptyDateForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmCancelDateId, setConfirmCancelDateId] = useState<string | null>(null);
  const [confirmCancelEvent, setConfirmCancelEvent] = useState(false);

  const load = useCallback(async () => {
    const data = await api<EventItem>(`/events/${id}`, { auth: true });
    setEvent(data);
    setForm({
      title: data.title,
      description: data.description ?? '',
      category: data.category,
      venueName: data.venueName ?? '',
      venueAddress: data.venueAddress ?? '',
      city: data.city ?? '',
      country: data.country ?? '',
    });
    const forms: Record<string, DateForm> = {};
    for (const d of data.dates) {
      const start = toLocalParts(d.startDate);
      const end = toLocalParts(d.endDate);
      forms[d.id] = {
        startDate: start.date,
        startTime: start.time,
        endDate: end.date,
        endTime: end.time,
        capacity: String(d.capacity),
        price: d.price,
      };
    }
    setDateForms(forms);
  }, [id]);

  useEffect(() => {
    if (!accessToken) {
      router.push('/auth/login');
      return;
    }
    load().catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el evento'));
  }, [accessToken, load, router]);

  async function saveHeader(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/events/${id}`, {
        method: 'PATCH',
        auth: true,
        body: form,
      });
      setNotice('Datos del evento guardados');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setLoading(false);
    }
  }

  async function saveDate(dateId: string) {
    const d = dateForms[dateId];
    if (!d) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/events/${id}/dates/${dateId}`, {
        method: 'PATCH',
        auth: true,
        body: {
          startDate: new Date(`${d.startDate}T${d.startTime}`).toISOString(),
          endDate: new Date(`${d.endDate}T${d.endTime}`).toISOString(),
          capacity: Number(d.capacity),
          price: Number(d.price),
        },
      });
      setNotice('Función actualizada');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la función');
    } finally {
      setLoading(false);
    }
  }

  async function cancelDate(dateId: string) {
    setConfirmCancelDateId(null);
    setLoading(true);
    setError(null);
    try {
      await api(`/events/${id}/dates/${dateId}/cancel`, { method: 'POST', auth: true });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar la función');
    } finally {
      setLoading(false);
    }
  }

  async function addDate(e: React.FormEvent) {
    e.preventDefault();
    if (!newDate.startDate || !newDate.startTime || !newDate.endDate || !newDate.endTime || !newDate.capacity || !newDate.price) {
      setError('Completá todos los campos de la nueva función');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api(`/events/${id}/dates`, {
        method: 'POST',
        auth: true,
        body: {
          startDate: new Date(`${newDate.startDate}T${newDate.startTime}`).toISOString(),
          endDate: new Date(`${newDate.endDate}T${newDate.endTime}`).toISOString(),
          capacity: Number(newDate.capacity),
          price: Number(newDate.price),
        },
      });
      setNewDate(emptyDateForm());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar la función');
    } finally {
      setLoading(false);
    }
  }

  async function cancelEvent() {
    setConfirmCancelEvent(false);
    setLoading(true);
    setError(null);
    try {
      await api(`/events/${id}/cancel`, { method: 'POST', auth: true });
      router.push('/dashboard/organizer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar el evento');
    } finally {
      setLoading(false);
    }
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <p className="font-mono text-sm text-muted">{error ?? 'Cargando…'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/dashboard/organizer" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-emerald transition-colors">
        <ArrowLeft size={16} /> Volver al panel
      </Link>

      <span className="mt-4 block font-mono text-xs uppercase tracking-widest text-emerald">Editar evento</span>
      <h1 className="mt-1 font-display text-4xl font-bold text-fg">{event.title}</h1>

      <div className="mt-4 flex gap-2">
        <Link href={`/dashboard/organizer/events/${id}/products`} className="btn-outline flex items-center gap-1.5 text-sm !px-4 !py-2">
          <Beer size={14} /> Combos
        </Link>
        {event.status !== 'CANCELLED' && (
          <button onClick={() => setConfirmCancelEvent(true)} disabled={loading} className="btn-outline flex items-center gap-1.5 text-sm !px-4 !py-2 disabled:opacity-50">
            <Ban size={14} /> Cancelar todo el evento
          </button>
        )}
      </div>

      {notice && <p className="mt-4 rounded-xl border border-emerald/30 bg-emerald/10 px-4 py-2 text-sm text-emerald">{notice}</p>}
      {error && <p className="mt-4 rounded-xl border border-violet/30 bg-violet/10 px-4 py-2 text-sm font-medium text-cyan">{error}</p>}

      <form onSubmit={saveHeader} className="glass mt-8 space-y-3 p-5">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted">Datos del evento</h2>
        <input
          className="field"
          placeholder="Título"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          className="field min-h-24"
          placeholder="Descripción"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <select
          className="field appearance-none"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input
            className="field"
            placeholder="Sede"
            value={form.venueName}
            onChange={(e) => setForm({ ...form, venueName: e.target.value })}
          />
          <input
            className="field"
            placeholder="Ciudad"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
        <input
          className="field"
          placeholder="Dirección exacta"
          value={form.venueAddress}
          onChange={(e) => setForm({ ...form, venueAddress: e.target.value })}
        />
        <button type="submit" disabled={loading} className="btn-neon w-full text-sm disabled:opacity-50">
          <Save size={14} /> Guardar cambios
        </button>
      </form>

      <h2 className="mt-10 font-mono text-xs uppercase tracking-widest text-muted">Funciones</h2>
      <div className="mt-4 space-y-3">
        {event.dates.map((d) => {
          const df = dateForms[d.id];
          if (!df) return null;
          const cancelled = d.status === 'CANCELLED';
          return (
            <div key={d.id} className={`glass space-y-3 p-4 ${cancelled ? 'opacity-50' : ''}`}>
              {cancelled && <p className="text-xs font-medium text-cyan">Cancelada</p>}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-muted">Fecha inicio</span>
                  <input
                    type="date"
                    disabled={cancelled}
                    className="field mt-1"
                    value={df.startDate}
                    onChange={(e) => setDateForms((s) => ({ ...s, [d.id]: { ...df, startDate: e.target.value } }))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">Hora inicio</span>
                  <input
                    type="time"
                    disabled={cancelled}
                    className="field mt-1"
                    value={df.startTime}
                    onChange={(e) => setDateForms((s) => ({ ...s, [d.id]: { ...df, startTime: e.target.value } }))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">Fecha fin</span>
                  <input
                    type="date"
                    disabled={cancelled}
                    className="field mt-1"
                    value={df.endDate}
                    onChange={(e) => setDateForms((s) => ({ ...s, [d.id]: { ...df, endDate: e.target.value } }))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">Hora fin</span>
                  <input
                    type="time"
                    disabled={cancelled}
                    className="field mt-1"
                    value={df.endTime}
                    onChange={(e) => setDateForms((s) => ({ ...s, [d.id]: { ...df, endTime: e.target.value } }))}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-muted">Capacidad ({d.ticketsSold} vendidas)</span>
                  <input
                    type="number"
                    min={d.ticketsSold}
                    disabled={cancelled}
                    className="field mt-1"
                    value={df.capacity}
                    onChange={(e) => setDateForms((s) => ({ ...s, [d.id]: { ...df, capacity: e.target.value } }))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">Precio (ARS, 0 = gratis)</span>
                  <input
                    type="number"
                    min={0}
                    disabled={cancelled}
                    className="field mt-1"
                    value={df.price}
                    onChange={(e) => setDateForms((s) => ({ ...s, [d.id]: { ...df, price: e.target.value } }))}
                  />
                </label>
              </div>
              {!cancelled && (
                <div className="flex gap-2">
                  <button
                    onClick={() => saveDate(d.id)}
                    disabled={loading}
                    className="btn-outline flex-1 text-sm !py-2 disabled:opacity-50"
                  >
                    <Save size={14} /> Guardar función
                  </button>
                  <button
                    onClick={() => setConfirmCancelDateId(d.id)}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-xl border border-line px-4 text-sm text-muted hover:border-cyan/40 hover:text-cyan transition-colors disabled:opacity-50"
                  >
                    <CalendarX2 size={14} /> Cancelar función
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={addDate} className="glass mt-6 space-y-3 p-4">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted">Agregar nueva función</h3>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            className="field"
            value={newDate.startDate}
            onChange={(e) => setNewDate({ ...newDate, startDate: e.target.value })}
          />
          <input
            type="time"
            className="field"
            value={newDate.startTime}
            onChange={(e) => setNewDate({ ...newDate, startTime: e.target.value })}
          />
          <input
            type="date"
            className="field"
            value={newDate.endDate}
            onChange={(e) => setNewDate({ ...newDate, endDate: e.target.value })}
          />
          <input
            type="time"
            className="field"
            value={newDate.endTime}
            onChange={(e) => setNewDate({ ...newDate, endTime: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            min={1}
            placeholder="Capacidad"
            className="field"
            value={newDate.capacity}
            onChange={(e) => setNewDate({ ...newDate, capacity: e.target.value })}
          />
          <input
            type="number"
            min={0}
            placeholder="Precio (0 = gratis)"
            className="field"
            value={newDate.price}
            onChange={(e) => setNewDate({ ...newDate, price: e.target.value })}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-neon w-full text-sm disabled:opacity-50">
          <Plus size={14} /> Agregar función
        </button>
      </form>

      <ConfirmDialog
        open={confirmCancelDateId !== null}
        title="¿Cancelar esta función?"
        message="Se reembolsa el 100% a quienes ya compraron esta función, sin afectar al resto del evento. No se borra: queda marcada como cancelada."
        confirmLabel="Sí, cancelar función"
        onConfirm={() => confirmCancelDateId && cancelDate(confirmCancelDateId)}
        onCancel={() => setConfirmCancelDateId(null)}
      />
      <ConfirmDialog
        open={confirmCancelEvent}
        title="¿Cancelar todo el evento?"
        message="Se reembolsa el 100% a los compradores (incluido el costo de servicio) y se te aplica una multa por la comisión y el costo de servicio perdidos. No se borra: queda marcado como CANCELADO."
        confirmLabel="Sí, cancelar evento"
        onConfirm={cancelEvent}
        onCancel={() => setConfirmCancelEvent(false)}
      />
    </div>
  );
}
