'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  IndianRupee,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
  Boxes,
  Clock,
  Receipt,
  Trophy,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api } from '@/lib/api';
import { formatPrice, formatDate } from '@/lib/format';

interface Dashboard {
  stats: {
    revenue: number;
    orders: number;
    customers: number;
    products: number;
    unitsSold: number;
    pendingOrders: number;
    avgOrderValue: number;
  };
  lowStock: Array<{ _id: string; title: string; variants: { stock: number }[] }>;
  recentOrders: Array<{ _id: string; orderNumber: string; grandTotal: number; status: string; createdAt: string; user?: { name: string } }>;
  statusBreakdown: Array<{ _id: string; count: number }>;
  topProducts: Array<{ _id: string; title: string; units: number; revenue: number }>;
  categoryRevenue: Array<{ _id: string; revenue: number }>;
  salesTrend: Array<{ _id: string; revenue: number; orders: number }>;
}

// Brand-anchored categorical palette (coral → warm → cool), reused across charts.
const PALETTE = ['#f0475b', '#ff8a3d', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6'];

const STATUS_COLORS: Record<string, string> = {
  placed: '#94a3b8',
  confirmed: '#3b82f6',
  processing: '#f59e0b',
  shipped: '#8b5cf6',
  delivered: '#10b981',
  cancelled: '#ef4444',
  returned: '#ff8a3d',
};

/** Compact currency for tight KPI/axis labels: ₹1.2L, ₹3.4Cr, ₹12k. */
function compactPrice(v: number) {
  const n = Math.abs(v);
  if (n >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${Math.round(v / 1e3)}k`;
  return `₹${Math.round(v)}`;
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [range, setRange] = useState<7 | 30>(30);

  useEffect(() => {
    api<Dashboard>('/admin/dashboard')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  // Window the sales trend to the selected range (rows are day-grouped, date-sorted).
  const trend = useMemo(() => {
    if (!data) return [];
    const cutoff = new Date(Date.now() - range * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    return data.salesTrend
      .filter((d) => d._id >= cutoff)
      .map((d) => ({ ...d, label: d._id.slice(5) })); // MM-DD
  }, [data, range]);

  if (error) return <p className="text-red-600">Failed to load dashboard: {error}</p>;
  if (!data) return <p className="text-slate-400">Loading dashboard…</p>;

  const { stats } = data;
  const cards = [
    { label: 'Total Revenue', value: formatPrice(stats.revenue), icon: IndianRupee, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Orders', value: stats.orders, icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
    { label: 'Avg Order Value', value: formatPrice(stats.avgOrderValue), icon: Receipt, color: 'bg-rose-50 text-rose-600' },
    { label: 'Units Sold', value: stats.unitsSold, icon: Boxes, color: 'bg-violet-50 text-violet-600' },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'Customers', value: stats.customers, icon: Users, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Products', value: stats.products, icon: Package, color: 'bg-teal-50 text-teal-600' },
  ];

  const statusData = data.statusBreakdown.map((s) => ({ name: s._id, value: s.count }));
  const categoryData = data.categoryRevenue.map((c) => ({ name: c._id, revenue: c.revenue }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-7">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card p-4">
              <div className={`grid h-9 w-9 place-items-center rounded-lg ${c.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xl font-black leading-tight">{c.value}</p>
              <p className="text-xs text-slate-400">{c.label}</p>
            </div>
          );
        })}
      </div>

      {/* Revenue trend + order status */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              <TrendingUp className="h-4 w-4 text-brand-600" /> Revenue &amp; Orders
            </h2>
            <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs font-semibold">
              {([7, 30] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-md px-3 py-1 transition ${
                    range === r ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {r}d
                </button>
              ))}
            </div>
          </div>
          {trend.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">No sales in this period yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={trend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f0475b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f0475b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis yAxisId="rev" tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={compactPrice} width={52} />
                <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11 }} stroke="#cbd5e1" allowDecimals={false} width={28} />
                <Tooltip
                  formatter={(v: number, name: string) =>
                    name === 'revenue' ? [formatPrice(v), 'Revenue'] : [v, 'Orders']
                  }
                />
                <Bar yAxisId="ord" dataKey="orders" fill="#c7d2fe" radius={[3, 3, 0, 0]} maxBarSize={22} />
                <Area yAxisId="rev" type="monotone" dataKey="revenue" stroke="#f0475b" strokeWidth={2} fill="url(#rev)" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <PieIcon className="h-4 w-4 text-brand-600" /> Orders by Status
          </h2>
          {statusData.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">No orders yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {statusData.map((s) => (
                    <Cell key={s.name} fill={STATUS_COLORS[s.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number, n: string) => [v, n]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, textTransform: 'capitalize' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top products + category revenue */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <Trophy className="h-4 w-4 text-brand-600" /> Best Sellers (units)
          </h2>
          {data.topProducts.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">No sales yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, data.topProducts.length * 44)}>
              <BarChart data={data.topProducts} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="title"
                  tick={{ fontSize: 11 }}
                  stroke="#94a3b8"
                  width={120}
                  tickFormatter={(t: string) => (t.length > 18 ? `${t.slice(0, 17)}…` : t)}
                />
                <Tooltip formatter={(v: number, _n, p: any) => [`${v} units · ${formatPrice(p.payload.revenue)}`, p.payload.title]} />
                <Bar dataKey="units" radius={[0, 4, 4, 0]} maxBarSize={26}>
                  {data.topProducts.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold">
            <PieIcon className="h-4 w-4 text-brand-600" /> Revenue by Category
          </h2>
          {categoryData.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">No category sales yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, categoryData.length * 44)}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={compactPrice} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" width={110} />
                <Tooltip formatter={(v: number) => [formatPrice(v), 'Revenue']} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={26}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={PALETTE[(i + 2) % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Low stock + recent orders */}
      <div className="grid gap-6 lg:grid-cols-3">
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

        <div className="card p-5 lg:col-span-2">
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
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold capitalize text-white"
                        style={{ backgroundColor: STATUS_COLORS[o.status] || '#94a3b8' }}
                      >
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
    </div>
  );
}
