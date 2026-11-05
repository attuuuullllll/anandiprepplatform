'use client';

import React, { useState } from 'react';
import { ExamSection } from '@/types';
import { Sparkles, X, Clock, Zap, Target, BookOpen } from 'lucide-react';

export type AIExamMode = 'quick_5' | 'deep_10' | 'full_mock_120';

export interface GenerateAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (config: {
    section?: ExamSection;
    subtopic?: string;
    mode: AIExamMode;
    difficulty: 3 | 4 | 5;
  }) => void;
  weakSubtopics?: string[];
  initialSection?: ExamSection | 'all';
}

const SECTIONS: Array<{ id: ExamSection | 'all'; label: string; icon: string }> = [
  { id: 'all', label: 'All 5 Exam Domains (Balanced)', icon: '🏆' },
  { id: 'quant', label: 'Quantitative Aptitude & Unit Economics', icon: '🧮' },
  { id: 'logic', label: 'Logical Reasoning & Constraint Puzzles', icon: '🧩' },
  { id: 'verbal_di', label: 'Data Interpretation & Reading', icon: '📊' },
  { id: 'general_awareness', label: 'General Awareness & Startups', icon: '🌍' },
  { id: 'business_judgement', label: 'Business Judgement & Founder Calls', icon: '💡' },
];

export const GenerateAIModal: React.FC<GenerateAIModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  weakSubtopics = [],
  initialSection = 'all',
}) => {
  const [selectedSection, setSelectedSection] = useState<ExamSection | 'all'>(initialSection);
  const [selectedMode, setSelectedMode] = useState<AIExamMode>('quick_5');
  const [selectedDifficulty, setSelectedDifficulty] = useState<3 | 4 | 5>(4);
  const [selectedWeakSubtopic, setSelectedWeakSubtopic] = useState<string>('');

  React.useEffect(() => {
    if (isOpen && initialSection) {
      setSelectedSection(initialSection);
    }
  }, [isOpen, initialSection]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      section: selectedSection === 'all' ? undefined : selectedSection,
      subtopic: selectedWeakSubtopic || undefined,
      mode: selectedMode,
      difficulty: selectedDifficulty,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 sm:p-7 space-y-6 shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start space-x-3.5 pr-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Generate AI Exam / Practice Set
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Powered by DeepSeek-V3 dual-model verification audit.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          
          {/* Field 1: Choose Section / Domain */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 block uppercase tracking-wider font-mono text-[11px]">
              1. Choose Section / Domain
            </label>
            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
              {SECTIONS.map((sec) => (
                <button
                  type="button"
                  key={sec.id}
                  onClick={() => {
                    setSelectedSection(sec.id);
                    setSelectedWeakSubtopic('');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-all ${
                    selectedSection === sec.id && !selectedWeakSubtopic
                      ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                      : 'hover:bg-white text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{sec.icon}</span>
                    <span>{sec.label}</span>
                  </span>
                  {selectedSection === sec.id && !selectedWeakSubtopic && (
                    <span className="text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded">Selected</span>
                  )}
                </button>
              ))}

              {/* Weak Subtopics Option if available */}
              {weakSubtopics.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSection('all');
                    setSelectedWeakSubtopic(weakSubtopics[0]);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-all border border-amber-300 ${
                    selectedWeakSubtopic
                      ? 'bg-amber-600 text-white font-bold shadow-2xs'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>🎯</span>
                    <span>Focus on My Weak Spot ({weakSubtopics[0]})</span>
                  </span>
                  {selectedWeakSubtopic && (
                    <span className="text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded">Selected</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Field 2: Choose Exam Mode / Format */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 block uppercase tracking-wider font-mono text-[11px]">
              2. Choose Test Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMode('quick_5')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  selectedMode === 'quick_5'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 font-bold shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <Zap className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                <span className="block font-bold text-xs">5 Questions</span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">Quick Sprint (10m)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('deep_10')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  selectedMode === 'deep_10'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 font-bold shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <Target className="w-4 h-4 mx-auto mb-1 text-teal-600" />
                <span className="block font-bold text-xs">10 Questions</span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">Deep Drill (25m)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode('full_mock_120')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  selectedMode === 'full_mock_120'
                    ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 font-bold shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <Clock className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                <span className="block font-bold text-xs">Full Mock</span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">2 Hours (120 Qs)</span>
              </button>
            </div>
          </div>

          {/* Field 3: Difficulty */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 block uppercase tracking-wider font-mono text-[11px]">
              3. Difficulty Level
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedDifficulty(4)}
                className={`flex-1 py-2 px-3 rounded-lg border text-center font-mono ${
                  selectedDifficulty === 4
                    ? 'bg-slate-900 text-white font-bold border-slate-900'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Level 4 · Anandi Standard
              </button>
              <button
                type="button"
                onClick={() => setSelectedDifficulty(5)}
                className={`flex-1 py-2 px-3 rounded-lg border text-center font-mono ${
                  selectedDifficulty === 5
                    ? 'bg-slate-900 text-white font-bold border-slate-900'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Level 5 · Qualifier Hard
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold shadow-md active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate &amp; Start Test</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
