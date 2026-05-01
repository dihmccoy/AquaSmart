import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { UserProfile } from "./storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensurePermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const settings = await Notifications.getPermissionsAsync();
  let granted =
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted =
      req.granted ||
      req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("water-reminders", {
      name: "Lembretes de Água",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#00B4D8",
    });
  }
  return granted;
}

export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

const REMINDER_TITLES = [
  "Hora de hidratar 💧",
  "Beba um copo de água 🥤",
  "Seu corpo agradece 💙",
  "Pequenos goles, grandes resultados",
  "Vamos manter a hidratação?",
  "Um copinho agora cai bem 💦",
];

const REMINDER_BODIES = [
  "Que tal um copo de água agora?",
  "Mantenha o ritmo da sua meta diária.",
  "Hidratação é energia. Vai um gole!",
  "Você está indo super bem. Continue!",
  "Seu cérebro funciona melhor hidratado.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Schedules smart reminders for today between wake time and sleep time.
 * Frequency = how many reminders to fit so user reaches dailyGoalMl.
 * We aim for cupSize ml per reminder, evenly spaced.
 */
export async function scheduleSmartReminders(
  profile: UserProfile
): Promise<number> {
  if (Platform.OS === "web") return 0;
  if (!profile.notificationsEnabled) return 0;

  await cancelAllReminders();

  const cupSize = profile.cupSizeMl > 0 ? profile.cupSizeMl : 250;
  const totalReminders = Math.max(
    4,
    Math.min(14, Math.ceil(profile.dailyGoalMl / cupSize))
  );

  const wakeMin = profile.wakeHour * 60 + profile.wakeMinute;
  const sleepMin = profile.sleepHour * 60 + profile.sleepMinute;

  // Active window length in minutes
  let windowMin: number;
  if (sleepMin > wakeMin) {
    windowMin = sleepMin - wakeMin;
  } else {
    windowMin = 24 * 60 - wakeMin + sleepMin;
  }
  // pad first reminder 30min after wake, last 30min before sleep
  const startOffset = 30;
  const endOffset = 30;
  const usableWindow = Math.max(60, windowMin - startOffset - endOffset);
  const interval = Math.floor(usableWindow / Math.max(1, totalReminders - 1));

  let scheduled = 0;
  for (let i = 0; i < totalReminders; i++) {
    const minutesFromWake = startOffset + i * interval;
    const targetMin = (wakeMin + minutesFromWake) % (24 * 60);
    const hour = Math.floor(targetMin / 60);
    const minute = targetMin % 60;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: pick(REMINDER_TITLES),
        body: pick(REMINDER_BODIES),
        sound: "default",
        data: { type: "water-reminder", index: i },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute,
        repeats: true,
        channelId: "water-reminders",
      },
    });
    scheduled++;
  }
  return scheduled;
}
