'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Question, TestSession, UserAttempt, ExamSection, MistakeTag } from '@/types';
import { ExamTimer } from './ExamTimer';
import { QuestionCard } from './QuestionCard';
import { recordAttemptAndUpdateMemory, saveCompletedSession, cacheQuestions, getStoredApiKey } from '@/lib/storage';
import { CheckCircle, ArrowLeft, ArrowRight, RotateCcw, Award, AlertTriangle, Sparkles, MessageSquare } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TestSessionRunnerProps {
  initialQuestions: Question[];
  title: string;
  section?: ExamSection;
  isFullMock?: boolean;
  timeLimitSeconds?: number;
  onExit: () => void;
  onAskLeo: (question: Question) => void;
  onOpenSettings: () => void;
}

export const TestSessionRunner: React.FC<TestSessionRunnerProps> = ({
  initialQuestions,
  title,
  section,
  isFullMock = false,
  timeLimitSeconds = 1200, // 20 minutes default for sprint, 7200 for full mock
  onExit,
  onAskLeo,
  onOpenSettings,
}) => {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState<Record<string, UserAttempt>>({});
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [questionElapsedSeconds, setQuestionElapsedSeconds] = useState(0);
  const [isEvaluatingSubjective, setIsEvaluatingSubjective] = useState(false);

  // Timer for per-question pace tracking
  useEffect(() => {
    if (isPaused || isCompleted) return;
    const interval = setInterval(() => {
      setQuestionElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, isCompleted, currentIndex]);

  const activeQuestion = questions[currentIndex];

  const handleAnswerSubmit = async (userAnswer: any, mistakeTag?: MistakeTag) => {
    if (!activeQuestion) return;

    let isCorrect = false;
    let evalScore = 0;
    let evalFeedback = '';

    if (activeQuestion.type === 'mcq') {
      isCorrect = String(userAnswer).trim().toUpperCase() === String(activeQuestion.answerKey).trim().toUpperCase();
      evalScore = isCorrect ? 1 : 0;
    } else if (activeQuestion.type === 'multi_select') {
      const userArr = Array.isArray(userAnswer) ? userAnswer.sort() : [];
      const keyArr = Array.isArray(activeQuestion.answerKey)
        ? (activeQuestion.answerKey as string[]).sort()
        : [String(activeQuestion.answerKey)];
      isCorrect = JSON.stringify(userArr) === JSON.stringify(keyArr);
      evalScore = isCorrect ? 1 : 0;
    } else if (activeQuestion.type === 'numeric') {
      const userVal = parseFloat(userAnswer);
      const keyVal = parseFloat(String(activeQuestion.answerKey));
      const tol = activeQuestion.numericTolerance || 0.01;
      isCorrect = !isNaN(userVal) && Math.abs(userVal - keyVal) <= tol;
      evalScore = isCorrect ? 1 : 0;
    } else if (activeQuestion.type === 'subjective') {
      setIsEvaluatingSubjective(true);
      try {
        const apiKey = getStoredApiKey();
        const res = await fetch('/api/grade-subjective', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: activeQuestion,
            userAnswer,
            apiKey,
          }),
        });
        const data = await res.json();
        if (data.evaluation) {
          evalScore = data.evaluation.score;
          isCorrect = data.evaluation.percentage >= 60;
          evalFeedback = data.evaluation.overallCritique;
        }
      } catch (err) {
        console.error('Subjective grading error:', err);
        isCorrect = true;
        evalScore = 3;
      } finally {
        setIsEvaluatingSubjective(false);
      }
    }

    const newAttempt: UserAttempt = {
      questionId: activeQuestion.id,
      userAnswer,
      isCorrect,
      scoreEarned: evalScore,
      timeSpentSeconds: questionElapsedSeconds,
      mistakeTag: mistakeTag || (isCorrect ? 'none' : 'concept'),
      evalFeedback,
      timestamp: new Date().toISOString(),
    };

    const updatedAttempts = { ...attempts, [activeQuestion.id]: newAttempt };
    setAttempts(updatedAttempts);

    // Update memory and database
    const dummySession: TestSession = {
      id: `session_${Date.now()}`,
      title,
      section,
      isFullMock,
      totalQuestions: questions.length,
      timeLimitSeconds,
      questions,
      attempts: updatedAttempts,
      startedAt: new Date().toISOString(),
      score: 0,
      accuracyRate: 0,
      avgPaceSeconds: 0,
    };
    recordAttemptAndUpdateMemory(dummySession, newAttempt, activeQuestion);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setQuestionElapsedSeconds(0);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setQuestionElapsedSeconds(0);
    }
  };

  const handleFinishTest = () => {
    setIsCompleted(true);

    const attemptsList = Object.values(attempts);
    const correctCount = attemptsList.filter((a) => a.isCorrect).length;
    const accuracy = attemptsList.length > 0 ? Math.round((correctCount / attemptsList.length) * 100) : 0;
    const totalTimeSpent = attemptsList.reduce((acc, a) => acc + a.timeSpentSeconds, 0);
    const avgPace = attemptsList.length > 0 ? Math.round(totalTimeSpent / attemptsList.length) : 0;

    const completedSession: TestSession = {
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
    };

    saveCompletedSession(completedSession);
    cacheQuestions(questions);

    if (accuracy >= 70) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  if (isCompleted) {
    const attemptsList = Object.values(attempts);
    const correctCount = attemptsList.filter((a) => a.isCorrect).length;
    const accuracy = attemptsList.length > 0 ? Math.round((correctCount / attemptsList.length) * 100) : 0;
    const avgPace =
      attemptsList.length > 0
        ? Math.round(attemptsList.reduce((acc, a) => acc + a.timeSpentSeconds, 0) / attemptsList.length)
        : 0;

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg">
            <Award className="w-8 h-8" />
          </div>

          <h2 className="text-3xl font-black text-white">Anandi Session Completed!</h2>
          <p className="text-slate-300 text-sm max-w-lg mx-auto">
            Performance diagnostic has been recorded into Leo&apos;s Memory to personalize your next training cycle.
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto pt-4 text-center">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block">Score</span>
              <span className="text-2xl font-bold font-mono text-indigo-400">
                {correctCount} / {questions.length}
              </span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block">Accuracy</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">{accuracy}%</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 block">Avg Pace</span>
              <span className="text-2xl font-bold font-mono text-amber-400">{avgPace}s</span>
            </div>
          </div>

          <div className="pt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={onExit}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>

        {/* Detailed Questions Review List */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Review Verified Questions & Traps</h3>
          {questions.map((q, idx) => {
            const att = attempts[q.id];
            return (
              <div key={q.id} className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 pl-2">
                  <span>Question #{idx + 1}</span>
                  {att?.isCorrect ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Correct
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {att?.mistakeTag || 'Missed'}
                    </span>
                  )}
                </div>
                <QuestionCard
                  question={q}
                  attempt={att}
                  onAnswerSubmit={(ans, tag) => handleAnswerSubmit(ans, tag)}
                  onAskLeo={() => onAskLeo(q)}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Test Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
        <div>
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit to Dashboard</span>
          </button>
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>

        {/* Exam Timer & Pace Widget */}
        <ExamTimer
          totalSeconds={timeLimitSeconds}
          expectedQuestionSeconds={activeQuestion?.expectedPaceSeconds || 90}
          questionElapsedSeconds={questionElapsedSeconds}
          onTimeExpired={handleFinishTest}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused(!isPaused)}
        />
      </div>

      {/* Question Selector Numbers Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {questions.map((q, idx) => {
          const isCurr = idx === currentIndex;
          const isAns = Boolean(attempts[q.id]);
          return (
            <button
              key={q.id}
              onClick={() => {
                setCurrentIndex(idx);
                setQuestionElapsedSeconds(0);
              }}
              className={`w-9 h-9 rounded-xl font-mono text-xs font-bold shrink-0 transition-all border ${
                isCurr
                  ? 'bg-indigo-600 border-indigo-400 text-white ring-2 ring-indigo-500/50 scale-105'
                  : isAns
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Active Question Card */}
      {activeQuestion && (
        <QuestionCard
          question={activeQuestion}
          attempt={attempts[activeQuestion.id]}
          onAnswerSubmit={handleAnswerSubmit}
          onAskLeo={onAskLeo}
          isEvaluatingSubjective={isEvaluatingSubjective}
        />
      )}

      {/* Navigation Buttons Bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-30 border border-slate-800 font-semibold text-xs transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleFinishTest}
            className="px-5 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 font-semibold text-xs transition-colors"
          >
            Submit Exam
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === questions.length - 1}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 font-semibold text-xs transition-colors flex items-center gap-2"
          >
            <span>Next Question</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
