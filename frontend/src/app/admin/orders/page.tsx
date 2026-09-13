'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, FileDown, Ruler, ShieldAlert, History } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { downloadAuthenticatedFile } from '@/lib/download';
import { Navbar } from '@/components/Navbar';
import type { Order, FabricEstimate } from '@/types/designer';

interface StatusChange {
  from_status: string;
  to_status: string;
  changed_by: string | null;
  changed_at: string;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_production', label: 'In Production' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AdminOrdersPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [estimates, setEstimates] = useState<Record<number, FabricEstimate>>({});
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [history, setHistory] = useState<Record<number, StatusChange[]>>({});
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace('/login');
    }
  }, [isInitialized, user, router]);

  useEffect(() => {
    if (user?.is_staff) {
      api.get<Order[]>('/orders/').then((res) => setOrders(res.data));
    }
  }, [user]);

  const changeStatus = async (order: Order, status: string) => {
    setUpdatingId(order.id);
    try {
      const res = await api.post<Order>(`/orders/${order.id}/set-status/`, { status });
      setOrders((prev) => prev && prev.map((o) => (o.id === order.id ? res.data : o)));
      setHistory((prev) => {
        const next = { ...prev };
        delete next[order.id];
        return next;
      });
    } finally {
      setUpdatingId(null);
    }
  };

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

  const toggleFabricEstimate = async (order: Order) => {
    if (expandedId === order.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(order.id);
    if (!estimates[order.id]) {
      const res = await api.get<FabricEstimate>(`/orders/${order.id}/fabric-estimate/`);
      setEstimates((prev) => ({ ...prev, [order.id]: res.data }));
    }
  };

  const toggleHistory = async (order: Order) => {
    if (historyId === order.id) {
      setHistoryId(null);
      return;
    }
    setHistoryId(order.id);
    if (!history[order.id]) {
      const res = await api.get<StatusChange[]>(`/orders/${order.id}/status-history/`);
      setHistory((prev) => ({ ...prev, [order.id]: res.data }));
    }
  };

  if (!isInitialized || !user) {
    return null;
  }

  if (!user.is_staff) {
    return (
      <div className="min-h-screen bg-bg font-sans">
        <Navbar />
        <main className="max-w-md mx-auto px-sp-3 py-sp-6 text-center space-y-sp-2">
          <ShieldAlert className="w-8 h-8 text-secondary mx-auto" />
          <p className="text-sm text-secondary">This page is for staff accounts only.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg font-sans">
      <Navbar />
      <main className="max-w-5xl mx-auto px-sp-3 sm:px-sp-4 py-sp-5 pb-24 md:pb-sp-6">
        <h1 className="font-serif text-3xl sm:text-4xl text-ink mb-sp-4">Production Dashboard</h1>

        {downloadError && <p className="text-xs text-red-600 mb-sp-2">{downloadError}</p>}

        {orders === null ? (
          <div className="flex justify-center py-sp-6">
            <Loader2 className="w-6 h-6 text-secondary animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="editorial-card rounded-2xl p-sp-5 text-center">
            <p className="text-sm text-secondary">No orders yet.</p>
          </div>
        ) : (
          <div className="space-y-sp-2">
            {orders.map((order) => (
              <div key={order.id} className="editorial-card rounded-2xl p-sp-3">
                <div className="flex flex-wrap items-center justify-between gap-sp-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      Order #{order.id} &middot; {order.garment_name}
                    </p>
                    <p className="text-xs text-secondary mt-0.5">
                      {order.customer_name} &middot; Size {order.size} &middot; Qty {order.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-sp-2">
                    <span className="text-sm font-bold text-ink tabular-nums">${order.total_price}</span>
                    <select
                      value={order.status}
                      onChange={(e) => changeStatus(order, e.target.value)}
                      disabled={updatingId === order.id}
                      className="px-2.5 py-1.5 rounded-full text-xs font-semibold border border-hairline bg-white text-ink disabled:opacity-50"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => toggleFabricEstimate(order)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-hairline text-xs font-semibold text-secondary hover:text-ink active:text-ink transition-colors"
                      title="Fabric yield estimate"
                    >
                      <Ruler className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleHistory(order)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-hairline text-xs font-semibold text-secondary hover:text-ink active:text-ink transition-colors"
                      title="Status change history"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => downloadTechPack(order)}
                      disabled={downloadingId === order.id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-hairline text-xs font-semibold text-secondary hover:text-ink active:text-ink transition-colors disabled:opacity-50"
                      title="Download tech pack"
                    >
                      {downloadingId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {expandedId === order.id && (
                  <div className="mt-sp-2 pt-sp-2 border-t border-hairline text-xs text-secondary">
                    {estimates[order.id] ? (
                      <div className="flex flex-wrap gap-x-sp-4 gap-y-1">
                        <span>Fabric needed: <span className="text-ink font-semibold">{estimates[order.id].fabric_length_m} m</span></span>
                        <span>Utilization: <span className="text-ink font-semibold">{estimates[order.id].utilization_pct}%</span></span>
                        <span>Waste: <span className="text-ink font-semibold">{estimates[order.id].waste_pct}%</span></span>
                        <span>Pieces: <span className="text-ink font-semibold">{estimates[order.id].pieces_total}</span></span>
                      </div>
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                  </div>
                )}

                {historyId === order.id && (
                  <div className="mt-sp-2 pt-sp-2 border-t border-hairline text-xs text-secondary">
                    {!history[order.id] ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : history[order.id].length === 0 ? (
                      <span>No status changes yet.</span>
                    ) : (
                      <div className="space-y-1">
                        {history[order.id].map((change, i) => (
                          <div key={i}>
                            <span className="text-ink font-semibold">{change.from_status}</span>
                            {' → '}
                            <span className="text-ink font-semibold">{change.to_status}</span>
                            {' by '}
                            <span>{change.changed_by ?? 'unknown'}</span>
                            {' · '}
                            <span>{new Date(change.changed_at).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
