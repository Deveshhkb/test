import Booking from '../models/Booking.js';
import { asyncHandler } from '../middleware/error.js';

// @route POST /api/bookings  (user)
export const createBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.create({ ...req.body, user: req.user._id });
  res.status(201).json({ success: true, data: booking });
});

// @route GET /api/bookings/mine  (user)
export const myBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate('package', 'title slug coverImage price')
    .populate('hotel', 'name slug coverImage pricePerNight')
    .populate('cab', 'name vehicleType image')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: bookings.length, data: bookings });
});

// @route PUT /api/bookings/:id/cancel  (user)
export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  booking.status = 'cancelled';
  await booking.save();
  res.json({ success: true, data: booking });
});

// @route GET /api/bookings  (admin)
export const allBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find()
    .populate('user', 'name email mobile')
    .populate('package', 'title')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: bookings.length, data: bookings });
});

// @route PUT /api/bookings/:id  (admin) — update status / payment
export const updateBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  res.json({ success: true, data: booking });
});
