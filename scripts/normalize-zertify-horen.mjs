import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const teil = Number(process.argv[2] ?? 1);
if (![1, 2, 3].includes(teil)) throw new Error('Le Teil doit être 1, 2 ou 3.');

const input = `scraped/zertify-horen-teil${teil}.json`;
const output = `frontend/src/data/zertify-horen-teil${teil}.json`;
const source = JSON.parse(await readFile(input, 'utf8'));
const html = source.content?.html ?? '';

function decode(value = '') {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

const groups = html.split(/<div id="hoeren-group-\d+"/).slice(1).map((group, index) => {
  const title = decode(group.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1]);
  const audioUrl = group.match(/<audio[^>]+src="([^"]+)"/i)?.[1] ?? null;
  const text = decode(group);
  const tableStart = text.search(/Richtig\s+Falsch\s+Aussage/i);
  const questionText = tableStart >= 0 ? text.slice(tableStart).replace(/^Richtig\s+Falsch\s+Aussage\s*/i, '') : text;
  const end = questionText.search(/تحقق من الإجابات/i);
  const statementArea = end >= 0 ? questionText.slice(0, end) : questionText;
  const statements = [...statementArea.matchAll(/(?:^|\s)(\d+)\.\s+([\s\S]*?)(?=\s+\d+\.\s+|$)/g)]
    .map((match) => ({ number: Number(match[1]), text: match[2].trim() }))
    .filter((item) => item.text);
  const duration = text.match(/\b\d{1,2}:\d{2}\s+(\d{1,2}:\d{2})\b/)?.[1] ?? null;

  return {
    id: `zertify-b2-hoeren-teil${teil}-${String(index + 1).padStart(2, '0')}`,
    teil,
    level: 'B2',
    title,
    audioUrl,
    duration,
    statements,
    source: 'user-imported-zertify-export',
  };
}).filter((item) => item.title && item.statements.length);

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({ teil, importedAt: source.scrapedAt, exercises: groups }, null, 2)}\n`, 'utf8');
console.log(`${groups.length} exercices normalisés dans ${output}.`);
console.log(`${groups.filter((item) => item.audioUrl).length} avec audio, ${groups.filter((item) => !item.audioUrl).length} sans audio.`);
