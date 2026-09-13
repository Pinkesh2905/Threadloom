'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Loader2, FileDown, RotateCcw, Check } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { downloadAuthenticatedFile } from '@/lib/download';
import { Navbar } from '@/components/Navbar';
import type { Order, Address } from '@/types/designer';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  in_production: 'In Production',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function OrdersPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [reorderingId, setReorderingId] = useState<number | null>(null);
  const [reorderedId, setReorderedId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, user, router]);

  const loadOrders = () => {
    api.get<Order[]>('/orders/').then((res) => setOrders(res.data));
  };

  useEffect(() => {
    if (user) loadOrders();
  }, [user]);

  const downloadTechPack = async (order: Order) => {
    setDownloadingId(order.id);
    setDownloadError(null);
    try {
      await downloadAuthenticatedFile(`/orders/${order.id}/tech-pack/`, `order-${order.id}-tech-pack.pdf`);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Could not download the tech pack.');
    } finally {
      setDownloadingId(null);
    }
  };

  const reorder = async (order: Order) => {
    setReorderingId(order.id);
    setReorderedId(null);
    try {
      const addressesRes = await api.get<Address[]>('/auth/addresses/');
      const defaultAddress = addressesRes.data.find((a) => a.is_default) ?? addressesRes.data[0];
      await api.post('/orders/', {
        design: order.design,
        size: order.size,
        quantity: order.quantity,
        ...(defaultAddress ? { address_id: defaultAddress.id } : {}),
      });
      setReorderedId(order.id);
      loadOrders();
    } finally {
      setReorderingId(null);
    }
  };

  if (!isInitialized || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg font-sans">
      <Navbar />
      <main className="max-w-3xl mx-auto px-sp-3 sm:px-sp-4 py-sp-5 pb-24 md:pb-sp-6">
        <h1 className="font-serif text-3xl sm:text-4xl text-ink mb-sp-4">Your Orders</h1>

        {downloadError && <p className="text-xs text-red-600 mb-sp-2">{downloadError}</p>}

        {orders === null ? (
          <div className="flex justify-center py-sp-6">
            <Loader2 className="w-6 h-6 text-secondary animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="editorial-card rounded-2xl p-sp-5 text-center space-y-sp-2">
            <Package className="w-8 h-8 text-secondary mx-auto" />
            <p className="text-sm text-secondary">No orders yet — design something first.</p>
          </div>
        ) : (
          <div className="space-y-sp-2">
            {orders.map((order) => (
              <div key={order.id} className="editorial-card rounded-2xl p-sp-3 flex items-center justify-between gap-sp-2">
                <div>
                  <p className="text-sm font-semibold text-ink">Order #{order.id}</p>
                  <p className="text-xs text-secondary mt-0.5">
                    Size {order.size} &middot; Qty {order.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-sp-3">
                  <button
                    onClick={() => reorder(order)}
                    disabled={reorderingId === order.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-hairline text-xs font-semibold text-secondary hover:text-ink hover:border-ink active:text-ink active:border-ink transition-colors disabled:opacity-50"
                    title="Place a new order with the same design, size and quantity"
                  >
                    {reorderingId === order.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : reorderedId === order.id ? (
                      <Check className="w-3.5 h-3.5 text-accent" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    {reorderedId === order.id ? 'Reordered' : 'Reorder'}
                  </button>
                  <button
                    onClick={() => downloadTechPack(order)}
                    disabled={downloadingId === order.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-hairline text-xs font-semibold text-secondary hover:text-ink hover:border-ink active:text-ink active:border-ink transition-colors disabled:opacity-50"
                    title="Download production tech pack (PDF)"
                  >
                    {downloadingId === order.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileDown className="w-3.5 h-3.5" />
                    )}
                    Tech Pack
                  </button>
                  <div className="text-right">
                    <p className="text-sm font-bold text-ink tabular-nums">${order.total_price}</p>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
