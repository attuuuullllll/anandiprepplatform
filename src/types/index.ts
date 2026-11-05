export type ExamSection = 
  | 'quant'
  | 'logic'
  | 'verbal_di'
  | 'general_awareness'
  | 'business_judgement';

export type QuestionType = 
  | 'mcq'
  | 'multi_select'
  | 'numeric'
  | 'subjective';

export type MistakeTag = 
  | 'concept'
  | 'calculation'
  | 'careless'
  | 'time_pressure'
  | 'guessed'
  | 'none';

export interface QuestionOption {
  id: string; // e.g. "A", "B", "C", "D"
  text: string;
}

export interface SubjectiveRubric {
  commercialAcumen: string; // Evaluation for business logic / trade-offs
  analyticalRigor: string;  // Multi-step reasoning check
  clarityAndDirectness: string; // Brevity and structure
  maxScore: number; // e.g., 5
}

export interface Question {
  id: string;
  section: ExamSection;
  subtopic: string;
  difficulty: 1 | 2 | 3 | 4 | 5; // 3 to 5 are standard Anandi level
  type: QuestionType;
  prompt: string;
  options?: QuestionOption[]; // for mcq & multi_select
  answerKey: string | string[] | number; // option id(s), exact number, or model answer
  numericTolerance?: number; // for numeric e.g. +/- 0.05
  solution: string; // Complete step-by-step mathematical or logical explanation
  rubric?: SubjectiveRubric; // for subjective
  expectedPaceSeconds: number; // e.g. 90s for quant, 120s for business judgement
  source: 'ai_generated_verified' | 'curated_anandi';
  verificationMetadata?: {
    verifierModel: string;
    blindSolvedCorrectly: boolean;
    qualityScore: number; // 1-10
    hardnessScore: number; // 1-10
    auditorNotes: string;
  };
}

export interface UserAttempt {
  questionId: string;
  userAnswer: string | string[] | number;
  isCorrect: boolean;
  scoreEarned?: number; // 0-5 for subjective, 0 or 1 for objective
  timeSpentSeconds: number;
  mistakeTag?: MistakeTag;
  evalFeedback?: string; // Leo AI evaluation for subjective answers
  timestamp: string;
}

export interface TestSession {
  id: string;
  title: string;
  section?: ExamSection;
  isFullMock: boolean;
  totalQuestions: number;
  timeLimitSeconds: number; // e.g. 7200 for 2-hour mock, 1200 for sectional
  questions: Question[];
  attempts: Record<string, UserAttempt>;
  startedAt: string;
  completedAt?: string;
  score: number;
  accuracyRate: number;
  avgPaceSeconds: number;
}

export interface UserMemoryProfile {
  targetExam: "Anandi-NEAT 2026";
  streakDays: number;
  lastActiveDate?: string;
  totalQuestionsAttempted: number;
  overallAccuracy: number;
  sectionProficiency: Record<ExamSection, {
    attempted: number;
    accuracy: number;
    avgPaceSeconds: number;
    weakSubtopics: string[];
    strongSubtopics: string[];
  }>;
  mistakeDistribution: Record<MistakeTag, number>;
  spacedReviewQueue: {
    questionId: string;
    nextReviewDate: string;
    intervalDays: number;
  }[];
}
