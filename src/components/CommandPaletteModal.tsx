'use client';

import React, { useState, useEffect } from 'react';
import { Search, Zap, Play, BookOpen, ShieldAlert, Sparkles, Settings as SettingsIcon, X, ArrowRight } from 'lucide-react';
import { ExamSection } from '@/types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: string, section?: ExamSection) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands = [
    {
      id: 'full_mock',
      title: 'Full 2-Hour Anandi-NEAT Mock Simulation',
      subtitle: 'Timed 7,200s exam simulation across all 5 sections',
      category: 'Exam Simulator',
      icon: Zap,
      action: () => onSelectAction('mock'),
    },
    {
      id: 'quant_sprint',
      title: 'Quantitative Reasoning Sprint (Level 3-5)',
      subtitle: 'Commercial math, unit economics, probability',
      category: 'Modules',
      icon: Play,
      action: () => onSelectAction('practice', 'quant'),
    },
    {
      id: 'logic_sprint',
      title: 'Logic & Inferencing Practice',
      subtitle: 'Matrix arrangements, truth-teller logic puzzles',
      category: 'Modules',
      icon: BookOpen,
      action: () => onSelectAction('practice', 'logic'),
    },
    {
      id: 'di_verbal_sprint',
      title: 'DI & Verbal Reasoning Practice',
      subtitle: 'Business caselets, speed data analysis',
      category: 'Modules',
      icon: BookOpen,
      action: () => onSelectAction('practice', 'verbal_di'),
    },
    {
      id: 'biz_sprint',
      title: 'Business Judgement Decision Rubric',
      subtitle: 'XAT-style entrepreneurial trade-offs',
      category: 'Modules',
      icon: BookOpen,
      action: () => onSelectAction('practice', 'business_judgement'),
    },
    {
      id: 'mistake_vault',
      title: 'Review Mistake Vault Queue',
      subtitle: 'Spaced repetition review of missed questions',
      category: 'Diagnostics',
      icon: ShieldAlert,
      action: () => onSelectAction('vault'),
    },
    {
      id: 'ask_leo',
      title: 'Consult Leo AI Socratic Mentor',
      subtitle: 'Ask about concepts, distractor traps, or speed shortcuts',
      category: 'Mentor',
      icon: Sparkles,
      action: () => onSelectAction('leo'),
    },
    {
      id: 'settings',
      title: 'Platform Settings & API Keys',
      subtitle: 'OpenRouter credentials & Supabase cloud sync',
      category: 'System',
      icon: SettingsIcon,
      action: () => onSelectAction('settings'),
    },
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.subtitle.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl bg-[#0F1117] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-white/[0.07] flex items-center gap-3 bg-[#0F1117]">
          <Search className="w-4 h-4 text-[#8E95A5]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search syllabus..."
            className="flex-1 bg-transparent text-sm text-white placeholder-[#4B5264] outline-none"
          />
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-[#8E95A5] border border-white/[0.06]">
            ESC
          </span>
        </div>

        {/* Command List */}
        <div className="p-2 max-h-80 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8E95A5] font-mono">
              No matching actions found.
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-white/[0.04] flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[#8E95A5] group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4 text-[#10B981]" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white tracking-tight flex items-center gap-2">
                        <span>{item.title}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.04] text-[#8E95A5]">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8E95A5] mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#4B5264] group-hover:text-white transition-colors" />
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.06] bg-[#07080B] flex items-center justify-between text-[11px] font-mono text-[#4B5264]">
          <span>Navigation: ↑ ↓ Enter</span>
          <span>Leo AI Command Bar</span>
        </div>
      </div>
    </div>
  );
};
