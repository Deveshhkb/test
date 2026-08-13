'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Check, CreditCard, Truck, Banknote } from 'lucide-react';
import { api } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatPrice, cn } from '@/lib/utils';
import { loadRazorpay } from '@/lib/razorpay';
import { validateAddress, hasErrors, type AddressErrors } from '@/lib/validateAddress';
import type { Address } from '@/lib/types';

const EMPTY_ADDR = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
};

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, summary, refresh } = useCart();
  const { user, loading: authLoading } = useAuth();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [form, setForm] = useState(EMPTY_ADDR);
  const [showForm, setShowForm] = useState(false);
  const [shipping, setShipping] = useState<'standard' | 'express'>('standard');
  const [payment, setPayment] = useState<'razorpay' | 'cod'>('razorpay');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AddressErrors>({});
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login?redirect=/checkout');
  }, [authLoading, user, router]);

  useEffect(() => {
    api<{ addresses: Address[] }>('/addresses')
      .then((d) => {
        setAddresses(d.addresses);
        const def = d.addresses.find((a) => a.isDefault) || d.addresses[0];
        if (def) setSelected(def._id);
        else setShowForm(true);
      })
      .catch(() => setShowForm(true));
  }, []);

  const saveAddress = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');

    const errors = validateAddress(form);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setSavingAddress(true);
    try {
      const d = await api<{ address: Address }>('/addresses', {
        method: 'POST',
        body: JSON.stringify({ ...form, isDefault: addresses.length === 0 }),
      });
      setAddresses((prev) => [...prev, d.address]);
      setSelected(d.address._id);
      setShowForm(false);
      setForm(EMPTY_ADDR);
      setFieldErrors({});
    } catch (err) {
      // Previously unhandled, which surfaced as an uncaught promise rejection.
      setError(err instanceof Error ? err.message : 'Could not save the address.');
    } finally {
      setSavingAddress(false);
    }
  };

  const placeOrder = async () => {
    setError('');
    const address = addresses.find((a) => a._id === selected);
    if (!address) {
      setError('Please add a delivery address.');
      return;
    }
    setPlacing(true);
    try {
      const { fullName, phone, line1, line2, city, state, pincode, country } = address;
      const res = await api<{
        order: { _id: string; orderNumber: string };
        razorpayOrder: { id: string; amount: number; currency: string } | null;
        razorpayKeyId: string | null;
      }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          shippingAddress: { fullName, phone, line1, line2, city, state, pincode, country },
          paymentMethod: payment,
          shippingMethod: shipping,
        }),
      });

      if (payment === 'cod') {
        await refresh();
        router.push(`/order-confirmation?order=${res.order.orderNumber}`);
        return;
      }

      // Online payment via Razorpay
      const key = res.razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!res.razorpayOrder || !key) {
        setError('Online payment is not configured. Please choose Cash on Delivery.');
        setPlacing(false);
        return;
      }
      const ok = await loadRazorpay();
      if (!ok) {
        setError('Failed to load payment gateway. Please try again.');
        setPlacing(false);
        return;
      }

      const rzp = new window.Razorpay({
        key,
        amount: res.razorpayOrder.amount,
        currency: res.razorpayOrder.currency,
        name: 'Clothinary',
        description: `Order ${res.order.orderNumber}`,
        order_id: res.razorpayOrder.id,
        prefill: { name: user?.name, email: user?.email, contact: address.phone },
        theme: { color: '#f0475b' },
        handler: async (response: any) => {
          try {
            await api('/orders/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            await refresh();
            router.push(`/order-confirmation?order=${res.order.orderNumber}`);
          } catch {
            setError('Payment verification failed. Please contact support.');
            setPlacing(false);
          }
        },
      });
      rzp.on('payment.failed', () => {
        setError('Payment failed or was cancelled.');
        setPlacing(false);
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place order.');
      setPlacing(false);
    }
  };

  if (!user) return null;
  const items = cart?.items || [];

  return (
    <div className="container-nova py-8">
      <h1 className="mb-6 text-3xl font-black">Checkout</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Address */}
          <Section step={1} title="Delivery Address">
            <div className="space-y-3">
              {addresses.map((a) => (
                <label
                  key={a._id}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-xl border p-4 transition',
                    selected === a._id ? 'border-ink ring-1 ring-ink' : 'border-ink/15'
                  )}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selected === a._id}
                    onChange={() => setSelected(a._id)}
                    className="mt-1 accent-nova-600"
                  />
                  <div className="text-sm">
                    <p className="font-semibold">
                      {a.fullName} · {a.phone}
                    </p>
                    <p className="text-ink/60">
                      {a.line1}, {a.line2 && `${a.line2}, `}
                      {a.city}, {a.state} - {a.pincode}
                    </p>
                  </div>
                </label>
              ))}

              {showForm ? (
                <form noValidate onSubmit={saveAddress} className="grid gap-3 rounded-xl border border-ink/15 p-4 sm:grid-cols-2">
                  <Input label="Full Name" v={form.fullName} on={(v) => setForm({ ...form, fullName: v })} err={fieldErrors.fullName} />
                  <Input label="Phone" v={form.phone} on={(v) => setForm({ ...form, phone: v })} err={fieldErrors.phone} inputMode="tel" />
                  <Input label="Address Line 1" v={form.line1} on={(v) => setForm({ ...form, line1: v })} err={fieldErrors.line1} full />
                  <Input label="Address Line 2 (optional)" v={form.line2} on={(v) => setForm({ ...form, line2: v })} full />
                  <Input label="City" v={form.city} on={(v) => setForm({ ...form, city: v })} err={fieldErrors.city} />
                  <Input label="State" v={form.state} on={(v) => setForm({ ...form, state: v })} err={fieldErrors.state} />
                  <Input label="Pincode" v={form.pincode} on={(v) => setForm({ ...form, pincode: v })} err={fieldErrors.pincode} inputMode="numeric" />
                  <div className="sm:col-span-2">
                    <button type="submit" disabled={savingAddress} className="btn-primary !py-2.5">
                      {savingAddress ? 'Saving…' : 'Save Address'}
                    </button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setShowForm(true)} className="text-sm font-semibold text-nova-600">
                  + Add a new address
                </button>
              )}
            </div>
          </Section>

          {/* Shipping */}
          <Section step={2} title="Shipping Method">
            <div className="grid gap-3 sm:grid-cols-2">
              <Choice
                active={shipping === 'standard'}
                onClick={() => setShipping('standard')}
                icon={<Truck className="h-5 w-5" />}
                title="Standard"
                desc="4–6 business days · Free over ₹999"
              />
              <Choice
                active={shipping === 'express'}
                onClick={() => setShipping('express')}
                icon={<Truck className="h-5 w-5" />}
                title="Express"
                desc="1–2 business days"
              />
            </div>
          </Section>

          {/* Payment */}
          <Section step={3} title="Payment Method">
            <div className="grid gap-3 sm:grid-cols-2">
              <Choice
                active={payment === 'razorpay'}
                onClick={() => setPayment('razorpay')}
                icon={<CreditCard className="h-5 w-5" />}
                title="Pay Online"
                desc="UPI · Cards · Net Banking (Razorpay)"
              />
              <Choice
                active={payment === 'cod'}
                onClick={() => setPayment('cod')}
                icon={<Banknote className="h-5 w-5" />}
                title="Cash on Delivery"
                desc="Pay when your order arrives"
              />
            </div>
          </Section>
        </div>

        {/* Order review */}
        <aside className="h-fit rounded-2xl border border-ink/10 p-6 lg:sticky lg:top-24">
          <h2 className="mb-4 text-lg font-bold">Order Review</h2>
          <div className="max-h-64 space-y-3 overflow-y-auto">
            {items.map((item) => (
              <div key={item._id} className="flex gap-3">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-ink/5">
                  {item.product?.images?.[0] && (
                    <Image src={item.product.images[0]} alt={item.product.title} fill className="object-cover" sizes="56px" />
                  )}
                </div>
                <div className="flex-1 text-sm">
                  <p className="line-clamp-1 font-medium">{item.product?.title}</p>
                  <p className="text-ink/50">Qty {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 border-t border-ink/10 pt-4 text-sm">
            <Row label="Subtotal" value={formatPrice(summary.itemsTotal)} />
            {summary.discount > 0 && <Row label="Discount" value={`-${formatPrice(summary.discount)}`} green />}
            <Row label="Shipping" value={summary.shippingFee === 0 ? 'Free' : formatPrice(summary.shippingFee)} />
            <div className="flex justify-between border-t border-ink/10 pt-3 text-base font-bold">
              <span>Total</span>
              <span>{formatPrice(summary.grandTotal)}</span>
            </div>
          </div>

          {error && <p className="mt-3 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>}

          <button onClick={placeOrder} disabled={placing || items.length === 0} className="btn-primary mt-5 w-full">
            {placing ? 'Processing...' : payment === 'cod' ? 'Place Order' : `Pay ${formatPrice(summary.grandTotal)}`}
          </button>
          <p className="mt-3 text-center text-xs text-ink/40">
            🔒 100% secure checkout
          </p>
        </aside>
      </div>
    </div>
  );
}

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink/10 p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-sm text-white">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Choice({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 text-left transition',
        active ? 'border-ink ring-1 ring-ink' : 'border-ink/15 hover:border-ink/40'
      )}
    >
      <span className="text-nova-600">{icon}</span>
      <div>
        <p className="flex items-center gap-1.5 font-semibold">
          {title}
          {active && <Check className="h-4 w-4 text-green-600" />}
        </p>
        <p className="text-xs text-ink/50">{desc}</p>
      </div>
    </button>
  );
}

function Input({
  label,
  v,
  on,
  full,
  err,
  inputMode,
}: {
  label: string;
  v: string;
  on: (v: string) => void;
  full?: boolean;
  err?: string;
  inputMode?: 'tel' | 'numeric' | 'text';
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="mb-1 block text-xs font-medium text-ink/60">{label}</label>
      <input
        value={v}
        onChange={(e) => on(e.target.value)}
        inputMode={inputMode}
        aria-invalid={Boolean(err)}
        className={cn('input !py-2.5', err && 'border-accent focus:border-accent')}
      />
      {err && <p className="mt-1 text-xs text-accent">{err}</p>}
    </div>
  );
}

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink/60">{label}</span>
      <span className={green ? 'font-medium text-green-600' : 'font-medium'}>{value}</span>
    </div>
  );
}
