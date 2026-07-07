'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  IndianRupee,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/format';

interface Dashboard {
  stats: { revenue: number; orders: number; customers: number; products: number };
  lowStock: Array<{ _id: string; title: string; variants: { stock: number }[] }>;
  recentOrders: Array<{ _id: string; orderNumber: string; grandTotal: number; status: string; createdAt: string; user?: { name: string } }>;
  salesTrend: Array<{ _id: string; revenue: number; orders: number }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Dashboard>('/admin/dashboard')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">Failed to load dashboard: {error}</p>;
  if (!data) return <p className="text-slate-400">Loading dashboard…</p>;

  const cards = [
    { label: 'Total Revenue', value: formatPrice(data.stats.revenue), icon: IndianRupee, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Orders', value: data.stats.orders, icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
    { label: 'Customers', value: data.stats.customers, icon: Users, color: 'bg-violet-50 text-violet-600' },
    { label: 'Products', value: data.stats.products, icon: Package, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card p-5">
              <div className={`grid h-10 w-10 place-items-center rounded-lg ${c.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-2xl font-black">{c.value}</p>
              <p className="text-sm text-slate-400">{c.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <TrendingUp className="h-4 w-4 text-brand-600" /> Revenue (last 7 days)
          </h2>
          {data.salesTrend.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">No sales data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.salesTrend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f0475b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f0475b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="_id" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip formatter={(v: number) => formatPrice(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#f0475b" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Low Stock
          </h2>
          <div className="space-y-3">
            {data.lowStock.length === 0 ? (
              <p className="text-sm text-slate-400">All products are well stocked.</p>
            ) : (
              data.lowStock.map((p) => {
                const total = p.variants?.reduce((s, v) => s + v.stock, 0) ?? 0;
                return (
                  <Link key={p._id} href={`/products/${p._id}`} className="flex items-center justify-between text-sm hover:text-brand-600">
                    <span className="line-clamp-1">{p.title}</span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
                      {total} left
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Recent Orders</h2>
          <Link href="/orders" className="text-sm font-semibold text-brand-600">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="th">Order</th>
                <th className="th">Customer</th>
                <th className="th">Date</th>
                <th className="th">Status</th>
                <th className="th text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((o) => (
                <tr key={o._id} className="border-b border-slate-50">
                  <td className="td font-medium">#{o.orderNumber}</td>
                  <td className="td">{o.user?.name || '—'}</td>
                  <td className="td text-slate-500">{formatDate(o.createdAt)}</td>
                  <td className="td">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize">
                      {o.status}
                    </span>
                  </td>
                  <td className="td text-right font-semibold">{formatPrice(o.grandTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
