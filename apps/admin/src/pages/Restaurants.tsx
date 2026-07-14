import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

interface RestaurantRow {
  _id: string;
  name: string;
  cuisines: string[];
  rating: number;
  ratingCount: number;
  isOpen: boolean;
  isActive: boolean;
  deliveryTimeMins: number;
}

export const Restaurants = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', cuisines: '', address: '', lat: '', lng: '', coverImageUrl: '' });

  const { data } = useQuery({
    queryKey: ['admin-restaurants'],
    queryFn: async () =>
      (await api.get<{ data: { items: RestaurantRow[] } }>('/restaurants', { params: { limit: 50 } }))
        .data.data.items,
  });

  const toggle = async (r: RestaurantRow, field: 'isOpen' | 'isActive') => {
    await api.patch(`/admin/restaurants/${r._id}`, { [field]: !r[field] });
    qc.invalidateQueries({ queryKey: ['admin-restaurants'] });
  };

  const create = async () => {
    await api.post('/admin/restaurants', {
      name: form.name,
      slug: form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      cuisines: form.cuisines.split(',').map((c) => c.trim()).filter(Boolean),
      address: form.address,
      coverImageUrl: form.coverImageUrl,
      location: { type: 'Point', coordinates: [Number(form.lng), Number(form.lat)] },
    });
    setForm({ name: '', cuisines: '', address: '', lat: '', lng: '', coverImageUrl: '' });
    qc.invalidateQueries({ queryKey: ['admin-restaurants'] });
  };

  return (
    <>
      <h1>Restaurants</h1>

      <div className="panel">
        <h2>Add restaurant</h2>
        <div className="form-grid">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Cuisines (comma-separated)" value={form.cuisines} onChange={(e) => setForm({ ...form, cuisines: e.target.value })} />
          <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <input placeholder="Latitude" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
          <input placeholder="Longitude" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
          <input placeholder="Cover image URL" value={form.coverImageUrl} onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })} />
        </div>
        <button onClick={create} disabled={!form.name || !form.lat || !form.lng}>Create</button>
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr><th>Name</th><th>Cuisines</th><th>Rating</th><th>ETA</th><th>Open</th><th>Active</th></tr>
          </thead>
          <tbody>
            {data?.map((r) => (
              <tr key={r._id}>
                <td>{r.name}</td>
                <td>{r.cuisines.join(', ')}</td>
                <td>★ {r.rating.toFixed(1)} ({r.ratingCount})</td>
                <td>{r.deliveryTimeMins} min</td>
                <td>
                  <button className="ghost" onClick={() => toggle(r, 'isOpen')}>
                    {r.isOpen ? '🟢 Open' : '🔴 Closed'}
                  </button>
                </td>
                <td>
                  <button className="ghost" onClick={() => toggle(r, 'isActive')}>
                    {r.isActive ? 'Listed' : 'Delisted'}
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
