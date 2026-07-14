import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

interface DriverRow {
  _id: string;
  user?: { name: string; phone?: string; email?: string };
  vehicleType: string;
  vehicleNumber: string;
  isApproved: boolean;
  isOnline: boolean;
  rating: number;
  totalDeliveries: number;
}

export const Drivers = () => {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['admin-drivers'],
    queryFn: async () => (await api.get<{ data: DriverRow[] }>('/admin/drivers')).data.data,
    refetchInterval: 30_000,
  });

  const setApproval = async (id: string, isApproved: boolean) => {
    await api.patch(`/admin/drivers/${id}/approve`, { isApproved });
    qc.invalidateQueries({ queryKey: ['admin-drivers'] });
  };

  return (
    <>
      <h1>Drivers</h1>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Phone</th><th>Vehicle</th><th>Rating</th>
              <th>Deliveries</th><th>Status</th><th>Approval</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((d) => (
              <tr key={d._id}>
                <td>{d.user?.name ?? '—'}</td>
                <td>{d.user?.phone ?? '—'}</td>
                <td>{d.vehicleType} · {d.vehicleNumber}</td>
                <td>★ {d.rating.toFixed(1)}</td>
                <td>{d.totalDeliveries}</td>
                <td>
                  <span className={`badge ${d.isOnline ? 'done' : 'bad'}`}>
                    {d.isOnline ? 'Online' : 'Offline'}
                  </span>
                </td>
                <td>
                  {d.isApproved ? (
                    <button className="ghost" onClick={() => setApproval(d._id, false)}>Revoke</button>
                  ) : (
                    <button onClick={() => setApproval(d._id, true)}>Approve</button>
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
