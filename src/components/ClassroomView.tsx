import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Classroom, ClassroomMember, JoinedClassroom } from '../types';
import {
  createClassroomRecord,
  deleteTeacherClassroom,
  joinClassroomByCode,
  leaveStudentClassroom,
  listClassroomMembers,
  listStudentJoinedClasses,
  listTeacherClassrooms,
  removeStudentFromClassroom,
} from '../services/firestoreService';
import {
  generateClassCode,
  normalizeClassCode,
  parseJoinCodeFromUrl,
} from '../utils/gameLogic';
import {
  GraduationCap,
  Plus,
  Copy,
  Check,
  Users,
  Link2,
  Trash2,
  RefreshCw,
  UserMinus,
  LogOut,
  Zap,
  Flame,
  Target,
  BookOpen,
  Shield,
} from 'lucide-react';

export const ClassroomView: React.FC = () => {
  const {
    user,
    stats,
    pendingJoinCode,
    clearPendingJoinCode,
    cloudErrorNotice,
  } = useAuth();

  const [subTab, setSubTab] = useState<'join' | 'manage'>(
    user?.role === 'teacher' && !pendingJoinCode ? 'manage' : 'join'
  );

  // Join class state
  const [joinInput, setJoinInput] = useState(pendingJoinCode || '');
  const [joinedClasses, setJoinedClasses] = useState<JoinedClassroom[]>([]);
  const [joinMessage, setJoinMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Teacher / Admin create & manage state
  const [className, setClassName] = useState('');
  const [classCode, setClassCode] = useState(() => generateClassCode('ENG'));
  const [classDesc, setClassDesc] = useState('');
  const [ownedClasses, setOwnedClasses] = useState<Classroom[]>([]);
  const [selectedClassCode, setSelectedClassCode] = useState<string>('');
  const [members, setMembers] = useState<ClassroomMember[]>([]);
  const [teacherMessage, setTeacherMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteCode, setConfirmDeleteCode] = useState<string | null>(null);

  const loadJoinedClasses = useCallback(async () => {
    if (!user) return;
    try {
      const list = await listStudentJoinedClasses(user.id);
      setJoinedClasses(list);
    } catch {
      // handled cleanly
    }
  }, [user]);

  const loadOwnedClasses = useCallback(async () => {
    if (!user) return;
    try {
      const list = await listTeacherClassrooms(user.id);
      setOwnedClasses(list);
      if (list.length > 0 && !list.some((c) => c.code === selectedClassCode)) {
        setSelectedClassCode(list[0].code);
      } else if (list.length === 0) {
        setSelectedClassCode('');
        setMembers([]);
      }
    } catch {
      // handled cleanly
    }
  }, [user, selectedClassCode]);

  const loadMembersForClass = useCallback(
    async (code: string) => {
      if (!user || !code) {
        setMembers([]);
        return;
      }
      setIsLoadingMembers(true);
      try {
        const list = await listClassroomMembers(code, user.id);
        setMembers(list);
      } catch {
        setMembers([]);
      } finally {
        setIsLoadingMembers(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;
    if (pendingJoinCode) {
      setSubTab('join');
    } else if (user.role === 'teacher') {
      setSubTab('manage');
    } else {
      setSubTab('join');
    }
  }, [user?.id, user?.role, pendingJoinCode]);

  useEffect(() => {
    loadJoinedClasses();
    loadOwnedClasses();
  }, [loadJoinedClasses, loadOwnedClasses]);

  useEffect(() => {
    if (selectedClassCode && subTab === 'manage') {
      loadMembersForClass(selectedClassCode);
    }
  }, [selectedClassCode, subTab, loadMembersForClass]);

  const executeJoin = useCallback(
    async (rawInput: string) => {
      if (!user) return;
      const trimmed = rawInput.trim();
      if (!trimmed) {
        setJoinMessage({ type: 'err', text: 'Masukkan kode kelas atau link undangan.' });
        return;
      }

      let codeToJoin = '';
      if (trimmed.includes('http') || trimmed.includes('join')) {
        try {
          const parsedUrl = new URL(
            trimmed.startsWith('http') ? trimmed : `https://dummy.local/${trimmed.replace(/^\/+/, '')}`
          );
          codeToJoin = parseJoinCodeFromUrl(parsedUrl.search, parsedUrl.pathname) || '';
        } catch {
          codeToJoin = '';
        }
      }
      if (!codeToJoin) {
        codeToJoin = normalizeClassCode(trimmed);
      }

      setIsJoining(true);
      setJoinMessage(null);
      try {
        const joined = await joinClassroomByCode(user, stats, codeToJoin);
        setJoinMessage({
          type: 'ok',
          text: `Berhasil bergabung ke kelas ${joined.className}.`,
        });
        setJoinInput('');
        await loadJoinedClasses();
      } catch (err) {
        setJoinMessage({
          type: 'err',
          text: err instanceof Error ? err.message : 'Gagal bergabung ke kelas.',
        });
      } finally {
        setIsJoining(false);
      }
    },
    [user, stats, loadJoinedClasses]
  );

  // Auto-join if user opened an invite link
  useEffect(() => {
    if (user && pendingJoinCode) {
      const code = pendingJoinCode;
      clearPendingJoinCode();
      setSubTab('join');
      executeJoin(code);
    }
  }, [user, pendingJoinCode, clearPendingJoinCode, executeJoin]);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeJoin(joinInput);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setTeacherMessage(null);
    setIsCreating(true);
    try {
      const created = await createClassroomRecord(user, className, classCode, classDesc);
      setTeacherMessage({
        type: 'ok',
        text: `Kelas ${created.name} berhasil dibuat dengan kode ${created.code}.`,
      });
      setClassName('');
      setClassDesc('');
      setClassCode(generateClassCode('ENG'));
      await loadOwnedClasses();
      setSelectedClassCode(created.code);
    } catch (err) {
      setTeacherMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal membuat kelas.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback ignored cleanly
    }
  };

  const handleRemoveMember = async (studentUid: string) => {
    if (!selectedClassCode) return;
    try {
      await removeStudentFromClassroom(selectedClassCode, studentUid);
      setMembers((prev) => prev.filter((m) => m.userId !== studentUid));
    } catch (err) {
      setTeacherMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal mengeluarkan murid.',
      });
    }
  };

  const handleDeleteClass = async (code: string) => {
    try {
      await deleteTeacherClassroom(code);
      setConfirmDeleteCode(null);
      setTeacherMessage({ type: 'ok', text: `Kelas ${code} berhasil dihapus.` });
      await loadOwnedClasses();
    } catch (err) {
      setTeacherMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menghapus kelas.',
      });
    }
  };

  const handleLeaveClass = async (code: string) => {
    if (!user) return;
    try {
      await leaveStudentClassroom(user.id, code);
      setJoinedClasses((prev) => prev.filter((c) => c.classId !== code));
    } catch {
      // ignore
    }
  };

  const selectedClass = ownedClasses.find((c) => c.code === selectedClassCode) || null;
  const inviteLink =
    selectedClass && typeof window !== 'undefined'
      ? `${window.location.origin}/?join=${selectedClass.code}`
      : '';

  const avgXp =
    members.length > 0
      ? Math.round(members.reduce((sum, m) => sum + m.xp, 0) / members.length)
      : 0;
  const avgLessons =
    members.length > 0
      ? (
          members.reduce((sum, m) => sum + m.completedLessonsCount, 0) / members.length
        ).toFixed(1)
      : '0';
  const avgAccuracy =
    members.length > 0
      ? Math.round(members.reduce((sum, m) => sum + m.accuracyRate, 0) / members.length)
      : 0;

  return (
    <div className="w-full max-w-3xl mx-auto pb-24">
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          Ruang Kelas Linguitica
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Buat kelas untuk memantau progres murid, atau bergabung memakai kode dan link undangan.
        </p>
      </div>

      {cloudErrorNotice && (
        <div className="mb-5 p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-900 text-xs font-semibold">
          {cloudErrorNotice}
        </div>
      )}

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={() => setSubTab('join')}
          className={`py-3 px-4 rounded-2xl border-2 font-extrabold text-sm flex items-center justify-center gap-2 transition ${
            subTab === 'join'
              ? 'bg-sky-50 border-[#1CB0F6] text-[#1CB0F6]'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users size={18} />
          <span>Gabung Kelas (Murid)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('manage')}
          className={`py-3 px-4 rounded-2xl border-2 font-extrabold text-sm flex items-center justify-center gap-2 transition ${
            subTab === 'manage'
              ? 'bg-emerald-50 border-[#58CC02] text-[#46A302]'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <GraduationCap size={18} />
          <span>Kelola Kelas (Guru)</span>
        </button>
      </div>

      {/* STUDENT VIEW: JOIN & JOINED CLASSES */}
      {subTab === 'join' && (
        <div className="space-y-6">
          <form
            onSubmit={handleJoinSubmit}
            className="bg-white rounded-3xl p-6 border-2 border-slate-200"
          >
            <h3 className="text-base font-black text-slate-900 mb-1">
              Gabung ke Kelas
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Tempel kode kelas atau link undangan dari gurumu di sini.
            </p>

            {joinMessage && (
              <div
                className={`mb-4 p-3 rounded-2xl border-2 text-xs font-bold ${
                  joinMessage.type === 'ok'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                {joinMessage.text}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Contoh: ENG402 atau https://.../?join=ENG402"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-[#1CB0F6] focus:outline-none text-slate-900 font-bold text-sm"
              />
              <button
                type="submit"
                disabled={isJoining}
                className="py-3 px-6 bg-[#1CB0F6] hover:bg-sky-500 text-white font-black rounded-2xl border-b-4 border-[#1899D6] active:translate-y-0.5 transition text-sm shrink-0 disabled:opacity-60"
              >
                {isJoining ? 'Memproses...' : 'Gabung Kelas'}
              </button>
            </div>
          </form>

          <div>
            <h3 className="text-base font-black text-slate-900 mb-3">
              Kelas yang Kamu Ikuti ({joinedClasses.length})
            </h3>
            {joinedClasses.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border-2 border-slate-200 text-center">
                <p className="text-sm font-bold text-slate-600">
                  Kamu belum bergabung ke kelas mana pun.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Minta kode kelas atau link undangan dari gurumu untuk mulai belajar bersama.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {joinedClasses.map((cls) => (
                  <div
                    key={cls.classId}
                    className="bg-white rounded-2xl p-5 border-2 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-sky-50 text-[#1CB0F6] border border-sky-200">
                          {cls.classId}
                        </span>
                        <h4 className="text-base font-black text-slate-900">
                          {cls.className}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        Pengajar: {cls.teacherName} • Progres tersinkron: {stats.xp} XP, {stats.completedLessons.length} pelajaran
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLeaveClass(cls.classId)}
                      className="px-3.5 py-2 rounded-xl border-2 border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto transition"
                    >
                      <LogOut size={14} />
                      <span>Keluar Kelas</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TEACHER / ADMIN VIEW */}
      {subTab === 'manage' && (
        <div className="space-y-6">
          {/* Create Class Card */}
          <form
            onSubmit={handleCreateClass}
            className="bg-white rounded-3xl p-6 border-2 border-slate-200"
          >
            <div className="flex items-center gap-2 mb-1">
              <Shield size={18} className="text-[#58CC02]" />
              <h3 className="text-base font-black text-slate-900">
                Buat Kelas Baru (Admin Kelas)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Cukup isi nama kelas dan kode kelas agar murid bisa langsung bergabung.
            </p>

            {teacherMessage && (
              <div
                className={`mb-4 p-3 rounded-2xl border-2 text-xs font-bold ${
                  teacherMessage.type === 'ok'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}
              >
                {teacherMessage.text}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">
                  Nama Kelas
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bahasa Inggris Kelas 7A"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  maxLength={80}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#58CC02] focus:outline-none text-slate-900 font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">
                  Kode Kelas
                </label>
                <div className="flex gap-2 min-w-0">
                  <input
                    type="text"
                    placeholder="ENG123"
                    value={classCode}
                    onChange={(e) => setClassCode(normalizeClassCode(e.target.value))}
                    maxLength={20}
                    required
                    className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#58CC02] focus:outline-none text-slate-900 font-black text-sm uppercase tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setClassCode(generateClassCode('ENG'))}
                    className="px-3.5 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold text-xs shrink-0 transition"
                  >
                    Acak
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">
                Deskripsi Singkat (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Kelas latihan harian untuk semester genap."
                value={classDesc}
                onChange={(e) => setClassDesc(e.target.value)}
                maxLength={150}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-[#58CC02] focus:outline-none text-slate-900 font-medium text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full sm:w-auto py-3 px-6 bg-[#58CC02] hover:bg-[#61E002] text-white font-black rounded-2xl border-b-4 border-[#46A302] active:translate-y-0.5 transition text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Plus size={18} />
              <span>{isCreating ? 'Menyimpan...' : 'Buat Kelas Sekarang'}</span>
            </button>
          </form>

          {/* Teacher Owned Classes Selector & Admin Dashboard */}
          <div>
            <h3 className="text-base font-black text-slate-900 mb-3">
              Daftar Kelas Saya ({ownedClasses.length})
            </h3>

            {ownedClasses.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border-2 border-slate-200 text-center">
                <p className="text-sm font-bold text-slate-600">
                  Belum ada kelas yang dibuat.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Buat kelas pertamamu di atas untuk mulai memantau progres belajar murid.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Class Pills */}
                <div className="flex flex-wrap gap-2">
                  {ownedClasses.map((cls) => {
                    const isSelected = cls.code === selectedClassCode;
                    return (
                      <button
                        key={cls.code}
                        type="button"
                        onClick={() => setSelectedClassCode(cls.code)}
                        className={`px-4 py-2 rounded-xl border-2 text-xs font-extrabold transition flex items-center gap-2 ${
                          isSelected
                            ? 'bg-emerald-50 border-[#58CC02] text-[#46A302]'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{cls.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-black">
                          {cls.code}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Class Admin Panel */}
                {selectedClass && (
                  <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-100 pb-4">
                      <div>
                        <span className="text-[11px] font-black uppercase text-[#46A302] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          Panel Admin Guru
                        </span>
                        <h4 className="text-xl font-black text-slate-900 mt-1.5">
                          {selectedClass.name}
                        </h4>
                        {selectedClass.description && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {selectedClass.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => loadMembersForClass(selectedClass.code)}
                          className="px-3 py-2 rounded-xl border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
                        >
                          <RefreshCw size={14} />
                          <span>Muat Ulang</span>
                        </button>

                        {confirmDeleteCode === selectedClass.code ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteClass(selectedClass.code)}
                              className="px-3 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700"
                            >
                              Ya, Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteCode(null)}
                              className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCode(selectedClass.code)}
                            className="p-2 rounded-xl border-2 border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition"
                            title="Hapus kelas"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Shareable Code & Invite Link */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase text-slate-500 block">
                            Kode Kelas
                          </span>
                          <span className="text-lg font-black text-slate-900 tracking-wider">
                            {selectedClass.code}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(selectedClass.code, 'code')}
                          className="px-3 py-2 rounded-xl bg-white border-2 border-slate-200 hover:border-[#1CB0F6] text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
                        >
                          {copiedId === 'code' ? (
                            <>
                              <Check size={14} className="text-[#58CC02]" />
                              <span>Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              <span>Salin Kode</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-extrabold uppercase text-slate-500 block">
                            Link Undangan Kelas
                          </span>
                          <span className="text-xs font-bold text-slate-700 truncate block">
                            {inviteLink}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyText(inviteLink, 'link')}
                          className="px-3 py-2 rounded-xl bg-white border-2 border-slate-200 hover:border-[#1CB0F6] text-slate-700 font-bold text-xs flex items-center gap-1.5 shrink-0 transition"
                        >
                          {copiedId === 'link' ? (
                            <>
                              <Check size={14} className="text-[#58CC02]" />
                              <span>Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Link2 size={14} />
                              <span>Salin Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Class Aggregate KPIs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-2xl border-2 border-slate-200 bg-white">
                        <div className="flex items-center gap-1 text-[11px] font-extrabold text-slate-500 uppercase">
                          <Users size={13} /> Murid
                        </div>
                        <p className="text-xl font-black text-slate-900 mt-0.5">
                          {members.length}
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl border-2 border-slate-200 bg-white">
                        <div className="flex items-center gap-1 text-[11px] font-extrabold text-amber-600 uppercase">
                          <Zap size={13} /> Rata XP
                        </div>
                        <p className="text-xl font-black text-slate-900 mt-0.5">
                          {avgXp}
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl border-2 border-slate-200 bg-white">
                        <div className="flex items-center gap-1 text-[11px] font-extrabold text-[#58CC02] uppercase">
                          <BookOpen size={13} /> Rata Pelajaran
                        </div>
                        <p className="text-xl font-black text-slate-900 mt-0.5">
                          {avgLessons}
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl border-2 border-slate-200 bg-white">
                        <div className="flex items-center gap-1 text-[11px] font-extrabold text-[#1CB0F6] uppercase">
                          <Target size={13} /> Rata Akurasi
                        </div>
                        <p className="text-xl font-black text-slate-900 mt-0.5">
                          {avgAccuracy}%
                        </p>
                      </div>
                    </div>

                    {/* Student Roster Table */}
                    <div>
                      <h5 className="text-sm font-black text-slate-900 mb-3">
                        Progres Murid di Kelas Ini
                      </h5>

                      {isLoadingMembers ? (
                        <p className="text-xs font-semibold text-slate-500 py-4">
                          Memuat data murid...
                        </p>
                      ) : members.length === 0 ? (
                        <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                          <p className="text-xs font-bold text-slate-600">
                            Belum ada murid yang bergabung ke kelas ini.
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Bagikan kode {selectedClass.code} atau link undangan di atas kepada muridmu.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto border-2 border-slate-200 rounded-2xl">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-600 uppercase font-extrabold">
                                <th className="py-3 px-4">Nama Murid</th>
                                <th className="py-3 px-3">Level</th>
                                <th className="py-3 px-3">XP</th>
                                <th className="py-3 px-3">Pelajaran</th>
                                <th className="py-3 px-3">Akurasi</th>
                                <th className="py-3 px-3">Streak</th>
                                <th className="py-3 px-3 text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {members.map((m) => (
                                <tr
                                  key={m.userId}
                                  className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                                >
                                  <td className="py-3 px-4 font-extrabold text-slate-900">
                                    {m.studentName}
                                  </td>
                                  <td className="py-3 px-3 font-bold text-slate-700">
                                    Lv. {m.currentLevelId}
                                  </td>
                                  <td className="py-3 px-3 font-black text-amber-700">
                                    {m.xp} XP
                                  </td>
                                  <td className="py-3 px-3 font-bold text-emerald-700">
                                    {m.completedLessonsCount}
                                  </td>
                                  <td className="py-3 px-3 font-bold text-sky-700">
                                    {m.accuracyRate}%
                                  </td>
                                  <td className="py-3 px-3 font-bold text-orange-600">
                                    <span className="inline-flex items-center gap-1">
                                      <Flame size={13} /> {m.streak}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMember(m.userId)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                      title="Keluarkan murid"
                                    >
                                      <UserMinus size={15} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
