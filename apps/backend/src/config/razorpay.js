import Razorpay from 'razorpay';

let instance = null;

/**
 * Lazily create the Razorpay client so the server can boot without
 * payment keys during local development / seeding.
 */
export const getRazorpay = () => {
  if (instance) return instance;
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }
  instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return instance;
};
