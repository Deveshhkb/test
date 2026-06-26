import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export const metadata = { title: 'Order Confirmed', robots: { index: false } };

export default async function OrderConfirmation({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <div className="container-nova grid place-items-center py-24 text-center">
      <CheckCircle2 className="h-20 w-20 text-green-500" />
      <h1 className="mt-6 text-3xl font-black">Thank you for your order!</h1>
      <p className="mt-2 text-ink/60">
        Your order {order && <strong className="text-ink">#{order}</strong>} has been placed successfully.
      </p>
      <p className="text-sm text-ink/50">A confirmation has been sent to your email.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/account/orders" className="btn-primary">
          View My Orders
        </Link>
        <Link href="/collections/new-arrivals" className="btn-outline">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
