import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  // Guard: expo-notifications not supported in Expo Go
  if (Constants.appOwnership === 'expo') {
    console.log('Push notifications not supported in Expo Go — skipping.');
    return undefined;
  }

  const Notifications = await import('expo-notifications');

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (!Device.isDevice) {
    console.log('Must use physical device for push notifications.');
    return undefined;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return undefined;

  try {
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('Expo Push Token:', token);
    return token;
  } catch (e) {
    console.error('Error getting push token:', e);
    return undefined;
  }
}

// ── Local daily "come back" reminder ─────────────────────────────────────────
// A single on-device scheduled notification (no backend). Identified by a fixed
// id so rescheduling replaces it rather than stacking duplicates.
const QUIZ_REMINDER_ID = 'quiz-daily-reminder';

// Set ONCE, early (called at App module load). Controls how a notification is
// presented — including while the app is foregrounded. expo-notifications 0.32
// deprecated `shouldShowAlert` in favour of `shouldShowBanner` + `shouldShowList`.
export async function setupNotificationHandler(): Promise<void> {
  if (Constants.appOwnership === 'expo') return; // not supported in Expo Go
  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// (Re)schedule the daily quiz reminder for 7:00 PM local. Called on quiz activity
// (and toggle-on); rescheduling just refreshes the single reminder. No-ops in Expo
// Go / on simulators / when permission isn't granted.
//
// Pass the user's current daily-streak count to personalize the copy: a streak of
// 2+ gets a loss-aversion "keep your streak alive" message; otherwise the generic
// nudge. Called with no arg (e.g. the Settings toggle) → generic copy.
export async function scheduleQuizReminder(streak?: number): Promise<void> {
  if (Constants.appOwnership === 'expo') return;
  if (!Device.isDevice) return;

  const Notifications = await import('expo-notifications');

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return; // don't schedule without permission

  // Replace any existing reminder so we never stack duplicates.
  await Notifications.cancelScheduledNotificationAsync(QUIZ_REMINDER_ID).catch(() => {});

  // Next occurrence of 7:00 PM local: today if it's still before 7pm, else tomorrow.
  // One-off (DATE) so each quiz re-arms it forward — it only fires if the user goes
  // quiet (no quiz before the next 7pm).
  const next = new Date();
  next.setHours(19, 0, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);

  const hasStreak = typeof streak === 'number' && streak >= 2;
  const content = hasStreak
    ? {
        title: 'Keep your streak alive! 🔥',
        body: `Don't lose your ${streak}-day streak — take today's quiz in SportsWise.`,
        data: { type: 'quiz-reminder' },
      }
    : {
        title: "Ready for today's quiz? 🏆",
        body: 'Keep your game IQ sharp — take a quick quiz in SportsWise.',
        data: { type: 'quiz-reminder' },
      };

  await Notifications.scheduleNotificationAsync({
    identifier: QUIZ_REMINDER_ID,
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: next,
    },
  });
}

// Cancel the reminder (e.g. when the Game Alerts toggle is turned off).
export async function cancelQuizReminder(): Promise<void> {
  if (Constants.appOwnership === 'expo') return;
  const Notifications = await import('expo-notifications');
  await Notifications.cancelScheduledNotificationAsync(QUIZ_REMINDER_ID).catch(() => {});
}