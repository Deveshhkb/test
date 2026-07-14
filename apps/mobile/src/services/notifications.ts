import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Ask permission, create the Android channel, and return the FCM device token. */
export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Order updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E4572E',
      });
    }

    await messaging().registerDeviceForRemoteMessages();
    return await messaging().getToken();
  } catch (err) {
    console.warn('[push] registration failed', err);
    return null;
  }
};

/** Foreground FCM → local banner so in-app order updates are still visible. */
export const attachForegroundHandler = () =>
  messaging().onMessage(async (remoteMessage) => {
    if (!remoteMessage.notification) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: remoteMessage.notification.title ?? 'Savora',
        body: remoteMessage.notification.body ?? '',
        data: remoteMessage.data,
      },
      trigger: null,
    });
  });
