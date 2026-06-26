'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import PageHeader from '@/components/PageHeader';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
}

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (q = '') => {
    setLoading(true);
    api<{ customers: Customer[] }>(`/admin/customers${q ? `?search=${encodeURIComponent(q)}` : ''}`)
      .then((d) => setItems(d.customers))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader title="Customers" />
      <div className="card mb-4 flex items-center gap-2 p-2">
        <Search className="ml-2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(search)}
          placeholder="Search by name or email… (press Enter)"
          className="flex-1 bg-transparent px-1 py-1.5 text-sm outline-none"
        />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="th">Name</th>
              <th className="th">Email</th>
              <th className="th">Phone</th>
              <th className="th">Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="td text-slate-400" colSpan={4}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="td text-slate-400" colSpan={4}>No customers found.</td></tr>
            ) : (
              items.map((c) => (
                <tr key={c._id} className="border-b border-slate-50">
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                        {c.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="td text-slate-500">{c.email}</td>
                  <td className="td text-slate-500">{c.phone || '—'}</td>
                  <td className="td text-slate-500">{formatDate(c.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
