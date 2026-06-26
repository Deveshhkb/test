'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/format';
import PageHeader from '@/components/PageHeader';

interface Order {
  _id: string;
  orderNumber: string;
  grandTotal: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  user?: { name: string; email: string };
  items: { title: string; quantity: number }[];
}

const STATUSES = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api<{ orders: Order[] }>(`/orders/admin/all${filter ? `?status=${filter}` : ''}`)
      .then((d) => setOrders(d.orders))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (id: string, status: string) => {
    await api(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, status } : o)));
  };

  return (
    <div>
      <PageHeader title="Orders" />

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('')}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${!filter ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200'}`}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${filter === s ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="th">Order</th>
              <th className="th">Customer</th>
              <th className="th">Items</th>
              <th className="th">Date</th>
              <th className="th">Payment</th>
              <th className="th">Total</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="td text-slate-400" colSpan={7}>Loading…</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td className="td text-slate-400" colSpan={7}>No orders found.</td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o._id} className="border-b border-slate-50">
                  <td className="td font-medium">#{o.orderNumber}</td>
                  <td className="td">
                    <p className="font-medium">{o.user?.name || '—'}</p>
                    <p className="text-xs text-slate-400">{o.user?.email}</p>
                  </td>
                  <td className="td text-slate-500">{o.items.reduce((s, i) => s + i.quantity, 0)} items</td>
                  <td className="td text-slate-500">{formatDate(o.createdAt)}</td>
                  <td className="td">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${o.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {o.paymentStatus}
                    </span>
                    <p className="mt-1 text-xs uppercase text-slate-400">{o.paymentMethod}</p>
                  </td>
                  <td className="td font-semibold">{formatPrice(o.grandTotal)}</td>
                  <td className="td">
                    <select
                      value={o.status}
                      onChange={(e) => updateStatus(o._id, e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium capitalize outline-none"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
