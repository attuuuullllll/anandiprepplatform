import { Question, TestSession, UserAttempt, UserMemoryProfile, ExamSection, MistakeTag } from '@/types';
import { supabase, isSupabaseConfigured } from './supabase';

const MEMORY_STORAGE_KEY = 'leo_user_memory_v1';
const SESSIONS_STORAGE_KEY = 'leo_test_sessions_v1';
const QUESTIONS_CACHE_KEY = 'leo_questions_cache_v1';
const API_KEY_STORAGE_KEY = 'leo_openrouter_api_key';

export const INITIAL_MEMORY_PROFILE: UserMemoryProfile = {
  targetExam: "Anandi-NEAT 2026",
  streakDays: 1,
  totalQuestionsAttempted: 0,
  overallAccuracy: 0,
  sectionProficiency: {
    quant: { attempted: 0, accuracy: 0, avgPaceSeconds: 0, weakSubtopics: [], strongSubtopics: [] },
    logic: { attempted: 0, accuracy: 0, avgPaceSeconds: 0, weakSubtopics: [], strongSubtopics: [] },
    verbal_di: { attempted: 0, accuracy: 0, avgPaceSeconds: 0, weakSubtopics: [], strongSubtopics: [] },
    general_awareness: { attempted: 0, accuracy: 0, avgPaceSeconds: 0, weakSubtopics: [], strongSubtopics: [] },
    business_judgement: { attempted: 0, accuracy: 0, avgPaceSeconds: 0, weakSubtopics: [], strongSubtopics: [] },
  },
  mistakeDistribution: {
    concept: 0,
    calculation: 0,
    careless: 0,
    time_pressure: 0,
    guessed: 0,
    none: 0,
  },
  spacedReviewQueue: [],
};

export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
}

export function saveStoredApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
}

let currentUserId = 'default_user';

export function setActiveUserId(id: string) {
  currentUserId = id || 'default_user';
}

export function getActiveUserId(): string {
  return currentUserId;
}

export function getUserMemory(): UserMemoryProfile {
  if (typeof window === 'undefined') return INITIAL_MEMORY_PROFILE;
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    const profile: UserMemoryProfile = raw ? { ...INITIAL_MEMORY_PROFILE, ...JSON.parse(raw) } : { ...INITIAL_MEMORY_PROFILE };
    
    // Automatic day streak tracking
    const todayStr = new Date().toISOString().split('T')[0];
    if (!profile.lastActiveDate) {
      profile.lastActiveDate = todayStr;
      profile.streakDays = Math.max(1, profile.streakDays || 1);
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(profile));
    } else if (profile.lastActiveDate !== todayStr) {
      const last = new Date(profile.lastActiveDate);
      const curr = new Date(todayStr);
      const diffDays = Math.round((curr.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // Consecutive day
        profile.streakDays = (profile.streakDays || 1) + 1;
      } else if (diffDays > 1) {
        // Broken streak, reset to 1
        profile.streakDays = 1;
      }
      profile.lastActiveDate = todayStr;
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(profile));
    }

    return profile;
  } catch (err) {
    return INITIAL_MEMORY_PROFILE;
  }
}

export async function loadUserMemoryFromCloud(userId: string): Promise<UserMemoryProfile | null> {
  if (!isSupabaseConfigured || !supabase || !userId) return null;
  try {
    const base = getUserMemory();

    // 1. Fetch user_memory
    const { data: memoryData } = await supabase
      .from('user_memory')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (memoryData) {
      if (memoryData.mistake_distribution) {
        base.mistakeDistribution = { ...base.mistakeDistribution, ...memoryData.mistake_distribution };
      }
      if (memoryData.spaced_review_queue) {
        base.spacedReviewQueue = memoryData.spaced_review_queue;
      }
    }

    // 2. Fetch profiles table for streak_days
    const { data: profileData } = await supabase
      .from('profiles')
      .select('streak_days')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileData?.streak_days) {
      base.streakDays = Math.max(base.streakDays, profileData.streak_days);
    }

    saveUserMemory(base);
    return base;
  } catch (err) {
    console.error('Failed to load memory from cloud:', err);
    return null;
  }
}

export function saveUserMemory(profile: UserMemoryProfile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(profile));
  
  if (isSupabaseConfigured && supabase) {
    (async () => {
      try {
        const uid = getActiveUserId();
        // Upsert user_memory
        await supabase.from('user_memory').upsert({
          user_id: uid,
          weak_subtopics: Object.values(profile.sectionProficiency).flatMap(s => s.weakSubtopics),
          strong_subtopics: Object.values(profile.sectionProficiency).flatMap(s => s.strongSubtopics),
          mistake_distribution: profile.mistakeDistribution,
          spaced_review_queue: profile.spacedReviewQueue,
          updated_at: new Date().toISOString()
        });

        // Upsert profiles for streak
        await supabase.from('profiles').upsert({
          user_id: uid,
          target_exam: 'Anandi-NEAT 2026',
          streak_days: profile.streakDays || 1,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Supabase user_memory/profile upsert error:', err);
      }
    })();
  }
}

export function recordAttemptAndUpdateMemory(
  session: TestSession,
  attempt: UserAttempt,
  question: Question
): UserMemoryProfile {
  const memory = getUserMemory();
  
  memory.totalQuestionsAttempted += 1;
  const section = question.section;
  const secProf = memory.sectionProficiency[section];

  // Update section metrics
  const prevAttempts = secProf.attempted;
  const prevCorrect = Math.round((secProf.accuracy / 100) * prevAttempts);
  const newAttempts = prevAttempts + 1;
  const newCorrect = prevCorrect + (attempt.isCorrect ? 1 : 0);
  
  secProf.attempted = newAttempts;
  secProf.accuracy = Math.round((newCorrect / newAttempts) * 100);
  secProf.avgPaceSeconds = Math.round(
    ((secProf.avgPaceSeconds * prevAttempts) + attempt.timeSpentSeconds) / newAttempts
  );

  // Track subtopics
  if (!attempt.isCorrect) {
    if (!secProf.weakSubtopics.includes(question.subtopic)) {
      secProf.weakSubtopics.push(question.subtopic);
    }
  } else {
    // If mastered, remove from weak and add to strong
    secProf.weakSubtopics = secProf.weakSubtopics.filter(s => s !== question.subtopic);
    if (!secProf.strongSubtopics.includes(question.subtopic)) {
      secProf.strongSubtopics.push(question.subtopic);
    }
  }

  // Update overall accuracy
  let totalCorrect = 0;
  for (const s of Object.values(memory.sectionProficiency)) {
    totalCorrect += Math.round((s.accuracy / 100) * s.attempted);
  }
  memory.overallAccuracy = memory.totalQuestionsAttempted > 0
    ? Math.round((totalCorrect / memory.totalQuestionsAttempted) * 100)
    : 0;

  // Track mistake tags
  const tag: MistakeTag = attempt.mistakeTag || (attempt.isCorrect ? 'none' : 'concept');
  memory.mistakeDistribution[tag] = (memory.mistakeDistribution[tag] || 0) + 1;

  // Spaced review queue
  if (!attempt.isCorrect) {
    const existing = memory.spacedReviewQueue.find(q => q.questionId === question.id);
    if (!existing) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      memory.spacedReviewQueue.push({
        questionId: question.id,
        nextReviewDate: tomorrow.toISOString(),
        intervalDays: 1,
      });
    }
  }

  saveUserMemory(memory);

  // Sync attempt to Supabase user_attempts
  if (isSupabaseConfigured && supabase) {
    (async () => {
      try {
        await supabase.from('user_attempts').insert({
          user_id: getActiveUserId(),
          question_id: question.id,
          session_id: session.id,
          user_answer: attempt.userAnswer,
          is_correct: attempt.isCorrect,
          time_spent_seconds: attempt.timeSpentSeconds,
          mistake_tag: attempt.mistakeTag || null,
        });
      } catch (err) {
        console.error('Supabase user_attempts insert error:', err);
      }
    })();
  }

  return memory;
}

export function saveCompletedSession(session: TestSession): void {
  if (typeof window === 'undefined') return;
  try {
    const existingRaw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    const sessions: TestSession[] = existingRaw ? JSON.parse(existingRaw) : [];
    sessions.unshift(session);
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.slice(0, 50)));

    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          await supabase.from('test_sessions').insert({
            id: session.id,
            user_id: getActiveUserId(),
            title: session.title,
            section: session.section,
            is_full_mock: session.isFullMock,
            total_questions: session.totalQuestions,
            time_limit_seconds: session.timeLimitSeconds,
            score: session.score,
            accuracy_rate: session.accuracyRate,
            avg_pace_seconds: session.avgPaceSeconds,
            started_at: session.startedAt,
            completed_at: session.completedAt,
          });
        } catch (err) {
          console.error('Supabase test_sessions insert error:', err);
        }
      })();
    }
  } catch (err) {
    console.error('Error saving session:', err);
  }
}

export function getSavedSessions(): TestSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export interface SubtopicDiagnostic {
  subtopic: string;
  section: ExamSection;
  totalAttempted: number;
  totalCorrect: number;
  accuracy: number; // 0 - 100%
  avgPaceSeconds: number;
  failedQuestions: Question[];
  estimatedMarksLost: number; // Empirical lost marks based on Anandi-NEAT 2026 marking scheme (+1, -0.25)
}

export interface DiagnosticOverview {
  totalQuestionsAttempted: number;
  overallAccuracy: number;
  subtopics: SubtopicDiagnostic[];
  totalEstimatedMarksLost: number;
  weakestSubtopics: SubtopicDiagnostic[];
  masteredSubtopics: SubtopicDiagnostic[];
}

/**
 * Extracts empirical subtopic diagnostics strictly from the user's actual test session attempts.
 * Zero guesswork or simulated data: every metric is grounded in actual question results.
 */
export function getEmpiricalDiagnostics(): DiagnosticOverview {
  const sessions = getSavedSessions();
  const subtopicMap = new Map<string, {
    subtopic: string;
    section: ExamSection;
    attempts: number;
    correct: number;
    totalTime: number;
    failedQuestionsMap: Map<string, Question>;
  }>();

  let totalQuestions = 0;
  let totalCorrect = 0;

  for (const session of sessions) {
    if (!session.attempts || !session.questions) continue;
    const qMap = new Map<string, Question>();
    session.questions.forEach(q => qMap.set(q.id, q));

    for (const [qId, attempt] of Object.entries(session.attempts)) {
      const q = qMap.get(qId);
      if (!q) continue;

      totalQuestions += 1;
      if (attempt.isCorrect) totalCorrect += 1;

      const key = `${q.section}:::${q.subtopic}`;
      let entry = subtopicMap.get(key);
      if (!entry) {
        entry = {
          subtopic: q.subtopic,
          section: q.section,
          attempts: 0,
          correct: 0,
          totalTime: 0,
          failedQuestionsMap: new Map(),
        };
        subtopicMap.set(key, entry);
      }

      entry.attempts += 1;
      entry.totalTime += (attempt.timeSpentSeconds || 0);

      if (attempt.isCorrect) {
        entry.correct += 1;
        // If mastered in a later attempt, remove from failed map
        entry.failedQuestionsMap.delete(q.id);
      } else {
        entry.failedQuestionsMap.set(q.id, q);
      }
    }
  }

  const subtopics: SubtopicDiagnostic[] = [];
  let totalLostMarks = 0;

  for (const entry of Array.from(subtopicMap.values())) {
    if (entry.attempts === 0) continue;
    const acc = Math.round((entry.correct / entry.attempts) * 100);
    const avgPace = Math.round(entry.totalTime / entry.attempts);
    
    // Anandi-NEAT 2026: ~5 questions per major subtopic in 120-Q exam.
    // Marking scheme: +1.0 for correct, -0.25 for incorrect penalty.
    // Lost marks formula: 5.0 * (1 - acc/100) * 1.25
    const marksLost = Number(Math.max(0, 5.0 * (1 - acc / 100) * 1.25).toFixed(1));
    totalLostMarks += marksLost;

    subtopics.push({
      subtopic: entry.subtopic,
      section: entry.section,
      totalAttempted: entry.attempts,
      totalCorrect: entry.correct,
      accuracy: acc,
      avgPaceSeconds: avgPace,
      failedQuestions: Array.from(entry.failedQuestionsMap.values()),
      estimatedMarksLost: marksLost,
    });
  }

  // Sort subtopics by lowest accuracy first (most critical weak spots)
  subtopics.sort((a, b) => a.accuracy - b.accuracy || b.totalAttempted - a.totalAttempted);

  const weakestSubtopics = subtopics.filter(s => s.accuracy < 70);
  const masteredSubtopics = subtopics.filter(s => s.accuracy >= 70);

  return {
    totalQuestionsAttempted: totalQuestions,
    overallAccuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    subtopics,
    totalEstimatedMarksLost: Number(totalLostMarks.toFixed(1)),
    weakestSubtopics,
    masteredSubtopics,
  };
}

export function cacheQuestions(newQuestions: Question[]): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(QUESTIONS_CACHE_KEY);
    const existing: Question[] = raw ? JSON.parse(raw) : [];
    const map = new Map<string, Question>();
    existing.forEach(q => map.set(q.id, q));
    newQuestions.forEach(q => map.set(q.id, q));
    localStorage.setItem(QUESTIONS_CACHE_KEY, JSON.stringify(Array.from(map.values())));

    if (isSupabaseConfigured && supabase) {
      (async () => {
        try {
          await supabase.from('questions').upsert(
            newQuestions.map(q => ({
              id: q.id,
              section: q.section,
              subtopic: q.subtopic,
              difficulty: q.difficulty,
              type: q.type,
              prompt: q.prompt,
              options: q.options,
              answer_key: q.answerKey,
              numeric_tolerance: q.numericTolerance,
              solution: q.solution,
              rubric: q.rubric,
              expected_pace_seconds: q.expectedPaceSeconds,
              verification_metadata: q.verificationMetadata,
            }))
          );
        } catch (err) {
          console.error('Supabase questions upsert error:', err);
        }
      })();
    }
  } catch (err) {
    console.error('Error caching questions:', err);
  }
}

export function getCachedQuestions(): Question[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUESTIONS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function resetUserMemory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MEMORY_STORAGE_KEY);
  localStorage.removeItem(SESSIONS_STORAGE_KEY);
  localStorage.removeItem(QUESTIONS_CACHE_KEY);
}
