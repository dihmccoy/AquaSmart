import AsyncStorage from "@react-native-async-storage/async-storage";

export type ActivityLevel = "sedentary" | "moderate" | "active";

export interface UserProfile {
  name?: string;
  weight: number; // kg
  age: number;
  activity: ActivityLevel;
  wakeHour: number; // 0-23
  wakeMinute: number; // 0-59
  sleepHour: number; // 0-23
  sleepMinute: number; // 0-59
  dailyGoalMl: number;
  notificationsEnabled: boolean;
  cupSizeMl: number;
  createdAt: string;
}

export interface IntakeEntry {
  id: string;
  amountMl: number;
  timestamp: string; // ISO
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  totalMl: number;
  goalMl: number;
  entries: IntakeEntry[];
}

const KEYS = {
  PROFILE: "@aquasmart/profile",
  LOGS: "@aquasmart/logs",
  ACHIEVEMENTS: "@aquasmart/achievements",
  STREAK: "@aquasmart/streak",
};

export const todayKey = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const dateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export async function getProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.PROFILE);
  return raw ? JSON.parse(raw) : null;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

export async function clearProfile(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.PROFILE,
    KEYS.LOGS,
    KEYS.ACHIEVEMENTS,
    KEYS.STREAK,
  ]);
}

export async function getAllLogs(): Promise<Record<string, DayLog>> {
  const raw = await AsyncStorage.getItem(KEYS.LOGS);
  return raw ? JSON.parse(raw) : {};
}

export async function getDayLog(date: string): Promise<DayLog | null> {
  const all = await getAllLogs();
  return all[date] ?? null;
}

export async function getOrCreateTodayLog(goalMl: number): Promise<DayLog> {
  const all = await getAllLogs();
  const key = todayKey();
  if (!all[key]) {
    all[key] = { date: key, totalMl: 0, goalMl, entries: [] };
    await AsyncStorage.setItem(KEYS.LOGS, JSON.stringify(all));
  } else if (all[key].goalMl !== goalMl) {
    all[key].goalMl = goalMl;
    await AsyncStorage.setItem(KEYS.LOGS, JSON.stringify(all));
  }
  return all[key];
}

export async function addIntake(amountMl: number, goalMl: number): Promise<DayLog> {
  const all = await getAllLogs();
  const key = todayKey();
  if (!all[key]) {
    all[key] = { date: key, totalMl: 0, goalMl, entries: [] };
  }
  const entry: IntakeEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    amountMl,
    timestamp: new Date().toISOString(),
  };
  all[key].entries.push(entry);
  all[key].totalMl += amountMl;
  all[key].goalMl = goalMl;
  await AsyncStorage.setItem(KEYS.LOGS, JSON.stringify(all));
  return all[key];
}

export async function removeIntake(entryId: string): Promise<DayLog | null> {
  const all = await getAllLogs();
  const key = todayKey();
  if (!all[key]) return null;
  const entry = all[key].entries.find((e) => e.id === entryId);
  if (!entry) return all[key];
  all[key].entries = all[key].entries.filter((e) => e.id !== entryId);
  all[key].totalMl = Math.max(0, all[key].totalMl - entry.amountMl);
  await AsyncStorage.setItem(KEYS.LOGS, JSON.stringify(all));
  return all[key];
}

export async function getUnlockedAchievements(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEYS.ACHIEVEMENTS);
  return raw ? JSON.parse(raw) : [];
}

export async function setUnlockedAchievements(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(ids));
}
