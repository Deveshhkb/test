import mongoose from 'mongoose';

/**
 * Stores ONLY non-sensitive display metadata for a saved card — never the full
 * PAN or CVV (that would violate PCI-DSS). Real charges go through Razorpay's
 * tokenization; `gatewayToken` optionally holds a provider token reference.
 */
const cardSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cardholderName: { type: String, required: true, trim: true },
    brand: { type: String, default: 'card' }, // visa / mastercard / rupay / amex
    last4: { type: String, required: true, match: /^\d{4}$/ },
    expMonth: { type: Number, required: true, min: 1, max: 12 },
    expYear: { type: Number, required: true },
    gatewayToken: { type: String, default: '' }, // provider token, not card data
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Card', cardSchema);
