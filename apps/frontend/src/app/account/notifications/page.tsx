'use client';

import { Bell, Package, Tag, Heart } from 'lucide-react';

const NOTIFICATIONS = [
  { icon: Package, title: 'Order shipped', body: 'Your recent order is on its way!', time: '2h ago', unread: true },
  { icon: Tag, title: 'Flash sale live', body: 'Up to 50% off ends tonight. Don’t miss out.', time: '1d ago', unread: true },
  { icon: Heart, title: 'Back in stock', body: 'An item from your wishlist is available again.', time: '3d ago', unread: false },
];

export default function NotificationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-black">Notifications</h1>
      <div className="mt-6 space-y-3">
        {NOTIFICATIONS.map((n, i) => {
          const Icon = n.icon;
          return (
            <div
              key={i}
              className={`flex gap-4 rounded-2xl border p-4 ${n.unread ? 'border-nova-200 bg-nova-50' : 'border-ink/10'}`}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-nova-600 shadow-sm">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{n.title}</p>
                <p className="text-sm text-ink/60">{n.body}</p>
              </div>
              <span className="text-xs text-ink/40">{n.time}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-6 flex items-center gap-2 text-sm text-ink/40">
        <Bell className="h-4 w-4" /> You&apos;re all caught up.
      </p>
    </div>
  );
}
