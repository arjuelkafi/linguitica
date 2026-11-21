import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Medal, Crown, Sparkles } from 'lucide-react';
import { LinguiMascot } from './LinguiMascot';

export const LeaderboardView: React.FC = () => {
  const { leaderboard } = useAuth();

  return (
    <div className="w-full max-w-2xl mx-auto pb-24">
      {/* Header Banner */}
      <div className="text-center mb-8">
        <LinguiMascot mood="cheering" size={90} className="mx-auto" />
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
          Peringkat Mingguan (Leaderboard)
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Kumpulkan XP dari setiap pelajaran untuk bersaing memperebutkan posisi teratas minggu ini.
        </p>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8 items-end">
        {/* Rank 2 */}
        {leaderboard[1] && (
          <div className="bg-white rounded-3xl p-4 border-2 border-slate-200 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center font-black text-slate-700 text-sm mb-2">
              2
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center font-black text-slate-800 text-base mb-1">
              {leaderboard[1].name.charAt(0)}
            </div>
            <h4 className="text-xs font-black text-slate-900 truncate w-full">
              {leaderboard[1].name}
            </h4>
            <span className="text-xs font-bold text-slate-500 mt-0.5">
              {leaderboard[1].xp} XP
            </span>
          </div>
        )}

        {/* Rank 1 */}
        {leaderboard[0] && (
          <div className="bg-amber-50 rounded-3xl p-4 border-2 border-amber-300 text-center flex flex-col items-center scale-105 shadow-xs">
            <Crown size={28} className="text-amber-500 fill-amber-400 mb-1" />
            <div className="w-12 h-12 rounded-full bg-amber-400 border-2 border-amber-600 flex items-center justify-center font-black text-amber-950 text-lg mb-1">
              {leaderboard[0].name.charAt(0)}
            </div>
            <h4 className="text-xs font-black text-slate-900 truncate w-full">
              {leaderboard[0].name}
            </h4>
            <span className="text-xs font-black text-amber-700 mt-0.5">
              {leaderboard[0].xp} XP
            </span>
          </div>
        )}

        {/* Rank 3 */}
        {leaderboard[2] && (
          <div className="bg-white rounded-3xl p-4 border-2 border-slate-200 text-center flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-200 flex items-center justify-center font-black text-amber-800 text-sm mb-2">
              3
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center font-black text-slate-800 text-base mb-1">
              {leaderboard[2].name.charAt(0)}
            </div>
            <h4 className="text-xs font-black text-slate-900 truncate w-full">
              {leaderboard[2].name}
            </h4>
            <span className="text-xs font-bold text-slate-500 mt-0.5">
              {leaderboard[2].xp} XP
            </span>
          </div>
        )}
      </div>

      {/* Full Leaderboard List */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-xs">
        {leaderboard.map((entry, idx) => {
          const isCurrentUser = entry.isCurrentUser;

          return (
            <div
              key={entry.id}
              className={`p-4 flex items-center justify-between border-b border-slate-100 last:border-b-0 transition ${
                isCurrentUser ? 'bg-emerald-50/80 font-bold' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`w-7 text-center font-black text-sm ${
                    idx === 0
                      ? 'text-amber-500'
                      : idx === 1
                      ? 'text-slate-500'
                      : idx === 2
                      ? 'text-amber-700'
                      : 'text-slate-400'
                  }`}
                >
                  {entry.rank || idx + 1}
                </span>

                <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm uppercase">
                  {entry.name.charAt(0)}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900">
                      {entry.name}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[10px] bg-emerald-500 text-white font-bold px-1.5 py-0.5 rounded-md uppercase">
                        Kamu
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">@{entry.username}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-black text-slate-800">
                  {entry.xp} XP
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
