import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { api, getAdminToken } from '../api';

interface AdminOrder {
  _id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  user?: { name: string; phone?: string };
  restaurant?: { name: string };
  driver?: { name: string };
  pricing: { grandTotal: number };
}

const STATUSES = [
  '', 'placed', 'confirmed', 'preparing', 'ready_for_pickup',
  'picked_up', 'on_the_way', 'delivered', 'cancelled',
];

const badgeClass = (status: string) =>
  status === 'delivered' ? 'done' : status === 'cancelled' ? 'bad' : 'active';

export const Orders = () => {
  const [status, setStatus] = useState('');
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['admin-orders', status],
    queryFn: async () =>
      (await api.get<{ data: { items: AdminOrder[]; total: number } }>('/admin/orders', {
        params: status ? { status } : {},
      })).data.data,
  });

  // Live board: any order event from the socket refreshes the table.
  useEffect(() => {
    const socket = io('/', { auth: { token: getAdminToken() } });
    socket.on('order:update', () => qc.invalidateQueries({ queryKey: ['admin-orders'] }));
    return () => { socket.disconnect(); };
  }, [qc]);

  const advance = async (id: string, next: string) => {
    await api.patch(`/orders/${id}/status`, { status: next });
    qc.invalidateQueries({ queryKey: ['admin-orders'] });
  };

  return (
    <>
      <h1>Orders {data ? `(${data.total})` : ''}</h1>
      <div className="toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === '' ? 'All statuses' : s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Order</th><th>Customer</th><th>Restaurant</th><th>Driver</th>
              <th>Total</th><th>Status</th><th>Placed</th><th></th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((o) => (
              <tr key={o._id}>
                <td>{o.orderNumber}</td>
                <td>{o.user?.name ?? '—'}</td>
                <td>{o.restaurant?.name ?? '—'}</td>
                <td>{o.driver?.name ?? '—'}</td>
                <td>₹{o.pricing.grandTotal}</td>
                <td><span className={`badge ${badgeClass(o.status)}`}>{o.status.replace(/_/g, ' ')}</span></td>
                <td>{new Date(o.createdAt).toLocaleTimeString()}</td>
                <td>
                  {o.status === 'placed' && (
                    <button onClick={() => advance(o._id, 'confirmed')}>Confirm</button>
                  )}
                  {o.status === 'confirmed' && (
                    <button onClick={() => advance(o._id, 'preparing')}>Preparing</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
