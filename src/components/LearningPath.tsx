import React from 'react';
import { Level, Lesson } from '../types';
import { useAuth } from '../context/AuthContext';
import { LinguiMascot } from './LinguiMascot';
import {
  Check,
  Lock,
  Star,
  Trophy,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';

interface LearningPathProps {
  levels: Level[];
  activeLevelId: number;
  onSelectLevel: (lvlId: number) => void;
  onStartLesson: (lesson: Lesson) => void;
}

export const LearningPath: React.FC<LearningPathProps> = ({
  levels,
  activeLevelId,
  onSelectLevel,
  onStartLesson,
}) => {
  const { stats, unlockLevel } = useAuth();
  const currentLevel = levels.find((l) => l.id === activeLevelId) || levels[0];
  const firstLessonOfLevel = currentLevel.units[0]?.lessons[0];
  const isLevelLocked =
    firstLessonOfLevel && !stats.unlockedLessons.includes(firstLessonOfLevel.id);

  // Identify the very first unlocked, uncompleted lesson in this level to attach the "MULAI" bubble
  const firstActiveLessonId = currentLevel.units
    .flatMap((u) => u.lessons)
    .find(
      (l) => stats.unlockedLessons.includes(l.id) && !stats.completedLessons.includes(l.id)
    )?.id;

  return (
    <div className="w-full max-w-xl mx-auto pb-24">
      {/* Top Section Bar (Duolingo Web style) */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-slate-200">
        <button
          type="button"
          onClick={() => onSelectLevel(Math.max(1, activeLevelId - 1))}
          disabled={activeLevelId === 1}
          aria-label="Level sebelumnya"
          className={`p-1.5 rounded-xl transition ${
            activeLevelId === 1
              ? 'text-slate-300 cursor-not-allowed'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          <ArrowLeft size={20} />
        </button>

        <span className="text-sm font-extrabold text-slate-600 tracking-wide">
          Bagian {currentLevel.id}: {currentLevel.title}
        </span>

        <div className="w-8" />
      </div>

      {/* Compact Level Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {levels.map((lvl) => {
          const isActive = lvl.id === activeLevelId;
          return (
            <button
              key={lvl.id}
              onClick={() => onSelectLevel(lvl.id)}
              className={`shrink-0 px-3.5 py-2 rounded-xl border-2 text-xs font-extrabold transition ${
                isActive
                  ? 'bg-sky-50 border-sky-300 text-sky-600'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {lvl.name}
            </button>
          );
        })}
      </div>

      {/* Level Jump / Unlock Card if this level is locked */}
      {isLevelLocked && (
        <div className="mb-6 p-4 rounded-2xl bg-sky-50 border-2 border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              {currentLevel.name}: {currentLevel.title}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {currentLevel.description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => unlockLevel(currentLevel.id)}
            className="shrink-0 px-4 py-2.5 bg-[#1CB0F6] hover:bg-sky-500 text-white font-black text-xs rounded-xl border-b-4 border-[#1899D6] active:translate-y-0.5 transition"
          >
            Buka Level Ini
          </button>
        </div>
      )}

      {/* Units & Wavy Path */}
      <div className="space-y-10">
        {currentLevel.units.map((unit, unitIdx) => {
          const totalLessons = unit.lessons.length;
          const completedInUnit = unit.lessons.filter((l) =>
            stats.completedLessons.includes(l.id)
          ).length;
          const unitHasUnlocked = unit.lessons.some((l) =>
            stats.unlockedLessons.includes(l.id)
          );

          return (
            <section key={unit.id} className="relative">
              {/* Bright Green Duolingo-style Unit Banner */}
              <div
                className={`rounded-2xl p-5 mb-10 border-b-4 flex items-center justify-between gap-4 ${
                  unitHasUnlocked
                    ? 'bg-[#58CC02] border-[#46A302] text-white'
                    : 'bg-slate-200 border-slate-300 text-slate-600'
                }`}
              >
                <div>
                  <h2 className="text-xl font-black tracking-tight">
                    {unit.title}
                  </h2>
                  <p
                    className={`text-sm mt-0.5 font-medium ${
                      unitHasUnlocked ? 'text-white/95' : 'text-slate-500'
                    }`}
                  >
                    {unit.description}
                  </p>
                </div>

                <div
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-black uppercase ${
                    unitHasUnlocked
                      ? 'bg-[#4EB802] border-[#46A302] text-white'
                      : 'bg-slate-100 border-slate-300 text-slate-500'
                  }`}
                >
                  <BookOpen size={15} />
                  <span>
                    {completedInUnit}/{totalLessons}
                  </span>
                </div>
              </div>

              {/* Winding Lesson Nodes + Floating Globe Mascot */}
              <div className="relative flex flex-col items-center gap-7 py-2">
                {/* Decorative Globe Mascot beside the path (like Duolingo character beside nodes) */}
                {unit.lessons.length >= 2 && (
                  <div
                    className={`hidden sm:flex flex-col items-center pointer-events-none select-none absolute top-24 ${
                      unitIdx % 2 === 0 ? 'right-6' : 'left-6'
                    }`}
                    aria-hidden="true"
                  >
                    <LinguiMascot
                      mood={unitHasUnlocked ? 'cheering' : 'thinking'}
                      muted={!unitHasUnlocked}
                      size={112}
                    />
                  </div>
                )}

                {unit.lessons.map((lesson, lessonIdx) => {
                  const isCompleted = stats.completedLessons.includes(lesson.id);
                  const isUnlocked = stats.unlockedLessons.includes(lesson.id);
                  const isCurrentActive = lesson.id === firstActiveLessonId;
                  const isCheckpoint = Boolean(lesson.isCheckpoint);

                  // Gentle S-curve horizontal offsets matching Duolingo path
                  const offsets = [0, -44, -64, -36, 18, 52];
                  const offsetPx = offsets[lessonIdx % offsets.length];

                  return (
                    <div
                      key={lesson.id}
                      className="relative flex flex-col items-center"
                      style={{ transform: `translateX(${offsetPx}px)` }}
                    >
                      {/* Floating "MULAI" Speech Bubble above active node */}
                      {isCurrentActive && (
                        <div className="mb-2.5 relative z-20 animate-bounce">
                          <div className="bg-white border-2 border-slate-200 text-[#58CC02] font-black text-xs tracking-wider uppercase px-3.5 py-1.5 rounded-xl shadow-xs">
                            MULAI
                          </div>
                          <div className="w-3 h-3 bg-white border-r-2 border-b-2 border-slate-200 rotate-45 mx-auto -mt-1.5" />
                        </div>
                      )}

                      {/* Outer ring for current active lesson */}
                      <div
                        className={
                          isCurrentActive
                            ? 'p-2 rounded-full border-4 border-slate-200 bg-white'
                            : ''
                        }
                      >
                        <button
                          onClick={() => {
                            if (isUnlocked) onStartLesson(lesson);
                          }}
                          disabled={!isUnlocked}
                          aria-label={lesson.title}
                          className={`relative w-[72px] h-[72px] rounded-full flex items-center justify-center transition active:translate-y-1.5 focus:outline-none ${
                            isCompleted
                              ? 'bg-[#FFC800] border-b-[6px] border-[#E5A400] hover:bg-[#FFD433] text-amber-950'
                              : isUnlocked
                              ? isCheckpoint
                                ? 'bg-[#1CB0F6] border-b-[6px] border-[#1899D6] hover:bg-[#33BCFF] text-white'
                                : 'bg-[#58CC02] border-b-[6px] border-[#46A302] hover:bg-[#61E002] text-white'
                              : 'bg-[#E5E5E5] border-b-[6px] border-[#CECECE] text-[#AFAFAF] cursor-not-allowed'
                          }`}
                        >
                          {isCompleted ? (
                            <Check size={32} strokeWidth={3.5} />
                          ) : isUnlocked ? (
                            isCheckpoint ? (
                              <Trophy size={28} strokeWidth={2.5} />
                            ) : (
                              <Star size={30} fill="currentColor" strokeWidth={0} />
                            )
                          ) : isCheckpoint ? (
                            <Trophy size={26} strokeWidth={2.2} />
                          ) : (
                            <Lock size={24} strokeWidth={2.5} />
                          )}
                        </button>
                      </div>

                      {/* Lesson Label */}
                      <div className="mt-2 text-center max-w-[140px]">
                        <span
                          className={`text-xs font-bold block truncate ${
                            isUnlocked ? 'text-slate-700' : 'text-slate-400'
                          }`}
                        >
                          {lesson.title}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
