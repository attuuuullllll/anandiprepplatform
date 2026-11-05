'use client';

import React, { useState } from 'react';
import { UserMemoryProfile, ExamSection } from '@/types';

interface DashboardViewProps {
  memory: UserMemoryProfile;
  user?: any;
  onStartSession: (section?: ExamSection, isFullMock?: boolean) => void;
  onOpenGenerateAIModal?: (sec?: ExamSection | 'all') => void;
  onOpenDiagnostics?: () => void;
  onOpenSettings: () => void;
  onOpenLeo: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

interface SyllabusSubject {
  id: ExamSection;
  icon: string;
  name: string;
  simpleName: string;
  questionCount: number;
  topics: string;
  difficultyBadge: string;
}

const SYLLABUS_SUBJECTS: SyllabusSubject[] = [
  {
    id: 'quant',
    icon: '🧮',
    name: 'Quantitative Reasoning',
    simpleName: 'Math & Number Proficiency',
    questionCount: 30,
    topics: 'Profit & Loss, Percentages, Speed-Distance, Unit Economics, Simple/Compound Interest, Averages',
    difficultyBadge: '30 Questions in Exam',
  },
  {
    id: 'logic',
    icon: '🧩',
    name: 'Logical Reasoning',
    simpleName: 'Puzzles & Problem Solving',
    questionCount: 25,
    topics: 'Seating Arrangements, Pattern Sequences, Blood Relations, Syllogisms, Constraint Puzzles',
    difficultyBadge: '25 Questions in Exam',
  },
  {
    id: 'verbal_di',
    icon: '📊',
    name: 'Data & Reading',
    simpleName: 'Charts, Graphs & Comprehension',
    questionCount: 25,
    topics: 'Bar Charts, Data Tables, Business Case Passages, Critical Reading & Inference',
    difficultyBadge: '25 Questions in Exam',
  },
  {
    id: 'general_awareness',
    icon: '🌍',
    name: 'General Awareness',
    simpleName: 'Startups, Business & Current Affairs',
    questionCount: 20,
    topics: 'Top Indian Startups, Unicorn Founders, Key Govt Schemes, Tech Trends & Macro Economics',
    difficultyBadge: '20 Questions in Exam',
  },
  {
    id: 'business_judgement',
    icon: '💡',
    name: 'Business Judgement',
    simpleName: 'Real Founder Dilemmas & Decision Making',
    questionCount: 20,
    topics: 'Customer Complaints, Product Pricing, Ethics, Team Conflicts & Startup Growth Choices',
    difficultyBadge: '20 Questions in Exam',
  },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  memory,
  user,
  onStartSession,
  onOpenGenerateAIModal,
  onOpenDiagnostics,
  onOpenSettings,
  onOpenLeo,
  onOpenAuth,
  onSignOut,
}) => {
  // Official Exam Date: November 29, 2026 (Anandi-NEAT 2026)
  const examDate = new Date('2026-11-29T00:00:00');
  const today = new Date();
  const diffTime = examDate.getTime() - today.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const hasAttempts = memory.totalQuestionsAttempted > 0;
  const [showExamDetails, setShowExamDetails] = useState(false);

  // Calculate Weakest Area diagnostics
  const sectionsWithAttempts = (Object.keys(memory.sectionProficiency) as ExamSection[])
    .filter(s => memory.sectionProficiency[s].attempted > 0);

  const weakestSection = sectionsWithAttempts.length > 0
    ? sectionsWithAttempts.reduce((prev, curr) => 
        memory.sectionProficiency[curr].accuracy < memory.sectionProficiency[prev].accuracy ? curr : prev
      )
    : null;

  const allWeakSubtopics = Object.values(memory.sectionProficiency).flatMap(s => s.weakSubtopics);
  const weakestSubtopicsForSection = weakestSection 
    ? memory.sectionProficiency[weakestSection].weakSubtopics 
    : [];

  return (
    <div className="w-full max-w-[880px] mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col justify-between select-none">
      
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION BAR (Clean White & Emerald Theme)                       */}
      {/* ========================================================================= */}
      <header className="w-full flex items-center justify-between py-2 mb-6 border-b border-slate-200 pb-4">
        {/* Brand Lockup: Cute Panda Logo */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2.5">
            <img
              src="/logo.png"
              alt="Leo AI Panda Logo"
              className="w-9 h-9 rounded-xl object-contain shadow-xs border border-emerald-200/80 hover:scale-105 transition-transform"
            />
            <div>
              <div className="text-[15px] font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Leo AI
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  Anandi-NEAT Prep
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Controls: Streak, Auth, AI Mentor Button, Settings */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {/* User Streak */}
          <div 
            className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium"
            title="Daily practice streak"
          >
            <span>🔥</span>
            <span className="font-mono text-[12px] font-semibold">Day {memory.streakDays || 1}</span>
          </div>

          {/* User Auth Pill or Google Sign In Button */}
          {user ? (
            <div 
              className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium shadow-xs"
              title={`Logged in as ${user.email} (Cloud Synced)`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="truncate max-w-[100px] sm:max-w-[140px] font-mono text-[11px] font-semibold">
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
              <button 
                onClick={onSignOut} 
                className="ml-1 text-[11px] text-slate-400 hover:text-rose-600 font-mono transition-colors" 
                title="Sign Out"
              >
                ✕
              </button>
            </div>
          ) : (
            <button 
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
              title="Sign in with Google to save memory & streaks in real-time"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Sign In with Google</span>
            </button>
          )}

          {/* Weakness Diagnostic Hub Button */}
          {onOpenDiagnostics && (
            <button 
              onClick={onOpenDiagnostics}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
              title="Open dedicated Weakness Diagnostic Hub & Lost Marks Estimator"
            >
              <span>🎯</span>
              <span className="hidden sm:inline">Diagnostic Hub</span>
            </button>
          )}

          {/* Ask Leo Button (Anandi Emerald Theme) */}
          <button 
            onClick={onOpenLeo}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
            title="Ask any question or clear doubts (Shortcut: ⌘K)"
          >
            <span>💬</span>
            <span>Ask Leo</span>
          </button>

          {/* Settings */}
          <button 
            onClick={onOpenSettings}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-xs"
            title="Study Preferences & Reset"
          >
            <span className="text-xs">⚙️</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. COMMUNITY & OFFICIAL LINKS STRIP                                       */}
      {/* ========================================================================= */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs text-xs">
        <div className="flex items-center gap-2 pl-1 font-mono text-[11px] text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Official Links &amp; Community:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp Community Link */}
          <a
            href="https://chat.whatsapp.com/invite/anandi-fellowship-prep"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-medium transition-all"
            title="Student WhatsApp Prep Group"
          >
            <span>💬</span>
            <span>WhatsApp Group</span>
          </a>

          {/* Instagram Link */}
          <a
            href="https://www.instagram.com/theanandifellowship/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 text-[11px] font-medium transition-all"
            title="Official Instagram (@theanandifellowship)"
          >
            <span>📸</span>
            <span>Instagram (@theanandifellowship)</span>
          </a>

          {/* Official Website Link */}
          <a
            href="https://www.theanandifellowship.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 text-[11px] font-medium transition-all"
            title="Official Anandi Fellowship Website"
          >
            <span>🌐</span>
            <span>Official Website</span>
            <span className="text-[10px] text-slate-400">↗</span>
          </a>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. HERO STAGE (Exact Title & Balanced Action Buttons)                     */}
      {/* ========================================================================= */}
      <section className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl text-slate-900 font-normal leading-tight mb-2 tracking-[-0.02em]">
          Your platform to help you crack Anandi-NEAT exam.
        </h1>

        <p className="text-[15px] text-slate-600 max-w-[680px] font-normal leading-relaxed mb-6 font-sans">
          The written exam takes place on <strong>November 29, 2026</strong>. 
          Use this free platform to practice real questions across all 5 test domains, clear tricky doubts with <strong>Leo AI</strong>, and test your exam pace with full 2-hour mocks.
        </p>

        {/* Balanced Action Buttons: Matching Heights, Matching Font Sizes, Mobile Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Quick Practice Hook */}
          <button 
            onClick={() => onStartSession(undefined, false)}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all duration-150 active:scale-[0.98] shadow-sm hover:shadow-md"
          >
            <span>⚡</span>
            <span>Try 5 Quick Practice Questions</span>
          </button>

          {/* Single Unified AI Exam Generator Button */}
          {onOpenGenerateAIModal && (
            <button 
              onClick={() => onOpenGenerateAIModal?.('all')}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              title="Choose your target section and format (5-Q sprint, 10-Q drill, or 2-hour mock) with DeepSeek-V3"
            >
              <span className="animate-pulse">✨</span>
              <span>Generate AI Practice Set</span>
            </button>
          )}

          {/* Full Mock Simulation */}
          <button 
            onClick={() => onStartSession(undefined, true)}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-full bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold border border-slate-300 hover:border-slate-400 shadow-xs transition-all duration-150 active:scale-[0.98]"
          >
            <span>⏱️</span>
            <span>Take Full 2-Hour Mock Test</span>
          </button>

          {/* Clean Explainer Pill Toggle */}
          <button 
            onClick={() => setShowExamDetails(!showExamDetails)}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-colors shadow-xs"
          >
            <span>ℹ️</span>
            <span>{showExamDetails ? 'Hide Exam Pattern' : 'How does the exam work?'}</span>
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. EXAM PATTERN EXPLAINER (Clean Emerald Tinted Box)                       */}
      {/* ========================================================================= */}
      {showExamDetails && (
        <div className="mb-8 p-5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-4 animate-in fade-in duration-200 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Anandi-NEAT 2026: Exam Format &amp; Details
            </h3>
            <span className="text-xs font-mono text-emerald-800 font-semibold bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
              Offline Pen-and-Paper Test
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-white border border-emerald-100 shadow-xs space-y-1">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <span>🗓️</span> The Exam Date
              </div>
              <p className="text-slate-600 leading-relaxed">
                Sunday, <strong>November 29, 2026</strong>. Held across 17 major cities in India.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-white border border-emerald-100 shadow-xs space-y-1">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <span>⏱️</span> Format &amp; Time
              </div>
              <p className="text-slate-600 leading-relaxed">
                <strong>120 Questions</strong> in <strong>120 Minutes</strong> (2 hours). Multiple-choice + short numericals.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-white border border-emerald-100 shadow-xs space-y-1">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <span>🏆</span> The Fellowship
              </div>
              <p className="text-slate-600 leading-relaxed">
                Top 50 qualify for <strong>The Grit Bootcamp</strong> in Gurgaon (May 2027). Final 10 win the Fellowship.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TELEMETRY STRIP (Clean & Non-Redundant Metrics)                         */}
      {/* ========================================================================= */}
      <div className="w-full mb-6 py-3 px-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between text-xs text-slate-600 overflow-x-auto">
        <div className="flex items-center space-x-6 min-w-max font-mono">
          <div className="flex items-center space-x-2">
            <span>📅</span>
            <span className="text-slate-900 font-bold">{daysRemaining} Days to Exam</span>
            <span className="text-emerald-700 font-medium">(Nov 29, 2026)</span>
          </div>
          <span className="text-slate-300">•</span>

          <div className="flex items-center space-x-2">
            <span>🎯</span>
            <span className="text-slate-600">Accuracy:</span>
            <span className={hasAttempts ? "text-emerald-700 font-bold" : "text-slate-400 font-medium"}>
              {hasAttempts ? `${memory.overallAccuracy}%` : '—'}
            </span>
          </div>
          <span className="text-slate-300">•</span>

          <div className="flex items-center space-x-2">
            <span>{user ? '☁️' : '💾'}</span>
            <span className={user ? "text-emerald-700 font-semibold" : "text-slate-600"}>
              {user ? 'Supabase Cloud Synced' : 'Local Storage Mode'}
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-[11px] font-mono text-slate-500 pl-4 border-l border-slate-100">
          <span className="text-slate-900 font-bold">{memory.totalQuestionsAttempted}</span>
          <span>Questions Solved</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5.5 WEAKEST AREA & ADAPTIVE DIAGNOSTIC CARD                                */}
      {/* ========================================================================= */}
      {weakestSection ? (
        <div className="w-full mb-6 p-4 rounded-xl bg-amber-50/90 border border-amber-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-start space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-lg shrink-0">
              🎯
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 font-mono">
                  Your Weakest Section
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 font-semibold">
                  {memory.sectionProficiency[weakestSection].accuracy}% Accuracy ({memory.sectionProficiency[weakestSection].attempted} solved)
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5 font-sans">
                Leo AI detected that you need the most improvement in <strong>{SYLLABUS_SUBJECTS.find(s => s.id === weakestSection)?.name}</strong>
                {weakestSubtopicsForSection.length > 0 ? (
                  <span> (specifically: <em>{weakestSubtopicsForSection.slice(0, 3).join(', ')}</em>)</span>
                ) : (
                  <span>. Practice targeted questions to raise your accuracy.</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            {onOpenDiagnostics && (
              <button
                onClick={onOpenDiagnostics}
                className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-white hover:bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold shadow-2xs transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                title="Open dedicated Weakness Diagnostic Hub with subtopic percentages & lost marks estimator"
              >
                <span>📊</span>
                <span>Diagnostic Hub</span>
              </button>
            )}

            <button
              onClick={() => onStartSession(weakestSection, false)}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
              title="Practice targeted questions in your weakest section"
            >
              <span>Practice Section</span>
              <span>→</span>
            </button>
          </div>
        </div>
      ) : hasAttempts ? (
        <div className="w-full mb-6 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-xs flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <span>✨</span>
            <span className="font-semibold">Strong Performance!</span>
            <span className="text-emerald-700">No critically weak section detected yet across your attempts. Keep maintaining high accuracy!</span>
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* 6. THE 5 EXAM SUBJECTS (Clean White Cards with Active Practice Buttons)   */}
      {/* ========================================================================= */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="text-[12px] font-semibold text-slate-900 uppercase tracking-wider font-mono">
            Practice by Subject (5 Sections in Exam)
          </div>
          <span className="text-[11px] font-mono text-emerald-700 font-medium">
            Click any subject to practice
          </span>
        </div>

        {/* Subjects List */}
        <div className="space-y-2.5">
          {SYLLABUS_SUBJECTS.map((sub) => {
            const stats = memory.sectionProficiency[sub.id];
            const hasSectionAttempts = stats && stats.attempted > 0;

            return (
              <div
                key={sub.id}
                onClick={() => onStartSession(sub.id, false)}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50/20 hover:border-emerald-300 cursor-pointer transition-all duration-150 active:scale-[0.99] group flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:shadow-sm"
              >
                {/* Subject Title & Details */}
                <div className="flex items-start space-x-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-lg shrink-0 group-hover:bg-emerald-100 group-hover:border-emerald-300 transition-colors">
                    {sub.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-[14px] font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                        {sub.name}
                      </span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        ({sub.simpleName})
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-600 mt-0.5 line-clamp-1">
                      {sub.topics}
                    </p>
                  </div>
                </div>

                {/* Right: Question Count & Action Button */}
                <div className="flex items-center justify-between sm:justify-end space-x-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 font-mono">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {sub.difficultyBadge}
                    </span>
                    <span className="block text-[10px] text-slate-500 mt-1">
                      {hasSectionAttempts ? `${stats.accuracy}% accuracy (${stats.attempted} solved)` : 'Not started yet'}
                    </span>
                  </div>

                  {/* Action Button: Practice */}
                  <div className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-50 group-hover:bg-emerald-600 text-emerald-700 group-hover:text-white border border-emerald-200 group-hover:border-emerald-600 text-xs font-semibold transition-all shadow-xs">
                    <span>Practice</span>
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. QUICK FAQ & HELP HELPER FOR FIRST-TIME STUDENTS                       */}
      {/* ========================================================================= */}
      <section className="mb-6 p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm shrink-0">
            💡
          </div>
          <div className="text-xs">
            <span className="font-semibold text-slate-900">Never prepared for a test like this?</span>
            <p className="text-slate-600 mt-0.5">
              Click <strong>&quot;Try 5 Quick Practice Questions&quot;</strong> above to get a feel for the questions in 3 minutes.
            </p>
          </div>
        </div>

        <button 
          onClick={onOpenLeo}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 shrink-0"
        >
          Ask Leo a question →
        </button>
      </section>

      {/* ========================================================================= */}
      {/* 8. FOOTER WITH SAFE NOTICE                                                */}
      {/* ========================================================================= */}
      <footer className="w-full border-t border-slate-200 pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
        <div>
          Independent prep platform for <strong>Anandi-NEAT 2026</strong>.
        </div>
        <div className="flex items-center space-x-2">
          <span>AI Tutor: DeepSeek-R1</span>
          <span>•</span>
          <span className="text-emerald-700 font-semibold">Ready</span>
        </div>
      </footer>

    </div>
  );
};
