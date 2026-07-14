import { User } from '../models/User';
import { sendPushToTokens } from '../config/firebase';

/** Fire-and-forget FCM push to every registered device for a user. */
export const notifyUser = async (
  userId: string,
  notification: { title: string; body: string },
  data: Record<string, string> = {},
): Promise<void> => {
  try {
    const user = await User.findById(userId).select('fcmTokens').lean();
    if (!user?.fcmTokens?.length) return;
    await sendPushToTokens(user.fcmTokens, notification, data);
  } catch (err) {
    console.warn('[push] delivery failed', err);
  }
};
