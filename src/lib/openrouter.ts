export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterCallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: 'json_object' };
}

export const DEFAULT_GENERATOR_MODEL = 'deepseek/deepseek-chat';
export const DEFAULT_VERIFIER_MODEL = 'deepseek/deepseek-chat';
export const REASONING_MODEL = 'deepseek/deepseek-r1-0528';
export const FALLBACK_GENERATOR_MODEL = 'deepseek/deepseek-chat';
export const FALLBACK_VERIFIER_MODEL = 'deepseek/deepseek-chat';

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  apiKey?: string,
  options: OpenRouterCallOptions = {}
): Promise<string> {
  const key = apiKey || process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error('OPENROUTER_API_KEY is not set in backend or request.');
  }

  const model = options.model || DEFAULT_GENERATOR_MODEL;
  const payload: any = {
    model,
    messages,
    temperature: options.temperature ?? 0.3,
    // Limit max_tokens to 1500 by default to prevent OpenRouter 402 Insufficient Balance estimation against 32k/131k tokens
    max_tokens: options.maxTokens ?? 1500,
  };

  if (options.responseFormat?.type === 'json_object') {
    payload.response_format = { type: 'json_object' };
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key.trim()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://leo-anandi.app',
        'X-Title': 'Leo AI - Anandi Prep Engine',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      // Try fallback model if model failed or rate-limited
      if ((res.status === 429 || res.status === 404 || res.status >= 500) && model !== FALLBACK_GENERATOR_MODEL) {
        console.warn(`Model ${model} returned ${res.status}. Falling back to ${FALLBACK_GENERATOR_MODEL}`);
        return callOpenRouter(messages, apiKey, { ...options, model: FALLBACK_GENERATOR_MODEL });
      }
      throw new Error(`OpenRouter API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Received empty response from OpenRouter');
    }
    return content;
  } catch (error: any) {
    console.error('callOpenRouter error:', error);
    throw error;
  }
}
