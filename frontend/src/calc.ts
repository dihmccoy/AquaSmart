import type { ActivityLevel } from "./storage";

/**
 * Calcula a meta diária de água em ml com base em:
 * - Peso: base 35ml por kg
 * - Idade: ajuste para idosos (rim filtra menos)
 * - Atividade: sedentário 1x, moderado 1.15x, ativo 1.3x
 */
export function calculateDailyGoal(
  weightKg: number,
  age: number,
  activity: ActivityLevel
): number {
  let base = weightKg * 35;

  if (age >= 56 && age <= 65) {
    base *= 0.92;
  } else if (age > 65) {
    base *= 0.85;
  } else if (age < 18) {
    base *= 1.05;
  }

  const activityMultiplier =
    activity === "active" ? 1.3 : activity === "moderate" ? 1.15 : 1.0;
  base *= activityMultiplier;

  // Round to nearest 50ml
  return Math.round(base / 50) * 50;
}

export function formatTime(hour: number, minute: number): string {
  const h = String(hour).padStart(2, "0");
  const m = String(minute).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Returns true if given minutes-of-day is within sleep window.
 * Sleep window may cross midnight.
 */
export function isWithinSleepHours(
  minutesOfDay: number,
  sleepHour: number,
  sleepMinute: number,
  wakeHour: number,
  wakeMinute: number
): boolean {
  const sleep = sleepHour * 60 + sleepMinute;
  const wake = wakeHour * 60 + wakeMinute;
  if (sleep === wake) return false;
  if (sleep < wake) {
    return minutesOfDay >= sleep && minutesOfDay < wake;
  }
  // crosses midnight
  return minutesOfDay >= sleep || minutesOfDay < wake;
}

/**
 * Calculates how many ml the user should have drunk by 'now'
 * to be on pace to hit goalMl by sleep time.
 */
export function expectedMlByNow(
  goalMl: number,
  wakeMin: number,
  sleepMin: number,
  nowMin: number
): number {
  let total = sleepMin > wakeMin ? sleepMin - wakeMin : 24 * 60 - wakeMin + sleepMin;
  if (total <= 0) total = 16 * 60;
  let elapsed: number;
  if (sleepMin > wakeMin) {
    elapsed = Math.max(0, Math.min(total, nowMin - wakeMin));
  } else {
    if (nowMin >= wakeMin) elapsed = nowMin - wakeMin;
    else if (nowMin < sleepMin) elapsed = 24 * 60 - wakeMin + nowMin;
    else elapsed = total;
  }
  return Math.round((elapsed / total) * goalMl);
}
