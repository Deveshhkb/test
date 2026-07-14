import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

interface CouponRow {
  _id: string;
  code: string;
  title: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  minOrderAmount: number;
  validUntil: string;
  usedCount: number;
  isActive: boolean;
}

export const Coupons = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    code: '', title: '', discountType: 'percent', discountValue: '',
    maxDiscount: '', minOrderAmount: '', validUntil: '',
  });

  const { data } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => (await api.get<{ data: CouponRow[] }>('/admin/coupons')).data.data,
  });

  const create = async () => {
    await api.post('/admin/coupons', {
      code: form.code.toUpperCase(),
      title: form.title,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
      minOrderAmount: Number(form.minOrderAmount || 0),
      validUntil: new Date(form.validUntil).toISOString(),
    });
    setForm({ code: '', title: '', discountType: 'percent', discountValue: '', maxDiscount: '', minOrderAmount: '', validUntil: '' });
    qc.invalidateQueries({ queryKey: ['admin-coupons'] });
  };

  const toggle = async (c: CouponRow) => {
    await api.patch(`/admin/coupons/${c._id}`, { isActive: !c.isActive });
    qc.invalidateQueries({ queryKey: ['admin-coupons'] });
  };

  return (
    <>
      <h1>Coupons</h1>

      <div className="panel">
        <h2>Create coupon</h2>
        <div className="form-grid">
          <input placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
            <option value="percent">Percent %</option>
            <option value="flat">Flat ₹</option>
          </select>
          <input placeholder="Discount value" type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} />
          <input placeholder="Max discount ₹ (optional)" type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} />
          <input placeholder="Min order ₹" type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} />
          <input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
        </div>
        <button onClick={create} disabled={!form.code || !form.title || !form.discountValue || !form.validUntil}>
          Create
        </button>
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr><th>Code</th><th>Title</th><th>Discount</th><th>Min order</th><th>Valid until</th><th>Used</th><th>Status</th></tr>
          </thead>
          <tbody>
            {data?.map((c) => (
              <tr key={c._id}>
                <td><strong>{c.code}</strong></td>
                <td>{c.title}</td>
                <td>{c.discountType === 'percent' ? `${c.discountValue}%` : `₹${c.discountValue}`}</td>
                <td>₹{c.minOrderAmount}</td>
                <td>{new Date(c.validUntil).toLocaleDateString()}</td>
                <td>{c.usedCount}</td>
                <td>
                  <button className="ghost" onClick={() => toggle(c)}>
                    {c.isActive ? '🟢 Active' : '⚪ Paused'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
