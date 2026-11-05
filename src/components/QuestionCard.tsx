'use client';

import React, { useState } from 'react';
import { Question, UserAttempt, MistakeTag } from '@/types';
import { MathRenderer } from './MathRenderer';
import { CheckCircle2, XCircle, ShieldCheck, ChevronDown, ChevronUp, Sparkles, MessageSquare, AlertCircle } from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  attempt?: UserAttempt;
  onAnswerSubmit: (answer: any, mistakeTag?: MistakeTag) => void;
  onAskLeo: (question: Question) => void;
  apiKey?: string;
  isEvaluatingSubjective?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  attempt,
  onAnswerSubmit,
  onAskLeo,
  isEvaluatingSubjective = false,
}) => {
  const [selectedOption, setSelectedOption] = useState<string>(
    typeof attempt?.userAnswer === 'string' ? attempt.userAnswer : ''
  );
  const [selectedMultiOptions, setSelectedMultiOptions] = useState<string[]>(
    Array.isArray(attempt?.userAnswer) ? attempt.userAnswer : []
  );
  const [numericInput, setNumericInput] = useState<string>(
    typeof attempt?.userAnswer === 'number' || typeof attempt?.userAnswer === 'string'
      ? String(attempt.userAnswer)
      : ''
  );
  const [subjectiveInput, setSubjectiveInput] = useState<string>(
    typeof attempt?.userAnswer === 'string' ? attempt.userAnswer : ''
  );
  const [showSolution, setShowSolution] = useState<boolean>(Boolean(attempt));
  const [selectedMistakeTag, setSelectedMistakeTag] = useState<MistakeTag>(attempt?.mistakeTag || 'none');

  const isSubmitted = Boolean(attempt);

  const handleSelectOption = (optId: string) => {
    if (isSubmitted) return;
    setSelectedOption(optId);
  };

  const handleToggleMulti = (optId: string) => {
    if (isSubmitted) return;
    if (selectedMultiOptions.includes(optId)) {
      setSelectedMultiOptions(selectedMultiOptions.filter((id) => id !== optId));
    } else {
      setSelectedMultiOptions([...selectedMultiOptions, optId]);
    }
  };

  const handlePrimarySubmit = () => {
    if (isSubmitted) return;
    if (question.type === 'mcq') {
      if (!selectedOption) return;
      onAnswerSubmit(selectedOption, selectedMistakeTag);
    } else if (question.type === 'multi_select') {
      if (selectedMultiOptions.length === 0) return;
      onAnswerSubmit(selectedMultiOptions, selectedMistakeTag);
    } else if (question.type === 'numeric') {
      if (numericInput.trim() === '') return;
      onAnswerSubmit(parseFloat(numericInput), selectedMistakeTag);
    } else if (question.type === 'subjective') {
      if (subjectiveInput.trim() === '') return;
      onAnswerSubmit(subjectiveInput.trim(), selectedMistakeTag);
    }
    setShowSolution(true);
  };

  const handleMistakeTagChange = (tag: MistakeTag) => {
    setSelectedMistakeTag(tag);
    if (attempt) {
      onAnswerSubmit(attempt.userAnswer, tag);
    }
  };

  const sectionLabels: Record<string, string> = {
    quant: 'Quantitative Reasoning',
    logic: 'Logic & Inferencing',
    verbal_di: 'Data Interpretation & Verbal',
    general_awareness: 'General Awareness',
    business_judgement: 'Business Judgement',
  };

  return (
    <div className="bg-[#0F172A] border border-slate-700/80 rounded-3xl p-6 sm:p-9 shadow-2xl relative overflow-hidden backdrop-blur-sm">
      {/* Top Header Badge Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {sectionLabels[question.section] || question.section}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {question.subtopic}
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase bg-slate-900 text-slate-400 border border-slate-800">
            {question.type.replace('_', ' ')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Difficulty Stars */}
          <div className="flex items-center gap-1.5 bg-[#090D16] px-3 py-1 rounded-xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400">Rigor</span>
            <div className="flex text-amber-400 text-xs">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <span key={lvl} className={lvl <= question.difficulty ? 'text-amber-400' : 'text-slate-700'}>
                  ★
                </span>
              ))}
            </div>
            <span className="text-xs text-amber-300 font-bold ml-0.5">L{question.difficulty}</span>
          </div>

          {/* Anandi Verified Badge */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-1 rounded-xl">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Anandi Verified</span>
          </div>
        </div>
      </div>

      {/* Question Prompt */}
      <div className="text-lg sm:text-xl font-medium text-white leading-relaxed mb-8 tracking-wide">
        <MathRenderer content={question.prompt} />
      </div>

      {/* Dynamic Answer Inputs */}
      <div className="space-y-3.5 mb-8">
        {/* Single Choice MCQ */}
        {question.type === 'mcq' && question.options && (
          <div className="grid grid-cols-1 gap-3">
            {question.options.map((option) => {
              const isSelected = selectedOption === option.id;
              const isCorrectAnswer = isSubmitted && question.answerKey === option.id;
              const isUserWrongSelection = isSubmitted && isSelected && !isCorrectAnswer;

              let cardStyle = 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/90 hover:border-slate-600 text-slate-200';
              if (isSelected && !isSubmitted) {
                cardStyle = 'border-indigo-500 bg-indigo-950/50 text-white shadow-lg ring-2 ring-indigo-500/60';
              } else if (isCorrectAnswer) {
                cardStyle = 'border-emerald-500 bg-emerald-950/60 text-emerald-100 ring-2 ring-emerald-500/70 shadow-lg';
              } else if (isUserWrongSelection) {
                cardStyle = 'border-rose-500 bg-rose-950/60 text-rose-100 ring-2 ring-rose-500/70 shadow-lg';
              }

              return (
                <button
                  key={option.id}
                  disabled={isSubmitted}
                  onClick={() => handleSelectOption(option.id)}
                  className={`w-full text-left p-4.5 rounded-2xl border transition-all flex items-start gap-4 ${cardStyle}`}
                >
                  <span
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border transition-colors ${
                      isSelected && !isSubmitted
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                        : isCorrectAnswer
                        ? 'bg-emerald-600 border-emerald-400 text-white shadow-md'
                        : isUserWrongSelection
                        ? 'bg-rose-600 border-rose-400 text-white shadow-md'
                        : 'bg-slate-950 border-slate-700 text-slate-400'
                    }`}
                  >
                    {option.id}
                  </span>
                  <div className="flex-1 pt-0.5 text-base font-normal">
                    <MathRenderer content={option.text} />
                  </div>
                  {isCorrectAnswer && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-1" />}
                  {isUserWrongSelection && <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Multi-Select MCQ */}
        {question.type === 'multi_select' && question.options && (
          <div className="grid grid-cols-1 gap-3">
            <p className="text-xs text-indigo-400 uppercase font-bold tracking-wider mb-1">
              Select all options that apply:
            </p>
            {question.options.map((option) => {
              const isChecked = selectedMultiOptions.includes(option.id);
              return (
                <button
                  key={option.id}
                  disabled={isSubmitted}
                  onClick={() => handleToggleMulti(option.id)}
                  className={`w-full text-left p-4.5 rounded-2xl border transition-all flex items-start gap-4 ${
                    isChecked
                      ? 'border-indigo-500 bg-indigo-950/50 text-white ring-2 ring-indigo-500'
                      : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center ${
                      isChecked ? 'bg-indigo-600 border-indigo-400' : 'border-slate-600 bg-slate-950'
                    }`}
                  >
                    {isChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 text-base">
                    <span className="font-bold mr-2 text-slate-400">{option.id}.</span>
                    <MathRenderer content={option.text} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Numeric / TITA Input */}
        {question.type === 'numeric' && (
          <div className="bg-[#090D16] p-6 rounded-2xl border border-slate-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Type In The Numerical Value:
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <input
                type="number"
                step="any"
                disabled={isSubmitted}
                value={numericInput}
                onChange={(e) => setNumericInput(e.target.value)}
                placeholder="Enter calculated number..."
                className="w-full sm:w-80 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {isSubmitted && (
                <div className="text-base font-semibold">
                  {attempt?.isCorrect ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-5 h-5" /> Correct Answer: {question.answerKey}
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1.5">
                      <XCircle className="w-5 h-5" /> Correct Key: {question.answerKey}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subjective Caselet */}
        {question.type === 'subjective' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                State your decision, business trade-offs & justification:
              </label>
              <span className="text-xs text-slate-400 font-mono">
                {subjectiveInput.trim().split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              rows={5}
              disabled={isSubmitted}
              value={subjectiveInput}
              onChange={(e) => setSubjectiveInput(e.target.value)}
              placeholder="Structure your choice: 1) Core decision, 2) Trade-offs evaluated, 3) Unit economics & feasibility..."
              className="w-full p-4.5 rounded-2xl bg-[#090D16] border border-slate-800 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed"
            />
          </div>
        )}
      </div>

      {/* Action Bar */}
      {!isSubmitted ? (
        <div className="flex items-center justify-between pt-5 border-t border-slate-800">
          <button
            onClick={() => onAskLeo(question)}
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-800/80 transition-colors border border-indigo-500/20"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Need a hint? Ask Leo</span>
          </button>

          <button
            onClick={handlePrimarySubmit}
            disabled={isEvaluatingSubjective}
            className="px-7 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold shadow-lg shadow-indigo-950 transition-all flex items-center gap-2 disabled:opacity-50 text-sm"
          >
            {isEvaluatingSubjective ? (
              <span>Leo is evaluating...</span>
            ) : (
              <span>Submit Answer</span>
            )}
          </button>
        </div>
      ) : (
        /* Mistake Tagging & Verified Solution Section */
        <div className="pt-5 border-t border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#090D16] p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Diagnostic Tag:
              </span>
              {attempt?.isCorrect ? (
                <span className="text-xs text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-800">
                  Concept Mastered ✓
                </span>
              ) : (
                <span className="text-xs text-rose-400 font-bold bg-rose-950/60 px-2.5 py-1 rounded-md border border-rose-800 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> What caused the error?
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(['concept', 'calculation', 'careless', 'time_pressure', 'guessed'] as MistakeTag[]).map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleMistakeTagChange(tag)}
                  className={`text-xs px-3 py-1.5 rounded-lg capitalize font-semibold transition-all border ${
                    selectedMistakeTag === tag
                      ? 'bg-rose-600 border-rose-400 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {tag.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => onAskLeo(question)}
              className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-semibold px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Discuss traps with Leo</span>
            </button>

            <button
              onClick={() => setShowSolution(!showSolution)}
              className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white font-semibold px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <span>{showSolution ? 'Hide Solution' : 'View Verified Solution'}</span>
              {showSolution ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showSolution && (
            <div className="mt-4 p-6 rounded-2xl bg-[#090D16] border border-slate-800 text-slate-200 text-sm leading-relaxed space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-bold text-emerald-400 flex items-center gap-2 text-base">
                  <CheckCircle2 className="w-5 h-5" /> Step-by-Step Proof & Logic
                </span>
                {question.verificationMetadata && (
                  <span className="text-xs text-slate-400 font-mono">
                    Audit: Quality {question.verificationMetadata.qualityScore}/10 · Rigor {question.verificationMetadata.hardnessScore}/10
                  </span>
                )}
              </div>
              <div className="pt-2 text-slate-100 text-base">
                <MathRenderer content={question.solution} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
