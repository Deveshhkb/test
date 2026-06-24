import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['package', 'hotel', 'cab'],
      required: true,
    },
    // Reference depends on `type`
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
    hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel' },
    cab: { type: mongoose.Schema.Types.ObjectId, ref: 'Cab' },

    travelDate: { type: Date },
    travellers: { type: Number, default: 1 },
    nights: { type: Number },

    // Cab specific
    tripType: { type: String, enum: ['oneway', 'roundtrip', 'airport', 'railway'] },
    pickup: String,
    drop: String,

    contactName: String,
    contactMobile: String,
    notes: String,

    amount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
  },
  { timestamps: true }
);

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
