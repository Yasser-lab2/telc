import { z } from 'zod';
import type { GradingResult } from '../types';
import { gradeSchreiben as gradeWithGemini } from './gemini';

export const GRADING_PROMPT_VERSION = 'telc-writing-v2';
export const gradingResultSchema = z.object({
  score_inhalt: z.number().min(0).max(5),
  score_redemittel: z.number().min(0).max(5),
  score_korrektheit: z.number().min(0).max(5),
  score_total: z.number().min(0).max(100),
  niveau_vocab: z.enum(['A2', 'B1', 'B2', 'C1']),
  errors: z.array(z.object({ type: z.string(), original: z.string(), correction: z.string() })).max(50),
  suggestions: z.array(z.string()).max(20),
  improved_text: z.string(),
  feedback_ar: z.string(),
});

type AiEnvironment = {
  AI_PROVIDER?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  GEMINI_API_KEY?: string;
  APP_URL: string;
};

export async function gradeWriting(env: AiEnvironment, input: { userText: string; niveau: 'B1' | 'B2'; themaContext: string }) {
  const preferred = env.AI_PROVIDER?.toLowerCase() === 'openrouter' ? 'openrouter' : 'gemini';
  const providers = preferred === 'openrouter' ? ['openrouter', 'gemini'] as const : ['gemini', 'openrouter'] as const;
  const failures: string[] = [];

  for (const provider of providers) {
    try {
      if (provider === 'openrouter' && env.OPENROUTER_API_KEY) {
        const model = env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free';
        const result = await gradeWithOpenRouter(input, env.OPENROUTER_API_KEY, model, env.APP_URL);
        return { result, provider, model, promptVersion: GRADING_PROMPT_VERSION };
      }
      if (provider === 'gemini' && env.GEMINI_API_KEY) {
        const result = gradingResultSchema.parse(await gradeWithGemini(input.userText, input.niveau, input.themaContext, env.GEMINI_API_KEY));
        return { result, provider, model: 'gemini-2.0-flash', promptVersion: GRADING_PROMPT_VERSION };
      }
    } catch (error) {
      failures.push(`${provider}:${error instanceof Error ? error.name : 'error'}`);
    }
  }
  throw new Error(`No AI grading provider succeeded (${failures.join(',') || 'no keys configured'})`);
}

async function gradeWithOpenRouter(input: { userText: string; niveau: 'B1' | 'B2'; themaContext: string }, apiKey: string, model: string, appUrl: string): Promise<GradingResult> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal: AbortSignal.timeout(60_000),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': appUrl, 'X-OpenRouter-Title': 'TELC Prep' },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 1800,
      messages: [
        { role: 'system', content: systemPrompt(input.niveau) },
        { role: 'user', content: `Aufgabe:\n${input.themaContext}\n\nText des Lernenden:\n${input.userText}` },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'telc_writing_feedback', strict: true, schema: gradingJsonSchema } },
      // Free endpoints may require provider-side logging and may not advertise
      // every structured-output parameter. Zod validation remains mandatory.
      provider: model.endsWith(':free') ? undefined : { data_collection: 'deny' },
    }),
  });
  if (!response.ok) throw new Error(`OpenRouter request failed: ${response.status}`);
  const data = await response.json<{ choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }> }>();
  const content = data.choices?.[0]?.message?.content;
  const raw = typeof content === 'string' ? content : content?.map((item) => item.text ?? '').join('') ?? '';
  return parseGradingResult(raw);
}

export function parseGradingResult(raw: string): GradingResult {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI response did not contain JSON');
  return gradingResultSchema.parse(JSON.parse(match[0]));
}

function systemPrompt(level: 'B1' | 'B2') {
  return `You are a careful TELC ${level} writing tutor. Evaluate task coverage, communicative form and language correctness. Each criterion is scored from 0 to 5. score_total is the three-criterion sum normalized to 0-100. Give concise learner-safe feedback in French in feedback_ar despite the legacy field name. Return only the requested JSON.`;
}

const gradingJsonSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    score_inhalt: { type: 'number', minimum: 0, maximum: 5 }, score_redemittel: { type: 'number', minimum: 0, maximum: 5 }, score_korrektheit: { type: 'number', minimum: 0, maximum: 5 }, score_total: { type: 'number', minimum: 0, maximum: 100 },
    niveau_vocab: { type: 'string', enum: ['A2', 'B1', 'B2', 'C1'] },
    errors: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { type: { type: 'string' }, original: { type: 'string' }, correction: { type: 'string' } }, required: ['type', 'original', 'correction'] } },
    suggestions: { type: 'array', items: { type: 'string' } }, improved_text: { type: 'string' }, feedback_ar: { type: 'string' },
  },
  required: ['score_inhalt', 'score_redemittel', 'score_korrektheit', 'score_total', 'niveau_vocab', 'errors', 'suggestions', 'improved_text', 'feedback_ar'],
};
