import crypto from 'crypto';
import Razorpay from 'razorpay';
import Stripe from 'stripe';
import { env } from '../config/env';
import { Order } from '../models/Order';
import { ApiError } from '../utils/ApiError';
import { emitOrderUpdate } from '../sockets';

const razorpay = env.razorpayKeyId
  ? new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret })
  : null;

const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

/** Amounts are stored in rupees; providers want the smallest currency unit. */
export const createPaymentOrder = async (
  provider: 'razorpay' | 'stripe',
  amount: number,
  orderId: string,
): Promise<{ id: string; clientSecret?: string; keyId?: string; amount: number; currency: string }> => {
  if (provider === 'razorpay') {
    if (!razorpay) throw ApiError.badRequest('Razorpay is not configured');
    const rzpOrder = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      receipt: orderId,
      notes: { savoraOrderId: orderId },
    });
    return { id: rzpOrder.id, keyId: env.razorpayKeyId, amount: amount * 100, currency: 'INR' };
  }

  if (!stripe) throw ApiError.badRequest('Stripe is not configured');
  const intent = await stripe.paymentIntents.create({
    amount: amount * 100,
    currency: 'inr',
    metadata: { savoraOrderId: orderId },
    automatic_payment_methods: { enabled: true },
  });
  return { id: intent.id, clientSecret: intent.client_secret ?? undefined, amount: amount * 100, currency: 'inr' };
};

/** Razorpay checkout callback → verify HMAC signature, mark paid, kick off dispatch. */
export const verifyRazorpayPayment = async (params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<string> => {
  const expected = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.razorpaySignature))) {
    throw ApiError.badRequest('Payment signature verification failed', 'BAD_SIGNATURE');
  }

  const order = await Order.findOne({ 'payment.providerOrderId': params.razorpayOrderId });
  if (!order) throw ApiError.notFound('Order not found for this payment');

  order.payment.status = 'paid';
  order.payment.providerPaymentId = params.razorpayPaymentId;
  order.status = 'placed';
  order.statusHistory.push({ status: 'placed', at: new Date() });
  await order.save();
  emitOrderUpdate(order.id, { orderId: order.id, status: 'placed', at: Date.now() });
  return order.id;
};
