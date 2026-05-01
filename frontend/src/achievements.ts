import type { DayLog } from "./storage";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // ionicons name
  check: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  totalDays: number;
  daysOnGoal: number;
  currentStreak: number;
  bestStreak: number;
  totalLifetimeMl: number;
  todayMl: number;
  todayGoal: number;
  logs: DayLog[];
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-sip",
    title: "Primeiro Gole",
    description: "Registre sua primeira dose de água",
    icon: "water-outline",
    check: (c) => c.totalLifetimeMl > 0,
  },
  {
    id: "half-day",
    title: "Meio Caminho",
    description: "Atinja 50% da meta diária",
    icon: "speedometer-outline",
    check: (c) => c.todayGoal > 0 && c.todayMl >= c.todayGoal * 0.5,
  },
  {
    id: "daily-goal",
    title: "Meta Cumprida",
    description: "Bata 100% da sua meta diária",
    icon: "checkmark-circle-outline",
    check: (c) => c.todayGoal > 0 && c.todayMl >= c.todayGoal,
  },
  {
    id: "streak-3",
    title: "Trinca Hidratada",
    description: "3 dias seguidos batendo a meta",
    icon: "flame-outline",
    check: (c) => c.currentStreak >= 3 || c.bestStreak >= 3,
  },
  {
    id: "streak-7",
    title: "Semana Perfeita",
    description: "7 dias seguidos batendo a meta",
    icon: "trophy-outline",
    check: (c) => c.currentStreak >= 7 || c.bestStreak >= 7,
  },
  {
    id: "streak-30",
    title: "Mês de Ouro",
    description: "30 dias seguidos batendo a meta",
    icon: "ribbon-outline",
    check: (c) => c.currentStreak >= 30 || c.bestStreak >= 30,
  },
  {
    id: "lifetime-10l",
    title: "10 Litros",
    description: "Consuma 10L acumulados",
    icon: "beaker-outline",
    check: (c) => c.totalLifetimeMl >= 10000,
  },
  {
    id: "lifetime-100l",
    title: "Centenário",
    description: "Consuma 100L acumulados",
    icon: "rocket-outline",
    check: (c) => c.totalLifetimeMl >= 100000,
  },
];

export function computeContext(logs: DayLog[], todayDate: string): AchievementContext {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const today = sorted.find((l) => l.date === todayDate);

  let totalLifetimeMl = 0;
  let daysOnGoal = 0;
  for (const log of sorted) {
    totalLifetimeMl += log.totalMl;
    if (log.goalMl > 0 && log.totalMl >= log.goalMl) daysOnGoal++;
  }

  // Compute streak (consecutive days hitting goal up to today)
  const dayHit: Record<string, boolean> = {};
  for (const log of sorted) {
    dayHit[log.date] = log.goalMl > 0 && log.totalMl >= log.goalMl;
  }
  let currentStreak = 0;
  let cursor = new Date(todayDate);
  // include today only if hit; otherwise start from yesterday
  if (dayHit[todayDate]) {
    while (true) {
      const k = formatDate(cursor);
      if (dayHit[k]) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
  } else {
    cursor.setDate(cursor.getDate() - 1);
    while (true) {
      const k = formatDate(cursor);
      if (dayHit[k]) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
  }

  // Best streak
  let bestStreak = 0;
  let running = 0;
  const allDates = Object.keys(dayHit).sort();
  let prev: Date | null = null;
  for (const d of allDates) {
    const dt = new Date(d);
    if (prev && (dt.getTime() - prev.getTime()) / 86400000 !== 1) {
      running = 0;
    }
    if (dayHit[d]) {
      running++;
      if (running > bestStreak) bestStreak = running;
    } else {
      running = 0;
    }
    prev = dt;
  }

  return {
    totalDays: sorted.length,
    daysOnGoal,
    currentStreak,
    bestStreak,
    totalLifetimeMl,
    todayMl: today?.totalMl ?? 0,
    todayGoal: today?.goalMl ?? 0,
    logs: sorted,
  };
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
