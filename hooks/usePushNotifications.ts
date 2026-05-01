import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { bridgeClient } from '../utils/bridge-client';
import Constants from 'expo-constants';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const [pushToken, setPushToken] = useState<string | undefined>(undefined);
  const [notificationPermission, setNotificationPermission] = useState<Notifications.PermissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  const registerForPushNotificationsAsync = async () => {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setError('Permission to receive notifications was denied');
        setNotificationPermission(finalStatus);
        return;
      }

      setNotificationPermission(finalStatus);

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      const token = tokenData.data;
      setPushToken(token);

      // Register with CLEO bridge
      const deviceId = Constants.deviceId || 'unknown';
      const deviceType = (Platform.OS === 'ios' ? 'ios' : 'android') as 'ios' | 'android';

      await bridgeClient.registerPushToken(token, deviceId, deviceType);
      console.log('[push] Token registered with CLEO:', token);

      // Set up notification listener for foreground messages
      const subscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          console.log('[push] Notification received:', response.notification.request.content);
          // Handle notification tap - navigate to relevant screen based on data
          const data = response.notification.request.content.data;
          if (data?.type === 'briefing') {
            // Navigate to home tab or briefing screen
            console.log('[push] Briefing notification tapped');
          } else if (data?.type === 'alert') {
            // Navigate to alerts screen
            console.log('[push] Alert notification tapped');
          }
        }
      );

      return () => {
        subscription.remove();
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to register push token: ${errorMsg}`);
      console.error('[push] Registration failed:', errorMsg);
    }
  };

  return {
    pushToken,
    notificationPermission,
    error,
    isRegistered: pushToken !== undefined && notificationPermission === 'granted',
  };
}
