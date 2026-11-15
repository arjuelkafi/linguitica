export type QuestionType =
  | 'multiple_choice'
  | 'translation'
  | 'word_arrangement'
  | 'fill_blank'
  | 'listening'
  | 'vocabulary';

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  targetText?: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation: string;
  xpReward: number;
}

export interface Lesson {
  id: string;
  unitId: string;
  levelId: number;
  title: string;
  description: string;
  xpReward: number;
  isCheckpoint?: boolean;
  questions: Question[];
}

export interface Unit {
  id: string;
  levelId: number;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface Level {
  id: number;
  name: string;
  title: string;
  description: string;
  badge: string;
  units: Unit[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlockedAt: string | null;
  progress: number;
  maxProgress: number;
}

export type UserRole = 'student' | 'teacher';

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  avatar: string;
  isCloudSynced?: boolean;
  authProvider?: 'name' | 'google';
  createdAt: string;
}

export interface SkillStat {
  correct: number;
  total: number;
}

export interface DailyXpPoint {
  date: string; // YYYY-MM-DD
  xp: number;
}

export interface UserStats {
  xp: number;
  coins: number;
  hearts: number;
  lastHeartLossTime: number | null;
  streak: number;
  longestStreak: number;
  lastActiveDate: string;
  completedLessons: string[];
  unlockedLessons: string[];
  currentLevelId: number;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  skillStats: Record<QuestionType, SkillStat>;
  dailyXpHistory: DailyXpPoint[];
}

export interface UserSettings {
  soundEnabled: boolean;
  darkMode: boolean;
  dailyGoalXp: number;
  remindersEnabled: boolean;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  username: string;
  avatar: string;
  xp: number;
  isCurrentUser?: boolean;
  rank?: number;
}

export interface Classroom {
  code: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassroomMember {
  userId: string;
  ownerId: string;
  classId: string;
  studentName: string;
  xp: number;
  streak: number;
  completedLessonsCount: number;
  accuracyRate: number;
  currentLevelId: number;
  joinedAt: string;
  updatedAt: string;
}

export interface JoinedClassroom {
  classId: string;
  userId: string;
  className: string;
  teacherName: string;
  joinedAt: string;
}
