import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/openrouter';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { messages, context, apiKey } = await req.json();

    const effectiveApiKey = apiKey || process.env.OPENROUTER_API_KEY;
    if (!effectiveApiKey) {
      return NextResponse.json({ error: 'OpenRouter API key is missing in environment.' }, { status: 401 });
    }

    const systemPrompt = `You are "Leo", the elite AI personal mentor for The Anandi Fellowship's entrance exam (Anandi-NEAT 2026).
Exam Sections: Quantitative Reasoning, Logic & Inferencing, Data Interpretation & Verbal Reasoning, General Awareness, Business Judgement.

Your personality:
- Sharp, motivating, honest, and direct. You treat the student like an ambitious future founder.
- When helping with questions: Guide them with sharp Socratic hints, identify common distractor traps, and teach speed shortcuts. Do not immediately dump the final answer unless they explicitly ask for full derivation.
- Break down complex unit economics, arrangement matrices, and trade-off dilemmas into clear, structured principles.
- Use clean formatting, bullet points, and LaTeX for mathematical formulas when relevant.

Current Context:
${context ? JSON.stringify(context, null, 2) : 'General Anandi prep session.'}
`;

    const chatResponse = await callOpenRouter(
      [
        { role: 'system', content: systemPrompt },
        ...(messages || [])
      ],
      effectiveApiKey,
      {
        model: 'deepseek/deepseek-chat',
        temperature: 0.6,
      }
    );

    return NextResponse.json({ reply: chatResponse });
  } catch (err: any) {
    console.error('API /leo-chat error:', err);
    return NextResponse.json({ error: err.message || 'Error communicating with AI backend' }, { status: 500 });
  }
}
