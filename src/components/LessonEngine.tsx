import React, { useState, useEffect } from 'react';
import { Lesson, Question } from '../types';
import { useAuth } from '../context/AuthContext';
import { soundService } from '../utils/sound';
import { checkQuestionAnswer } from '../utils/gameLogic';
import { LinguiMascot } from './LinguiMascot';
import confetti from 'canvas-confetti';
import {
  Volume2,
  Heart,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  Zap,
  X,
  RotateCcw,
} from 'lucide-react';

interface LessonEngineProps {
  lesson: Lesson;
  onClose: () => void;
  onComplete: () => void;
}

export const LessonEngine: React.FC<LessonEngineProps> = ({
  lesson,
  onClose,
  onComplete,
}) => {
  const {
    stats,
    consumeHeart,
    refillHeartsFull,
    recordQuestionAttempt,
    recordLessonCompleted,
  } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [arrangedWords, setArrangedWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [mistakesCount, setMistakesCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [outOfHearts, setOutOfHearts] = useState(false);

  const currentQ: Question = lesson.questions[currentIdx];
  const progressPercent = ((currentIdx) / lesson.questions.length) * 100;

  // Initialize word arrangement question options
  useEffect(() => {
    if (!currentQ) return;
    setIsAnswered(false);
    setSelectedAnswer('');
    if (currentQ.type === 'word_arrangement') {
      const words = [...(currentQ.options || [])].sort(() => Math.random() - 0.5);
      setAvailableWords(words);
      setArrangedWords([]);
    } else {
      setArrangedWords([]);
      setAvailableWords([]);
    }

    // Auto speak listening and vocabulary questions
    if (currentQ.type === 'listening' && currentQ.targetText) {
      soundService.speak(currentQ.targetText);
    }
  }, [currentIdx, currentQ]);

  // Handle checking the user's answer
  const handleCheck = () => {
    if (isAnswered) return;

    const userCorrect = checkQuestionAnswer(currentQ, selectedAnswer, arrangedWords);
    recordQuestionAttempt(currentQ.type, userCorrect);

    setIsAnswered(true);
    setIsCorrect(userCorrect);

    if (userCorrect) {
      soundService.playCorrect();
    } else {
      soundService.playWrong();
      setMistakesCount((c) => c + 1);
      const alive = consumeHeart();
      if (!alive) {
        setOutOfHearts(true);
      }
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < lesson.questions.length) {
      setCurrentIdx((idx) => idx + 1);
    } else {
      // Completed all questions in the lesson
      soundService.playFanfare();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
      const isPerfect = mistakesCount === 0;
      const bonusXp = isPerfect ? 5 : 0;
      const totalEarnedXp = lesson.xpReward + bonusXp;
      recordLessonCompleted(lesson.id, totalEarnedXp, isPerfect);
      setShowSummary(true);
    }
  };

  // Word arrangement helpers
  const handlePickWord = (word: string, index: number) => {
    if (isAnswered) return;
    setArrangedWords([...arrangedWords, word]);
    const updated = [...availableWords];
    updated.splice(index, 1);
    setAvailableWords(updated);
  };

  const handleRemoveWord = (word: string, index: number) => {
    if (isAnswered) return;
    setAvailableWords([...availableWords, word]);
    const updated = [...arrangedWords];
    updated.splice(index, 1);
    setArrangedWords(updated);
  };

  // Can the check button be pressed?
  const canCheck = () => {
    if (isAnswered) return true;
    if (currentQ.type === 'word_arrangement') {
      return arrangedWords.length > 0;
    }
    return selectedAnswer.length > 0;
  };

  // Summary screen
  if (showSummary) {
    const isPerfect = mistakesCount === 0;
    const earnedXp = lesson.xpReward + (isPerfect ? 5 : 0);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border-2 border-slate-100 flex flex-col items-center text-center">
          <LinguiMascot mood="celebrating" size={120} />
          <h2 className="text-3xl font-black text-slate-900 mt-4">
            {isPerfect ? 'Luar Biasa, Sempurna!' : 'Pelajaran Selesai!'}
          </h2>
          <p className="text-slate-600 mt-2 text-sm max-w-sm">
            {isPerfect
              ? 'Hebat sekali! Kamu menyelesaikan seluruh soal tanpa membuat satu kesalahan pun.'
              : 'Kerja bagus! Terus asah kemampuan bahasa Inggrismu setiap hari.'}
          </p>

          <div className="grid grid-cols-2 gap-4 w-full mt-6">
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs uppercase mb-1">
                <Zap size={16} /> Total XP
              </div>
              <span className="text-2xl font-black text-amber-700">+{earnedXp}</span>
              {isPerfect && (
                <span className="text-xs font-semibold text-amber-600 mt-0.5">
                  (+5 Bonus Sempurna)
                </span>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-rose-600 font-bold text-xs uppercase mb-1">
                <Heart size={16} /> Sisa Hati
              </div>
              <span className="text-2xl font-black text-rose-700">{stats.hearts} / 5</span>
              <span className="text-xs text-rose-600 mt-0.5">
                {mistakesCount === 0 ? 'Tanpa Salah' : `${mistakesCount} Salah`}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              onComplete();
              onClose();
            }}
            className="w-full mt-6 py-4 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl border-b-4 border-emerald-700 active:translate-y-1 active:border-b-0 transition flex items-center justify-center gap-2"
          >
            Lanjutkan Perjalanan <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  // Out of hearts modal
  if (outOfHearts && stats.hearts === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border-2 border-slate-100 flex flex-col items-center text-center">
          <LinguiMascot mood="thinking" size={100} />
          <h2 className="text-2xl font-black text-slate-900 mt-4">Kehabisan Hati!</h2>
          <p className="text-slate-600 mt-2 text-sm">
            Kamu telah menghabiskan semua nyawamu. Hati akan pulih otomatis 1 poin setiap 30 menit, atau kamu dapat mengisi ulang sekarang untuk lanjut belajar.
          </p>

          <div className="w-full mt-6 space-y-3">
            <button
              onClick={() => {
                refillHeartsFull();
                setOutOfHearts(false);
              }}
              className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl border-b-4 border-emerald-700 active:translate-y-1 active:border-b-0 transition flex items-center justify-center gap-2"
            >
              <Sparkles size={18} className="text-amber-300" />
              Isi Penuh Hati & Lanjutkan
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl border-b-2 border-slate-300 text-sm transition"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col justify-between overflow-y-auto">
      {/* Top Navigation Bar */}
      <div className="w-full max-w-4xl mx-auto px-4 py-4 sm:py-6 flex items-center gap-4">
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition"
          title="Tutup pelajaran"
        >
          <X size={24} />
        </button>

        {/* Flat Progress Bar */}
        <div className="flex-1 bg-slate-200 h-4 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Hearts indicator */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border-2 border-rose-200 rounded-2xl text-rose-600 font-bold text-sm">
          <Heart size={18} className="fill-rose-500 text-rose-500" />
          <span>{stats.hearts}</span>
        </div>
      </div>

      {/* Main Question Container */}
      <div className="w-full max-w-2xl mx-auto px-4 py-6 flex-1 flex flex-col justify-center">
        {/* Question Header & Mascot Cue */}
        <div className="flex items-start gap-4 mb-6">
          <LinguiMascot
            mood={isAnswered ? (isCorrect ? 'cheering' : 'thinking') : 'happy'}
            size={76}
            className="shrink-0 hidden sm:inline-flex"
          />
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              {currentQ.type.replace('_', ' ')}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              {currentQ.prompt}
            </h3>
          </div>
        </div>

        {/* Speech/Audio Button if listening or targetText available */}
        {currentQ.targetText && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
            <button
              onClick={() => currentQ.targetText && soundService.speak(currentQ.targetText)}
              className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-2xl flex items-center justify-center shrink-0 border-b-3 border-emerald-700 transition"
              title="Dengarkan pengucapan"
            >
              <Volume2 size={24} />
            </button>
            <div className="flex-1">
              <span className="text-xs font-bold text-slate-600 uppercase">
                {currentQ.type === 'listening' ? 'Klik ikon suara untuk mendengarkan' : 'Audio Pengucapan'}
              </span>
              <p className="text-lg font-bold text-slate-900">
                {currentQ.type === 'listening' ? 'Tekan untuk memutar audio...' : currentQ.targetText}
              </p>
            </div>
          </div>
        )}

        {/* Exercise Type 1: Word Arrangement */}
        {currentQ.type === 'word_arrangement' && (
          <div className="space-y-4">
            {/* Sentence Construction Zone */}
            <div className="min-h-18 p-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-wrap gap-2 items-center">
              {arrangedWords.length === 0 && (
                <span className="text-slate-400 text-sm font-medium italic pl-2">
                  Klik kata di bawah untuk menyusun kalimat...
                </span>
              )}
              {arrangedWords.map((word, idx) => (
                <button
                  key={`${word}-${idx}`}
                  disabled={isAnswered}
                  onClick={() => handleRemoveWord(word, idx)}
                  className="px-4 py-2.5 bg-white text-slate-800 font-bold rounded-xl border-2 border-slate-300 border-b-4 hover:border-slate-400 active:translate-y-0.5 text-sm transition"
                >
                  {word}
                </button>
              ))}
            </div>

            {/* Word Bank */}
            <div className="flex flex-wrap gap-2.5 pt-2">
              {availableWords.map((word, idx) => (
                <button
                  key={`bank-${word}-${idx}`}
                  disabled={isAnswered}
                  onClick={() => handlePickWord(word, idx)}
                  className="px-4 py-2.5 bg-white text-slate-800 font-bold rounded-xl border-2 border-slate-200 border-b-4 hover:border-emerald-400 active:translate-y-0.5 text-sm transition"
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Exercise Type 2: Multiple Choice / Translation / Listening / Fill blank */}
        {currentQ.type !== 'word_arrangement' && (
          <div className="grid grid-cols-1 gap-3">
            {currentQ.options?.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              let btnStyle = 'bg-white border-slate-200 text-slate-800 hover:border-emerald-400';

              if (isAnswered) {
                if (option === currentQ.correctAnswer) {
                  btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-800';
                } else if (isSelected && !isCorrect) {
                  btnStyle = 'bg-rose-50 border-rose-500 text-rose-800';
                } else {
                  btnStyle = 'bg-white border-slate-200 text-slate-400 opacity-60';
                }
              } else if (isSelected) {
                btnStyle = 'bg-emerald-50 border-emerald-500 text-emerald-800';
              }

              return (
                <button
                  key={idx}
                  disabled={isAnswered}
                  onClick={() => setSelectedAnswer(option)}
                  className={`w-full p-4 rounded-2xl border-2 border-b-4 text-left font-bold text-base transition flex items-center justify-between active:translate-y-0.5 ${btnStyle}`}
                >
                  <span>{option}</span>
                  <div
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center text-xs font-bold ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Feedback / Continue Drawer */}
      <div
        className={`w-full border-t-2 py-4 sm:py-6 px-4 transition-colors ${
          !isAnswered
            ? 'bg-white border-slate-200'
            : isCorrect
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-rose-50 border-rose-200'
        }`}
      >
        <div className="w-full max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Feedback status & explanation */}
          {isAnswered ? (
            <div className="flex items-start gap-3 w-full sm:w-auto">
              {isCorrect ? (
                <CheckCircle2 size={32} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle size={32} className="text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h4
                  className={`text-lg font-black ${
                    isCorrect ? 'text-emerald-800' : 'text-rose-800'
                  }`}
                >
                  {isCorrect ? 'Luar biasa, benar!' : 'Jawaban belum tepat!'}
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 mt-1 max-w-md font-medium">
                  {currentQ.explanation}
                </p>
                {!isCorrect && (
                  <p className="text-xs font-bold text-slate-900 mt-1">
                    Jawaban yang benar:{' '}
                    <span className="text-emerald-700">
                      {Array.isArray(currentQ.correctAnswer)
                        ? currentQ.correctAnswer.join(' ')
                        : currentQ.correctAnswer}
                    </span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden sm:block text-slate-500 text-xs font-semibold">
              Pilih jawaban lalu klik Periksa
            </div>
          )}

          {/* Action button: Check or Continue */}
          <div className="w-full sm:w-auto flex items-center justify-end">
            {!isAnswered ? (
              <button
                onClick={handleCheck}
                disabled={!canCheck()}
                className={`w-full sm:w-44 py-3.5 px-6 font-bold rounded-2xl border-b-4 transition active:translate-y-1 active:border-b-0 ${
                  canCheck()
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-700'
                    : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                }`}
              >
                Periksa
              </button>
            ) : (
              <button
                onClick={handleNext}
                className={`w-full sm:w-44 py-3.5 px-6 font-bold rounded-2xl border-b-4 text-white transition active:translate-y-1 active:border-b-0 ${
                  isCorrect
                    ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-700'
                    : 'bg-rose-500 hover:bg-rose-600 border-rose-700'
                }`}
              >
                Lanjutkan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
