import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LEARNING_LEVELS } from '../data/curriculum';
import { QuestionType } from '../types';
import {
  computeOverallAccuracy,
  getCefrEstimate,
  getUserLevelInfo,
} from '../utils/gameLogic';
import {
  Zap,
  Target,
  CheckCircle2,
  Award,
  BarChart3,
  BookOpen,
} from 'lucide-react';

const SKILL_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Pilihan Ganda',
  translation: 'Terjemahan Kalimat',
  word_arrangement: 'Susun Kata',
  fill_blank: 'Lengkapi Kalimat',
  listening: 'Menyimak Audio',
  vocabulary: 'Kosakata',
};

const SKILL_COLORS: Record<QuestionType, string> = {
  multiple_choice: 'bg-[#58CC02]',
  translation: 'bg-[#1CB0F6]',
  word_arrangement: 'bg-[#FFC800]',
  fill_blank: 'bg-[#FF9600]',
  listening: 'bg-indigo-500',
  vocabulary: 'bg-teal-500',
};

export const AnalyticsView: React.FC = () => {
  const { stats } = useAuth();

  const allLessons = LEARNING_LEVELS.flatMap((lvl) =>
    lvl.units.flatMap((u) => u.lessons)
  );
  const totalLessons = allLessons.length;
  const completedCount = stats.completedLessons.length;
  const accuracy = computeOverallAccuracy(
    stats.totalCorrectAnswers,
    stats.totalQuestionsAnswered
  );
  const cefr = getCefrEstimate(completedCount, totalLessons);
  const userLevel = getUserLevelInfo(stats.xp);

  // Build 7-day chart points ending today
  const today = new Date();
  const xpMap = new Map<string, number>();
  for (const pt of stats.dailyXpHistory || []) {
    xpMap.set(pt.date, pt.xp);
  }
  const last7Days = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(today.getTime() - (6 - idx) * 86400000);
    const iso = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('id-ID', { weekday: 'short' });
    return {
      date: iso,
      label,
      xp: xpMap.get(iso) || 0,
    };
  });
  const maxDailyXp = Math.max(20, ...last7Days.map((d) => d.xp));

  const skillKeys: QuestionType[] = [
    'vocabulary',
    'multiple_choice',
    'translation',
    'word_arrangement',
    'fill_blank',
    'listening',
  ];

  return (
    <div className="w-full max-w-3xl mx-auto pb-24">
      <div className="mb-7">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          Dashboard Analitik Belajar
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Pantau perkembangan XP, akurasi jawaban, dan penguasaan level bahasa Inggrismu.
        </p>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200">
          <div className="flex items-center gap-1.5 text-amber-600 font-extrabold text-xs uppercase mb-1">
            <Zap size={15} /> Total XP
          </div>
          <p className="text-2xl font-black text-slate-900">{stats.xp}</p>
          <span className="text-[11px] font-semibold text-slate-500">
            Level Akun {userLevel.level}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200">
          <div className="flex items-center gap-1.5 text-[#1CB0F6] font-extrabold text-xs uppercase mb-1">
            <Target size={15} /> Akurasi
          </div>
          <p className="text-2xl font-black text-slate-900">{accuracy}%</p>
          <span className="text-[11px] font-semibold text-slate-500">
            {stats.totalCorrectAnswers}/{stats.totalQuestionsAnswered} soal benar
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200">
          <div className="flex items-center gap-1.5 text-[#58CC02] font-extrabold text-xs uppercase mb-1">
            <CheckCircle2 size={15} /> Pelajaran
          </div>
          <p className="text-2xl font-black text-slate-900">
            {completedCount}/{totalLessons}
          </p>
          <span className="text-[11px] font-semibold text-slate-500">
            Materi diselesaikan
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200">
          <div className="flex items-center gap-1.5 text-[#FF9600] font-extrabold text-xs uppercase mb-1">
            <Award size={15} /> Estimasi CEFR
          </div>
          <p className="text-2xl font-black text-slate-900">{cefr.code}</p>
          <span className="text-[11px] font-semibold text-slate-500">
            {cefr.label}
          </span>
        </div>
      </div>

      {/* 7-Day XP Activity Chart */}
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-[#58CC02]" />
            <h3 className="text-base font-black text-slate-900">
              Aktivitas XP 7 Hari Terakhir
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-400">Harian</span>
        </div>

        <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-40 pt-4 border-b-2 border-slate-100 pb-2">
          {last7Days.map((day) => {
            const pct = Math.max(6, Math.round((day.xp / maxDailyXp) * 100));
            return (
              <div key={day.date} className="flex flex-col items-center h-full justify-end">
                <span className="text-[10px] font-extrabold text-slate-600 mb-1">
                  {day.xp > 0 ? day.xp : '0'}
                </span>
                <div className="w-full max-w-[36px] bg-slate-100 rounded-t-xl h-28 flex items-end overflow-hidden">
                  <div
                    className={`w-full rounded-t-xl transition-all ${
                      day.xp > 0 ? 'bg-[#58CC02]' : 'bg-slate-200'
                    }`}
                    style={{ height: `${day.xp > 0 ? pct : 8}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-500 mt-2">
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Level Mastery Breakdown & Skill Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Level Mastery */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-[#1CB0F6]" />
            <h3 className="text-base font-black text-slate-900">
              Penguasaan Per Level
            </h3>
          </div>

          <div className="space-y-4">
            {LEARNING_LEVELS.map((lvl) => {
              const lvlLessons = lvl.units.flatMap((u) => u.lessons);
              const done = lvlLessons.filter((l) =>
                stats.completedLessons.includes(l.id)
              ).length;
              const pct =
                lvlLessons.length > 0
                  ? Math.round((done / lvlLessons.length) * 100)
                  : 0;

              return (
                <div key={lvl.id}>
                  <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-slate-700 mb-1">
                    <span className="truncate">
                      {lvl.name}: {lvl.title}
                    </span>
                    <span className="text-slate-500 shrink-0">
                      {done}/{lvlLessons.length} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-[#1CB0F6] h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-Exercise-Type Accuracy */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className="text-[#FF9600]" />
            <h3 className="text-base font-black text-slate-900">
              Ketepatan Tiap Tipe Latihan
            </h3>
          </div>

          <div className="space-y-4">
            {skillKeys.map((key) => {
              const stat = stats.skillStats[key] || { correct: 0, total: 0 };
              const pct = computeOverallAccuracy(stat.correct, stat.total);

              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-700 mb-1">
                    <span>{SKILL_LABELS[key]}</span>
                    <span className="text-slate-500">
                      {stat.total > 0
                        ? `${stat.correct}/${stat.total} (${pct}%)`
                        : 'Belum ada latihan'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div
                      className={`${SKILL_COLORS[key]} h-full rounded-full transition-all`}
                      style={{ width: `${stat.total > 0 ? Math.max(4, pct) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
