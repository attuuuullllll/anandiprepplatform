'use client';

import React, { useState, useEffect } from 'react';
import { Question, UserAttempt, ExamSection, MistakeTag } from '@/types';
import { MathRenderer } from './MathRenderer';
import { recordAttemptAndUpdateMemory, saveCompletedSession, cacheQuestions, getStoredApiKey } from '@/lib/storage';
import confetti from 'canvas-confetti';

interface StitchExamCockpitProps {
  questions: Question[];
  title: string;
  section?: ExamSection;
  isFullMock?: boolean;
  timeLimitSeconds?: number;
  onExit: () => void;
  onAskLeo: (question: Question) => void;
}

export const StitchExamCockpit: React.FC<StitchExamCockpitProps> = ({
  questions,
  title,
  section,
  isFullMock = false,
  timeLimitSeconds = 7200,
  onExit,
  onAskLeo,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState<Record<string, UserAttempt>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [numericValue, setNumericValue] = useState<string>('');
  const [selectedMistakeTag, setSelectedMistakeTag] = useState<MistakeTag>('none');
  const [showSolution, setShowSolution] = useState(false);

  // Timers
  const [secondsRemaining, setSecondsRemaining] = useState(timeLimitSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [questionElapsed, setQuestionElapsed] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Right HUD Tab: 'matrix' | 'leo' | 'scratchpad'
  const [rightHudTab, setRightHudTab] = useState<'matrix' | 'leo' | 'scratchpad'>('matrix');
  const [scratchpadText, setScratchpadText] = useState('');

  // Leo quick doubt in right HUD
  const [leoHint, setLeoHint] = useState<string | null>(null);
  const [isLeoLoading, setIsLeoLoading] = useState(false);

  const activeQuestion = questions[currentIndex] || questions[0];
  const expectedPace = activeQuestion?.expectedPaceSeconds || 90;

  // Countdown timer
  useEffect(() => {
    if (isPaused || isCompleted || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinishTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, isCompleted, secondsRemaining]);

  // Per-question elapsed timer
  useEffect(() => {
    if (isPaused || isCompleted) return;
    const interval = setInterval(() => {
      setQuestionElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, isCompleted, currentIndex]);

  // Update selection when navigating
  useEffect(() => {
    const existing = attempts[activeQuestion?.id];
    if (existing) {
      if (typeof existing.userAnswer === 'string') {
        setSelectedOption(existing.userAnswer);
        setNumericValue(existing.userAnswer);
      } else if (typeof existing.userAnswer === 'number') {
        setNumericValue(String(existing.userAnswer));
      }
      setSelectedMistakeTag(existing.mistakeTag || 'none');
      setShowSolution(true);
    } else {
      setSelectedOption('');
      setNumericValue('');
      setSelectedMistakeTag('none');
      setShowSolution(false);
    }
  }, [currentIndex, activeQuestion]);

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optId: string) => {
    setSelectedOption(optId);
  };

  const handleToggleMarkReview = () => {
    setMarkedForReview((prev) => ({
      ...prev,
      [activeQuestion.id]: !prev[activeQuestion.id],
    }));
  };

  const handleSaveAndNext = () => {
    if (!activeQuestion) return;

    let ans: any = selectedOption;
    if (activeQuestion.type === 'numeric') {
      ans = parseFloat(numericValue);
    }

    let isCorrect = false;
    if (activeQuestion.type === 'mcq') {
      isCorrect = String(ans).trim().toUpperCase() === String(activeQuestion.answerKey).trim().toUpperCase();
    } else if (activeQuestion.type === 'numeric') {
      const tol = activeQuestion.numericTolerance || 0.05;
      isCorrect = Math.abs(parseFloat(ans) - parseFloat(String(activeQuestion.answerKey))) <= tol;
    }

    const attempt: UserAttempt = {
      questionId: activeQuestion.id,
      userAnswer: ans,
      isCorrect,
      timeSpentSeconds: questionElapsed,
      mistakeTag: selectedMistakeTag !== 'none' ? selectedMistakeTag : isCorrect ? 'none' : 'concept',
      timestamp: new Date().toISOString(),
    };

    const updated = { ...attempts, [activeQuestion.id]: attempt };
    setAttempts(updated);

    recordAttemptAndUpdateMemory(
      {
        id: `session_${Date.now()}`,
        title,
        section,
        isFullMock,
        totalQuestions: questions.length,
        timeLimitSeconds,
        questions,
        attempts: updated,
        startedAt: new Date().toISOString(),
        score: 0,
        accuracyRate: 0,
        avgPaceSeconds: 0,
      },
      attempt,
      activeQuestion
    );

    // Go next
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setQuestionElapsed(0);
    }
  };

  const handleClearResponse = () => {
    setSelectedOption('');
    setNumericValue('');
    const copy = { ...attempts };
    delete copy[activeQuestion.id];
    setAttempts(copy);
  };

  const handleFinishTest = () => {
    setIsCompleted(true);
    const list = Object.values(attempts);
    const correctCount = list.filter((a) => a.isCorrect).length;
    const accuracy = list.length > 0 ? Math.round((correctCount / list.length) * 100) : 0;
    const avgPace = list.length > 0 ? Math.round(list.reduce((acc, a) => acc + a.timeSpentSeconds, 0) / list.length) : 0;

    saveCompletedSession({
      id: `session_${Date.now()}`,
      title,
      section,
      isFullMock,
      totalQuestions: questions.length,
      timeLimitSeconds,
      questions,
      attempts,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      score: correctCount,
      accuracyRate: accuracy,
      avgPaceSeconds: avgPace,
    });
    cacheQuestions(questions);

    if (accuracy >= 70) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }
  };

  const askLeoHintInHud = async () => {
    setIsLeoLoading(true);
    try {
      const apiKey = getStoredApiKey();
      const res = await fetch('/api/leo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Give me 1 quick Socratic hint for this question without giving away the answer: "${activeQuestion.prompt}"`,
            },
          ],
          context: {
            section: activeQuestion.section,
            subtopic: activeQuestion.subtopic,
            prompt: activeQuestion.prompt,
            solution: activeQuestion.solution,
          },
          apiKey,
        }),
      });
      const data = await res.json();
      setLeoHint(data.reply || 'Check the primary balance constraints before proceeding.');
    } catch {
      setLeoHint('Consider breaking the question down into unit rates first.');
    } finally {
      setIsLeoLoading(false);
    }
  };

  const sectionCodes: Record<string, string> = {
    quant: 'QR',
    logic: 'LR',
    verbal_di: 'DI',
    general_awareness: 'GA',
    business_judgement: 'BJ',
  };

  const sectionFullLabels: Record<string, string> = {
    quant: 'Quantitative Reasoning',
    logic: 'Logic & Inferencing',
    verbal_di: 'DI & Verbal Reasoning',
    general_awareness: 'General Awareness',
    business_judgement: 'Business Judgement',
  };

  if (isCompleted) {
    const list = Object.values(attempts);
    const correctCount = list.filter((a) => a.isCorrect).length;
    const accuracy = list.length > 0 ? Math.round((correctCount / list.length) * 100) : 0;
    const avgPace = list.length > 0 ? Math.round(list.reduce((acc, a) => acc + a.timeSpentSeconds, 0) / list.length) : 0;

    return (
      <div className="min-h-screen bg-[#0a0d14] text-[#e2e8f0] p-6 lg:p-12 flex flex-col items-center justify-center font-sans">
        <div className="w-full max-w-3xl glass-panel p-8 sm:p-12 rounded-3xl border border-white/10 space-y-6 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-bold text-2xl mx-auto shadow-[0_0_24px_rgba(245,158,11,0.4)]">
            <span className="material-symbols-outlined text-[36px]">military_tech</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Anandi Examination Completed
          </h2>
          <p className="text-base text-slate-300 max-w-md mx-auto leading-relaxed">
            Diagnostic telemetry synced to your candidate profile. Review answers and verified logic below.
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-2">
            <div className="bg-[#101726] p-5 rounded-2xl border border-white/10">
              <span className="text-xs text-slate-400 block font-mono font-medium">Score</span>
              <span className="text-3xl font-bold font-mono text-amber-400 mt-1 block">
                {correctCount} / {questions.length}
              </span>
            </div>
            <div className="bg-[#101726] p-5 rounded-2xl border border-white/10">
              <span className="text-xs text-slate-400 block font-mono font-medium">Accuracy</span>
              <span className="text-3xl font-bold font-mono text-emerald-400 mt-1 block">{accuracy}%</span>
            </div>
            <div className="bg-[#101726] p-5 rounded-2xl border border-white/10">
              <span className="text-xs text-slate-400 block font-mono font-medium">Avg Pace</span>
              <span className="text-3xl font-bold font-mono text-sky-400 mt-1 block">{avgPace}s</span>
            </div>
          </div>

          <div className="pt-6 flex justify-center gap-4">
            <button
              onClick={onExit}
              className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-sm shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all"
            >
              Back to Cockpit Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isLowTime = secondsRemaining <= 300;
  const isPaceWarning = questionElapsed > expectedPace;

  return (
    <div className="bg-[#0a0d14] text-[#e2e8f0] min-h-screen flex flex-col font-sans select-none overflow-x-hidden antialiased">
      {/* ========================================================================= */}
      {/* TOP COCKPIT BAR                                                           */}
      {/* ========================================================================= */}
      <header className="flex justify-between items-center w-full px-5 lg:px-8 h-15 bg-[#0e131f]/95 border-b border-white/10 z-50 sticky top-0 backdrop-blur-xl">
        {/* Brand Title */}
        <div className="flex items-center space-x-3.5">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-telemetry-pulse shadow-[0_0_8px_#f59e0b]"></span>
            <span className="text-base font-bold tracking-tight text-white">
              Anandi-NEAT 2026
            </span>
          </div>
          <span className="hidden xl:inline-block px-2.5 py-0.5 text-[11px] font-mono bg-[#161f36] border border-white/10 text-amber-400 rounded-md font-semibold tracking-wide">
            STAGE II ADVANCED • CBT RUNNER
          </span>
        </div>

        {/* Section Tabs */}
        <nav className="hidden md:flex items-center space-x-6 h-full text-xs font-mono font-medium">
          {(['quant', 'logic', 'verbal_di', 'general_awareness', 'business_judgement'] as ExamSection[]).map(
            (secKey) => {
              const isActive = (section || 'quant') === secKey;
              return (
                <button
                  key={secKey}
                  className={`h-full flex items-center space-x-1.5 px-2 border-b-2 transition-all ${
                    isActive
                      ? 'border-amber-400 text-amber-300 font-bold text-[13px]'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{sectionFullLabels[secKey]}</span>
                </button>
              );
            }
          )}
        </nav>

        {/* Trailing Actions & Countdown */}
        <div className="flex items-center space-x-3.5">
          {/* Live Countdown HUD Chip */}
          <div
            className={`flex items-center space-x-2.5 px-3.5 py-1.5 rounded-lg border font-mono ${
              isLowTime
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                : 'bg-[#101726] border-white/10 text-amber-400 shadow-inner'
            }`}
          >
            <span className="material-symbols-outlined text-[19px]">timer</span>
            <div className="flex flex-col">
              <span className="text-base font-bold leading-none tracking-tight">
                {formatTimer(secondsRemaining)}
              </span>
              <span className="text-[9px] text-slate-400 leading-none mt-0.5 tracking-wider font-semibold">SYNCHRONIZED</span>
            </div>
          </div>

          {/* Action Controls */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="px-3.5 py-1.5 text-xs font-mono font-semibold text-slate-300 bg-[#161f36] border border-white/10 hover:bg-[#1d2744] hover:text-white rounded-lg transition-colors"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>

          <button
            onClick={handleFinishTest}
            className="px-4 py-1.5 text-xs font-mono bg-rose-950/90 text-rose-200 hover:bg-rose-900 border border-rose-700/60 rounded-lg transition-colors font-bold tracking-wide"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN WORKSPACE: 3-COLUMN COCKPIT LAYOUT                                   */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SUB-RAIL: Quick Section Jumpers */}
        <aside className="hidden xl:flex flex-col justify-between w-15 bg-[#0b0e15] border-r border-white/10 py-5 items-center z-20">
          <div className="flex flex-col space-y-3.5 items-center font-mono">
            {(['quant', 'logic', 'verbal_di', 'general_awareness', 'business_judgement'] as ExamSection[]).map(
              (secKey) => {
                const isActive = (section || 'quant') === secKey;
                return (
                  <button
                    key={secKey}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-amber-500 text-black shadow-[0_0_14px_rgba(245,158,11,0.4)] scale-105'
                        : 'bg-[#101726] text-slate-400 hover:text-white border border-white/10 hover:border-white/20'
                    }`}
                    title={sectionFullLabels[secKey]}
                  >
                    {sectionCodes[secKey]}
                  </button>
                );
              }
            )}
          </div>

          <div className="flex flex-col space-y-2.5 items-center text-slate-400">
            <button
              onClick={() => onAskLeo(activeQuestion)}
              className="p-2 hover:text-amber-300 rounded-lg hover:bg-white/5 transition-colors"
              title="Leo AI Doubt Solver"
            >
              <span className="material-symbols-outlined text-[22px]">psychology</span>
            </button>
            <button
              onClick={onExit}
              className="p-2 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              title="Exit to Dashboard"
            >
              <span className="material-symbols-outlined text-[22px]">home</span>
            </button>
          </div>
        </aside>

        {/* CENTER CANVAS: QUESTION STAGE */}
        <main className="flex-1 overflow-y-auto px-5 lg:px-10 py-7 flex justify-center pb-28">
          <div className="w-full max-w-[900px] space-y-6">
            {/* Question Meta-Header Bar */}
            <div className="glass-panel p-4.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center space-x-3.5">
                <span className="px-3.5 py-1.5 bg-[#161f36] border border-white/15 text-amber-400 font-mono text-xs rounded-lg font-bold tracking-wide">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <div className="flex flex-col">
                  <span className="text-base text-white font-semibold tracking-tight">{activeQuestion.subtopic}</span>
                  <span className="text-xs text-slate-400 font-mono">
                    {sectionFullLabels[activeQuestion.section]} • Difficulty Level {activeQuestion.difficulty}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2.5">
                <span className="px-2.5 py-1 text-xs font-mono bg-rose-950/50 text-rose-300 border border-rose-800 rounded-md font-semibold">
                  Hard • Level {activeQuestion.difficulty}
                </span>
                <span className="px-2.5 py-1 text-xs font-mono bg-[#161f36] text-sky-300 border border-sky-800/40 rounded-md font-semibold">
                  +4.0 / -1.0
                </span>
                <button
                  onClick={handleToggleMarkReview}
                  className={`p-2 rounded-lg transition-colors border ${
                    markedForReview[activeQuestion.id]
                      ? 'text-amber-400 bg-amber-950/60 border-amber-500'
                      : 'text-slate-400 hover:text-white border-white/10 hover:bg-white/5'
                  }`}
                  title="Bookmark for Review"
                >
                  <span className="material-symbols-outlined text-[20px]">bookmark</span>
                </button>
              </div>
            </div>

            {/* Question Pace Tracker HUD Widget */}
            <div className="bg-[#101726] border border-white/10 rounded-xl p-3.5 px-5 flex items-center justify-between shadow-md">
              <div className="flex items-center space-x-3 text-xs text-slate-300 font-mono font-medium">
                <span className="material-symbols-outlined text-sky-400 text-[18px]">speed</span>
                <span>
                  Target Pace: <strong className="text-white font-bold">{expectedPace}s</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span>
                  Elapsed: <strong className="text-amber-400 font-bold">{questionElapsed}s</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className={isPaceWarning ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {isPaceWarning ? 'Pace Caution (+Buffer Exceeded)' : 'Pacing Velocity: Optimal'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-44 bg-[#1d2744] h-2.5 rounded-full overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-300 ${
                    isPaceWarning ? 'bg-rose-500' : 'bg-sky-400'
                  }`}
                  style={{ width: `${Math.min(100, (questionElapsed / expectedPace) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Primary Question Card */}
            <section className="glass-panel p-7 sm:p-9 rounded-2xl space-y-6 relative overflow-hidden shadow-xl border border-white/10">
              <div className="text-lg sm:text-xl leading-relaxed text-slate-100 font-normal tracking-wide">
                <MathRenderer content={activeQuestion.prompt} />
              </div>

              <div className="pt-3 flex items-center space-x-4 border-t border-white/10 text-xs text-slate-400 font-mono">
                <button
                  onClick={() => onAskLeo(activeQuestion)}
                  className="flex items-center space-x-1.5 hover:text-amber-300 transition-colors font-medium"
                >
                  <span className="material-symbols-outlined text-[17px]">functions</span>
                  <span>Formula Hint Sheet</span>
                </button>
                <span>•</span>
                <span className="text-slate-500 font-mono">ID: {activeQuestion.id}</span>
              </div>
            </section>

            {/* Multiple Choice Selection Nodes (MCQ Grid) */}
            {activeQuestion.type === 'mcq' && activeQuestion.options && (
              <div className="space-y-3.5">
                {activeQuestion.options.map((opt) => {
                  const isSelected = selectedOption === opt.id;
                  const isSavedAttempt = attempts[activeQuestion.id];
                  const isCorrect = isSavedAttempt && activeQuestion.answerKey === opt.id;
                  const isWrong = isSavedAttempt && isSelected && !isCorrect;

                  let style = 'bg-[#101726]/80 border-white/10 hover:border-white/25 hover:bg-[#161f36] text-slate-200';
                  if (isSelected && !isSavedAttempt) {
                    style = 'bg-[#161f36] border-l-4 border-l-amber-400 border-amber-400/50 amber-glow text-white shadow-xl';
                  } else if (isCorrect) {
                    style = 'bg-emerald-950/50 border-l-4 border-l-emerald-400 border-emerald-600 text-emerald-100 shadow-xl';
                  } else if (isWrong) {
                    style = 'bg-rose-950/50 border-l-4 border-l-rose-400 border-rose-600 text-rose-100 shadow-xl';
                  }

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.id)}
                      className={`group relative flex items-center justify-between p-4.5 sm:p-5 rounded-2xl border transition-all cursor-pointer ${style}`}
                    >
                      <div className="flex items-center space-x-4">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono text-sm font-bold border transition-colors shrink-0 ${
                            isSelected
                              ? 'bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.5)] border-amber-400'
                              : 'bg-[#161f36] text-slate-300 border-white/10 group-hover:border-white/20'
                          }`}
                        >
                          {opt.id}
                        </div>
                        <div className="text-base sm:text-lg font-normal text-slate-100 leading-relaxed">
                          <MathRenderer content={opt.text} />
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center space-x-1.5 font-mono text-xs text-amber-400 font-bold shrink-0 ml-3">
                          <span>SELECTED</span>
                          <span className="material-symbols-outlined text-[20px]">check_circle</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* TITA (Type-In-The-Answer) Input Box */}
            {activeQuestion.type === 'numeric' && (
              <div className="glass-panel p-6 rounded-2xl space-y-3 border border-white/10">
                <div className="flex items-center justify-between text-sm font-mono">
                  <div className="flex items-center space-x-2 text-white font-semibold">
                    <span className="material-symbols-outlined text-sky-400 text-[20px]">keyboard</span>
                    <span>Decimal Numerical Input / TITA</span>
                  </div>
                  <span className="text-slate-400 text-xs">Tolerance: ±{activeQuestion.numericTolerance || 0.05}</span>
                </div>
                <input
                  type="number"
                  step="any"
                  value={numericValue}
                  onChange={(e) => setNumericValue(e.target.value)}
                  placeholder="Type exact calculated numerical value..."
                  className="w-full bg-[#0a0d14] border border-white/15 text-amber-400 font-mono text-xl rounded-xl px-5 py-3 outline-none focus:border-amber-400 shadow-inner"
                />
              </div>
            )}

            {/* Self-Audit Cognitive Mistake Tagger Pills */}
            <div className="p-5 bg-[#101726]/90 border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 uppercase tracking-wider font-bold">
                  Diagnostic Friction Self-Tagging:
                </span>
                <span className="text-slate-500 font-mono text-[11px]">Anandi AI Telemetry</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { tag: 'concept', label: 'Concept Gap' },
                  { tag: 'calculation', label: 'Calculation Slip' },
                  { tag: 'careless', label: 'Careless Trap Checked' },
                  { tag: 'time_pressure', label: 'Time Pressure' },
                  { tag: 'guessed', label: 'Intuition Guess' },
                ].map((m) => (
                  <button
                    key={m.tag}
                    onClick={() => setSelectedMistakeTag(m.tag as MistakeTag)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors border ${
                      selectedMistakeTag === m.tag
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400 font-bold shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                        : 'bg-[#161f36] text-slate-300 hover:text-white border-white/10'
                    }`}
                  >
                    {selectedMistakeTag === m.tag ? `✓ ${m.label}` : m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Verified Solution Accordion */}
            {showSolution && (
              <div className="glass-panel p-6 rounded-2xl border border-emerald-700/60 space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 text-sm font-mono">
                  <span className="text-emerald-400 font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">verified</span>
                    Step-by-Step Proof & Logic
                  </span>
                  <span className="text-slate-400 text-xs">
                    Verified by DeepSeek-R1 (Fidelity 10/10)
                  </span>
                </div>
                <div className="text-base text-slate-200 leading-relaxed pt-2">
                  <MathRenderer content={activeQuestion.solution} />
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ========================================================================= */}
        {/* RIGHT WORKSPACE HUD                                                       */}
        {/* ========================================================================= */}
        <aside className="hidden lg:flex flex-col justify-between h-[calc(100vh-3.75rem)] w-76 p-5 bg-[#0e131f] border-l border-white/10 z-40 fixed right-0 top-15 overflow-y-auto">
          <div className="space-y-5">
            {/* Header: Session Status */}
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <div>
                  <div className="text-xs font-bold text-white font-mono tracking-tight">Session #ANANDI-2026</div>
                  <div className="text-[10px] text-slate-400 font-mono">Stitch Cockpit HUD</div>
                </div>
              </div>
              <span className="text-[10px] text-amber-400 font-mono font-bold tracking-wider">ONLINE</span>
            </div>

            {/* HUD Navigation Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-[#0a0d14] p-1 rounded-lg border border-white/10 text-xs font-mono font-semibold">
              <button
                onClick={() => setRightHudTab('matrix')}
                className={`py-1.5 rounded-md text-center transition-colors ${
                  rightHudTab === 'matrix' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Matrix
              </button>
              <button
                onClick={() => setRightHudTab('leo')}
                className={`py-1.5 rounded-md text-center transition-colors ${
                  rightHudTab === 'leo' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Leo AI
              </button>
              <button
                onClick={() => setRightHudTab('scratchpad')}
                className={`py-1.5 rounded-md text-center transition-colors ${
                  rightHudTab === 'scratchpad' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Notes
              </button>
            </div>

            {/* TAB 1: QUESTION MATRIX */}
            {rightHudTab === 'matrix' && (
              <div className="space-y-3.5">
                {/* Status Legend */}
                <div className="p-3 bg-[#101726] rounded-xl border border-white/10 space-y-2 text-[11px] font-mono">
                  <div className="text-slate-400 uppercase tracking-wider font-bold">
                    Candidate Status Palette
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-md bg-emerald-500/30 border border-emerald-500"></span>
                      <span className="text-slate-300">
                        {Object.values(attempts).length} Answered
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-md bg-amber-500/30 border border-amber-500"></span>
                      <span className="text-slate-300">
                        {Object.values(markedForReview).filter(Boolean).length} Marked
                      </span>
                    </div>
                  </div>
                </div>

                {/* Question Numbers Grid (1 to N) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Question Node Jump</span>
                    <span>Q 1 - {questions.length}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
                    {questions.map((q, idx) => {
                      const isCurrent = idx === currentIndex;
                      const isAnswered = Boolean(attempts[q.id]);
                      const isMarked = Boolean(markedForReview[q.id]);

                      let cellStyle = 'bg-[#161f36] border-white/10 text-slate-400 hover:text-white';
                      if (isCurrent) {
                        cellStyle = 'bg-amber-500 text-black font-bold ring-2 ring-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)]';
                      } else if (isMarked) {
                        cellStyle = 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold';
                      } else if (isAnswered) {
                        cellStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold';
                      }

                      return (
                        <button
                          key={q.id}
                          onClick={() => {
                            setCurrentIndex(idx);
                            setQuestionElapsed(0);
                          }}
                          className={`h-8 rounded-lg font-mono text-xs border transition-all ${cellStyle}`}
                        >
                          {(idx + 1).toString().padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LEO AI MENTOR IN HUD */}
            {rightHudTab === 'leo' && (
              <div className="glass-panel p-4 rounded-xl border border-sky-800/40 space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sky-400 font-bold text-sm">
                    <span className="material-symbols-outlined text-[18px]">psychology</span>
                    <span>Leo AI Socratic Hint</span>
                  </div>
                </div>

                {leoHint ? (
                  <p className="text-slate-100 leading-relaxed bg-[#0a0d14] p-3 rounded-lg border border-white/10 text-sm font-sans">
                    {leoHint}
                  </p>
                ) : (
                  <p className="text-slate-300 leading-relaxed font-sans text-xs">
                    Stuck on step 1? Ask Leo for an intuition nudge without spoiling the final answer.
                  </p>
                )}

                <button
                  onClick={askLeoHintInHud}
                  disabled={isLeoLoading}
                  className="w-full py-2.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 rounded-lg font-semibold transition-colors disabled:opacity-50 text-xs font-mono"
                >
                  {isLeoLoading ? 'Thinking...' : '💡 Request Socratic Hint'}
                </button>
              </div>
            )}

            {/* TAB 3: SCRATCHPAD */}
            {rightHudTab === 'scratchpad' && (
              <div className="space-y-2.5">
                <div className="text-xs text-slate-300 font-mono font-medium">Rough Work & Calculations:</div>
                <textarea
                  rows={8}
                  value={scratchpadText}
                  onChange={(e) => setScratchpadText(e.target.value)}
                  placeholder="Calculate margins, draw arrangements..."
                  className="w-full bg-[#0a0d14] border border-white/15 rounded-xl p-3 text-xs font-mono text-slate-100 placeholder-slate-600 outline-none focus:border-amber-400"
                />
              </div>
            )}
          </div>

          {/* Footer Guidelines */}
          <div className="border-t border-white/10 pt-3 text-xs font-mono text-slate-400 flex flex-col space-y-1.5">
            <button
              onClick={() => onAskLeo(activeQuestion)}
              className="flex items-center space-x-2 py-1.5 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">help</span>
              <span>Open Full Leo AI Chat</span>
            </button>
          </div>
        </aside>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM DOCKED UTILITY COCKPIT                                             */}
      {/* ========================================================================= */}
      <footer className="fixed bottom-0 left-0 w-full z-50 flex justify-between items-center px-5 lg:px-8 h-17 bg-[#0e131f]/95 border-t border-white/10 backdrop-blur-xl">
        {/* Left Actions */}
        <div className="flex items-center space-x-2.5 font-mono text-xs">
          <button
            onClick={handleClearResponse}
            className="flex items-center text-slate-300 hover:text-white px-3.5 py-2.5 border border-white/10 rounded-xl hover:bg-[#161f36] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] mr-1.5">backspace</span>
            <span>Clear</span>
          </button>
          <button
            onClick={() => {
              if (currentIndex > 0) {
                setCurrentIndex((prev) => prev - 1);
                setQuestionElapsed(0);
              }
            }}
            disabled={currentIndex === 0}
            className="flex items-center text-slate-300 hover:text-white px-3.5 py-2.5 border border-white/10 rounded-xl hover:bg-[#161f36] transition-colors disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-[18px] mr-1.5">arrow_back</span>
            <span>Previous</span>
          </button>
        </div>

        {/* Center Pace Summary */}
        <div className="hidden md:flex items-center space-x-2 text-xs font-mono px-4 py-1.5 bg-[#101726] rounded-lg border border-white/10">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-slate-300">Target: {expectedPace}s/Q • Current: {questionElapsed}s</span>
        </div>

        {/* Right Primary Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={handleToggleMarkReview}
            className={`flex items-center px-4 py-2.5 border rounded-xl transition-all font-semibold ${
              markedForReview[activeQuestion.id]
                ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                : 'border-amber-400/40 text-amber-300 hover:bg-amber-400/10'
            }`}
          >
            <span className="material-symbols-outlined text-[18px] mr-1.5">bookmark</span>
            <span>Review Later</span>
          </button>

          <button
            onClick={handleSaveAndNext}
            className="flex items-center bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-2.5 rounded-xl shadow-[0_0_18px_rgba(245,158,11,0.4)] transition-all active:scale-[0.98] text-sm"
          >
            <span className="mr-1.5">Save &amp; Next</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
