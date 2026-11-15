import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getUserLevelInfo,
  calculateStreakUpdate,
  computeHeartRecovery,
  checkQuestionAnswer,
  canRefillHeartsWithCoins,
  normalizeClassCode,
  generateClassCode,
  parseJoinCodeFromUrl,
  computeOverallAccuracy,
  getCefrEstimate,
  updateDailyXpHistory,
  HEART_RECOVERY_SECONDS,
} from './gameLogic';

test('getUserLevelInfo computes level and progress correctly', () => {
  assert.deepEqual(getUserLevelInfo(0), {
    level: 1,
    currentLevelXp: 0,
    xpPerLevel: 50,
    progressPercent: 0,
  });
  assert.deepEqual(getUserLevelInfo(75), {
    level: 2,
    currentLevelXp: 25,
    xpPerLevel: 50,
    progressPercent: 50,
  });
});

test('calculateStreakUpdate handles same day, consecutive day, and missed day', () => {
  assert.deepEqual(calculateStreakUpdate(3, 5, '2026-11-15', '2026-11-15'), {
    streak: 3,
    longestStreak: 5,
  });
  assert.deepEqual(calculateStreakUpdate(3, 3, '2026-11-14', '2026-11-15'), {
    streak: 4,
    longestStreak: 4,
  });
  assert.deepEqual(calculateStreakUpdate(4, 6, '2026-11-10', '2026-11-15'), {
    streak: 1,
    longestStreak: 6,
  });
});

test('computeHeartRecovery restores hearts every 30 minutes', () => {
  const start = 1000000;
  const halfWay = computeHeartRecovery(3, start, start + 900 * 1000);
  assert.equal(halfWay.hearts, 3);
  assert.equal(halfWay.secondsUntilNextHeart, 900);

  const oneHeart = computeHeartRecovery(3, start, start + HEART_RECOVERY_SECONDS * 1000);
  assert.equal(oneHeart.hearts, 4);
  assert.equal(oneHeart.secondsUntilNextHeart, HEART_RECOVERY_SECONDS);

  const full = computeHeartRecovery(3, start, start + HEART_RECOVERY_SECONDS * 4 * 1000);
  assert.equal(full.hearts, 5);
  assert.equal(full.lastHeartLossTime, null);
  assert.equal(full.secondsUntilNextHeart, 0);
});

test('checkQuestionAnswer validates multiple choice, translation, and word arrangement', () => {
  assert.equal(
    checkQuestionAnswer({ type: 'multiple_choice', correctAnswer: 'Good morning' }, 'good morning ', []),
    true
  );
  assert.equal(
    checkQuestionAnswer({ type: 'translation', correctAnswer: 'Hello, how are you?' }, 'hello how are you', []),
    true
  );
  assert.equal(
    checkQuestionAnswer(
      { type: 'word_arrangement', correctAnswer: ['I', 'am', 'from', 'Indonesia'] },
      '',
      ['I', 'am', 'from', 'Indonesia']
    ),
    true
  );
  assert.equal(
    checkQuestionAnswer({ type: 'word_arrangement', correctAnswer: ['I', 'am'] }, '', []),
    false
  );
});

test('canRefillHeartsWithCoins checks heart deficit and coin balance', () => {
  assert.equal(canRefillHeartsWithCoins(5, 100), false);
  assert.equal(canRefillHeartsWithCoins(3, 49), false);
  assert.equal(canRefillHeartsWithCoins(3, 50), true);
});

test('class code helpers normalize, generate, and parse join URLs cleanly', () => {
  assert.equal(normalizeClassCode(' eng-10a! '), 'ENG-10A');
  const code = generateClassCode('KELAS');
  assert.equal(code.startsWith('KEL'), true);
  assert.equal(code.length, 7);
  assert.equal(parseJoinCodeFromUrl('?join=eng402', '/'), 'ENG402');
  assert.equal(parseJoinCodeFromUrl('', '/join/kel99a'), 'KEL99A');
  assert.equal(parseJoinCodeFromUrl('', '/'), null);
});

test('analytics helpers compute accuracy, CEFR estimate, and daily XP history', () => {
  assert.equal(computeOverallAccuracy(0, 0), 0);
  assert.equal(computeOverallAccuracy(8, 10), 80);
  assert.equal(getCefrEstimate(1, 20).code, 'A1');
  assert.equal(getCefrEstimate(16, 20).code, 'C1');

  const updated = updateDailyXpHistory([{ date: '2026-11-14', xp: 20 }], '2026-11-15', 15);
  assert.deepEqual(updated, [
    { date: '2026-11-14', xp: 20 },
    { date: '2026-11-15', xp: 15 },
  ]);
});
