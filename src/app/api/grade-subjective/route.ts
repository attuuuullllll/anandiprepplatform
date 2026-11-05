import { NextRequest, NextResponse } from 'next/server';
import { gradeSubjectiveAnswer } from '@/lib/subjective-grader';
import { Question } from '@/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, userAnswer, apiKey } = body as {
      question: Question;
      userAnswer: string;
      apiKey?: string;
    };

    if (!question || !userAnswer) {
      return NextResponse.json({ error: 'Question and userAnswer are required' }, { status: 400 });
    }

    const effectiveApiKey = apiKey || process.env.OPENROUTER_API_KEY;
    if (!effectiveApiKey) {
      return NextResponse.json({ error: 'OpenRouter API key is required' }, { status: 401 });
    }

    const evaluation = await gradeSubjectiveAnswer(question, userAnswer, effectiveApiKey);
    return NextResponse.json({ evaluation });
  } catch (err: any) {
    console.error('API /grade-subjective error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to grade subjective answer' },
      { status: 500 }
    );
  }
}
