'use client';

import React, { useState, useEffect } from 'react';
import { ExamSection, Question, UserMemoryProfile } from '@/types';
import { DashboardView } from '@/components/DashboardView';
import { ZenExamRunner } from '@/components/ZenExamRunner';
import { LeoChatModal } from '@/components/LeoChatModal';
import { SettingsModal } from '@/components/SettingsModal';
import { AuthModal } from '@/components/AuthModal';
import { supabase } from '@/lib/supabase';
import { 
  getUserMemory, 
  getStoredApiKey, 
  cacheQuestions, 
  INITIAL_MEMORY_PROFILE,
  setActiveUserId,
  loadUserMemoryFromCloud
} from '@/lib/storage';
import { 
  CURATED_ANANDI_QUANT_QUESTIONS, 
  getCuratedQuestionsForSection, 
  getCuratedFullMockSet,
  getCuratedMiniStarterSet
} from '@/lib/curated-questions';
import { WeaknessDiagnosticHub } from '@/components/WeaknessDiagnosticHub';
import { GenerateAIModal, AIExamMode } from '@/components/GenerateAIModal';
import { SubtopicDiagnostic } from '@/lib/storage';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [memory, setMemory] = useState<UserMemoryProfile>(INITIAL_MEMORY_PROFILE);
  const [activeScreen, setActiveScreen] = useState<'workspace' | 'test' | 'generating' | 'diagnostics'>('workspace');
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [sessionTitle, setSessionTitle] = useState('Anandi Practice Sprint');
  const [sessionSection, setSessionSection] = useState<ExamSection | undefined>(undefined);
  const [isFullMock, setIsFullMock] = useState(false);
  const [sessionTimeLimit, setSessionTimeLimit] = useState(7200);

  const [isLeoOpen, setIsLeoOpen] = useState(false);
  const [leoContextQuestion, setLeoContextQuestion] = useState<Question | undefined>(undefined);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [modalTargetSection, setModalTargetSection] = useState<ExamSection | 'all'>('all');
  const [user, setUser] = useState<any>(null);
  const [generatingStatus, setGeneratingStatus] = useState('');

  useEffect(() => {
    setIsMounted(true);
    setMemory(getUserMemory());

    // Check active Supabase Auth Session
    if (supabase) {
      // Sync profile safely to Supabase
      const syncProfile = async (u: any) => {
        if (!u || !supabase) return;
        try {
          await supabase.from('profiles').upsert(
            {
              user_id: u.id,
              target_exam: 'Anandi-NEAT 2026',
              streak_days: 1,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
        } catch (err) {
          console.error('Failed to sync profile:', err);
        }
      };

      // 1. Detect OAuth PKCE redirect code (?code=...)
      if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        if (code) {
          supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
            if (!error && data?.session?.user) {
              setUser(data.session.user);
              setActiveUserId(data.session.user.id);
              syncProfile(data.session.user);
              loadUserMemoryFromCloud(data.session.user.id).then((cloudMem) => {
                if (cloudMem) setMemory(cloudMem);
              });
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }).catch(console.error);
        }
      }

      // 2. Check active Supabase Auth Session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          setActiveUserId(session.user.id);
          syncProfile(session.user);
          loadUserMemoryFromCloud(session.user.id).then((cloudMem) => {
            if (cloudMem) setMemory(cloudMem);
          });
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          setActiveUserId(session.user.id);
          syncProfile(session.user);
          const cloudMem = await loadUserMemoryFromCloud(session.user.id);
          if (cloudMem) setMemory(cloudMem);
        } else {
          setUser(null);
          setActiveUserId('default_user');
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    }

    // ⌘K global listener to open Leo AI Socratic mentor
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsLeoOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
      setActiveUserId('default_user');
      setMemory(getUserMemory());
    }
  };

  const handleConfigureAndGenerateAI = async (config: {
    section?: ExamSection;
    subtopic?: string;
    mode: AIExamMode;
    difficulty: 3 | 4 | 5;
  }) => {
    setIsAIModalOpen(false);

    // 1. Full 2-Hour Mock Simulation Mode
    if (config.mode === 'full_mock_120') {
      setActiveScreen('generating');
      setGeneratingStatus('DeepSeek-V3 assembling verified 120-Question 2-Hour Mock across all 5 Anandi domains...');
      setTimeout(() => {
        const mockSet = getCuratedFullMockSet();
        setCurrentQuestions(mockSet);
        setSessionTitle('Full 2-Hour Anandi-NEAT Mock Simulation (5 Domains)');
        setSessionSection(undefined);
        setIsFullMock(true);
        setSessionTimeLimit(7200); // 120 mins
        setActiveScreen('test');
      }, 1000);
      return;
    }

    // 2. Targeted Section / Subtopic / 5-Q / 10-Q Mode
    const sec: ExamSection = config.section || 'quant';
    const weakSubs = memory.sectionProficiency[sec]?.weakSubtopics || [];
    const sub = config.subtopic || (weakSubs.length > 0 ? weakSubs[0] : undefined);
    const count = config.mode === 'deep_10' ? 10 : 5;

    setActiveScreen('generating');
    setGeneratingStatus(`DeepSeek-V3 generating fresh verified question for ${sub || sec}...`);

    try {
      const response = await fetch('/api/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: sec,
          subtopic: sub,
          difficulty: config.difficulty || 4,
          apiKey: getStoredApiKey(),
        }),
      });

      let aiQuestion: Question | null = null;
      if (response.ok) {
        const data = await response.json();
        aiQuestion = data.question;

        // Persist to Supabase questions cloud bank
        if (supabase && aiQuestion) {
          try {
            await supabase.from('questions').upsert({
              id: aiQuestion.id,
              section: aiQuestion.section,
              subtopic: aiQuestion.subtopic,
              difficulty: aiQuestion.difficulty,
              type: aiQuestion.type,
              prompt: aiQuestion.prompt,
              options: aiQuestion.options,
              answer_key: aiQuestion.answerKey,
              numeric_tolerance: aiQuestion.numericTolerance,
              solution: aiQuestion.solution,
              rubric: aiQuestion.rubric,
              expected_pace_seconds: aiQuestion.expectedPaceSeconds,
              verification_metadata: aiQuestion.verificationMetadata,
            });
          } catch (dbErr) {
            console.error('Failed to store generated question to Supabase:', dbErr);
          }
        }
      }

      const companion = getCuratedQuestionsForSection(sec, aiQuestion ? count - 1 : count, sub ? [sub] : weakSubs);
      const sessionQuestions = aiQuestion ? [aiQuestion, ...companion] : companion;

      setCurrentQuestions(sessionQuestions);
      setSessionTitle(
        sub 
          ? `⚡ Targeted Drill · ${sub}`
          : config.section
          ? `⚡ AI Generated Set · ${sec}`
          : `⚡ Balanced 5-Question AI Sprint`
      );
      setSessionSection(config.section);
      setIsFullMock(false);
      setSessionTimeLimit(sessionQuestions.length * 150); // 2.5 mins per question
      setActiveScreen('test');
    } catch (err: any) {
      console.error('Live AI generation failed:', err);
      handleStartSession(config.section, false);
    }
  };

  const handleStartSession = async (section?: ExamSection, fullMock: boolean = false) => {
    setIsFullMock(fullMock);
    setSessionSection(section);

    if (fullMock) {
      let cloudQuestions: Question[] = [];
      if (supabase) {
        try {
          const { data } = await supabase
            .from('questions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
          
          if (data && data.length > 0) {
            cloudQuestions = data.map((q: any) => ({
              id: q.id,
              section: q.section,
              subtopic: q.subtopic,
              difficulty: q.difficulty,
              type: q.type,
              prompt: q.prompt,
              options: q.options,
              answerKey: q.answer_key,
              numericTolerance: q.numeric_tolerance,
              solution: q.solution,
              rubric: q.rubric,
              expectedPaceSeconds: q.expected_pace_seconds || 90,
              source: 'ai_generated_verified' as const,
              verificationMetadata: q.verification_metadata,
            }));
          }
        } catch (e) {
          console.error('Error fetching mock questions from Supabase:', e);
        }
      }

      setSessionTitle('Full 2-Hour Anandi-NEAT Mock Simulation (5 Domains)');
      setSessionTimeLimit(7200); // 2 hours (120 mins)
      const mockSet = getCuratedFullMockSet();
      const combinedMock = [...cloudQuestions];
      for (const mq of mockSet) {
        if (!combinedMock.some(c => c.id === mq.id)) {
          combinedMock.push(mq);
        }
      }

      setCurrentQuestions(combinedMock);
      setActiveScreen('test');
      return;
    }

    if (section) {
      const sectionLabels: Record<ExamSection, string> = {
        quant: 'Quantitative Reasoning',
        logic: 'Logical Reasoning & Puzzles',
        verbal_di: 'DI & Reading Comprehension',
        general_awareness: 'General Awareness & Startups',
        business_judgement: 'Business Judgement & Decision Making',
      };

      const weakSubs = memory.sectionProficiency[section]?.weakSubtopics || [];
      
      // Load newest live AI questions from Supabase for THIS section
      let cloudQuestions: Question[] = [];
      if (supabase) {
        try {
          const { data } = await supabase
            .from('questions')
            .select('*')
            .eq('section', section)
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (data && data.length > 0) {
            cloudQuestions = data.map((q: any) => ({
              id: q.id,
              section: q.section,
              subtopic: q.subtopic,
              difficulty: q.difficulty,
              type: q.type,
              prompt: q.prompt,
              options: q.options,
              answerKey: q.answer_key,
              numericTolerance: q.numeric_tolerance,
              solution: q.solution,
              rubric: q.rubric,
              expectedPaceSeconds: q.expected_pace_seconds || 90,
              source: 'ai_generated_verified' as const,
              verificationMetadata: q.verification_metadata,
            }));
          }
        } catch (e) {
          console.error(`Error fetching ${section} questions from Supabase:`, e);
        }
      }

      const curated = getCuratedQuestionsForSection(section, Math.max(1, 5 - cloudQuestions.length), weakSubs);
      const combinedQuestions = [...cloudQuestions, ...curated];

      const isWeakFocus = weakSubs.length > 0;
      setSessionTitle(
        isWeakFocus 
          ? `${sectionLabels[section]} · Weak Subtopics Targeted Drill`
          : `${sectionLabels[section]} · Practice Sprint`
      );
      setSessionTimeLimit(900); // 15 mins
      setCurrentQuestions(combinedQuestions.slice(0, 5));
      setActiveScreen('test');
      return;
    }

    // 5-Question Starter Sprint: Pull fresh questions from Supabase Cloud Bank first!
    let cloudQuestions: Question[] = [];
    if (supabase) {
      try {
        const { data } = await supabase
          .from('questions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (data && data.length > 0) {
          cloudQuestions = data.map((q: any) => ({
            id: q.id,
            section: q.section,
            subtopic: q.subtopic,
            difficulty: q.difficulty,
            type: q.type,
            prompt: q.prompt,
            options: q.options,
            answerKey: q.answer_key,
            numericTolerance: q.numeric_tolerance,
            solution: q.solution,
            rubric: q.rubric,
            expectedPaceSeconds: q.expected_pace_seconds || 90,
            source: 'ai_generated_verified' as const,
            verificationMetadata: q.verification_metadata,
          }));
        }
      } catch (err) {
        console.error('Error fetching starter questions from Supabase:', err);
      }
    }

    const starterSet = getCuratedMiniStarterSet();
    const combinedStarter = [...cloudQuestions];
    for (const sq of starterSet) {
      if (combinedStarter.length >= 5) break;
      if (!combinedStarter.some(c => c.id === sq.id)) {
        combinedStarter.push(sq);
      }
    }

    setSessionTitle(
      cloudQuestions.length > 0 
        ? '5-Question Sprint (Live Cloud Bank)' 
        : '5-Question Diagnostic Sprint (All 5 Domains)'
    );
    setSessionTimeLimit(600);
    setCurrentQuestions(combinedStarter.slice(0, 5));
    setActiveScreen('test');
  };

  const handleAskLeo = (question?: Question) => {
    setLeoContextQuestion(question);
    setIsLeoOpen(true);
  };

  const handleStartSurgeryDrill = (diagnostic: SubtopicDiagnostic) => {
    // 1. Gather user's actual failed questions from past test attempts in this subtopic
    const failed = diagnostic.failedQuestions || [];
    
    // 2. Fetch companion questions from this section to create a focused 3-question drill
    const companion = getCuratedQuestionsForSection(diagnostic.section, 3, [diagnostic.subtopic])
      .filter(q => !failed.some(f => f.id === q.id));

    // Combine: user's actual past mistake first, followed by companion questions
    const surgerySet = [...failed, ...companion].slice(0, 3);

    setCurrentQuestions(surgerySet);
    setSessionTitle(`🎯 Weak-Spot Surgery · ${diagnostic.subtopic}`);
    setSessionSection(diagnostic.section);
    setIsFullMock(false);
    setSessionTimeLimit(surgerySet.length * 180); // 3 mins per question
    setActiveScreen('test');
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-700 font-mono text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Starting Leo AI...</span>
        </div>
      </div>
    );
  }

  // Active Screen: Test Session
  if (activeScreen === 'test') {
    return (
      <ZenExamRunner
        questions={currentQuestions}
        title={sessionTitle}
        section={sessionSection}
        isFullMock={isFullMock}
        timeLimitSeconds={sessionTimeLimit}
        onExit={() => {
          setMemory(getUserMemory());
          setActiveScreen('workspace');
        }}
        onAskLeo={handleAskLeo}
      />
    );
  }

  // Active Screen: Generating
  if (activeScreen === 'generating') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white border border-slate-200 p-10 rounded-2xl max-w-md w-full space-y-6 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Dual-AI Verification Audit
            </h2>
            <p className="text-xs text-slate-500 font-mono leading-relaxed">
              {generatingStatus}
            </p>
          </div>

          <div className="space-y-2 pt-2 text-left text-xs font-mono text-slate-500">
            <div className="flex items-center gap-2.5 text-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>DeepSeek-V3 generator invoked</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>DeepSeek-R1 verifier auditor running</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span>Anandi-NEAT hardness validation</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Screen: Weakness Diagnostic Hub
  if (activeScreen === 'diagnostics') {
    return (
      <WeaknessDiagnosticHub
        onBack={() => setActiveScreen('workspace')}
        onStartSurgeryDrill={handleStartSurgeryDrill}
        onStartStarterSprint={() => handleStartSession(undefined, false)}
        onOpenLeo={() => setIsLeoOpen(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Centered Bounded Instrument Workspace */}
      <main className="flex-1 flex flex-col">
        <DashboardView
          memory={memory}
          user={user}
          onStartSession={handleStartSession}
          onOpenGenerateAIModal={(sec) => {
            setModalTargetSection(sec || 'all');
            setIsAIModalOpen(true);
          }}
          onOpenDiagnostics={() => setActiveScreen('diagnostics')}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenLeo={() => setIsLeoOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onSignOut={handleSignOut}
        />
      </main>

      {/* Unified AI Practice Set Generator Modal */}
      <GenerateAIModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onGenerate={handleConfigureAndGenerateAI}
        initialSection={modalTargetSection}
        weakSubtopics={Object.values(memory.sectionProficiency).flatMap(s => s.weakSubtopics)}
      />

      {/* Socratic Leo Doubt Modal */}
      <LeoChatModal
        isOpen={isLeoOpen}
        onClose={() => setIsLeoOpen(false)}
        activeQuestion={leoContextQuestion}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onKeySaved={() => {
          setMemory(getUserMemory());
        }}
      />

      {/* Supabase Google & Email Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={async (authUser) => {
          setUser(authUser);
          setActiveUserId(authUser.id);
          const cloudMem = await loadUserMemoryFromCloud(authUser.id);
          if (cloudMem) setMemory(cloudMem);
        }}
      />
    </div>
  );
}
