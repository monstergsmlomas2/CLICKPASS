'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Beer, Plus, Trash2, EyeOff, Eye, ImagePlus, X } from 'lucide-react';
import { api } from '../../../../../../lib/api';
import { useAuth } from '../../../../../../lib/store';
import type { Product } from '../../../../../../lib/types';
import { formatMoney } from '../../../../../../lib/format';
import { uploadEventImage } from '../../../../../../lib/cloudinary';
import { ConfirmDialog } from '../../../../../../components/confirm-dialog';

function emptyForm() {
  return { name: '', description: '', price: '', stock: '', imageUrl: '' };
}

export default function EventProductsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { accessToken } = useAuth();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Product | null>(null);

  const load = useCallback(async () => {
    const data = await api<Product[]>(`/events/${id}/products/manage`, { auth: true });
    setProducts(data);
  }, [id]);

  useEffect(() => {
    if (!accessToken) {
      router.push('/auth/login');
      return;
    }
    load().catch(() => setProducts([]));
  }, [accessToken, load, router]);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadEventImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.price) {
      setError('Completá nombre y precio');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api(`/events/${id}/products`, {
        method: 'POST',
        auth: true,
        body: {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          imageUrl: form.imageUrl || undefined,
          price: Number(form.price),
          stock: form.stock ? Number(form.stock) : undefined,
        },
      });
      setForm(emptyForm());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el combo');
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(p: Product) {
    setLoading(true);
    try {
      await api(`/events/${id}/products/${p.id}`, {
        method: 'PATCH',
        auth: true,
        body: { active: !p.active },
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar');
    } finally {
      setLoading(false);
    }
  }

  async function remove(p: Product) {
    setConfirmRemove(null);
    setLoading(true);
    try {
      await api(`/events/${id}/products/${p.id}`, { method: 'DELETE', auth: true });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/dashboard/organizer" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-emerald transition-colors">
        <ArrowLeft size={16} /> Volver al panel
      </Link>

      <span className="mt-4 flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-emerald">
        <Beer size={14} /> Consumiciones
      </span>
      <h1 className="mt-1 font-display text-4xl font-bold text-fg">Combos de bebida/comida</h1>
      <p className="mt-2 text-sm text-muted">
        Se ofrecen junto a la entrada en el checkout, en todas las funciones de este evento.
      </p>

      <form onSubmit={createProduct} className="glass mt-8 space-y-3 p-5">
        <div className="flex items-center gap-3">
          {form.imageUrl ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line">
              <Image src={form.imageUrl} alt="" fill className="object-cover" />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-night/80 text-fg"
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <label className="flex h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-muted hover:border-emerald/40 hover:text-emerald transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={onPickImage} disabled={uploading} />
              <ImagePlus size={18} />
              <span className="text-[10px]">{uploading ? '...' : 'Foto'}</span>
            </label>
          )}
          <input
            className="field flex-1"
            placeholder="Nombre (ej: Cerveza en lata 6x4)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <input
          className="field"
          placeholder="Descripción (opcional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            className="field"
            type="number"
            min="0"
            step="0.01"
            placeholder="Precio ARS"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <input
            className="field"
            type="number"
            min="0"
            placeholder="Stock (vacío = ilimitado)"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
          />
        </div>
        {error && (
          <p className="rounded-xl border border-violet/30 bg-violet/10 px-3 py-2 text-sm font-medium text-cyan">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn-neon w-full text-sm disabled:opacity-50">
          <Plus size={14} /> Agregar combo
        </button>
      </form>

      <h2 className="mt-10 font-mono text-xs uppercase tracking-widest text-muted">Tus combos</h2>
      {products === null ? (
        <p className="mt-4 font-mono text-sm text-muted">Cargando…</p>
      ) : products.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Todavía no agregaste ningún combo.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {products.map((p) => (
            <div key={p.id} className="glass flex items-center justify-between gap-3 px-5 py-4">
              <div className={`flex items-center gap-3 ${p.active ? '' : 'opacity-50'}`}>
                {p.imageUrl ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-line">
                    <Image src={p.imageUrl} alt="" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-line text-muted">
                    <Beer size={18} />
                  </div>
                )}
                <div>
                  <p className="font-medium text-fg">{p.name}</p>
                  <p className="font-mono text-xs text-muted">
                    {formatMoney(p.price)} · {p.stock != null ? `${p.stock - p.sold}/${p.stock} disponibles` : 'stock ilimitado'}
                    {!p.active && ' · desactivado'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleActive(p)}
                  disabled={loading}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted hover:text-emerald hover:border-emerald/30 transition-colors disabled:opacity-50"
                  title={p.active ? 'Desactivar' : 'Activar'}
                >
                  {p.active ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button
                  onClick={() => setConfirmRemove(p)}
                  disabled={loading}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted hover:text-cyan hover:border-cyan/30 transition-colors disabled:opacity-50"
                  title="Borrar"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmRemove !== null}
        title={`¿Borrar "${confirmRemove?.name ?? ''}"?`}
        message="Si este combo ya tuvo ventas, se desactiva en vez de borrarse, para no afectar pedidos ya confirmados."
        confirmLabel="Sí, borrar"
        onConfirm={() => confirmRemove && remove(confirmRemove)}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
