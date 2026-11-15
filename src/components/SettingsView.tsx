import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Volume2,
  VolumeX,
  Bell,
  Moon,
  RotateCcw,
  LogOut,
  Target,
  ShieldAlert,
  Check,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, resetProgress, logout, refillHeartsFull } = useAuth();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleToggleSound = () => {
    updateSettings({ soundEnabled: !settings.soundEnabled });
    triggerNotice();
  };

  const handleToggleReminders = () => {
    updateSettings({ remindersEnabled: !settings.remindersEnabled });
    triggerNotice();
  };

  const handleChangeDailyGoal = (xp: number) => {
    updateSettings({ dailyGoalXp: xp });
    triggerNotice();
  };

  const triggerNotice = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Pengaturan Akun & Belajar
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Sesuaikan preferensi pengalaman belajar bahasa Inggrismu di Linguitica.
          </p>
        </div>
        {savedNotice && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-bold rounded-xl animate-fade-in">
            <Check size={14} /> Tersimpan
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Audio & Sounds */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-xs">
          <h3 className="text-base font-black text-slate-900 mb-4">Suara & Audio</h3>
          <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                {settings.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Efek Suara Kuis</h4>
                <p className="text-xs text-slate-400 font-medium">
                  Putar audio saat jawaban benar atau salah
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleSound}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors ${
                settings.soundEnabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${
                  settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Daily Target Goal */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Target size={18} className="text-emerald-600" />
            <h3 className="text-base font-black text-slate-900">Target Belajar Harian</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Pilih target XP harian agar streak belajarmu tetap teratur dan fokus.
          </p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Santai', xp: 20 },
              { label: 'Standar', xp: 35 },
              { label: 'Serius', xp: 50 },
            ].map((goal) => {
              const isSelected = settings.dailyGoalXp === goal.xp;
              return (
                <button
                  key={goal.xp}
                  onClick={() => handleChangeDailyGoal(goal.xp)}
                  className={`py-3 px-3 rounded-2xl border-2 font-bold text-sm transition flex flex-col items-center ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span>{goal.label}</span>
                  <span className="text-xs text-slate-400 font-normal mt-0.5">
                    {goal.xp} XP / hari
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Heart Utilities */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-xs">
          <h3 className="text-base font-black text-slate-900 mb-2">Bantuan Belajar</h3>
          <p className="text-xs text-slate-500 mb-4">
            Ingin terus berlatih tanpa menunggu regenerasi hati 30 menit?
          </p>
          <button
            onClick={() => {
              refillHeartsFull();
              triggerNotice();
            }}
            className="w-full py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-2xl border-2 border-emerald-200 text-sm transition"
          >
            Pulihkan 5 Hati Penuh Sekarang
          </button>
        </div>

        {/* Danger Zone: Reset Progress & Logout */}
        <div className="bg-rose-50/50 rounded-3xl p-6 border-2 border-rose-200">
          <div className="flex items-center gap-2 mb-2 text-rose-700">
            <ShieldAlert size={18} />
            <h3 className="text-base font-black">Zona Tindakan Akun</h3>
          </div>
          <p className="text-xs text-slate-600 mb-4">
            Atur ulang semua pencapaian atau keluar dari akun Anda saat ini.
          </p>

          <div className="space-y-3">
            {showResetConfirm ? (
              <div className="p-4 bg-white rounded-2xl border-2 border-rose-300 space-y-3">
                <p className="text-xs font-bold text-rose-700">
                  Apakah Anda yakin ingin menghapus semua kemajuan level, XP, dan streak? Tindakan ini tidak dapat dibatalkan.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      resetProgress();
                      setShowResetConfirm(false);
                      triggerNotice();
                    }}
                    className="flex-1 py-2 px-3 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700"
                  >
                    Ya, Reset Sekarang
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2 px-3 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-3 px-4 bg-white hover:bg-rose-50 text-rose-600 font-bold rounded-2xl border-2 border-rose-200 text-sm transition flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} /> Reset Kemajuan Belajar
              </button>
            )}

            <button
              onClick={logout}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-2xl border-2 border-slate-200 text-sm transition flex items-center justify-center gap-2"
            >
              <LogOut size={16} /> Keluar dari Akun (Logout)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
