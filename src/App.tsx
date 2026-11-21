import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { LEARNING_LEVELS } from './data/curriculum';
import { Lesson } from './types';
import {
  HEART_REFILL_COST_COINS,
  MAX_HEARTS,
  canRefillHeartsWithCoins,
} from './utils/gameLogic';
import { LinguiMascot } from './components/LinguiMascot';
import { LearningPath } from './components/LearningPath';
import { PracticeHub } from './components/PracticeHub';
import { AnalyticsView } from './components/AnalyticsView';
import { ClassroomView } from './components/ClassroomView';
import { LeaderboardView } from './components/LeaderboardView';
import { ProfileView } from './components/ProfileView';
import { SettingsView } from './components/SettingsView';
import { LessonEngine } from './components/LessonEngine';
import { AuthModal } from './components/AuthModal';

import {
  Home,
  Dumbbell,
  BarChart3,
  GraduationCap,
  Trophy,
  User,
  Settings,
  Flame,
  Zap,
  Heart,
  Gem,
  LogIn,
  ArrowRight,
  Gift,
} from 'lucide-react';

type TabType =
  | 'learn'
  | 'practice'
  | 'analytics'
  | 'classroom'
  | 'leaderboard'
  | 'profile'
  | 'settings';

// Simple flat English flag icon (no emojis, no gradients)
const EnglishFlagIcon: React.FC = () => (
  <svg
    viewBox="0 0 28 20"
    width="28"
    height="20"
    className="rounded-md border border-slate-200 shrink-0"
    aria-label="Bahasa Inggris"
  >
    <rect width="28" height="20" fill="#FFFFFF" />
    <rect y="0" width="28" height="3.3" fill="#EF4444" />
    <rect y="6.6" width="28" height="3.3" fill="#EF4444" />
    <rect y="13.2" width="28" height="3.3" fill="#EF4444" />
    <rect y="17.5" width="28" height="2.5" fill="#EF4444" />
    <rect width="13" height="11" fill="#1D4ED8" />
    <circle cx="4" cy="3.5" r="1" fill="#FFFFFF" />
    <circle cx="9" cy="3.5" r="1" fill="#FFFFFF" />
    <circle cx="6.5" cy="5.5" r="1" fill="#FFFFFF" />
    <circle cx="4" cy="7.5" r="1" fill="#FFFFFF" />
    <circle cx="9" cy="7.5" r="1" fill="#FFFFFF" />
  </svg>
);

export default function App() {
  const {
    user,
    isLoggedIn,
    stats,
    settings,
    pendingJoinCode,
    secondsUntilNextHeart,
    refillHeartsFull,
    refillHeartsWithCoins,
  } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('learn');
  const [activeLevelId, setActiveLevelId] = useState<number>(1);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showHeartsPopover, setShowHeartsPopover] = useState<boolean>(false);

  // Automatically route to Classroom view when an invite code is present in URL
  useEffect(() => {
    if (pendingJoinCode) {
      setActiveTab('classroom');
    }
  }, [pendingJoinCode]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getNextUnfinishedLesson = (): Lesson => {
    const all = LEARNING_LEVELS.flatMap((l) => l.units.flatMap((u) => u.lessons));
    const next = all.find(
      (l) => stats.unlockedLessons.includes(l.id) && !stats.completedLessons.includes(l.id)
    );
    return next || all[0];
  };

  const navItems: {
    id: TabType;
    label: string;
    mobileLabel: string;
    icon: React.FC<{ size?: number; className?: string }>;
    iconColor: string;
    showOnMobileBottom?: boolean;
  }[] = [
    {
      id: 'learn',
      label: 'BELAJAR',
      mobileLabel: 'Belajar',
      icon: Home,
      iconColor: 'text-[#58CC02]',
      showOnMobileBottom: true,
    },
    {
      id: 'practice',
      label: 'LATIHAN',
      mobileLabel: 'Latihan',
      icon: Dumbbell,
      iconColor: 'text-[#1CB0F6]',
      showOnMobileBottom: true,
    },
    {
      id: 'analytics',
      label: 'ANALITIK',
      mobileLabel: 'Analitik',
      icon: BarChart3,
      iconColor: 'text-indigo-500',
      showOnMobileBottom: true,
    },
    {
      id: 'classroom',
      label: 'KELAS',
      mobileLabel: 'Kelas',
      icon: GraduationCap,
      iconColor: 'text-[#58CC02]',
      showOnMobileBottom: true,
    },
    {
      id: 'leaderboard',
      label: 'PERINGKAT',
      mobileLabel: 'Peringkat',
      icon: Trophy,
      iconColor: 'text-[#FFC800]',
      showOnMobileBottom: true,
    },
    {
      id: 'profile',
      label: 'PROFIL',
      mobileLabel: 'Profil',
      icon: User,
      iconColor: 'text-[#FF9600]',
      showOnMobileBottom: true,
    },
    {
      id: 'settings',
      label: 'PENGATURAN',
      mobileLabel: 'Atur',
      icon: Settings,
      iconColor: 'text-slate-500',
      showOnMobileBottom: false,
    },
  ];

  const dailyGoalTarget = settings.dailyGoalXp || 30;
  const dailyQuestCurrent = Math.min(stats.xp, dailyGoalTarget);
  const dailyQuestPercent = Math.min(
    100,
    Math.round((dailyQuestCurrent / dailyGoalTarget) * 100)
  );
  const canBuyHearts = canRefillHeartsWithCoins(stats.hearts, stats.coins);

  const renderHeartsPopover = () => (
    <div className="absolute right-0 top-11 z-50 w-80 bg-white rounded-2xl border-2 border-slate-200 shadow-xl p-5 text-left">
      <div className="text-center">
        <h3 className="text-lg font-black text-slate-900">Hati</h3>
        <div className="flex items-center justify-center gap-2 my-3">
          {Array.from({ length: MAX_HEARTS }).map((_, i) => {
            const filled = i < stats.hearts;
            return (
              <Heart
                key={i}
                size={26}
                className={
                  filled
                    ? 'fill-[#FF4B4B] text-[#FF4B4B]'
                    : 'fill-slate-200 text-slate-200'
                }
              />
            );
          })}
        </div>
        <p className="text-sm font-bold text-slate-800">
          {stats.hearts >= MAX_HEARTS
            ? 'Semua hati terisi penuh.'
            : `Hati berikutnya pulih dalam ${formatTimer(secondsUntilNextHeart)}.`}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {stats.hearts >= MAX_HEARTS
            ? 'Kamu siap menyelesaikan pelajaran baru.'
            : 'Jawaban yang salah akan mengurangi satu hati.'}
        </p>
      </div>

      <div className="mt-4 space-y-2.5">
        <button
          type="button"
          onClick={() => {
            if (canBuyHearts) {
              refillHeartsWithCoins();
            }
          }}
          disabled={!canBuyHearts}
          className={`w-full py-2.5 px-3.5 rounded-xl border-2 font-extrabold text-xs flex items-center justify-between transition ${
            canBuyHearts
              ? 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
              : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span className="flex items-center gap-2">
            <Heart size={16} className="fill-[#FF4B4B] text-[#FF4B4B]" />
            ISI ULANG HATI
          </span>
          <span className="flex items-center gap-1 text-[#1CB0F6]">
            <Gem size={14} className="fill-[#1CB0F6] text-[#1CB0F6]" />
            {HEART_REFILL_COST_COINS}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setShowHeartsPopover(false);
            setActiveTab('practice');
          }}
          className="w-full py-2.5 px-3.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-xs flex items-center justify-between transition"
        >
          <span className="flex items-center gap-2">
            <Dumbbell size={16} className="text-[#1CB0F6]" />
            LATIHAN UNTUK BELAJAR
          </span>
          <ArrowRight size={14} className="text-slate-400" />
        </button>

        {stats.hearts < MAX_HEARTS && (
          <button
            type="button"
            onClick={() => {
              refillHeartsFull();
              setShowHeartsPopover(false);
            }}
            className="w-full py-2.5 px-3.5 rounded-xl bg-[#58CC02] hover:bg-[#61E002] border-b-4 border-[#46A302] text-white font-extrabold text-xs transition"
          >
            ISI PENUH GRATIS
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row text-slate-900 font-sans">
      {/* Desktop Left Sidebar (Duolingo Web style) */}
      <aside className="hidden md:flex flex-col justify-between w-60 lg:w-64 bg-white border-r-2 border-slate-200 p-4 sticky top-0 h-screen select-none shrink-0">
        <div>
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 px-3 py-3 mb-5">
            <LinguiMascot mood="happy" size={40} />
            <span className="text-2xl font-black tracking-tight text-[#58CC02]">
              linguitica
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl font-extrabold text-xs tracking-wider transition ${
                    isActive
                      ? 'bg-sky-50 text-[#1CB0F6] border-2 border-[#84D8FF]'
                      : 'text-slate-600 hover:bg-slate-100 border-2 border-transparent'
                  }`}
                >
                  <Icon
                    size={22}
                    className={isActive ? 'text-[#1CB0F6]' : tab.iconColor}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card */}
        <div className="p-3 bg-white rounded-2xl border-2 border-slate-200">
          {isLoggedIn && user ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-100 border-2 border-sky-300 flex items-center justify-center font-black text-sky-700 text-sm uppercase shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="truncate flex-1">
                <p className="text-xs font-extrabold text-slate-800 truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {user.role === 'teacher' ? 'Guru / Admin' : 'Murid'} • @{user.username}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                aria-label="Ganti akun"
                title="Ganti akun"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <LogIn size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="truncate">
                <p className="text-xs font-extrabold text-slate-800 truncate">
                  {user?.name || 'Pelajar'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  Belum masuk akun
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 rounded-xl bg-[#58CC02] hover:bg-[#61E002] text-white font-extrabold text-xs shrink-0 transition"
              >
                Masuk
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="flex-1 flex flex-col min-h-screen bg-white">
        {/* Mobile & Tablet Top Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b-2 border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinguiMascot mood="happy" size={32} />
            <span className="font-black text-lg text-[#58CC02]">linguitica</span>
          </div>

          <div className="relative flex items-center gap-3 sm:gap-4">
            <EnglishFlagIcon />
            <div className="flex items-center gap-1 text-[#FF9600] font-black text-sm">
              <Flame size={18} className="fill-[#FF9600] text-[#FF9600]" />
              <span>{stats.streak}</span>
            </div>
            <div className="flex items-center gap-1 text-[#1CB0F6] font-black text-sm">
              <Gem size={17} className="fill-[#1CB0F6] text-[#1CB0F6]" />
              <span>{stats.coins}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowHeartsPopover((prev) => !prev)}
              aria-label="Lihat status hati"
              className="flex items-center gap-1 text-[#FF4B4B] font-black text-sm"
            >
              <Heart size={18} className="fill-[#FF4B4B] text-[#FF4B4B]" />
              <span>{stats.hearts}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              aria-label="Buka pengaturan"
              className={`md:hidden p-1.5 rounded-xl border transition ${
                activeTab === 'settings'
                  ? 'bg-sky-50 border-[#84D8FF] text-[#1CB0F6]'
                  : 'border-slate-200 text-slate-500'
              }`}
            >
              <Settings size={17} />
            </button>
            {showHeartsPopover && renderHeartsPopover()}
          </div>
        </header>

        {/* Main Content Grid */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full flex flex-col lg:flex-row gap-10 items-start justify-center">
          {/* Center Column */}
          <div className="w-full flex-1 min-w-0">
            {activeTab === 'learn' && (
              <LearningPath
                levels={LEARNING_LEVELS}
                activeLevelId={activeLevelId}
                onSelectLevel={(lvlId) => setActiveLevelId(lvlId)}
                onStartLesson={(lesson) => setActiveLesson(lesson)}
              />
            )}
            {activeTab === 'practice' && <PracticeHub />}
            {activeTab === 'analytics' && <AnalyticsView />}
            {activeTab === 'classroom' && <ClassroomView />}
            {activeTab === 'leaderboard' && <LeaderboardView />}
            {activeTab === 'profile' && (
              <ProfileView onOpenLogin={() => setShowAuthModal(true)} />
            )}
            {activeTab === 'settings' && <SettingsView />}
          </div>

          {/* Right Sidebar Column (Desktop) */}
          <aside className="hidden lg:flex flex-col gap-5 w-80 shrink-0 sticky top-6 self-start">
            {/* Top-Right Stats Bar */}
            <div className="relative flex items-center justify-between px-2 py-1 z-50">
              <EnglishFlagIcon />

              <div
                className="flex items-center gap-1.5 text-[#FF9600] font-black text-sm"
                title="Streak harian"
              >
                <Flame size={20} className="fill-[#FF9600] text-[#FF9600]" />
                <span>{stats.streak}</span>
              </div>

              <div
                className="flex items-center gap-1.5 text-[#1CB0F6] font-black text-sm"
                title="Koin hadiah"
              >
                <Gem size={19} className="fill-[#1CB0F6] text-[#1CB0F6]" />
                <span>{stats.coins}</span>
              </div>

              <button
                type="button"
                onClick={() => setShowHeartsPopover((prev) => !prev)}
                aria-label="Buka panel hati"
                className="flex items-center gap-1.5 text-[#FF4B4B] font-black text-sm px-2 py-1 rounded-xl hover:bg-rose-50 transition"
              >
                <Heart size={20} className="fill-[#FF4B4B] text-[#FF4B4B]" />
                <span>{stats.hearts}</span>
              </button>

              {showHeartsPopover && renderHeartsPopover()}
            </div>

            {/* Daily Quests Card */}
            <div className="bg-white rounded-2xl p-5 border-2 border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-slate-800">Misi Harian</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('analytics')}
                  className="text-xs font-extrabold text-[#1CB0F6] hover:text-sky-600 uppercase tracking-wide"
                >
                  ANALITIK
                </button>
              </div>

              <div className="flex items-center gap-3">
                <Zap
                  size={28}
                  className="fill-[#FFC800] text-[#FFC800] shrink-0"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 mb-1.5">
                    <span>Kumpulkan {dailyGoalTarget} XP</span>
                    <span>
                      {dailyQuestCurrent} / {dailyGoalTarget}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 h-3.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#FFC800] h-full rounded-full transition-all"
                        style={{ width: `${dailyQuestPercent}%` }}
                      />
                    </div>
                    <Gift size={20} className="text-[#FF9600] shrink-0" />
                  </div>
                </div>
              </div>
            </div>

            {/* Globe Mascot Quick Action Card */}
            <div className="bg-white rounded-2xl p-5 border-2 border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <LinguiMascot mood="cheering" size={64} />
                <div>
                  <span className="text-[11px] font-black uppercase text-[#58CC02] tracking-wider">
                    Teman Belajar
                  </span>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    Lanjut Belajar
                  </h3>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
                Selesaikan satu pelajaran hari ini untuk menjaga streak belajarmu.
              </p>
              <button
                onClick={() => setActiveLesson(getNextUnfinishedLesson())}
                className="w-full py-3 px-4 bg-[#58CC02] hover:bg-[#61E002] text-white font-extrabold rounded-2xl border-b-4 border-[#46A302] active:translate-y-0.5 active:border-b-2 transition flex items-center justify-center gap-2 text-xs tracking-wide uppercase"
              >
                Mulai Belajar <ArrowRight size={16} />
              </button>
            </div>
          </aside>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (6 compact items, Settings accessible from top header) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-slate-200 px-1 py-1.5 flex items-center justify-around select-none">
        {navItems
          .filter((item) => item.showOnMobileBottom)
          .map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-1 flex flex-col items-center justify-center transition min-w-0 ${
                  isActive ? 'text-[#1CB0F6] font-extrabold' : 'text-slate-400 font-semibold'
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition ${
                    isActive
                      ? 'bg-sky-50 border border-[#84D8FF] text-[#1CB0F6]'
                      : 'text-slate-400'
                  }`}
                >
                  <Icon size={18} />
                </div>
                <span className="text-[10px] mt-0.5 truncate max-w-full px-0.5">
                  {tab.mobileLabel}
                </span>
              </button>
            );
          })}
      </nav>

      {/* Transparent backdrop to dismiss Hearts popover on outside click */}
      {showHeartsPopover && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setShowHeartsPopover(false)}
          aria-hidden="true"
        />
      )}

      {/* Interactive Lesson Modal Engine */}
      {activeLesson && (
        <LessonEngine
          lesson={activeLesson}
          onClose={() => setActiveLesson(null)}
          onComplete={() => setActiveLesson(null)}
        />
      )}

      {/* Authentication Modal for switching accounts */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
