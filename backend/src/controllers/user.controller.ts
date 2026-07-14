import { Request, Response } from 'express';
import { z } from 'zod';
import { Restaurant } from '../models/Restaurant';
import { ApiError } from '../utils/ApiError';

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  avatarUrl: z.string().url().optional(),
  language: z.enum(['en', 'hi', 'es']).optional(),
  dietaryPreference: z.enum(['veg', 'non_veg', 'vegan']).optional(),
});

export const updateProfile = async (req: Request, res: Response) => {
  Object.assign(req.user!, req.body);
  await req.user!.save();
  res.json({ success: true, data: req.user });
};

export const addressSchema = z.object({
  label: z.enum(['home', 'work', 'other']).default('home'),
  line1: z.string().min(3),
  line2: z.string().optional(),
  city: z.string().min(1),
  pincode: z.string().min(4).max(10),
  lat: z.number(),
  lng: z.number(),
  isDefault: z.boolean().default(false),
});

export const addAddress = async (req: Request, res: Response) => {
  const body = req.body as z.infer<typeof addressSchema>;
  const user = req.user!;
  if (body.isDefault) user.addresses.forEach((a) => (a.isDefault = false));
  user.addresses.push({
    label: body.label,
    line1: body.line1,
    line2: body.line2,
    city: body.city,
    pincode: body.pincode,
    location: { type: 'Point', coordinates: [body.lng, body.lat] },
    isDefault: body.isDefault || user.addresses.length === 0,
  });
  await user.save();
  res.status(201).json({ success: true, data: user.addresses });
};

export const removeAddress = async (req: Request, res: Response) => {
  const user = req.user!;
  user.addresses = user.addresses.filter((a) => a._id?.toString() !== req.params.addressId);
  await user.save();
  res.json({ success: true, data: user.addresses });
};

export const toggleWishlist = async (req: Request, res: Response) => {
  const { restaurantId } = req.params;
  const exists = await Restaurant.exists({ _id: restaurantId });
  if (!exists) throw ApiError.notFound('Restaurant not found');

  const user = req.user!;
  const idx = user.wishlist.findIndex((id) => id.toString() === restaurantId);
  if (idx >= 0) user.wishlist.splice(idx, 1);
  else user.wishlist.push(exists._id);
  await user.save();
  res.json({ success: true, data: { wishlisted: idx < 0, wishlist: user.wishlist } });
};

export const getWishlist = async (req: Request, res: Response) => {
  const user = await req.user!.populate('wishlist');
  res.json({ success: true, data: user.wishlist });
};
