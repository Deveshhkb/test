'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Pencil, Trash2, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import PageHeader from '@/components/PageHeader';

interface Product {
  _id: string;
  title: string;
  images: string[];
  price: number;
  category?: { name: string };
  isActive: boolean;
  variants: { stock: number }[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (q = '') => {
    setLoading(true);
    api<{ products: Product[] }>(`/products?limit=60${q ? `&search=${encodeURIComponent(q)}` : ''}`)
      .then((d) => setProducts(d.products))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    await api(`/products/${id}`, { method: 'DELETE' });
    setProducts((p) => p.filter((x) => x._id !== id));
  };

  return (
    <div>
      <PageHeader title="Products" action={{ label: '+ New Product', href: '/products/new' }} />

      <div className="card mb-4 flex items-center gap-2 p-2">
        <Search className="ml-2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(search)}
          placeholder="Search products… (press Enter)"
          className="flex-1 bg-transparent px-1 py-1.5 text-sm outline-none"
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="th">Product</th>
              <th className="th">Category</th>
              <th className="th">Price</th>
              <th className="th">Stock</th>
              <th className="th">Status</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="td text-slate-400" colSpan={6}>
                  Loading…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td className="td text-slate-400" colSpan={6}>
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const stock = p.variants?.reduce((s, v) => s + v.stock, 0) ?? 0;
                return (
                  <tr key={p._id} className="border-b border-slate-50">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-10 overflow-hidden rounded bg-slate-100">
                          {p.images?.[0] && <Image src={p.images[0]} alt="" fill className="object-cover" sizes="40px" />}
                        </div>
                        <span className="font-medium">{p.title}</span>
                      </div>
                    </td>
                    <td className="td text-slate-500">{p.category?.name || '—'}</td>
                    <td className="td font-semibold">{formatPrice(p.price)}</td>
                    <td className="td">
                      <span className={stock <= 5 ? 'font-semibold text-amber-600' : ''}>{stock}</span>
                    </td>
                    <td className="td">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${p.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {p.isActive ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-2">
                        <Link href={`/products/${p._id}`} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button onClick={() => remove(p._id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
