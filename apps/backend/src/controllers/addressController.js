import Address from '../models/Address.js';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';

// GET /api/addresses
export const listAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id }).sort('-isDefault -createdAt');
  res.json({ success: true, addresses });
});

// POST /api/addresses
export const createAddress = asyncHandler(async (req, res) => {
  const body = { ...req.body, user: req.user._id };
  if (body.isDefault) {
    await Address.updateMany({ user: req.user._id }, { isDefault: false });
  }
  const address = await Address.create(body);
  res.status(201).json({ success: true, address });
});

// PUT /api/addresses/:id
export const updateAddress = asyncHandler(async (req, res) => {
  if (req.body.isDefault) {
    await Address.updateMany({ user: req.user._id }, { isDefault: false });
  }
  const address = await Address.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true }
  );
  if (!address) throw new ApiError(404, 'Address not found.');
  res.json({ success: true, address });
});

// DELETE /api/addresses/:id
export const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!address) throw new ApiError(404, 'Address not found.');
  res.json({ success: true, message: 'Address removed.' });
});
