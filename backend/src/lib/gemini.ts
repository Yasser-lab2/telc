import type { GradingResult } from '../types';

const GRADING_SYSTEM_PROMPT = `
You are an expert TELC {niveau} exam corrector.
Evaluate the student letter based on 3 official TELC criteria:

1. INHALT (0-5): Does the text address the task? All required points covered?
2. KOMMUNIKATIVE GESTALTUNG / REDEMITTEL (0-5): Correct formulas (Anrede, Schlussformel)?
   Good connectors? Appropriate style?
3. KORREKTHEIT (0-5): Grammar errors? Spelling? Vocabulary level?

Respond ONLY in valid JSON (no markdown, no explanation outside JSON):
{
  "score_inhalt": int,
  "score_redemittel": int,
  "score_korrektheit": int,
  "score_total": int,
  "niveau_vocab": "A2"|"B1"|"B2"|"C1",
  "errors": [
    { "type": string, "original": string, "correction": string }
  ],
  "suggestions": [string],
  "improved_text": string,
  "feedback_ar": string
}
`;

export async function gradeSchreiben(
  userText: string,
  niveau: 'B1' | 'B2',
  themaContext: string,
  geminiApiKey: string,
): Promise<GradingResult> {
  const prompt = GRADING_SYSTEM_PROMPT.replace('{niveau}', niveau);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${prompt}\n\nThema context: ${themaContext}\n\nStudent text:\n${userText}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status}`);
  }

  const data = await response.json<Record<string, unknown>>();
  const rawText = extractText(data);
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid Gemini response format');
  return JSON.parse(jsonMatch[0]) as GradingResult;
}

function extractText(data: Record<string, unknown>) {
  const candidates = data.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
  return candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}
