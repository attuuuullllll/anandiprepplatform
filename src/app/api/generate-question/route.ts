import { NextRequest, NextResponse } from 'next/server';
import { generateVerifiedAnandiQuestion } from '@/lib/question-engine';
import { ExamSection, QuestionType } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { section, subtopic, type, difficulty, apiKey } = body as {
      section: ExamSection;
      subtopic?: string;
      type?: QuestionType;
      difficulty?: 3 | 4 | 5;
      apiKey?: string;
    };

    if (!section) {
      return NextResponse.json({ error: 'Section is required' }, { status: 400 });
    }

    const effectiveApiKey = apiKey || process.env.OPENROUTER_API_KEY;
    if (!effectiveApiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key is missing. Please enter your API key in Settings or configure OPENROUTER_API_KEY.' },
        { status: 401 }
      );
    }

    const verifiedQuestion = await generateVerifiedAnandiQuestion(
      section,
      subtopic,
      type,
      difficulty || 4,
      2,
      effectiveApiKey
    );

    return NextResponse.json({ question: verifiedQuestion });
  } catch (err: any) {
    console.error('API /generate-question error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate verified question' },
      { status: 500 }
    );
  }
}
