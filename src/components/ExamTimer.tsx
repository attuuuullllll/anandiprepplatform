'use client';

import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, Pause, Play } from 'lucide-react';

interface ExamTimerProps {
  totalSeconds: number;
  expectedQuestionSeconds?: number;
  questionElapsedSeconds: number;
  onTimeExpired: () => void;
  isPaused: boolean;
  onTogglePause: () => void;
}

export const ExamTimer: React.FC<ExamTimerProps> = ({
  totalSeconds,
  expectedQuestionSeconds = 90,
  questionElapsedSeconds,
  onTimeExpired,
  isPaused,
  onTogglePause,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);

  useEffect(() => {
    setSecondsRemaining(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (isPaused || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, secondsRemaining, onTimeExpired]);

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3200);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) {
      return `${hours}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = secondsRemaining <= 300; // < 5 mins
  const isCritical = secondsRemaining <= 60;

  // Pace status for current question
  const paceRatio = questionElapsedSeconds / expectedQuestionSeconds;
  let paceColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50';
  let paceText = 'On Target';

  if (paceRatio > 1.25) {
    paceColor = 'text-rose-400 bg-rose-950/40 border-rose-800/50 animate-pulse';
    paceText = 'Pace Warning (+30s)';
  } else if (paceRatio > 0.85) {
    paceColor = 'text-amber-400 bg-amber-950/40 border-amber-800/50';
    paceText = 'Wrapping Up';
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800 shadow-lg">
      {/* Overall Exam Countdown */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 font-mono text-lg font-bold px-3 py-1 rounded-lg border ${
          isCritical
            ? 'bg-rose-950/80 text-rose-400 border-rose-700 animate-pulse'
            : isLowTime
            ? 'bg-amber-950/70 text-amber-400 border-amber-700'
            : 'bg-slate-800/80 text-emerald-400 border-slate-700'
        }`}>
          <Clock className="w-4 h-4" />
          <span>{formatTime(secondsRemaining)}</span>
        </div>

        <button
          onClick={onTogglePause}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/60"
          title={isPaused ? 'Resume exam' : 'Pause exam'}
        >
          {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
        </button>

        {isPaused && (
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
            Paused
          </span>
        )}
      </div>

      {/* Per-Question Live Pace Tracker */}
      <div className="flex items-center gap-2">
        <div className="text-xs text-slate-400 hidden sm:inline">
          Pace Benchmark: <span className="text-slate-200 font-mono font-medium">{expectedQuestionSeconds}s</span>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium ${paceColor}`}>
          {paceRatio > 1.25 && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
          <span>{questionElapsedSeconds}s</span>
          <span className="text-[10px] uppercase font-sans tracking-wide ml-1 opacity-80">({paceText})</span>
        </div>
      </div>
    </div>
  );
};
