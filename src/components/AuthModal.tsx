import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { LinguiMascot } from './LinguiMascot';
import { ArrowRight, GraduationCap, Sparkles, UserCheck, Cloud, X } from 'lucide-react';

interface NameLoginCardProps {
  onSuccess?: () => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const NameLoginCard: React.FC<NameLoginCardProps> = ({
  onSuccess,
  onClose,
  isModal = false,
}) => {
  const { loginWithName, loginWithGoogle, pendingJoinCode } = useAuth();
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const clean = name.trim();
    if (clean.length < 2) {
      setError('Masukkan nama minimal 2 huruf.');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginWithName(clean, role);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk ke akun.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await loginWithGoogle(role);
      onSuccess?.();
    } catch {
      setError('Masuk dengan Google dibatalkan atau gagal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await loginWithName('Budi Pembelajar', 'student');
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border-2 border-slate-200 shadow-lg relative">
      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition"
        >
          <X size={18} />
        </button>
      )}

      <div className="flex flex-col items-center text-center mb-5">
        <LinguiMascot mood="happy" size={84} />
        <h2 className="text-2xl font-black text-slate-900 mt-3">
          Masuk ke Linguitica
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Masukkan namamu untuk menyimpan progres belajar bahasa Inggris.
        </p>
      </div>

      {pendingJoinCode && (
        <div className="mb-4 p-3 bg-sky-50 border-2 border-sky-200 text-sky-800 text-xs rounded-2xl font-bold text-center">
          Masuk dengan namamu untuk bergabung ke kelas {pendingJoinCode}.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border-2 border-rose-200 text-rose-700 text-xs rounded-2xl font-bold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="login-name-input"
            className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1.5"
          >
            Nama Kamu
          </label>
          <input
            id="login-name-input"
            type="text"
            placeholder="Contoh: Rian Pratama"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-[#58CC02] focus:outline-none text-slate-900 font-bold text-sm transition"
            required
          />
        </div>

        <div>
          <span className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide mb-1.5">
            Peran Belajar
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`py-2.5 px-3 rounded-2xl border-2 font-extrabold text-xs flex items-center justify-center gap-1.5 transition ${
                role === 'student'
                  ? 'bg-sky-50 border-[#1CB0F6] text-[#1CB0F6]'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <UserCheck size={16} />
              <span>Murid</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('teacher')}
              className={`py-2.5 px-3 rounded-2xl border-2 font-extrabold text-xs flex items-center justify-center gap-1.5 transition ${
                role === 'teacher'
                  ? 'bg-emerald-50 border-[#58CC02] text-[#46A302]'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <GraduationCap size={16} />
              <span>Guru / Admin</span>
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 bg-[#58CC02] hover:bg-[#61E002] text-white font-black rounded-2xl border-b-4 border-[#46A302] active:translate-y-0.5 active:border-b-2 transition flex items-center justify-center gap-2 text-sm disabled:opacity-60"
        >
          <span>{isSubmitting ? 'Memproses...' : 'Masuk & Mulai Belajar'}</span>
          <ArrowRight size={18} />
        </button>
      </form>

      <div className="my-4 flex items-center gap-2 text-slate-400 text-[11px] font-bold uppercase">
        <div className="flex-1 h-px bg-slate-200" />
        <span>Pilihan Lainnya</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 font-extrabold rounded-2xl border-2 border-slate-200 border-b-4 active:translate-y-0.5 transition flex items-center justify-center gap-2 text-xs disabled:opacity-60"
        >
          <Cloud size={16} className="text-[#1CB0F6]" />
          <span>Masuk dengan Google (Sync Cloud)</span>
        </button>

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl border-2 border-slate-200 active:translate-y-0.5 transition flex items-center justify-center gap-2 text-xs disabled:opacity-60"
        >
          <Sparkles size={15} className="text-[#FF9600]" />
          <span>Masuk Akun Demo (Budi)</span>
        </button>
      </div>
    </div>
  );
};

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
      <NameLoginCard isModal onClose={onClose} onSuccess={onClose} />
    </div>
  );
};
