import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Achievement,
  LeaderboardEntry,
  QuestionType,
  UserProfile,
  UserRole,
  UserSettings,
  UserStats,
} from '../types';
import { LEARNING_LEVELS, INITIAL_ACHIEVEMENTS } from '../data/curriculum';
import { soundService } from '../utils/sound';
import {
  MAX_HEARTS,
  HEART_REFILL_COST_COINS,
  calculateStreakUpdate,
  computeHeartRecovery,
  canRefillHeartsWithCoins,
  updateDailyXpHistory,
  parseJoinCodeFromUrl,
} from '../utils/gameLogic';
import { auth, googleProvider } from '../firebase';
import {
  fetchUserFromCloud,
  syncLocalJoinedMembershipProgress,
  syncUserProgressToCloud,
} from '../services/firestoreService';

interface AuthContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  authReady: boolean;
  stats: UserStats;
  settings: UserSettings;
  achievements: Achievement[];
  leaderboard: LeaderboardEntry[];
  pendingJoinCode: string | null;
  clearPendingJoinCode: () => void;
  loginWithName: (name: string, role?: UserRole) => Promise<void>;
  loginWithGoogle: (role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (name: string, role?: UserRole) => void;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  recordQuestionAttempt: (questionType: QuestionType, isCorrect: boolean) => void;
  recordLessonCompleted: (
    lessonId: string,
    earnedXp: number,
    isPerfect: boolean,
    isCheckpoint?: boolean
  ) => { unlockedNewLesson: boolean };
  unlockLevel: (levelId: number) => void;
  consumeHeart: () => boolean;
  refillHeartsFull: () => void;
  refillHeartsWithCoins: () => boolean;
  resetProgress: () => void;
  secondsUntilNextHeart: number;
}

const STORAGE_KEYS = {
  USER: 'linguitica_user',
  STATS: 'linguitica_stats',
  SETTINGS: 'linguitica_settings',
  ACHIEVEMENTS: 'linguitica_achievements',
  NAME_PROFILES: 'linguitica_name_profiles_v1',
};

const DEFAULT_SETTINGS: UserSettings = {
  soundEnabled: true,
  darkMode: false,
  dailyGoalXp: 30,
  remindersEnabled: true,
};

function createEmptySkillStats(): Record<QuestionType, { correct: number; total: number }> {
  return {
    multiple_choice: { correct: 0, total: 0 },
    translation: { correct: 0, total: 0 },
    word_arrangement: { correct: 0, total: 0 },
    fill_blank: { correct: 0, total: 0 },
    listening: { correct: 0, total: 0 },
    vocabulary: { correct: 0, total: 0 },
  };
}

function createDefaultStats(): UserStats {
  const today = new Date().toISOString().split('T')[0];
  return {
    xp: 0,
    coins: 50,
    hearts: 5,
    lastHeartLossTime: null,
    streak: 0,
    longestStreak: 0,
    lastActiveDate: '',
    completedLessons: [],
    unlockedLessons: ['l1-1-1'],
    currentLevelId: 1,
    totalQuestionsAnswered: 0,
    totalCorrectAnswers: 0,
    skillStats: createEmptySkillStats(),
    dailyXpHistory: [{ date: today, xp: 0 }],
  };
}

function createDemoStats(): UserStats {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const d1 = new Date(today.getTime() - 2 * 86400000);
  const d2 = new Date(today.getTime() - 1 * 86400000);
  return {
    xp: 45,
    coins: 80,
    hearts: 5,
    lastHeartLossTime: null,
    streak: 2,
    longestStreak: 4,
    lastActiveDate: fmt(today),
    completedLessons: ['l1-1-1'],
    unlockedLessons: ['l1-1-1', 'l1-1-2'],
    currentLevelId: 1,
    totalQuestionsAnswered: 10,
    totalCorrectAnswers: 9,
    skillStats: {
      multiple_choice: { correct: 3, total: 3 },
      translation: { correct: 2, total: 2 },
      word_arrangement: { correct: 1, total: 2 },
      fill_blank: { correct: 1, total: 1 },
      listening: { correct: 1, total: 1 },
      vocabulary: { correct: 1, total: 1 },
    },
    dailyXpHistory: [
      { date: fmt(d1), xp: 15 },
      { date: fmt(d2), xp: 15 },
      { date: fmt(today), xp: 15 },
    ],
  };
}

const DEFAULT_GUEST_USER: UserProfile = {
  id: 'guest_learner',
  name: 'Pelajar',
  username: 'pelajar',
  role: 'student',
  avatar: 'globe',
  isCloudSynced: false,
  authProvider: 'guest',
  createdAt: new Date().toISOString(),
};

const DEFAULT_DEMO_USER: UserProfile = {
  id: 'user_demo_budi',
  name: 'Budi Pembelajar',
  username: 'budipembelajar',
  role: 'student',
  avatar: 'globe',
  isCloudSynced: false,
  authProvider: 'name',
  createdAt: new Date().toISOString(),
};

const INITIAL_BOT_LEADERBOARD: LeaderboardEntry[] = [
  { id: 'bot_1', name: 'Nadia Pratama', username: 'nadiap', avatar: 'globe', xp: 280 },
  { id: 'bot_2', name: 'Rian Saputra', username: 'rians', avatar: 'globe', xp: 210 },
  { id: 'bot_3', name: 'Siti Rahma', username: 'sitir', avatar: 'globe', xp: 165 },
  { id: 'bot_4', name: 'Dimas Anggara', username: 'dimasa', avatar: 'globe', xp: 120 },
  { id: 'bot_5', name: 'Alifia Putri', username: 'alifiap', avatar: 'globe', xp: 95 },
  { id: 'bot_6', name: 'Reza Fauzi', username: 'rezaf', avatar: 'globe', xp: 70 },
  { id: 'bot_7', name: 'Maya Melinda', username: 'mayam', avatar: 'globe', xp: 35 },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function safeParseStats(raw: string | null): UserStats {
  if (!raw) return createDefaultStats();
  try {
    const parsed = JSON.parse(raw);
    const base = createDefaultStats();
    return {
      ...base,
      ...parsed,
      skillStats: {
        ...base.skillStats,
        ...(parsed.skillStats || {}),
      },
      dailyXpHistory: Array.isArray(parsed.dailyXpHistory)
        ? parsed.dailyXpHistory
        : base.dailyXpHistory,
      completedLessons: Array.isArray(parsed.completedLessons)
        ? parsed.completedLessons
        : [],
      unlockedLessons:
        Array.isArray(parsed.unlockedLessons) && parsed.unlockedLessons.length > 0
          ? parsed.unlockedLessons
          : ['l1-1-1'],
    };
  } catch {
    return createDefaultStats();
  }
}

function getNameSlug(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  return slug || 'learner';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return parseJoinCodeFromUrl(window.location.search, window.location.pathname);
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      if (saved) return JSON.parse(saved);
      if (isAutostart) return DEFAULT_DEMO_USER;
      return DEFAULT_GUEST_USER;
    } catch {
      return DEFAULT_GUEST_USER;
    }
  });
  const isLoggedIn = Boolean(user && user.authProvider !== 'guest');

  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STATS);
      if (saved) return safeParseStats(saved);
      if (isAutostart) return createDemoStats();
      return createDefaultStats();
    } catch {
      return createDefaultStats();
    }
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
      return saved ? JSON.parse(saved) : INITIAL_ACHIEVEMENTS;
    } catch {
      return INITIAL_ACHIEVEMENTS;
    }
  });

  const [authReady, setAuthReady] = useState<boolean>(false);
  const [secondsUntilNextHeart, setSecondsUntilNextHeart] = useState<number>(0);
  const isManualAuthInProgressRef = useRef<boolean>(false);

  const clearPendingJoinCode = useCallback(() => {
    setPendingJoinCode(null);
    if (typeof window !== 'undefined' && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete('join');
      if (url.pathname.toLowerCase().startsWith('/join/')) {
        url.pathname = '/';
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && !isManualAuthInProgressRef.current) {
        try {
          const cloudData = await fetchUserFromCloud(fbUser.uid);
          if (cloudData?.profilePartial && cloudData?.statsPartial) {
            setUser((prev) => ({
              id: fbUser.uid,
              name: cloudData.profilePartial?.name || fbUser.displayName || prev?.name || 'Pengguna',
              username: cloudData.profilePartial?.username || prev?.username || 'learner',
              role: (cloudData.profilePartial?.role as UserRole) || prev?.role || 'student',
              avatar: 'globe',
              isCloudSynced: true,
              authProvider: fbUser.isAnonymous ? 'name' : 'google',
              createdAt: prev?.createdAt || new Date().toISOString(),
            }));
            setStats((prev) => ({
              ...prev,
              ...cloudData.statsPartial,
            }));
          } else {
            setUser((prev) =>
              prev && prev.authProvider !== 'guest'
                ? {
                    ...prev,
                    id: fbUser.uid,
                    isCloudSynced: true,
                    authProvider: fbUser.isAnonymous ? 'name' : 'google',
                  }
                : {
                    id: fbUser.uid,
                    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Pengguna',
                    username: getNameSlug(fbUser.displayName || 'learner'),
                    role: 'student',
                    avatar: 'globe',
                    isCloudSynced: true,
                    authProvider: fbUser.isAnonymous ? 'name' : 'google',
                    createdAt: new Date().toISOString(),
                  }
            );
          }
        } catch {
          // Ignore initial fetch errors cleanly
        }
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    soundService.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Persist logged-in user & stats by name key + active storage
  useEffect(() => {
    try {
      if (user && user.authProvider !== 'guest') {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        const slug = getNameSlug(user.name);
        const rawProfiles = localStorage.getItem(STORAGE_KEYS.NAME_PROFILES);
        const profileMap = rawProfiles ? JSON.parse(rawProfiles) : {};
        profileMap[slug] = { user, stats, achievements };
        localStorage.setItem(STORAGE_KEYS.NAME_PROFILES, JSON.stringify(profileMap));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    } catch {
      // ignore storage errors
    }
  }, [user, stats, achievements]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
      if (user) {
        syncLocalJoinedMembershipProgress(user, stats);
      }
    } catch {
      // ignore storage errors
    }
  }, [stats, user]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore storage errors
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
    } catch {
      // ignore storage errors
    }
  }, [achievements]);

  // Heart regeneration timer
  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => {
        const result = computeHeartRecovery(prev.hearts, prev.lastHeartLossTime, Date.now());
        setSecondsUntilNextHeart(result.secondsUntilNextHeart);
        if (
          result.hearts !== prev.hearts ||
          result.lastHeartLossTime !== prev.lastHeartLossTime
        ) {
          return {
            ...prev,
            hearts: result.hearts,
            lastHeartLossTime: result.lastHeartLossTime,
          };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const syncCloudSafe = useCallback(async (targetUser: UserProfile, targetStats: UserStats) => {
    if (!auth.currentUser) return;
    try {
      await syncUserProgressToCloud(targetUser, targetStats);
    } catch {
      // Logged in handleFirestoreError
    }
  }, []);

  const loginWithName = async (rawName: string, role: UserRole = 'student') => {
    const cleanName = rawName.trim();
    if (!cleanName) return;

    const slug = getNameSlug(cleanName);
    let restoredUser: UserProfile | null = null;
    let restoredStats: UserStats | null = null;
    let restoredAchievements: Achievement[] | null = null;

    // Check if this name already has local saved progress
    try {
      const rawProfiles = localStorage.getItem(STORAGE_KEYS.NAME_PROFILES);
      if (rawProfiles) {
        const profileMap = JSON.parse(rawProfiles);
        if (profileMap[slug]) {
          restoredUser = profileMap[slug].user;
          restoredStats = profileMap[slug].stats;
          restoredAchievements = profileMap[slug].achievements;
        }
      }
    } catch {
      // ignore
    }

    const isDemoBudi = slug === 'budipembelajar' && !restoredStats;
    const hasGuestProgress =
      user?.authProvider === 'guest' && (stats.xp > 0 || stats.completedLessons.length > 0);
    const nextStats = restoredStats
      ? safeParseStats(JSON.stringify(restoredStats))
      : hasGuestProgress
      ? stats
      : isDemoBudi
      ? createDemoStats()
      : createDefaultStats();

    let nextUid = restoredUser?.id || `user_${slug}_${Date.now()}`;
    let cloudSynced = false;

    isManualAuthInProgressRef.current = true;
    try {
      try {
        if (!auth.currentUser) {
          const cred = await signInAnonymously(auth);
          nextUid = cred.user.uid;
          cloudSynced = true;
        } else {
          nextUid = auth.currentUser.uid;
          cloudSynced = true;
        }
      } catch {
        cloudSynced = false;
      }

      const nextUser: UserProfile = {
        id: nextUid,
        name: cleanName,
        username: slug,
        role: restoredUser?.role || role,
        avatar: 'globe',
        isCloudSynced: cloudSynced,
        authProvider: 'name',
        createdAt: restoredUser?.createdAt || new Date().toISOString(),
      };

      setUser(nextUser);
      setStats(nextStats);
      if (restoredAchievements) setAchievements(restoredAchievements);

      if (cloudSynced) {
        await syncCloudSafe(nextUser, nextStats);
      }
    } finally {
      isManualAuthInProgressRef.current = false;
    }
  };

  const loginWithGoogle = async (role: UserRole = 'student') => {
    isManualAuthInProgressRef.current = true;
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const fbUser = cred.user;
      const displayName =
        user?.name && user.authProvider === 'name'
          ? user.name
          : fbUser.displayName || fbUser.email?.split('@')[0] || 'Pengguna';
      const slug = getNameSlug(displayName);

      let finalStats =
        stats.xp > 0 || stats.completedLessons.length > 0 ? stats : createDefaultStats();
      let finalRole = user?.authProvider !== 'guest' && user?.role ? user.role : role;

      try {
        const cloudData = await fetchUserFromCloud(fbUser.uid);
        if (cloudData?.statsPartial) {
          const cloudXp = cloudData.statsPartial.xp || 0;
          if (cloudXp >= finalStats.xp) {
            finalStats = { ...finalStats, ...cloudData.statsPartial };
          }
        }
        if (cloudData?.profilePartial?.role) {
          finalRole = cloudData.profilePartial.role as UserRole;
        }
      } catch {
        // new cloud user
      }

      const nextUser: UserProfile = {
        id: fbUser.uid,
        name: displayName,
        username: slug,
        role: finalRole,
        avatar: 'globe',
        isCloudSynced: true,
        authProvider: 'google',
        createdAt: user?.createdAt || new Date().toISOString(),
      };

      setUser(nextUser);
      setStats(finalStats);
      await syncCloudSafe(nextUser, finalStats);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/unauthorized-domain') {
        throw new Error('Login Google belum tersedia di alamat ini. Gunakan masuk dengan nama.');
      }
      if (code === 'auth/popup-blocked') {
        throw new Error('Popup login diblokir oleh browser. Izinkan popup lalu coba lagi.');
      }
      if (code === 'auth/popup-closed-by-user') {
        throw new Error('Jendela login Google ditutup sebelum selesai.');
      }
      throw new Error('Gagal masuk dengan Google. Coba lagi sebentar.');
    } finally {
      isManualAuthInProgressRef.current = false;
    }
  };

  const logout = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {
      // ignore signOut error
    }
    setUser(DEFAULT_GUEST_USER);
    localStorage.removeItem(STORAGE_KEYS.USER);
  };

  const updateProfile = (name: string, role?: UserRole) => {
    if (!user) return;
    const cleanName = name.trim();
    if (!cleanName) return;
    const updatedUser: UserProfile = {
      ...user,
      name: cleanName,
      username: getNameSlug(cleanName),
      role: role || user.role,
    };
    setUser(updatedUser);
    syncCloudSafe(updatedUser, stats);
  };

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const recordQuestionAttempt = (questionType: QuestionType, isCorrect: boolean) => {
    setStats((prev) => {
      const currentSkill = prev.skillStats[questionType] || { correct: 0, total: 0 };
      return {
        ...prev,
        totalQuestionsAnswered: prev.totalQuestionsAnswered + 1,
        totalCorrectAnswers: prev.totalCorrectAnswers + (isCorrect ? 1 : 0),
        skillStats: {
          ...prev.skillStats,
          [questionType]: {
            correct: currentSkill.correct + (isCorrect ? 1 : 0),
            total: currentSkill.total + 1,
          },
        },
      };
    });
  };

  const consumeHeart = (): boolean => {
    const stillAlive = stats.hearts - 1 > 0;
    setStats((prev) => {
      const newHearts = Math.max(0, prev.hearts - 1);
      return {
        ...prev,
        hearts: newHearts,
        lastHeartLossTime: prev.lastHeartLossTime || Date.now(),
      };
    });
    return stillAlive;
  };

  const refillHeartsFull = () => {
    setStats((prev) => {
      const next = {
        ...prev,
        hearts: MAX_HEARTS,
        lastHeartLossTime: null,
      };
      if (user) syncCloudSafe(user, next);
      return next;
    });
    setSecondsUntilNextHeart(0);
  };

  const refillHeartsWithCoins = (): boolean => {
    if (!canRefillHeartsWithCoins(stats.hearts, stats.coins)) {
      return false;
    }
    setStats((prev) => {
      const next = {
        ...prev,
        hearts: MAX_HEARTS,
        coins: prev.coins - HEART_REFILL_COST_COINS,
        lastHeartLossTime: null,
      };
      if (user) syncCloudSafe(user, next);
      return next;
    });
    setSecondsUntilNextHeart(0);
    return true;
  };

  const findNextLessonId = (currentLessonId: string): string | null => {
    const allLessons = LEARNING_LEVELS.flatMap((lvl) =>
      lvl.units.flatMap((u) => u.lessons)
    );
    const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId);
    if (currentIndex !== -1 && currentIndex + 1 < allLessons.length) {
      return allLessons[currentIndex + 1].id;
    }
    return null;
  };

  const unlockLevel = (levelId: number) => {
    const level = LEARNING_LEVELS.find((l) => l.id === levelId);
    if (!level || level.units.length === 0 || level.units[0].lessons.length === 0) return;
    const firstLessonId = level.units[0].lessons[0].id;
    setStats((prev) => {
      const nextUnlocked = Array.from(new Set([...prev.unlockedLessons, firstLessonId]));
      const next: UserStats = {
        ...prev,
        currentLevelId: Math.max(prev.currentLevelId, levelId),
        unlockedLessons: nextUnlocked,
      };
      if (user) syncCloudSafe(user, next);
      return next;
    });
  };

  const recordLessonCompleted = (
    lessonId: string,
    earnedXp: number,
    isPerfect: boolean,
    isCheckpoint = false
  ): { unlockedNewLesson: boolean } => {
    let unlockedNew = false;
    const today = new Date().toISOString().split('T')[0];

    const { streak: newStreak, longestStreak: newLongest } = calculateStreakUpdate(
      stats.streak,
      stats.longestStreak,
      stats.lastActiveDate,
      today
    );

    const nextId = findNextLessonId(lessonId);
    const updatedCompleted = Array.from(new Set([...stats.completedLessons, lessonId]));
    const updatedUnlocked = new Set(stats.unlockedLessons);

    if (nextId && !updatedUnlocked.has(nextId)) {
      updatedUnlocked.add(nextId);
      unlockedNew = true;
    }

    const totalXp = stats.xp + earnedXp;
    const coinsEarned = 15;
    const updatedDailyHistory = updateDailyXpHistory(stats.dailyXpHistory, today, earnedXp);

    // Determine highest reached level from completed/unlocked lessons
    const levelFromNext = nextId ? parseInt(nextId.charAt(1), 10) || stats.currentLevelId : stats.currentLevelId;

    const updatedStats: UserStats = {
      ...stats,
      xp: totalXp,
      coins: stats.coins + coinsEarned,
      streak: newStreak,
      longestStreak: newLongest,
      lastActiveDate: today,
      currentLevelId: Math.max(stats.currentLevelId, levelFromNext),
      completedLessons: updatedCompleted,
      unlockedLessons: Array.from(updatedUnlocked),
      dailyXpHistory: updatedDailyHistory,
    };

    setStats(updatedStats);
    if (user) {
      syncCloudSafe(user, updatedStats);
    }

    setAchievements((prev) =>
      prev.map((ach) => {
        let newProgress = ach.progress;
        let unlockedAt = ach.unlockedAt;

        if (ach.id === 'first_lesson') {
          newProgress = 1;
        } else if (ach.id === 'perfect_lesson' && isPerfect) {
          newProgress = 1;
        } else if (ach.id === 'streak_3') {
          newProgress = Math.min(3, newStreak);
        } else if (ach.id === 'streak_7') {
          newProgress = Math.min(7, newStreak);
        } else if (ach.id === 'xp_100') {
          newProgress = Math.min(100, totalXp);
        } else if (
          ach.id === 'first_checkpoint' &&
          (isCheckpoint || lessonId.includes('checkpoint'))
        ) {
          newProgress = 1;
        }

        if (newProgress >= ach.maxProgress && !unlockedAt) {
          unlockedAt = new Date().toISOString();
        }

        return { ...ach, progress: newProgress, unlockedAt };
      })
    );

    return { unlockedNewLesson: unlockedNew };
  };

  const resetProgress = () => {
    const fresh = createDefaultStats();
    setStats(fresh);
    setAchievements(INITIAL_ACHIEVEMENTS);
    localStorage.removeItem(STORAGE_KEYS.STATS);
    localStorage.removeItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (user) syncCloudSafe(user, fresh);
  };

  const leaderboard: LeaderboardEntry[] = [
    ...INITIAL_BOT_LEADERBOARD,
    {
      id: user?.id || 'me',
      name: user?.name ? `${user.name} (Kamu)` : 'Kamu',
      username: user?.username || 'learner',
      avatar: 'globe',
      xp: stats.xp,
      isCurrentUser: true,
    },
  ]
    .sort((a, b) => b.xp - a.xp)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn,
        authReady,
        stats,
        settings,
        achievements,
        leaderboard,
        pendingJoinCode,
        clearPendingJoinCode,
        loginWithName,
        loginWithGoogle,
        logout,
        updateProfile,
        updateSettings,
        recordQuestionAttempt,
        recordLessonCompleted,
        unlockLevel,
        consumeHeart,
        refillHeartsFull,
        refillHeartsWithCoins,
        resetProgress,
        secondsUntilNextHeart,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
