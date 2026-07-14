declare module 'react-native-razorpay' {
  export interface CheckoutOptions {
    key: string;
    order_id: string;
    amount: number | string;
    currency: string;
    name: string;
    description?: string;
    image?: string;
    theme?: { color?: string };
    prefill?: { contact?: string; email?: string; name?: string };
    notes?: Record<string, string>;
  }

  export interface CheckoutSuccess {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  const RazorpayCheckout: {
    open(options: CheckoutOptions): Promise<CheckoutSuccess>;
  };
  export default RazorpayCheckout;
}
