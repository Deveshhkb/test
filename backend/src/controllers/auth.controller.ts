import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { verifyFirebaseIdToken } from '../config/firebase';
import { signToken } from '../middleware/auth';
import { ApiError } from '../utils/ApiError';

export const firebaseLoginSchema = z.object({
  idToken: z.string().min(10),
  name: z.string().min(1).max(80).optional(),
  fcmToken: z.string().optional(),
});

/**
 * OTP flow: the app completes Firebase phone-OTP (or email) sign-in on-device,
 * then exchanges the Firebase ID token here for a Savora session JWT.
 * The user document is created on first login (upsert by firebaseUid).
 */
export const firebaseLogin = async (req: Request, res: Response) => {
  const { idToken, name, fcmToken } = req.body as z.infer<typeof firebaseLoginSchema>;
  const decoded = await verifyFirebaseIdToken(idToken).catch(() => {
    throw ApiError.unauthorized('Invalid Firebase ID token');
  });

  let user = await User.findOne({ firebaseUid: decoded.uid });
  if (!user) {
    user = await User.create({
      firebaseUid: decoded.uid,
      name: name ?? decoded.name ?? 'Foodie',
      email: decoded.email,
      phone: decoded.phone_number,
      avatarUrl: decoded.picture,
    });
  }
  if (user.isBlocked) throw ApiError.forbidden('Account is blocked');

  if (fcmToken && !user.fcmTokens.includes(fcmToken)) {
    user.fcmTokens = [...user.fcmTokens.slice(-4), fcmToken]; // keep the 5 newest devices
    await user.save();
  }

  res.json({
    success: true,
    data: { token: signToken(user.id, user.role), user },
  });
};

export const me = async (req: Request, res: Response) => {
  res.json({ success: true, data: req.user });
};

export const logout = async (req: Request, res: Response) => {
  const { fcmToken } = req.body as { fcmToken?: string };
  if (fcmToken && req.user) {
    req.user.fcmTokens = req.user.fcmTokens.filter((t) => t !== fcmToken);
    await req.user.save();
  }
  res.json({ success: true });
};
