'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Upload, X, Plus, Trash2 } from 'lucide-react';
import { api, uploadFiles } from '@/lib/api';

interface Option {
  _id: string;
  name: string;
}
interface Variant {
  sku: string;
  color: string;
  colorHex: string;
  size: string;
  stock: number;
}

const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const COLLECTIONS = ['trending', 'new-arrivals', 'best-sellers'];

/** Lowercase, hyphenated slug used to auto-name variant SKUs. */
const slugFromTitle = (t: string) =>
  t.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: 0,
    compareAtPrice: 0,
    category: '',
    brand: '',
    gender: 'unisex',
    sizes: [] as string[],
    collections: [] as string[],
    images: [] as string[],
    colors: [] as { name: string; hex: string }[],
    variants: [] as Variant[],
    isFeatured: false,
    isActive: true,
  });

  useEffect(() => {
    api<{ categories: Option[] }>('/catalog/categories').then((d) => setCategories(d.categories)).catch(() => {});
    api<{ brands: Option[] }>('/catalog/brands').then((d) => setBrands(d.brands)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!productId) return;
    api<{ product: any }>(`/products/${productId}`).then((d) => {
      const p = d.product;
      setForm({
        title: p.title || '',
        description: p.description || '',
        price: p.price || 0,
        compareAtPrice: p.compareAtPrice || 0,
        category: p.category?._id || p.category || '',
        brand: p.brand?._id || p.brand || '',
        gender: p.gender || 'unisex',
        sizes: p.sizes || [],
        collections: p.collections || [],
        images: p.images || [],
        colors: p.colors || [],
        variants: p.variants || [],
        isFeatured: !!p.isFeatured,
        isActive: p.isActive !== false,
      });
    }).catch((e) => setError(e.message));
  }, [productId]);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const toggleIn = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError('');
    try {
      const uploaded = await uploadFiles(files);
      set({ images: [...form.images, ...uploaded.map((u) => u.url)] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed (is Cloudinary configured?)');
    } finally {
      setUploading(false);
    }
  };

  const addVariant = () =>
    set({ variants: [...form.variants, { sku: '', color: '', colorHex: '#000000', size: 'M', stock: 0 }] });

  const updateVariant = (i: number, patch: Partial<Variant>) =>
    set({ variants: form.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) });

  /** Drop blank variant rows and auto-fill a SKU for any the user left empty. */
  const cleanVariants = (): Variant[] =>
    form.variants
      // Ignore rows that are completely empty (no SKU, no colour, no stock).
      .filter((v) => v.sku.trim() || v.color.trim() || v.stock > 0)
      .map((v, i) => ({
        ...v,
        sku:
          v.sku.trim() ||
          `${slugFromTitle(form.title) || 'sku'}-${(v.color || 'std').toLowerCase()}-${(v.size || 'os').toLowerCase()}-${i + 1}`,
      }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.category) {
      setError('Please select a category. Create one under Categories first if the list is empty.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        variants: cleanVariants(),
        price: Number(form.price),
        compareAtPrice: Number(form.compareAtPrice) || undefined,
        brand: form.brand || undefined,
      };
      if (productId) {
        await api(`/products/${productId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/products', { method: 'POST', body: JSON.stringify(payload) });
      }
      router.push('/products');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card space-y-4 p-5">
            <h2 className="font-bold">Basic Info</h2>
            <div>
              <label className="label">Title</label>
              <input required value={form.title} onChange={(e) => set({ title: e.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={4} className="input" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Price (₹)</label>
                <input type="number" required value={form.price} onChange={(e) => set({ price: Number(e.target.value) })} className="input" />
              </div>
              <div>
                <label className="label">Compare-at / MRP (₹)</label>
                <input type="number" value={form.compareAtPrice} onChange={(e) => set({ compareAtPrice: Number(e.target.value) })} className="input" />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="card space-y-4 p-5">
            <h2 className="font-bold">Images</h2>
            <div className="flex flex-wrap gap-3">
              {form.images.map((src, i) => (
                <div key={i} className="relative h-24 w-20 overflow-hidden rounded-lg border border-slate-200">
                  <Image src={src} alt="" fill className="object-cover" sizes="80px" />
                  <button
                    type="button"
                    onClick={() => set({ images: form.images.filter((_, idx) => idx !== i) })}
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="grid h-24 w-20 place-items-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-brand-500"
              >
                <Upload className="h-5 w-5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleUpload(e.target.files)} />
            </div>
            {uploading && <p className="text-xs text-slate-400">Uploading…</p>}
            <p className="text-xs text-slate-400">
              Or paste an image URL and press Enter:
            </p>
            <input
              className="input"
              placeholder="https://…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const v = (e.target as HTMLInputElement).value.trim();
                  if (v) {
                    set({ images: [...form.images, v] });
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
          </div>

          {/* Variants */}
          <div className="card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Variants (SKU · Color · Size · Stock)</h2>
              <button type="button" onClick={addVariant} className="btn-ghost !py-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            {form.variants.length === 0 && <p className="text-sm text-slate-400">No variants added.</p>}
            <div className="space-y-2">
              {form.variants.map((v, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <input placeholder="SKU" value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} className="input col-span-3" />
                  <input placeholder="Color" value={v.color} onChange={(e) => updateVariant(i, { color: e.target.value })} className="input col-span-3" />
                  <select value={v.size} onChange={(e) => updateVariant(i, { size: e.target.value })} className="input col-span-2">
                    {ALL_SIZES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  <input type="number" placeholder="Stock" value={v.stock} onChange={(e) => updateVariant(i, { stock: Number(e.target.value) })} className="input col-span-3" />
                  <button type="button" onClick={() => set({ variants: form.variants.filter((_, idx) => idx !== i) })} className="col-span-1 grid place-items-center text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card space-y-4 p-5">
            <h2 className="font-bold">Organization</h2>
            <div>
              <label className="label">Category</label>
              <select required value={form.category} onChange={(e) => set({ category: e.target.value })} className="input">
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  No categories yet — create one under <strong>Categories</strong> (or run the seed) before adding a product.
                </p>
              )}
            </div>
            <div>
              <label className="label">Brand</label>
              <select value={form.brand} onChange={(e) => set({ brand: e.target.value })} className="input">
                <option value="">None</option>
                {brands.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Gender</label>
              <select value={form.gender} onChange={(e) => set({ gender: e.target.value })} className="input">
                {['men', 'women', 'unisex', 'kids'].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="card space-y-4 p-5">
            <h2 className="font-bold">Sizes</h2>
            <div className="flex flex-wrap gap-2">
              {ALL_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set({ sizes: toggleIn(form.sizes, s) })}
                  className={`h-9 w-10 rounded-lg border text-sm font-medium ${
                    form.sizes.includes(s) ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <h2 className="font-bold">Collections</h2>
            <div className="flex flex-wrap gap-2">
              {COLLECTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set({ collections: toggleIn(form.collections, c) })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    form.collections.includes(c) ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="card space-y-3 p-5">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => set({ isFeatured: e.target.checked })} />
              Featured product
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
              Active (visible in store)
            </label>
          </div>

          <button disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving…' : productId ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </div>
    </form>
  );
}
