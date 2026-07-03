import Card from '../models/Card.js';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';

// GET /api/cards
export const listCards = asyncHandler(async (req, res) => {
  const cards = await Card.find({ user: req.user._id }).sort('-isDefault -createdAt');
  res.json({ success: true, cards });
});

// POST /api/cards  — accepts display metadata only
export const addCard = asyncHandler(async (req, res) => {
  const { cardholderName, number, brand, expMonth, expYear, isDefault } = req.body;
  if (!cardholderName || !number || !expMonth || !expYear) {
    throw new ApiError(400, 'Cardholder name, number and expiry are required.');
  }
  // Derive last4 and discard the rest — we never store the full number.
  const digits = String(number).replace(/\D/g, '');
  if (digits.length < 12) throw new ApiError(400, 'Please enter a valid card number.');
  const last4 = digits.slice(-4);

  if (isDefault) await Card.updateMany({ user: req.user._id }, { isDefault: false });

  const card = await Card.create({
    user: req.user._id,
    cardholderName,
    brand: brand || 'card',
    last4,
    expMonth: Number(expMonth),
    expYear: Number(expYear),
    isDefault: Boolean(isDefault),
  });
  res.status(201).json({ success: true, card });
});

// PUT /api/cards/:id/default
export const setDefaultCard = asyncHandler(async (req, res) => {
  await Card.updateMany({ user: req.user._id }, { isDefault: false });
  const card = await Card.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isDefault: true },
    { new: true }
  );
  if (!card) throw new ApiError(404, 'Card not found.');
  res.json({ success: true, card });
});

// DELETE /api/cards/:id
export const deleteCard = asyncHandler(async (req, res) => {
  const card = await Card.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!card) throw new ApiError(404, 'Card not found.');
  res.json({ success: true, message: 'Card removed.' });
});
