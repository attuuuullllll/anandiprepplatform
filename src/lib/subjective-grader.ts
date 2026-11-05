import { Question, SubjectiveRubric } from '@/types';
import { callOpenRouter, DEFAULT_VERIFIER_MODEL } from './openrouter';

export interface SubjectiveGradeResult {
  score: number; // 0 to maxScore (usually 5)
  maxScore: number;
  percentage: number;
  feedback: {
    commercialAcumen: string;
    tradeoffClarity: string;
    feasibility: string;
    actionableAdvice: string;
  };
  overallCritique: string;
}

export async function gradeSubjectiveAnswer(
  question: Question,
  userAnswer: string,
  apiKey?: string
): Promise<SubjectiveGradeResult> {
  const rubric: SubjectiveRubric = question.rubric || {
    commercialAcumen: 'Grasps the core economic or logical levers of the dilemma.',
    analyticalRigor: 'Identifies realistic secondary effects and operational trade-offs.',
    clarityAndDirectness: 'Provides a structured, confident, and well-justified decision.',
    maxScore: 5
  };

  const graderPrompt = `You are "Leo", an elite business mentor and former founder evaluating an applicant's written decision for the Anandi-NEAT examination.

Question Scenario:
${question.prompt}

Benchmark Solution / Ideal Approach:
${question.solution}

Grading Rubric (Total Scale: ${rubric.maxScore} points):
1. Commercial Acumen: ${rubric.commercialAcumen}
2. Trade-off Analysis: ${rubric.analyticalRigor}
3. Clarity & Feasibility: ${rubric.clarityAndDirectness}

Applicant's Response:
"""
${userAnswer}
"""

Evaluate critically:
- Do NOT award full marks for superficial or generic buzzwords.
- Value sharp, numbers-driven or constraint-respecting entrepreneurial thinking.
- Provide honest, high-signal feedback.

Output strictly valid JSON:
{
  "score": number (between 0 and ${rubric.maxScore}, can be decimal e.g. 3.5),
  "feedback": {
    "commercialAcumen": "Specific feedback on their business reasoning",
    "tradeoffClarity": "Specific feedback on their handling of trade-offs",
    "feasibility": "Specific feedback on whether the decision would work in real life",
    "actionableAdvice": "1 key lesson to sharpen their decision next time"
  },
  "overallCritique": "2-3 sentences concise summary from Leo"
}`;

  const responseText = await callOpenRouter(
    [
      { role: 'system', content: graderPrompt },
      { role: 'user', content: 'Grade the applicant response according to the rubric and provide the JSON output.' }
    ],
    apiKey,
    {
      model: DEFAULT_VERIFIER_MODEL,
      temperature: 0.2,
      responseFormat: { type: 'json_object' }
    }
  );

  try {
    const parsed = JSON.parse(responseText);
    const score = Math.min(rubric.maxScore, Math.max(0, parsed.score));
    return {
      score,
      maxScore: rubric.maxScore,
      percentage: Math.round((score / rubric.maxScore) * 100),
      feedback: parsed.feedback,
      overallCritique: parsed.overallCritique || 'Evaluated by Leo AI.',
    };
  } catch (err) {
    const match = responseText.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        score: parsed.score || 3,
        maxScore: rubric.maxScore,
        percentage: 60,
        feedback: parsed.feedback || {},
        overallCritique: parsed.overallCritique || 'Evaluated by Leo AI.',
      };
    }
    throw new Error('Failed to parse subjective evaluation output');
  }
}
