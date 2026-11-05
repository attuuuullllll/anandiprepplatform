'use client';

import React, { useState, useEffect } from 'react';
import { DiagnosticOverview, SubtopicDiagnostic, getEmpiricalDiagnostics } from '@/lib/storage';
import { ExamSection, Question } from '@/types';
import { 
  ArrowLeft, 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Clock, 
  TrendingDown, 
  Sparkles,
  BarChart3,
  HelpCircle,
  BookOpen
} from 'lucide-react';

interface WeaknessDiagnosticHubProps {
  onBack: () => void;
  onStartSurgeryDrill: (subtopicDiagnostic: SubtopicDiagnostic) => void;
  onStartStarterSprint: () => void;
  onOpenLeo: () => void;
}

const SECTION_LABELS: Record<ExamSection, string> = {
  quant: 'Quantitative Aptitude',
  logic: 'Logical Reasoning',
  verbal_di: 'Data Interpretation & Reading',
  general_awareness: 'General Awareness',
  business_judgement: 'Business Judgement',
};

export const WeaknessDiagnosticHub: React.FC<WeaknessDiagnosticHubProps> = ({
  onBack,
  onStartSurgeryDrill,
  onStartStarterSprint,
  onOpenLeo,
}) => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticOverview | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'weak' | 'mastered'>('all');

  useEffect(() => {
    setDiagnostics(getEmpiricalDiagnostics());
  }, []);

  if (!diagnostics) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="text-slate-600 font-mono text-sm animate-pulse">
          Loading empirical test diagnostics...
        </div>
      </div>
    );
  }

  const hasData = diagnostics.totalQuestionsAttempted > 0;
  const filteredSubtopics = diagnostics.subtopics.filter((sub) => {
    if (selectedFilter === 'weak') return sub.accuracy < 70;
    if (selectedFilter === 'mastered') return sub.accuracy >= 70;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans select-none">
      
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION                                                         */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 transition-colors shadow-2xs"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <img
            src="/logo.png"
            alt="Leo AI Panda"
            className="w-8 h-8 rounded-lg object-contain border border-emerald-200/80 shadow-2xs"
          />
          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Weakness Diagnostic Hub</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                Fact-Based Engine
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Empirical diagnostics from your actual test results
            </div>
          </div>
        </div>

        <button
          onClick={onOpenLeo}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-all shadow-2xs"
          title="Ask Leo AI for diagnostic guidance"
        >
          <span>💬</span>
          <span className="hidden sm:inline">Ask Leo</span>
        </button>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN DIAGNOSTIC STAGE                                                  */}
      {/* ========================================================================= */}
      <main className="max-w-[880px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6 flex-1">
        
        {/* Zero-Data Honest Banner */}
        {!hasData ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto text-xl shadow-2xs">
              📊
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="text-lg font-bold text-slate-900">
                Zero Guesswork: No Diagnostic Data Yet
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                Leo AI does not guess or assume your weak spots. We only diagnose based on actual answers you submit in timed tests.
              </p>
            </div>
            <button
              onClick={onStartStarterSprint}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
            >
              <span>⚡</span>
              <span>Take 5-Question Starter Sprint to Build Diagnostics</span>
            </button>
          </div>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* 3. HERO URGENCY CARD: LOST MARKS ESTIMATOR                                */}
            {/* ========================================================================= */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-rose-50/90 via-amber-50/60 to-white border border-rose-200/90 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 text-lg shrink-0 shadow-2xs">
                    <TrendingDown className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-rose-900">
                        Estimated Exam Mark Bleed
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-bold">
                        Anandi-NEAT Scheme (+1, -0.25)
                      </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
                      You are losing ~{diagnostics.totalEstimatedMarksLost} marks across {diagnostics.weakestSubtopics.length} weak subtopics.
                    </h1>
                  </div>
                </div>

                <div className="sm:text-right shrink-0 font-mono">
                  <span className="text-3xl font-extrabold text-rose-600">
                    -{diagnostics.totalEstimatedMarksLost}
                  </span>
                  <span className="block text-[11px] text-slate-500 font-sans">
                    Estimated marks lost
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed max-w-2xl font-sans">
                In Anandi-NEAT 2026 (120 Qs / 120 Mins), every wrong MCQ costs you <strong>1.25 marks</strong> (1 mark not gained + 0.25 negative penalty). 
                Eliminating the {diagnostics.weakestSubtopics.length} subtopics below with targeted Surgery Drills will plug this mark bleed.
              </p>
            </div>

            {/* ========================================================================= */}
            {/* 4. HIGH-LEVEL TELEMETRY STRIP                                             */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-mono text-slate-500 block">Total Solved</span>
                <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                  {diagnostics.totalQuestionsAttempted}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-mono text-slate-500 block">Overall Accuracy</span>
                <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">
                  {diagnostics.overallAccuracy}%
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-mono text-rose-600 block">Weak Subtopics</span>
                <span className="text-xl font-bold font-mono text-rose-700 mt-1 block">
                  {diagnostics.weakestSubtopics.length}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-mono text-emerald-600 block">Exam-Ready (&gt;70%)</span>
                <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">
                  {diagnostics.masteredSubtopics.length}
                </span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 5. SUBTOPIC FILTER TABS                                                   */}
            {/* ========================================================================= */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 pt-2">
              <div className="flex items-center space-x-2 text-xs font-mono">
                <button
                  onClick={() => setSelectedFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    selectedFilter === 'all'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  All Subtopics ({diagnostics.subtopics.length})
                </button>
                <button
                  onClick={() => setSelectedFilter('weak')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    selectedFilter === 'weak'
                      ? 'bg-rose-600 text-white font-bold'
                      : 'bg-white hover:bg-slate-100 text-rose-700 border border-slate-200'
                  }`}
                >
                  <span>⚠️ Needs Surgery</span>
                  <span>({diagnostics.weakestSubtopics.length})</span>
                </button>
                <button
                  onClick={() => setSelectedFilter('mastered')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    selectedFilter === 'mastered'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-white hover:bg-slate-100 text-emerald-700 border border-slate-200'
                  }`}
                >
                  <span>✓ Mastered</span>
                  <span>({diagnostics.masteredSubtopics.length})</span>
                </button>
              </div>

              <span className="hidden sm:inline text-[11px] font-mono text-slate-400">
                Sorted by lowest accuracy
              </span>
            </div>

            {/* ========================================================================= */}
            {/* 6. SUBTOPIC DIAGNOSTIC CARDS (WITH REAL PERCENTAGE BARS)                  */}
            {/* ========================================================================= */}
            <div className="space-y-3">
              {filteredSubtopics.map((sub, idx) => {
                const isWeak = sub.accuracy < 70;
                const hasPastMistakes = sub.failedQuestions.length > 0;

                return (
                  <div
                    key={`${sub.section}-${sub.subtopic}-${idx}`}
                    className={`p-4 sm:p-5 rounded-xl border transition-all duration-150 shadow-2xs ${
                      isWeak 
                        ? 'bg-white border-rose-200/90 hover:border-rose-300' 
                        : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      {/* Left: Section Pill, Subtopic Title & Real Percent Bar */}
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                            {SECTION_LABELS[sub.section] || sub.section}
                          </span>
                          {isWeak ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                              Mark Bleed: -{sub.estimatedMarksLost} Marks
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                              Exam Ready
                            </span>
                          )}
                          {hasPastMistakes && (
                            <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              {sub.failedQuestions.length} Past Mistake{sub.failedQuestions.length > 1 ? 's' : ''} Saved
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 tracking-tight">
                          {sub.subtopic}
                        </h3>

                        {/* Exact Percentage Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-600">
                              Accuracy: <strong className={isWeak ? 'text-rose-600' : 'text-emerald-700'}>{sub.accuracy}%</strong> ({sub.totalCorrect}/{sub.totalAttempted} Solved)
                            </span>
                            <span className="text-slate-500 text-[11px]">
                              Avg Pace: {sub.avgPaceSeconds}s
                            </span>
                          </div>

                          {/* Progress Meter */}
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                sub.accuracy < 50 
                                  ? 'bg-rose-500' 
                                  : sub.accuracy < 70 
                                  ? 'bg-amber-500' 
                                  : 'bg-emerald-600'
                              }`}
                              style={{ width: `${Math.max(6, sub.accuracy)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Surgery Action Button */}
                      <div className="shrink-0 flex items-center justify-end sm:flex-col sm:items-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <button
                          onClick={() => onStartSurgeryDrill(sub)}
                          className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                            isWeak 
                              ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                          title={`Start targeted drill for ${sub.subtopic} incorporating your past mistakes`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{hasPastMistakes ? 'Start Weak-Spot Surgery' : 'Practice Topic'}</span>
                          <span>→</span>
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </main>
    </div>
  );
};
