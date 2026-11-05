'use client';

import React, { useState } from 'react';
import { resetUserMemory, getUserMemory } from '@/lib/storage';
import { X, RotateCcw, Check, ShieldCheck, Calendar, BookOpen } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onKeySaved,
}) => {
  const [resetDone, setResetDone] = useState(false);
  const memory = getUserMemory();

  if (!isOpen) return null;

  const handleResetProgress = () => {
    if (window.confirm('Are you sure you want to reset your practice attempts and start fresh?')) {
      resetUserMemory();
      setResetDone(true);
      setTimeout(() => {
        setResetDone(false);
        onKeySaved();
        onClose();
        window.location.reload();
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Study Preferences</h3>
              <p className="text-xs text-slate-500">The Anandi Fellowship Prep</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          
          {/* Exam Summary Card */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span>Anandi-NEAT 2026 Exam</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Offline pen-and-paper test on <strong>Sunday, November 29, 2026</strong>. 120 Questions in 120 Minutes across 17 cities in India.
            </p>
          </div>

          {/* Reset Progress Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-900">
                Practice Progress &amp; Memory
              </label>
              <span className="text-[11px] font-mono text-slate-500">
                {memory.totalQuestionsAttempted} Questions Solved
              </span>
            </div>

            <p className="text-slate-600 leading-relaxed text-[11px]">
              If you want to clear your test scores, mistake logs, and practice analytics to start fresh from Day 1, you can reset below.
            </p>

            <button
              onClick={handleResetProgress}
              className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
            >
              {resetDone ? (
                <>
                  <Check className="w-3.5 h-3.5 text-rose-700" />
                  <span>Progress Reset!</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-rose-700" />
                  <span>Reset My Practice History</span>
                </>
              )}
            </button>
          </div>

          {/* Privacy Note */}
          <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Your test attempts, streak, and performance analytics stay 100% private in your local browser storage.
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
