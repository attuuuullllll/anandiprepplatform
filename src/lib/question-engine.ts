import { Question, ExamSection, QuestionType } from '@/types';
import { callOpenRouter, DEFAULT_GENERATOR_MODEL, DEFAULT_VERIFIER_MODEL } from './openrouter';
import { getCuratedQuestionsForSection } from './curated-questions';

const ANANDI_SYLLABUS_GUIDELINES: Record<ExamSection, string> = {
  quant: `Class 10/11 level advanced arithmetic, commercial math (unit economics, margins, discount schemes, inventory turnover), number theory, algebra, geometric intuition, combinations & probability, and rapid estimation.
Questions must NOT be trivial school math. Must be multi-step, testing analytical agility, traps in options, and clean numbers without ugly decimals unless necessary.`,
  logic: `Arrangements (floor, matrix, circular), constraint satisfaction, critical syllogisms, multi-factor blood relations, directional networks, pattern deciphering.
Must require drawing a structured diagram or constraint table. No trivial single-line deductions.`,
  verbal_di: `Caselet Data Interpretation with entrepreneurial tables, speed reading business scenarios, critical reading comprehension, implicit assumption detection, para-jumbles.`,
  general_awareness: `Indian & global startup ecosystem, venture funding, major tech/business models, macroeconomic policy, regulatory milestones, founder insights, brand strategy.`,
  business_judgement: `XAT Decision Making style real-world entrepreneurial dilemmas: pricing trade-offs, founder vs investor conflicts, operational bottlenecks, customer retention vs acquisition costs, product launch trade-offs under severe resource constraints.
Every option must be plausible, but only ONE option demonstrates optimal, pragmatic commercial acumen.`
};

export async function generateQuestionCandidate(
  section: ExamSection,
  subtopic?: string,
  preferredType?: QuestionType,
  targetDifficulty: 3 | 4 | 5 = 4,
  apiKey?: string
): Promise<Partial<Question>> {
  const chosenType = preferredType || (section === 'business_judgement' ? (Math.random() > 0.4 ? 'mcq' : 'subjective') : 'mcq');
  
  const systemPrompt = `You are the Lead Question Designer for the prestigious "Anandi-NEAT" (Nationwide Entrepreneurial Acumen Test) by Bombay Shaving Company.
Your audience: Bright entrepreneurial aspirants.
Exam Philosophy: Tests raw cognitive horsepower, commercial intuition, mathematical clarity, and deep analytical reasoning (similar to IPMAT + XAT Decision Making).

RULES:
1. Difficulty MUST be Level ${targetDifficulty} (out of 5). ABSOLUTELY NO EASY OR 1-STEP TRIVIAL QUESTIONS.
2. Section: ${section.toUpperCase()}
3. Syllabus focus: ${ANANDI_SYLLABUS_GUIDELINES[section]}
4. ${subtopic ? `Specific topic to target: ${subtopic}` : 'Select a high-yield subtopic.'}
5. Question Type: ${chosenType}

Output ONLY valid JSON matching this exact structure:
{
  "subtopic": "string",
  "difficulty": ${targetDifficulty},
  "type": "${chosenType}",
  "prompt": "Clear, rigorous, realistic question text. Use LaTeX ($...$) for math formulas.",
  "options": ${chosenType === 'mcq' || chosenType === 'multi_select' ? '[{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}]' : 'null'},
  "answerKey": "${chosenType === 'mcq' ? 'A' : chosenType === 'numeric' ? '42' : 'Model answer or key'}",
  "numericTolerance": ${chosenType === 'numeric' ? '0.05' : 'null'},
  "solution": "Comprehensive step-by-step proof, formula, or commercial logic explaining why the answer is correct and why common trap answers fail.",
  "rubric": ${chosenType === 'subjective' ? '{"commercialAcumen":"Criteria for business logic","analyticalRigor":"Criteria for structure and depth","clarityAndDirectness":"Criteria for concise rationale","maxScore":5}' : 'null'},
  "expectedPaceSeconds": ${section === 'quant' ? 90 : section === 'business_judgement' ? 120 : 75}
}`;

  const responseText = await callOpenRouter(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate one fresh, original, exam-grade Level ${targetDifficulty} Anandi-NEAT question now.` }
    ],
    apiKey,
    {
      model: DEFAULT_GENERATOR_MODEL,
      temperature: 0.7,
      responseFormat: { type: 'json_object' }
    }
  );

  try {
    const parsed = JSON.parse(responseText);
    return {
      ...parsed,
      section,
    };
  } catch (err) {
    // If json parse failed, try extracting JSON block
    const match = responseText.match(/\{[\s\S]*\}/);
    if (match) {
      return {
        ...JSON.parse(match[0]),
        section,
      };
    }
    throw new Error('Failed to parse question generator output: ' + responseText.slice(0, 100));
  }
}

export interface VerificationResult {
  passed: boolean;
  computedAnswer: string;
  isKeyMatching: boolean;
  hardnessScore: number; // 1-10
  qualityScore: number;  // 1-10
  auditorNotes: string;
  rejectionReasons: string[];
}

export async function verifyQuestionQuality(
  candidate: Partial<Question>,
  apiKey?: string
): Promise<VerificationResult> {
  const isSubjective = candidate.type === 'subjective';

  const verifierPrompt = `You are the Chief Auditor and Exam Controller for Anandi-NEAT.
Your mission: Strictly audit this candidate question. You must REJECT any question that is:
1. Too easy, elementary, or can be solved in 1 trivial step (Hardness must be >= 7/10).
2. Mathematically flawed, ambiguous, or contains poorly stated assumptions.
3. Contains incorrect options or more than one plausible answer when single choice is requested.
4. Lacks Anandi-NEAT's signature entrepreneurial / high-aptitude tone.

Candidate Question for Audit:
Section: ${candidate.section}
Type: ${candidate.type}
Prompt: ${candidate.prompt}
${candidate.options ? `Options:\n` + candidate.options.map(o => `${o.id}: ${o.text}`).join('\n') : ''}

Task:
1. Blindly solve or evaluate the question from scratch first.
2. Determine the exact correct answer.
3. Compare with candidate's stated answer key: "${candidate.answerKey}".
4. Score Hardness (1-10) and Overall Quality (1-10).
5. If Hardness < 7 or Quality < 8 or answers disagree, set passed = false.

Return JSON only:
{
  "blindComputedAnswer": "your independently derived answer",
  "isKeyMatching": true/false,
  "hardnessScore": number (1-10),
  "qualityScore": number (1-10),
  "passed": true/false,
  "auditorNotes": "Detailed audit assessment",
  "rejectionReasons": ["list any flaws, or empty if passed"]
}`;

  const auditResponse = await callOpenRouter(
    [
      { role: 'system', content: verifierPrompt },
      { role: 'user', content: 'Audit this candidate question and provide the strict JSON verdict.' }
    ],
    apiKey,
    {
      model: DEFAULT_VERIFIER_MODEL,
      temperature: 0.1,
      responseFormat: { type: 'json_object' }
    }
  );

  try {
    const audit = JSON.parse(auditResponse);
    const passed = audit.passed && audit.hardnessScore >= 7 && audit.qualityScore >= 8 && (isSubjective || audit.isKeyMatching);
    return {
      passed,
      computedAnswer: audit.blindComputedAnswer,
      isKeyMatching: audit.isKeyMatching,
      hardnessScore: audit.hardnessScore,
      qualityScore: audit.qualityScore,
      auditorNotes: audit.auditorNotes,
      rejectionReasons: audit.rejectionReasons || [],
    };
  } catch (err) {
    const match = auditResponse.match(/\{[\s\S]*\}/);
    if (match) {
      const audit = JSON.parse(match[0]);
      return {
        passed: audit.passed && audit.hardnessScore >= 7,
        computedAnswer: audit.blindComputedAnswer,
        isKeyMatching: audit.isKeyMatching,
        hardnessScore: audit.hardnessScore,
        qualityScore: audit.qualityScore,
        auditorNotes: audit.auditorNotes,
        rejectionReasons: audit.rejectionReasons || [],
      };
    }
    return {
      passed: false,
      computedAnswer: '',
      isKeyMatching: false,
      hardnessScore: 0,
      qualityScore: 0,
      auditorNotes: 'Audit response failed parsing',
      rejectionReasons: ['Verification model response unreadable'],
    };
  }
}

/**
 * End-to-end pipeline: Generates, Audits, and Retries until an exam-grade Question passes!
 */
export async function generateVerifiedAnandiQuestion(
  section: ExamSection,
  subtopic?: string,
  preferredType?: QuestionType,
  targetDifficulty: 3 | 4 | 5 = 4,
  maxRetries = 2,
  apiKey?: string
): Promise<Question> {
  let attempts = 0;
  let lastError = '';

  while (attempts <= maxRetries) {
    attempts++;
    try {
      const candidate = await generateQuestionCandidate(section, subtopic, preferredType, targetDifficulty, apiKey);
      const audit = await verifyQuestionQuality(candidate, apiKey);

      if (audit.passed) {
        return {
          id: `anandi_${section}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          section,
          subtopic: candidate.subtopic || 'General Aptitude',
          difficulty: targetDifficulty,
          type: candidate.type || 'mcq',
          prompt: candidate.prompt!,
          options: candidate.options,
          answerKey: candidate.answerKey!,
          numericTolerance: candidate.numericTolerance,
          solution: candidate.solution || 'Solution validated by verifier.',
          rubric: candidate.rubric,
          expectedPaceSeconds: candidate.expectedPaceSeconds || (section === 'quant' ? 90 : 80),
          source: 'ai_generated_verified',
          verificationMetadata: {
            verifierModel: DEFAULT_VERIFIER_MODEL,
            blindSolvedCorrectly: audit.isKeyMatching,
            qualityScore: audit.qualityScore,
            hardnessScore: audit.hardnessScore,
            auditorNotes: audit.auditorNotes,
          }
        };
      } else {
        lastError = `Audit rejected attempt ${attempts}: ${audit.rejectionReasons.join(', ') || audit.auditorNotes}`;
        console.warn(lastError);
      }
    } catch (err: any) {
      lastError = err.message || 'Generation error';
      console.warn(`Attempt ${attempts} failed:`, err);
    }
  }

  console.warn(`AI generation retries exhausted (${lastError}), serving high-yield curated question for ${section}`);
  const fallbackCurated = getCuratedQuestionsForSection(section, 1)[0];
  if (fallbackCurated) {
    return {
      ...fallbackCurated,
      id: `anandi_${section}_${Date.now()}_fallback`,
    };
  }

  throw new Error(`Failed to generate verified question after ${attempts} attempts. Last error: ${lastError}`);
}
