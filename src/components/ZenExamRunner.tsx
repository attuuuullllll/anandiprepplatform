'use client';

import React, { useState, useEffect } from 'react';
import { Question, UserAttempt, ExamSection, MistakeTag } from '@/types';
import { MathRenderer } from './MathRenderer';
import { recordAttemptAndUpdateMemory, saveCompletedSession, cacheQuestions, getStoredApiKey } from '@/lib/storage';
import { 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  Bookmark, 
  Clock, 
  Pause, 
  Play, 
  Check, 
  Bot, 
  X, 
  ShieldCheck, 
  Award,
  LayoutGrid,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ZenExamRunnerProps {
  questions: Question[];
  title: string;
  section?: ExamSection;
  isFullMock?: boolean;
  timeLimitSeconds?: number;
  onExit: () => void;
  onAskLeo: (question: Question) => void;
}

export const ZenExamRunner: React.FC<ZenExamRunnerProps> = ({
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

  // UX additions: Review Mode & Question Palette
  const [isCompleted, setIsCompleted] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Timers
  const [secondsRemaining, setSecondsRemaining] = useState(timeLimitSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [questionElapsed, setQuestionElapsed] = useState(0);

  // Leo side panel
  const [isLeoDrawerOpen, setIsLeoDrawerOpen] = useState(false);
  const [leoMessages, setLeoMessages] = useState<Array<{ sender: 'user' | 'leo'; text: string }>>([]);
  const [leoInput, setLeoInput] = useState('');
  const [isLeoLoading, setIsLeoLoading] = useState(false);

  const activeQuestion = questions[currentIndex] || questions[0];
  const expectedPace = activeQuestion?.expectedPaceSeconds || 90;

  // Countdown timer
  useEffect(() => {
    if (isPaused || isCompleted || isReviewMode || secondsRemaining <= 0) return;
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
  }, [isPaused, isCompleted, isReviewMode, secondsRemaining]);

  // Per-question elapsed timer
  useEffect(() => {
    if (isPaused || isCompleted || isReviewMode) return;
    const interval = setInterval(() => {
      setQuestionElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, isCompleted, isReviewMode, currentIndex]);

  // Load selection when question changes
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
    } else {
      setSelectedOption('');
      setNumericValue('');
      setSelectedMistakeTag('none');
    }
    // Show solution automatically in review mode
    setShowSolution(isReviewMode);
  }, [currentIndex, activeQuestion?.id, isReviewMode]);

  // Keyboard Ergonomics UX: 1/2/3/4/A/B/C/D to select, Enter/Right to Next, Left to Prev, M to Mark
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCompleted && !isReviewMode) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      if (key === 'arrowright' || key === 'enter') {
        e.preventDefault();
        handleSaveAndNext();
      } else if (key === 'arrowleft') {
        e.preventDefault();
        if (currentIndex > 0) {
          setCurrentIndex((prev) => prev - 1);
          setQuestionElapsed(0);
        }
      } else if (key === 'm') {
        e.preventDefault();
        handleToggleMarkReview();
      } else if (activeQuestion.type === 'mcq' && activeQuestion.options) {
        if (['1', 'a'].includes(key) && activeQuestion.options[0]) {
          handleSelectOption(activeQuestion.options[0].id);
        } else if (['2', 'b'].includes(key) && activeQuestion.options[1]) {
          handleSelectOption(activeQuestion.options[1].id);
        } else if (['3', 'c'].includes(key) && activeQuestion.options[2]) {
          handleSelectOption(activeQuestion.options[2].id);
        } else if (['4', 'd'].includes(key) && activeQuestion.options[3]) {
          handleSelectOption(activeQuestion.options[3].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, activeQuestion, selectedOption, numericValue, selectedMistakeTag, isCompleted, isReviewMode]);

  const handleSelectOption = (optId: string) => {
    if (isReviewMode) return; // Read-only in review mode
    setSelectedOption(optId);
  };

  const handleToggleMarkReview = () => {
    setMarkedForReview((prev) => ({
      ...prev,
      [activeQuestion.id]: !prev[activeQuestion.id],
    }));
  };

  const handleSaveAndNext = () => {
    if (isReviewMode) {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // Last question in review mode
        onExit();
      }
      return;
    }

    const currentAnswer = activeQuestion.type === 'numeric' ? numericValue : selectedOption;
    const isLastQuestion = currentIndex === questions.length - 1;
    let updated = { ...attempts };

    if (currentAnswer || markedForReview[activeQuestion.id]) {
      let isCorrect = false;
      if (activeQuestion.type === 'mcq') {
        isCorrect = currentAnswer === activeQuestion.answerKey;
      } else if (activeQuestion.type === 'numeric') {
        const numUser = parseFloat(numericValue);
        const numKey = typeof activeQuestion.answerKey === 'number'
          ? activeQuestion.answerKey
          : parseFloat(String(activeQuestion.answerKey));
        const tol = activeQuestion.numericTolerance || 0.05;
        isCorrect = !isNaN(numUser) && Math.abs(numUser - numKey) <= tol;
      }

      const attempt: UserAttempt = {
        questionId: activeQuestion.id,
        userAnswer: currentAnswer,
        isCorrect,
        timeSpentSeconds: questionElapsed,
        mistakeTag: selectedMistakeTag !== 'none' ? selectedMistakeTag : isCorrect ? 'none' : 'concept',
        timestamp: new Date().toISOString(),
      };

      updated = { ...attempts, [activeQuestion.id]: attempt };
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
    }

    if (isLastQuestion) {
      handleFinishTest(updated);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setQuestionElapsed(0);
    }
  };

  const handleClear = () => {
    if (isReviewMode) return;
    setSelectedOption('');
    setNumericValue('');
    const copy = { ...attempts };
    delete copy[activeQuestion.id];
    setAttempts(copy);
  };

  const handleFinishTest = (overrideAttempts?: Record<string, UserAttempt>) => {
    setIsCompleted(true);
    const activeAttempts = overrideAttempts || attempts;
    const list = Object.values(activeAttempts);
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
      attempts: activeAttempts,
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

  const askLeoInDrawer = async (customPrompt?: string) => {
    const textToSend = customPrompt || leoInput;
    if (!textToSend.trim() || isLeoLoading) return;

    const userMsg = { sender: 'user' as const, text: textToSend };
    setLeoMessages((prev) => [...prev, userMsg]);
    setLeoInput('');
    setIsLeoLoading(true);

    try {
      const apiKey = getStoredApiKey();
      const res = await fetch('/api/leo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...leoMessages.map((m) => ({
              role: m.sender === 'leo' ? 'assistant' : 'user',
              content: m.text,
            })),
            { role: 'user', content: textToSend },
          ],
          context: {
            section: activeQuestion.section,
            subtopic: activeQuestion.subtopic,
            prompt: activeQuestion.prompt,
            difficulty: activeQuestion.difficulty,
            solution: activeQuestion.solution,
            userAnswer: selectedOption || numericValue,
            answerKey: activeQuestion.answerKey,
          },
          apiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reach Leo');

      setLeoMessages((prev) => [...prev, { sender: 'leo', text: data.reply }]);
    } catch (err: any) {
      setLeoMessages((prev) => [
        ...prev,
        {
          sender: 'leo',
          text: `⚠️ AI Error: ${err.message || 'Unable to connect to AI server.'}`,
        },
      ]);
    } finally {
      setIsLeoLoading(false);
    }
  };

  const sectionFullLabels: Record<string, string> = {
    quant: 'Quantitative Reasoning',
    logic: 'Logic & Inferencing',
    verbal_di: 'DI & Verbal Reasoning',
    general_awareness: 'General Awareness',
    business_judgement: 'Business Judgement',
  };

  const answeredCount = Object.keys(attempts).length;
  const sectionsInTest = Array.from(new Set(questions.map((q) => q.section)));

  // Format timer
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Completion View (Sprint Concluded)
  if (isCompleted && !isReviewMode) {
    const list = Object.values(attempts);
    const correctCount = list.filter((a) => a.isCorrect).length;
    const accuracy = list.length > 0 ? Math.round((correctCount / list.length) * 100) : 0;
    const avgPace = list.length > 0 ? Math.round(list.reduce((acc, a) => acc + a.timeSpentSeconds, 0) / list.length) : 0;

    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-6 lg:p-12 flex flex-col items-center justify-center font-sans">
        <div className="w-full max-w-xl bg-white border border-slate-200 p-8 sm:p-12 rounded-2xl space-y-8 text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <Award className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Sprint Concluded
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Diagnostic performance telemetry updated to your local memory.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block font-medium">Score</span>
              <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
                {correctCount} <span className="text-xs text-slate-400 font-normal">/ {questions.length}</span>
              </span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block font-medium">Accuracy</span>
              <span className="text-2xl font-bold font-mono text-emerald-600 mt-1 block">{accuracy}%</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 block font-medium">Avg Pace</span>
              <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">{avgPace}s</span>
            </div>
          </div>

          {/* Action Buttons: Review Answers vs Return */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <button
              onClick={() => {
                setIsReviewMode(true);
                setCurrentIndex(0);
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-sm font-semibold shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Review Solutions &amp; Traps</span>
            </button>

            <button
              onClick={onExit}
              className="w-full sm:w-auto ui-btn-accent px-8 py-3 text-sm font-bold flex items-center justify-center"
            >
              Return to Curriculum
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPaceOver = questionElapsed > expectedPace;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans select-none relative overflow-x-hidden">
      
      {/* ========================================================================= */}
      {/* 1. TOP BAR (Clean Header + Question Palette + Timer)                     */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
        
        {/* Left: Exit, Logo & Section Badge */}
        <div className="flex items-center space-x-3">
          <button
            onClick={isReviewMode ? () => setIsReviewMode(false) : onExit}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-xs"
            title={isReviewMode ? 'Exit Review' : 'Exit to Dashboard'}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-2">
            <img
              src="/logo.png"
              alt="Leo AI Logo"
              className="w-7 h-7 rounded-lg object-contain border border-emerald-200/80 shadow-2xs"
            />
            <span className="text-sm font-bold text-slate-900 tracking-tight">
              {isReviewMode ? 'Review Mode' : 'Anandi-NEAT'}
            </span>
            <span className="text-slate-300 text-sm">/</span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold truncate max-w-[140px] sm:max-w-none">
              {sectionFullLabels[activeQuestion.section] || activeQuestion.section}
            </span>
          </div>
        </div>

        {/* Center: Timer Capsule (or Review Indicator) */}
        {!isReviewMode ? (
          <div className="flex items-center space-x-3 bg-white border border-slate-200 shadow-xs px-4 py-1.5 rounded-full">
            <div className="flex items-center space-x-2 font-mono text-sm font-semibold text-slate-900">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="text-slate-400 hover:text-slate-800 transition-colors"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <span>✓ Verified Solutions</span>
          </div>
        )}

        {/* Right: Question Palette Grid Toggle & Finish */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Question Grid Toggle Button */}
          <button
            onClick={() => setIsPaletteOpen((prev) => !prev)}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors shadow-xs"
            title="Toggle Question Grid Palette"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold">{answeredCount}/{questions.length}</span>
          </button>

          {!isReviewMode && (
            <div className="hidden md:flex items-center space-x-2 text-xs font-mono text-slate-600 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-xs">
              <span>Pace:</span>
              <span className={isPaceOver ? 'text-rose-600 font-bold' : 'text-slate-900 font-bold'}>
                {questionElapsed}s
              </span>
              <span className="text-slate-300">/</span>
              <span>{expectedPace}s</span>
            </div>
          )}

          {!isReviewMode ? (
            <button
              onClick={() => handleFinishTest()}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 shadow-xs transition-colors"
            >
              Finish Test
            </button>
          ) : (
            <button
              onClick={onExit}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors"
            >
              Exit Review
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. SECTION TABS FOR FULL MOCKS (Instant Domain Jump UX)                  */}
      {/* ========================================================================= */}
      {sectionsInTest.length > 1 && (
        <div className="w-full bg-white border-b border-slate-200 px-4 sm:px-8 py-2 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[11px] font-mono text-slate-400 font-medium pl-1">Sections:</span>
          {sectionsInTest.map((sec) => {
            const firstIdx = questions.findIndex((q) => q.section === sec);
            const isCurrentSection = activeQuestion.section === sec;
            const count = questions.filter((q) => q.section === sec).length;

            return (
              <button
                key={sec}
                onClick={() => {
                  if (firstIdx !== -1) {
                    setCurrentIndex(firstIdx);
                    setQuestionElapsed(0);
                  }
                }}
                className={`px-3 py-1 rounded-full font-medium transition-all text-xs whitespace-nowrap ${
                  isCurrentSection
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                {sectionFullLabels[sec] || sec} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. QUESTION PALETTE DRAWER (CBT Grid UX)                                  */}
      {/* ========================================================================= */}
      {isPaletteOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm h-full bg-white border-l border-slate-200 shadow-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Question Palette</h3>
                </div>
                <button
                  onClick={() => setIsPaletteOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 my-4 text-[11px] font-mono text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-emerald-600"></span>
                  <span>Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-amber-400"></span>
                  <span>Review ({Object.values(markedForReview).filter(Boolean).length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-slate-200"></span>
                  <span>Unanswered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm ring-2 ring-emerald-600"></span>
                  <span>Current</span>
                </div>
              </div>

              {/* Grid Numbers */}
              <div className="grid grid-cols-5 gap-2 pt-2">
                {questions.map((q, idx) => {
                  const isAnswered = !!attempts[q.id];
                  const isMarked = !!markedForReview[q.id];
                  const isCurrent = currentIndex === idx;

                  let bgClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200';
                  if (isAnswered && isMarked) {
                    bgClass = 'bg-purple-100 text-purple-900 border border-purple-300 font-bold';
                  } else if (isAnswered) {
                    bgClass = 'bg-emerald-600 text-white font-bold shadow-xs';
                  } else if (isMarked) {
                    bgClass = 'bg-amber-100 text-amber-900 border border-amber-300 font-bold';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setQuestionElapsed(0);
                        setIsPaletteOpen(false);
                      }}
                      className={`h-10 rounded-lg text-xs font-mono font-semibold transition-all ${bgClass} ${
                        isCurrent ? 'ring-2 ring-emerald-500 scale-105' : ''
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setIsPaletteOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors mt-4"
            >
              Close Palette
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. QUESTION STAGE (Golden Width 780px, Distraction-Free CBT Card)         */}
      {/* ========================================================================= */}
      <main className="flex-1 flex justify-center px-4 sm:px-6 py-6 sm:py-8 pb-44">
        <div className="w-full max-w-[780px] space-y-6 animate-fade-in">
          
          {/* Question Paper Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-5">
            {/* Header: Question Meta & Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-xs font-bold tracking-wide">
                  Q{currentIndex + 1} OF {questions.length}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-700 truncate max-w-[240px] sm:max-w-none">
                  {activeQuestion.subtopic}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {activeQuestion.source === 'ai_generated_verified' || activeQuestion.id.includes('_17') ? (
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-semibold flex items-center gap-1.5 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>AI Generated (Cloud Bank)</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                    Curriculum Bank
                  </span>
                )}
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                  Level {activeQuestion.difficulty}
                </span>
                {!isReviewMode && (
                  <button
                    onClick={handleToggleMarkReview}
                    className={`p-1.5 rounded-lg transition-colors border ${
                      markedForReview[activeQuestion.id]
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-300 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Mark for Review (Shortcut: M)"
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* The Question Prompt - Calibrated Exam Typography */}
            <div className="text-[17px] sm:text-[18.5px] font-medium leading-[1.8] text-slate-900 tracking-normal font-sans">
              <MathRenderer content={activeQuestion.prompt} />
            </div>
          </div>

          {/* Multiple Choice Options */}
          {activeQuestion.type === 'mcq' && activeQuestion.options && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                  Options ({activeQuestion.options.length})
                </span>
                <span className="text-[11px] text-slate-400 font-mono">Select one option</span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {activeQuestion.options.map((opt) => {
                  const isSelected = selectedOption === opt.id;
                  const isSavedAttempt = attempts[activeQuestion.id];
                  const isCorrectKey = activeQuestion.answerKey === opt.id;

                  let cardClasses = 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 text-slate-800 shadow-2xs';
                  
                  if (isReviewMode) {
                    if (isCorrectKey) {
                      cardClasses = 'bg-emerald-50/90 border-2 border-emerald-600 text-emerald-950 font-semibold shadow-xs';
                    } else if (isSelected && !isCorrectKey) {
                      cardClasses = 'bg-rose-50 border-2 border-rose-400 text-rose-950';
                    }
                  } else {
                    if (isSelected) {
                      cardClasses = 'bg-emerald-50/70 border-2 border-emerald-600 text-emerald-950 font-semibold shadow-xs ring-1 ring-emerald-600/20';
                    }
                  }

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.id)}
                      className={`group relative flex items-center justify-between px-5 py-4 rounded-xl border transition-all duration-150 ${
                        isReviewMode ? 'cursor-default' : 'cursor-pointer'
                      } ${cardClasses}`}
                    >
                      <div className="flex items-center space-x-3.5 min-w-0 pr-3">
                        {/* Letter Identifier */}
                        <span
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-colors ${
                            isReviewMode && isCorrectKey
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 border border-slate-200 group-hover:border-emerald-300 group-hover:bg-emerald-50/50 group-hover:text-emerald-700'
                          }`}
                        >
                          {opt.id}
                        </span>
                        {/* Option Text */}
                        <div className="text-[16px] sm:text-[17px] font-medium leading-relaxed text-slate-800 break-words">
                          <MathRenderer content={opt.text} />
                        </div>
                      </div>

                      {/* Right-side Selection Indicator */}
                      <div className="shrink-0 pl-2">
                        {isReviewMode ? (
                          isCorrectKey ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-full border border-emerald-300 shadow-2xs">
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Correct Key</span>
                            </span>
                          ) : isSelected ? (
                            <span className="text-xs font-mono font-bold text-rose-600 bg-white px-2.5 py-1 rounded-full border border-rose-300 shadow-2xs">
                              Your Choice
                            </span>
                          ) : null
                        ) : (
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                                : 'border-slate-300 group-hover:border-emerald-400 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Numerical TITA Input */}
          {activeQuestion.type === 'numeric' && (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                <span className="font-semibold text-slate-700">Numerical Value (TITA)</span>
                <span>Tolerance: ±{activeQuestion.numericTolerance || 0.05}</span>
              </div>
              <input
                type="number"
                step="any"
                disabled={isReviewMode}
                value={numericValue}
                onChange={(e) => setNumericValue(e.target.value)}
                placeholder="Type your calculated answer..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-mono text-lg rounded-xl px-4 py-3 outline-none focus:bg-white focus:border-emerald-600 transition-colors"
              />
              {isReviewMode && (
                <div className="text-xs font-mono text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  Correct Numerical Answer: <strong>{String(activeQuestion.answerKey)}</strong>
                </div>
              )}
            </div>
          )}

          {/* Friction Tagging (During exam) */}
          {!isReviewMode && (
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 sm:p-4 space-y-2.5 mt-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span>⚡</span> Optional Friction Tag
                </span>
                <span className="text-[11px] text-slate-400">Tracks error patterns for Leo Diagnostics</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {[
                  { tag: 'concept', label: 'Concept Gap' },
                  { tag: 'calculation', label: 'Calculation Slip' },
                  { tag: 'careless', label: 'Distractor Trap' },
                  { tag: 'time_pressure', label: 'Time Crunch' },
                  { tag: 'guessed', label: 'Intuition Guess' },
                ].map((m) => (
                  <button
                    key={m.tag}
                    onClick={() => setSelectedMistakeTag(m.tag as MistakeTag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedMistakeTag === m.tag
                        ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    {selectedMistakeTag === m.tag ? `✓ ${m.label}` : m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Solution & Derivation Drawer (Always open in review mode, toggleable in sprint) */}
          {showSolution && (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-3 mt-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-xs font-semibold text-slate-900 flex items-center gap-2 font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Verified Mathematical Derivation &amp; Strategy
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  DeepSeek-R1 Audited
                </span>
              </div>
              <div className="text-[15px] sm:text-[16px] text-slate-700 leading-relaxed pt-1">
                <MathRenderer content={activeQuestion.solution} />
              </div>

              {isReviewMode && (
                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => {
                      setLeoInput('Why is this solution approach the fastest way to solve this problem?');
                      setIsLeoDrawerOpen(true);
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ask Leo to explain this solution</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Critical bottom spacer so floating dock never overlaps content on any screen size */}
          <div className="h-28" />
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 5. FLOATING BOTTOM COMMAND DOCK (Responsive & Ergonomic)                  */}
      {/* ========================================================================= */}
      <footer className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-[760px] px-3 sm:px-4 pointer-events-none">
        <div className="bg-white/95 border border-slate-200 p-1.5 sm:p-2 rounded-full flex items-center justify-between shadow-xl pointer-events-auto backdrop-blur-xl">
          
          {/* Left Actions: Previous & Clear */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                if (currentIndex > 0) {
                  setCurrentIndex((prev) => prev - 1);
                  setQuestionElapsed(0);
                }
              }}
              disabled={currentIndex === 0}
              className="px-3 sm:px-4 py-2 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-30"
              title="Previous (Shortcut: ←)"
            >
              Prev
            </button>
            
            {!isReviewMode && (
              <button
                onClick={handleClear}
                className="hidden sm:inline-block px-3 py-2 rounded-full text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                title="Clear current selection"
              >
                Clear
              </button>
            )}
          </div>

          {/* Center: Consult Leo AI */}
          <button
            onClick={() => setIsLeoDrawerOpen(true)}
            className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-full text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 transition-colors border border-slate-200 shadow-xs"
            title="Ask Leo AI for hints on this question"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span><span className="hidden sm:inline">Consult </span>Leo AI</span>
          </button>

          {/* Right Action: Save & Next */}
          <button
            onClick={handleSaveAndNext}
            className="ui-btn-accent flex items-center space-x-1.5 sm:space-x-2 px-4 sm:px-6 py-2.5 text-xs font-bold shrink-0"
            title="Save & Next (Shortcut: Enter or →)"
          >
            <span>{isReviewMode ? (currentIndex === questions.length - 1 ? 'Done' : 'Next') : (currentIndex === questions.length - 1 ? 'Save & Review' : 'Save & Next')}</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 6. LEO AI SIDE DRAWER                                                     */}
      {/* ========================================================================= */}
      {isLeoDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-3">
                <img
                  src="/logo.png"
                  alt="Leo AI Panda"
                  className="w-9 h-9 rounded-xl object-contain shadow-xs border border-emerald-200/80"
                />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Leo AI • Socratic Mentor</h3>
                  <p className="text-xs text-slate-500">The Anandi Fellowship Guidance</p>
                </div>
              </div>
              <button
                onClick={() => setIsLeoDrawerOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                Stuck on Question {currentIndex + 1}? Ask me for a subtle conceptual hint, a breakdown of governing constraints, or a speed shortcut without giving away the final answer.
              </div>

              {leoMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl p-4 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-50 border border-slate-200 text-slate-800'
                    }`}
                  >
                    <MathRenderer content={msg.text} />
                  </div>
                </div>
              ))}

              {isLeoLoading && (
                <div className="flex items-center space-x-2 text-xs font-mono text-emerald-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Leo is analyzing problem constraints...</span>
                </div>
              )}
            </div>

            {/* Quick Socratic Prompt Chips */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-2">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                Instant Inquiries:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Give me step 1 hint without spoiler',
                  'What is the common trap here?',
                  'How to eliminate options fast?',
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => askLeoInDrawer(chip)}
                    className="text-xs px-3 py-1 rounded-full bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 shadow-xs transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={leoInput}
                  onChange={(e) => setLeoInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && askLeoInDrawer()}
                  placeholder="Ask a question about this problem..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-emerald-600 transition-colors"
                />
                <button
                  onClick={() => askLeoInDrawer()}
                  disabled={!leoInput.trim() || isLeoLoading}
                  className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xs disabled:opacity-40"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
