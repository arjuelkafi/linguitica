import { DailyXpPoint, Question } from '../types';

export const MAX_HEARTS = 5;
export const HEART_RECOVERY_SECONDS = 1800; // 30 minutes
export const HEART_REFILL_COST_COINS = 50;

export function getUserLevelInfo(xp: number): {
  level: number;
  currentLevelXp: number;
  xpPerLevel: number;
  progressPercent: number;
} {
  const safeXp = Math.max(0, xp);
  const xpPerLevel = 50;
  const level = Math.floor(safeXp / xpPerLevel) + 1;
  const currentLevelXp = safeXp % xpPerLevel;
  const progressPercent = Math.round((currentLevelXp / xpPerLevel) * 100);
  return { level, currentLevelXp, xpPerLevel, progressPercent };
}

export function calculateStreakUpdate(
  currentStreak: number,
  longestStreak: number,
  lastActiveDate: string,
  todayDate: string
): { streak: number; longestStreak: number } {
  if (lastActiveDate === todayDate) {
    return { streak: currentStreak, longestStreak: Math.max(longestStreak, currentStreak) };
  }

  const todayMs = new Date(`${todayDate}T00:00:00Z`).getTime();
  const yesterdayDate = new Date(todayMs - 86400000).toISOString().split('T')[0];

  const newStreak = lastActiveDate === yesterdayDate ? currentStreak + 1 : 1;
  const newLongest = Math.max(longestStreak, newStreak);

  return { streak: newStreak, longestStreak: newLongest };
}

export function computeHeartRecovery(
  currentHearts: number,
  lastHeartLossTime: number | null,
  nowMs: number
): { hearts: number; lastHeartLossTime: number | null; secondsUntilNextHeart: number } {
  if (currentHearts >= MAX_HEARTS || !lastHeartLossTime) {
    return { hearts: MAX_HEARTS, lastHeartLossTime: null, secondsUntilNextHeart: 0 };
  }

  const elapsedSeconds = Math.max(0, Math.floor((nowMs - lastHeartLossTime) / 1000));
  const heartsToGain = Math.floor(elapsedSeconds / HEART_RECOVERY_SECONDS);

  if (heartsToGain > 0) {
    const newHearts = Math.min(MAX_HEARTS, currentHearts + heartsToGain);
    const remainingSeconds = elapsedSeconds % HEART_RECOVERY_SECONDS;
    const newLastLossTime = newHearts >= MAX_HEARTS ? null : nowMs - remainingSeconds * 1000;
    const secondsUntilNextHeart =
      newHearts >= MAX_HEARTS ? 0 : HEART_RECOVERY_SECONDS - remainingSeconds;
    return {
      hearts: newHearts,
      lastHeartLossTime: newLastLossTime,
      secondsUntilNextHeart,
    };
  }

  return {
    hearts: currentHearts,
    lastHeartLossTime,
    secondsUntilNextHeart: Math.max(0, HEART_RECOVERY_SECONDS - elapsedSeconds),
  };
}

export function checkQuestionAnswer(
  question: Pick<Question, 'type' | 'correctAnswer'>,
  selectedAnswer: string,
  arrangedWords: string[]
): boolean {
  if (question.type === 'word_arrangement') {
    const expectedWords = Array.isArray(question.correctAnswer)
      ? question.correctAnswer
      : question.correctAnswer.split(' ');
    const userSentence = arrangedWords.join(' ').trim().toLowerCase();
    const expectedSentence = expectedWords.join(' ').trim().toLowerCase();
    return userSentence.length > 0 && userSentence === expectedSentence;
  }

  if (question.type === 'translation') {
    const target = Array.isArray(question.correctAnswer)
      ? question.correctAnswer[0]
      : question.correctAnswer;
    const cleanUser = selectedAnswer.trim().toLowerCase().replace(/[.,!?]/g, '');
    const cleanTarget = target.trim().toLowerCase().replace(/[.,!?]/g, '');
    return cleanUser.length > 0 && cleanUser === cleanTarget;
  }

  const target = Array.isArray(question.correctAnswer)
    ? question.correctAnswer[0]
    : question.correctAnswer;
  return (
    selectedAnswer.trim().length > 0 &&
    selectedAnswer.trim().toLowerCase() === target.trim().toLowerCase()
  );
}

export function canRefillHeartsWithCoins(hearts: number, coins: number): boolean {
  return hearts < MAX_HEARTS && coins >= HEART_REFILL_COST_COINS;
}

export function normalizeClassCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 24);
}

export function generateClassCode(prefix = 'ENG'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const cleanPrefix = normalizeClassCode(prefix).slice(0, 3) || 'ENG';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${cleanPrefix}${suffix}`;
}

export function parseJoinCodeFromUrl(search: string, pathname: string): string | null {
  try {
    const params = new URLSearchParams(search);
    const joinParam = params.get('join');
    if (joinParam) {
      const normalized = normalizeClassCode(joinParam);
      if (normalized.length >= 3) return normalized;
    }
    const match = pathname.match(/\/join\/([a-zA-Z0-9_-]+)/i);
    if (match && match[1]) {
      const normalized = normalizeClassCode(match[1]);
      if (normalized.length >= 3) return normalized;
    }
  } catch {
    return null;
  }
  return null;
}

export function computeOverallAccuracy(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((correct / total) * 100)));
}

export function getCefrEstimate(
  completedCount: number,
  totalLessons: number
): { code: string; label: string } {
  const ratio = totalLessons > 0 ? completedCount / totalLessons : 0;
  if (ratio >= 0.8) return { code: 'C1', label: 'Mahir (Advanced)' };
  if (ratio >= 0.6) return { code: 'B2', label: 'Menengah Atas' };
  if (ratio >= 0.4) return { code: 'B1', label: 'Menengah' };
  if (ratio >= 0.2) return { code: 'A2', label: 'Dasar Lanjutan' };
  return { code: 'A1', label: 'Pemula' };
}

export function updateDailyXpHistory(
  history: DailyXpPoint[],
  dateStr: string,
  earnedXp: number
): DailyXpPoint[] {
  const map = new Map<string, number>();
  for (const item of history) {
    map.set(item.date, (map.get(item.date) || 0) + item.xp);
  }
  map.set(dateStr, (map.get(dateStr) || 0) + Math.max(0, earnedXp));
  return Array.from(map.entries())
    .map(([date, xp]) => ({ date, xp }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
}
