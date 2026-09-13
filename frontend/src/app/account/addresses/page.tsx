'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Loader2, Plus, Pencil, Trash2, Star, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Navbar } from '@/components/Navbar';
import type { Address } from '@/types/designer';

const EMPTY_FORM = {
  full_name: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'United States',
  phone: '',
  is_default: false,
};

export default function AddressesPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, user, router]);

  const loadAddresses = () => {
    api.get<Address[]>('/auth/addresses/').then((res) => setAddresses(res.data));
  };

  useEffect(() => {
    if (user) loadAddresses();
  }, [user]);

  const startNew = () => {
    setForm(EMPTY_FORM);
    setEditingId('new');
    setError(null);
  };

  const startEdit = (address: Address) => {
    setForm({
      full_name: address.full_name,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      phone: address.phone,
      is_default: address.is_default,
    });
    setEditingId(address.id);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError(null);
  };

  const save = async () => {
    if (!form.full_name.trim() || !form.line1.trim() || !form.city.trim() || !form.postal_code.trim()) {
      setError('Full name, address line 1, city and postal code are required.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      if (editingId === 'new') {
        await api.post('/auth/addresses/', form);
      } else if (editingId) {
        await api.patch(`/auth/addresses/${editingId}/`, form);
      }
      setEditingId(null);
      loadAddresses();
    } catch {
      setError('Could not save this address. Please check the fields and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (id: number) => {
    setDeletingId(id);
    try {
      await api.delete(`/auth/addresses/${id}/`);
      loadAddresses();
    } finally {
      setDeletingId(null);
    }
  };

  const makeDefault = async (address: Address) => {
    await api.patch(`/auth/addresses/${address.id}/`, { is_default: true });
    loadAddresses();
  };

  if (!isInitialized || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg font-sans">
      <Navbar />
      <main className="max-w-2xl mx-auto px-sp-3 sm:px-sp-4 py-sp-5 pb-24 md:pb-sp-6">
        <div className="flex items-center justify-between mb-sp-4">
          <h1 className="font-serif text-3xl sm:text-4xl text-ink">Saved Addresses</h1>
          {editingId === null && (
            <button
              onClick={startNew}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink hover:bg-black active:bg-black active:scale-[0.98] text-white text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Address
            </button>
          )}
        </div>

        {editingId !== null && (
          <div className="editorial-card rounded-2xl p-sp-3 space-y-sp-2 mb-sp-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-secondary">
                {editingId === 'new' ? 'New Address' : 'Edit Address'}
              </span>
              <button onClick={cancelEdit} className="p-1 text-secondary hover:text-ink active:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Full Name"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-surface-subtle border border-hairline text-xs text-ink placeholder:text-secondary/60 focus:bg-white focus:outline-none focus:border-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 sm:col-span-2"
              />
              <input
                type="text"
                placeholder="Address Line 1"
                value={form.line1}
                onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-surface-subtle border border-hairline text-xs text-ink placeholder:text-secondary/60 focus:bg-white focus:outline-none focus:border-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 sm:col-span-2"
              />
              <input
                type="text"
                placeholder="Address Line 2 (optional)"
                value={form.line2}
                onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-surface-subtle border border-hairline text-xs text-ink placeholder:text-secondary/60 focus:bg-white focus:outline-none focus:border-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 sm:col-span-2"
              />
              <input
                type="text"
                placeholder="City"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-surface-subtle border border-hairline text-xs text-ink placeholder:text-secondary/60 focus:bg-white focus:outline-none focus:border-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              />
              <input
                type="text"
                placeholder="State / Province"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-surface-subtle border border-hairline text-xs text-ink placeholder:text-secondary/60 focus:bg-white focus:outline-none focus:border-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              />
              <input
                type="text"
                placeholder="Postal Code"
                value={form.postal_code}
                onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-surface-subtle border border-hairline text-xs text-ink placeholder:text-secondary/60 focus:bg-white focus:outline-none focus:border-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              />
              <input
                type="text"
                placeholder="Country"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-surface-subtle border border-hairline text-xs text-ink placeholder:text-secondary/60 focus:bg-white focus:outline-none focus:border-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              />
              <input
                type="text"
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-surface-subtle border border-hairline text-xs text-ink placeholder:text-secondary/60 focus:bg-white focus:outline-none focus:border-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-secondary pt-1">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
              />
              Set as default shipping address
            </label>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 pt-sp-1">
              <button
                onClick={cancelEdit}
                className="flex-1 py-2.5 rounded-full border border-hairline text-secondary text-xs font-semibold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-full bg-ink hover:bg-black active:bg-black active:scale-[0.98] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Address'}
              </button>
            </div>
          </div>
        )}

        {addresses === null ? (
          <div className="flex justify-center py-sp-6">
            <Loader2 className="w-6 h-6 text-secondary animate-spin" />
          </div>
        ) : addresses.length === 0 && editingId === null ? (
          <div className="editorial-card rounded-2xl p-sp-5 text-center space-y-sp-2">
            <MapPin className="w-8 h-8 text-secondary mx-auto" />
            <p className="text-sm text-secondary">No saved addresses yet.</p>
          </div>
        ) : (
          <div className="space-y-sp-2">
            {addresses.map((address) => (
              <div key={address.id} className="editorial-card rounded-2xl p-sp-3 flex items-start justify-between gap-sp-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{address.full_name}</p>
                    {address.is_default && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
                        <Star className="w-3 h-3 fill-current" /> Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary mt-0.5">
                    {address.line1}{address.line2 ? `, ${address.line2}` : ''}, {address.city}
                    {address.state ? `, ${address.state}` : ''} {address.postal_code}, {address.country}
                  </p>
                  {address.phone && <p className="text-xs text-secondary mt-0.5">{address.phone}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!address.is_default && (
                    <button
                      onClick={() => makeDefault(address)}
                      title="Set as default"
                      className="p-1.5 text-secondary hover:text-ink active:text-ink"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(address)}
                    title="Edit"
                    className="p-1.5 text-secondary hover:text-ink active:text-ink"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => remove(address.id)}
                    disabled={deletingId === address.id}
                    title="Delete"
                    className="p-1.5 text-red-600 hover:text-red-700 active:text-red-700 disabled:opacity-50"
                  >
                    {deletingId === address.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
