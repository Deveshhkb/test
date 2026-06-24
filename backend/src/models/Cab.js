import mongoose from 'mongoose';

const cabSchema = new mongoose.Schema(
  {
    vehicleType: {
      type: String,
      enum: ['Sedan', 'SUV', 'Luxury', 'Tempo Traveller'],
      required: true,
    },
    name: { type: String, required: true }, // e.g. Toyota Etios, Innova Crysta
    seats: { type: Number, default: 4 },
    pricePerKm: { type: Number, required: true },
    baseFare: { type: Number, default: 0 },
    image: { type: String, required: true },
    features: [{ type: String }], // AC, Music System, Luggage
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Cab = mongoose.model('Cab', cabSchema);
export default Cab;
