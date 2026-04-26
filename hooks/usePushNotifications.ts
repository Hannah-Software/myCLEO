import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { bridgeClient } from '../utils/bridge-client';
import { getDeviceId } from '../utils/device-id';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const LAST_TOKEN_KEY = 'cleo.push.lastToken.v1';

export function usePushNotifications() {
  const [pushToken, setPushToken] = useState<string | undefined>(undefined);
  const [permission, setPermission] = useState<Notifications.PermissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    const register = async () => {
      try {
        if (!Device.isDevice) {
          setError('Push notifications require a physical device');
          return;
        }

        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (cancelled) return;
        setPermission(finalStatus);
        if (finalStatus !== 'granted') {
          setError('Permission to receive notifications was denied');
          return;
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId || projectId === 'REPLACE_WITH_EAS_PROJECT_ID') {
          setError('EAS projectId not set; run eas init to enable push');
          return;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        if (cancelled) return;
        const token = tokenData.data;
        setPushToken(token);

        const lastToken = await AsyncStorage.getItem(LAST_TOKEN_KEY);
        if (lastToken === token) {
          // Already registered with the bridge; skip the network call.
          return;
        }

        const deviceId = await getDeviceId();
        const deviceType = (Platform.OS === 'ios' ? 'ios' : 'android') as 'ios' | 'android';

        try {
          await bridgeClient.registerPushToken(token, deviceId, deviceType);
          await AsyncStorage.setItem(LAST_TOKEN_KEY, token);
          console.log('[push] token registered with bridge:', token.slice(0, 16) + '…');
        } catch (regErr) {
          // bridge-client already enqueued for retry via the offline queue
          // (registerPushToken opted in via enqueueOnFailure: true). Don't
          // store LAST_TOKEN_KEY so the next successful run still updates.
          console.warn(
            '[push] bridge registration deferred to offline queue:',
            regErr instanceof Error ? regErr.message : regErr
          );
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Push setup failed: ${msg}`);
        console.error('[push] setup failed:', msg);
      }
    };

    register();

    subscriptionRef.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.type === 'briefing') {
          console.log('[push] Briefing notification tapped');
        } else if (data?.type === 'alert') {
          console.log('[push] Alert notification tapped');
        }
      }
    );

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, []);

  return {
    pushToken,
    notificationPermission: permission,
    error,
    isRegistered: pushToken !== undefined && permission === 'granted',
  };
}
