import React, { useState } from 'react';
import { Lesson, Question } from '../types';
import { LessonEngine } from './LessonEngine';
import { BookOpen, Headphones, Languages, PenTool, Sparkles, Shuffle } from 'lucide-react';

export const PracticeHub: React.FC = () => {
  const [activePracticeLesson, setActivePracticeLesson] = useState<Lesson | null>(null);

  const practiceModes = [
    {
      id: 'vocab',
      title: 'Kosakata Sehari-hari',
      desc: 'Latih perbendaharaan kata bahasa Inggris populer beserta artinya.',
      icon: BookOpen,
      color: 'bg-emerald-500 text-white border-emerald-700',
      questions: [
        {
          id: 'p-vocab-1',
          type: 'vocabulary' as const,
          prompt: 'Apa arti kata "Opportunity"?',
          targetText: 'Opportunity',
          options: ['Kesempatan', 'Hambatan', 'Pengalaman', 'Keputusan'],
          correctAnswer: 'Kesempatan',
          explanation: '"Opportunity" berarti peluang atau kesempatan.',
          xpReward: 5,
        },
        {
          id: 'p-vocab-2',
          type: 'vocabulary' as const,
          prompt: 'Apa arti kata "Essential"?',
          targetText: 'Essential',
          options: ['Sangat penting / mendasar', 'Tidak berguna', 'Opsional', 'Sederhana'],
          correctAnswer: 'Sangat penting / mendasar',
          explanation: '"Essential" berarti sesuatu yang mutlak atau sangat penting diperlukan.',
          xpReward: 5,
        },
        {
          id: 'p-vocab-3',
          type: 'vocabulary' as const,
          prompt: 'Apa arti kata "Confident"?',
          targetText: 'Confident',
          options: ['Percaya diri', 'Ragu-ragu', 'Takut', 'Cemas'],
          correctAnswer: 'Percaya diri',
          explanation: '"Confident" bermakna memiliki rasa percaya diri yang tinggi.',
          xpReward: 5,
        },
      ],
    },
    {
      id: 'listening',
      title: 'Latihan Menyimak (Listening)',
      desc: 'Pertajam telinga mendengar pelafalan aksen native speaker.',
      icon: Headphones,
      color: 'bg-sky-500 text-white border-sky-700',
      questions: [
        {
          id: 'p-list-1',
          type: 'listening' as const,
          prompt: 'Dengarkan kalimat dan pilih kalimat yang tepat:',
          targetText: 'Practice makes perfect.',
          options: ['Practice makes perfect.', 'Knowledge is great power.', 'Time is very valuable.', 'Actions speak loud.'],
          correctAnswer: 'Practice makes perfect.',
          explanation: '"Practice makes perfect" = Praktik membuat sempurna.',
          xpReward: 5,
        },
        {
          id: 'p-list-2',
          type: 'listening' as const,
          prompt: 'Dengarkan kalimat berikut:',
          targetText: 'Could you please repeat that?',
          options: ['Could you please repeat that?', 'Can I help you today?', 'Where is the main station?', 'How was your journey?'],
          correctAnswer: 'Could you please repeat that?',
          explanation: '"Could you please repeat that?" = Bisakah Anda mengulanginya?',
          xpReward: 5,
        },
      ],
    },
    {
      id: 'translation',
      title: 'Penerjemahan Kalimat',
      desc: 'Latih kemampuan menerjemahkan Indonesia ke Inggris secara natural.',
      icon: Languages,
      color: 'bg-amber-500 text-white border-amber-700',
      questions: [
        {
          id: 'p-trans-1',
          type: 'translation' as const,
          prompt: 'Terjemahkan: "Saya sedang belajar bahasa Inggris sekarang"',
          targetText: 'I am learning English now',
          options: ['I', 'am', 'learning', 'English', 'now', 'learn', 'today'],
          correctAnswer: 'I am learning English now',
          explanation: 'Present Continuous Tense menggunakan to be + V-ing untuk aksi saat ini.',
          xpReward: 5,
        },
        {
          id: 'p-trans-2',
          type: 'word_arrangement' as const,
          prompt: 'Susun kalimat: "Jangan pernah menyerah pada mimpimu"',
          options: ['Never', 'give', 'up', 'on', 'your', 'dreams'],
          correctAnswer: ['Never', 'give', 'up', 'on', 'your', 'dreams'],
          explanation: '"Never give up on your dreams" = Jangan pernah menyerah pada impianmu.',
          xpReward: 5,
        },
      ],
    },
    {
      id: 'grammar',
      title: 'Grammar & Struktur',
      desc: 'Uji pemahaman tenses, preposisi, dan susunan kalimat baku.',
      icon: PenTool,
      color: 'bg-indigo-500 text-white border-indigo-700',
      questions: [
        {
          id: 'p-gram-1',
          type: 'fill_blank' as const,
          prompt: 'Neither John nor his friends ____ coming to the party.',
          options: ['are', 'is', 'was', 'be'],
          correctAnswer: 'are',
          explanation: 'Dalam aturan "Neither... nor...", kata kerja mengikuti subjek terdekat ("his friends" -> are).',
          xpReward: 5,
        },
        {
          id: 'p-gram-2',
          type: 'multiple_choice' as const,
          prompt: 'Pilihlah bentuk kalimat pasif yang tepat: "The chef cooked the meal."',
          options: ['The meal was cooked by the chef.', 'The meal is cooked by chef.', 'The chef was cooked by meal.', 'The meal cooked the chef.'],
          correctAnswer: 'The meal was cooked by the chef.',
          explanation: 'Kalimat pasif simple past: Object + was/were + V3 (cooked).',
          xpReward: 5,
        },
      ],
    },
  ];

  const handleLaunchPractice = (mode: (typeof practiceModes)[0]) => {
    const practiceLesson: Lesson = {
      id: `practice_${mode.id}_${Date.now()}`,
      unitId: 'practice',
      levelId: 1,
      title: mode.title,
      description: mode.desc,
      xpReward: 10,
      questions: mode.questions,
    };
    setActivePracticeLesson(practiceLesson);
  };

  return (
    <div className="w-full max-w-3xl mx-auto pb-24">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          Ruang Latihan Bebas
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Asah keahlian spesifik tanpa batasan level untuk memperkuat penguasaan bahasa Inggrismu.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {practiceModes.map((mode) => {
          const Icon = mode.icon;
          return (
            <div
              key={mode.id}
              className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
            >
              <div>
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center border-b-4 mb-4 ${mode.color}`}
                >
                  <Icon size={28} />
                </div>
                <h3 className="text-lg font-black text-slate-900">{mode.title}</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                  {mode.desc}
                </p>
              </div>

              <button
                onClick={() => handleLaunchPractice(mode)}
                className="mt-6 w-full py-3 px-4 bg-slate-100 hover:bg-emerald-500 hover:text-white text-slate-800 font-bold rounded-2xl border-b-2 border-slate-200 hover:border-emerald-700 active:translate-y-0.5 text-sm transition flex items-center justify-center gap-2"
              >
                Mulai Latihan (+10 XP)
              </button>
            </div>
          );
        })}
      </div>

      {activePracticeLesson && (
        <LessonEngine
          lesson={activePracticeLesson}
          onClose={() => setActivePracticeLesson(null)}
          onComplete={() => setActivePracticeLesson(null)}
        />
      )}
    </div>
  );
};
