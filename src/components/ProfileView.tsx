import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Flame,
  Zap,
  Heart,
  Coins,
  Trophy,
  CheckCircle,
  Calendar,
  Edit2,
  Check,
  ShieldCheck,
  Sparkles,
  Footprints,
} from 'lucide-react';
import { LinguiMascot } from './LinguiMascot';
import { getUserLevelInfo } from '../utils/gameLogic';

export const ProfileView: React.FC = () => {
  const { user, stats, achievements, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || 'Budi');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim()) {
      updateProfile(editName.trim(), user?.role || 'student');
      setIsEditing(false);
    }
  };

  const {
    level: currentLevel,
    currentLevelXp,
    xpPerLevel: nextLevelXp,
    progressPercent: levelProgress,
  } = getUserLevelInfo(stats.xp);

  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case 'Footprints':
        return <Footprints size={24} className="text-[#58CC02]" />;
      case 'Sparkles':
        return <Sparkles size={24} className="text-[#FFC800]" />;
      case 'Flame':
        return <Flame size={24} className="text-[#FF9600]" />;
      case 'Zap':
        return <Zap size={24} className="text-[#FFC800]" />;
      case 'Trophy':
        return <Trophy size={24} className="text-[#FF9600]" />;
      case 'ShieldCheck':
        return <ShieldCheck size={24} className="text-[#1CB0F6]" />;
      default:
        return <Trophy size={24} className="text-[#58CC02]" />;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto pb-24">
      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-200 mb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-sky-50 border-4 border-[#1CB0F6] flex items-center justify-center overflow-hidden">
              <LinguiMascot mood="happy" size={80} />
            </div>
            <div className="absolute -bottom-2 -right-1 bg-[#FFC800] text-amber-950 font-black text-xs px-2.5 py-1 rounded-full border-2 border-white">
              Lv. {currentLevel}
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            {isEditing ? (
              <form onSubmit={handleSave} className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="px-3 py-1.5 border-2 border-emerald-500 rounded-xl font-bold text-slate-900 text-lg focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
                >
                  <Check size={18} />
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h2 className="text-2xl font-black text-slate-900">
                  {user?.name || 'Pengguna Linguitica'}
                </h2>
                <button
                  onClick={() => {
                    setEditName(user?.name || '');
                    setIsEditing(true);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
                  title="Ubah nama"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
            <p className="text-xs text-slate-400 font-semibold">
              @{user?.username || 'learner'} • Bergabung pada 2026
            </p>

            <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-[#1CB0F6]">
                {user?.role === 'teacher' ? 'Guru / Admin Kelas' : 'Murid'}
              </span>
              <span
                className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border ${
                  user?.isCloudSynced
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                {user?.isCloudSynced ? 'Tersinkron Cloud' : 'Penyimpanan Lokal'}
              </span>
            </div>

            {/* Level progression bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                <span>Level {currentLevel}</span>
                <span>
                  {currentLevelXp} / {nextLevelXp} XP menuju Level {currentLevel + 1}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Overview Grid */}
      <h3 className="text-lg font-black text-slate-900 mb-4">Statistik Belajar</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200">
          <div className="flex items-center gap-1.5 text-orange-500 font-bold text-xs uppercase mb-1">
            <Flame size={16} /> Streak
          </div>
          <span className="text-2xl font-black text-slate-900">{stats.streak} Hari</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Terpanjang: {stats.longestStreak} Hari
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200">
          <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs uppercase mb-1">
            <Zap size={16} /> Total XP
          </div>
          <span className="text-2xl font-black text-slate-900">{stats.xp}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Poin Pengalaman</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200">
          <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase mb-1">
            <CheckCircle size={16} /> Selesai
          </div>
          <span className="text-2xl font-black text-slate-900">
            {stats.completedLessons.length}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Pelajaran Tuntas</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200">
          <div className="flex items-center gap-1.5 text-yellow-600 font-bold text-xs uppercase mb-1">
            <Coins size={16} /> Koin
          </div>
          <span className="text-2xl font-black text-slate-900">{stats.coins}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Tabungan Hadiah</span>
        </div>
      </div>

      {/* Achievements Badges */}
      <h3 className="text-lg font-black text-slate-900 mb-4">Lencana Pencapaian</h3>
      <div className="space-y-3">
        {achievements.map((ach) => {
          const isUnlocked = ach.unlockedAt !== null || ach.progress >= ach.maxProgress;
          const pct = Math.round((ach.progress / ach.maxProgress) * 100);

          return (
            <div
              key={ach.id}
              className={`p-4 rounded-2xl border-2 flex items-center justify-between transition ${
                isUnlocked
                  ? 'bg-white border-slate-200 shadow-xs'
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center shrink-0 ${
                    isUnlocked
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  {getAchievementIcon(ach.iconName)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-slate-900">{ach.title}</h4>
                    {isUnlocked && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-sm">
                        Terbuka
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{ach.description}</p>
                </div>
              </div>

              <div className="text-right pl-4">
                <span className="text-xs font-bold text-slate-700">
                  {ach.progress}/{ach.maxProgress}
                </span>
                <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
