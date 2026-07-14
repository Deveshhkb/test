import { useQuery } from '@tanstack/react-query';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { api } from '../api';

interface Analytics {
  orders30d: number;
  revenue30d: number;
  customers: number;
  onlineDrivers: number;
  revenueByDay: { _id: string; revenue: number; orders: number }[];
  topRestaurants: { name: string; revenue: number; orders: number }[];
  statusBreakdown: { _id: string; count: number }[];
}

export const Dashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => (await api.get<{ data: Analytics }>('/admin/analytics')).data.data,
    refetchInterval: 60_000,
  });

  if (isLoading) return <p>Loading analytics…</p>;
  if (!data) return <p>Could not load analytics — check your admin token.</p>;

  return (
    <>
      <h1>Dashboard — last 30 days</h1>

      <div className="cards">
        <div className="card"><div className="value">₹{data.revenue30d.toLocaleString()}</div><div className="label">Revenue</div></div>
        <div className="card"><div className="value">{data.orders30d.toLocaleString()}</div><div className="label">Orders</div></div>
        <div className="card"><div className="value">{data.customers.toLocaleString()}</div><div className="label">Customers</div></div>
        <div className="card"><div className="value">{data.onlineDrivers}</div><div className="label">Drivers online</div></div>
      </div>

      <div className="panel">
        <h2>Daily revenue</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.revenueByDay}>
            <CartesianGrid stroke="#2c261f" strokeDasharray="3 3" />
            <XAxis dataKey="_id" stroke="#a39a8d" fontSize={11} />
            <YAxis stroke="#a39a8d" fontSize={11} />
            <Tooltip contentStyle={{ background: '#1e1a15', border: '1px solid #2c261f' }} />
            <Line type="monotone" dataKey="revenue" stroke="#ff7a4d" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="panel">
        <h2>Top restaurants by revenue</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.topRestaurants}>
            <CartesianGrid stroke="#2c261f" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="#a39a8d" fontSize={11} />
            <YAxis stroke="#a39a8d" fontSize={11} />
            <Tooltip contentStyle={{ background: '#1e1a15', border: '1px solid #2c261f' }} />
            <Bar dataKey="revenue" fill="#2ec4a6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="panel">
        <h2>Order status breakdown</h2>
        <table>
          <thead><tr><th>Status</th><th>Count</th></tr></thead>
          <tbody>
            {data.statusBreakdown.map((s) => (
              <tr key={s._id}>
                <td>{s._id.replace(/_/g, ' ')}</td>
                <td>{s.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
