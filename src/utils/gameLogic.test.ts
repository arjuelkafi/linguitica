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

import { LEARNING_LEVELS } from '../data/curriculum';

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
      { type: 'translation', correctAnswer: 'Hello, how are you?' },
      '',
      ['Hello,', 'how', 'are', 'you?']
    ),
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

test('all 8 curriculum levels have accurate, unique, and solvable questions', () => {
  assert.equal(LEARNING_LEVELS.length >= 8, true);
  const lessonIds = new Set<string>();
  const questionIds = new Set<string>();

  for (const level of LEARNING_LEVELS) {
    assert.equal(level.units.length > 0, true);
    for (const unit of level.units) {
      assert.equal(unit.lessons.length > 0, true);
      for (const lesson of unit.lessons) {
        assert.equal(lessonIds.has(lesson.id), false, `Duplicate lesson id: ${lesson.id}`);
        lessonIds.add(lesson.id);
        assert.equal(lesson.questions.length > 0, true);

        for (const q of lesson.questions) {
          assert.equal(questionIds.has(q.id), false, `Duplicate question id: ${q.id}`);
          questionIds.add(q.id);
          assert.equal(q.prompt.trim().length > 0, true, `Empty prompt in ${q.id}`);
          assert.equal(q.explanation.trim().length > 0, true, `Empty explanation in ${q.id}`);

          if (q.type === 'word_arrangement') {
            assert.equal(Array.isArray(q.correctAnswer), true, `${q.id} word_arrangement must have array correctAnswer`);
            const words = q.correctAnswer as string[];
            const bank = [...(q.options || [])];
            for (const w of words) {
              const idx = bank.indexOf(w);
              assert.notEqual(idx, -1, `${q.id} missing word "${w}" in options`);
              bank.splice(idx, 1);
            }
          } else if (q.type === 'translation') {
            const target = String(q.correctAnswer);
            const opts = q.options || [];
            if (!opts.includes(target)) {
              const tokens = target.split(' ');
              const bank = [...opts];
              for (const t of tokens) {
                const idx = bank.indexOf(t);
                assert.notEqual(idx, -1, `${q.id} missing translation token "${t}" in options`);
                bank.splice(idx, 1);
              }
            }
          } else {
            const opts = q.options || [];
            assert.equal(opts.length, 4, `${q.id} should have 4 unique options`);
            assert.equal(new Set(opts).size, 4, `${q.id} has duplicate options`);
            assert.equal(
              opts.includes(String(q.correctAnswer)),
              true,
              `${q.id} correctAnswer "${q.correctAnswer}" not in options`
            );
          }
        }
      }
    }
  }
});
