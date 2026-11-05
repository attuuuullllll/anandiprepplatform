'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Question } from '@/types';
import { getStoredApiKey } from '@/lib/storage';
import { X, Send, Sparkles, Bot, User } from 'lucide-react';
import { MathRenderer } from './MathRenderer';

interface LeoChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeQuestion?: Question;
}

interface ChatMessage {
  id: string;
  sender: 'leo' | 'user';
  text: string;
  timestamp: string;
}

export const LeoChatModal: React.FC<LeoChatModalProps> = ({
  isOpen,
  onClose,
  activeQuestion,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'leo',
      text: "Hey! I'm Leo, your personal AI study coach for the Anandi Fellowship. Whether you want to clear doubts in Math, crack a tricky Logic puzzle, or learn how the November 29 exam works—ask me anything!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = getStoredApiKey();
      const res = await fetch('/api/leo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.sender === 'leo' ? 'assistant' : 'user',
            content: m.text,
          })),
          context: activeQuestion
            ? {
                section: activeQuestion.section,
                subtopic: activeQuestion.subtopic,
                difficulty: activeQuestion.difficulty,
                prompt: activeQuestion.prompt,
                solution: activeQuestion.solution,
              }
            : null,
          apiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reach Leo');
      }

      const leoReply: ChatMessage = {
        id: `leo-${Date.now()}`,
        sender: 'leo',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, leoReply]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'leo',
          text: `⚠️ Backend Error: ${err.message || 'Unable to connect to AI server.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const promptChips = activeQuestion
    ? [
        'Give me a step-1 hint without spoilers',
        'How do I eliminate the common trap option?',
        'What is the speed shortcut here?',
        'Explain the fundamental concept at play',
      ]
    : [
        'What is the Anandi Fellowship exam pattern?',
        'What topics come in Quantitative Reasoning?',
        'How to crack the Business Judgement section?',
        'Tips for 2-hour time management in the test',
      ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Leo AI Panda"
              className="w-9 h-9 rounded-xl object-contain shadow-xs border border-emerald-200/80"
            />
            <div>
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                Leo AI <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Mentor</span>
              </h3>
              <p className="text-xs text-slate-500">Anandi-NEAT Fellow Study Companion</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Context */}
        {activeQuestion && (
          <div className="px-5 py-2.5 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between text-xs text-slate-600">
            <span className="truncate max-w-[320px]">
              Active: <strong className="text-slate-900">{activeQuestion.subtopic}</strong>
            </span>
            <span className="font-mono text-emerald-700 font-semibold">Level {activeQuestion.difficulty}</span>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div key={m.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <img
                    src="/logo.png"
                    alt="Leo AI"
                    className="w-7 h-7 rounded-lg object-contain border border-emerald-200/60 shadow-2xs shrink-0 mt-0.5"
                  />
                )}

                <div
                  className={`max-w-[85%] rounded-xl p-4 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  <MathRenderer content={m.text} />
                  <span
                    className={`block text-[10px] mt-2 font-mono ${
                      isUser ? 'text-white/70 text-right' : 'text-slate-400'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 items-center">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-emerald-700 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Leo is synthesizing Socratic response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2 font-semibold">
            Suggested Mentor Questions:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {promptChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(chip)}
                className="text-xs px-3 py-1 rounded-full bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 shadow-xs transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Leo anything about this problem..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-emerald-600 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xs disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
