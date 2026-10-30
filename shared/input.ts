import { AppError } from './errors.ts';
import type { ExperimentInput, PhraseMatch } from './types.ts';

function phrasePattern(phrase: string): RegExp {
  const escaped = Array.from(phrase, ch => '\\^$.*+?()[]{}|'.includes(ch) ? '\\' + ch : ch).join('');
  const wordEdge = /[\p{L}\p{N}_]/u;
  const before = wordEdge.test(phrase[0] ?? '') ? '(?<![\\p{L}\\p{N}_])' : '';
  const after = wordEdge.test(phrase.at(-1) ?? '') ? '(?![\\p{L}\\p{N}_])' : '';
  return new RegExp(before + escaped + after, 'giu');
}

export function measurePhrases(text: string, phrases: string[]): PhraseMatch[] {
  return phrases.map(phrase => {
    const occurrences = phrase ? [...text.matchAll(phrasePattern(phrase))].length : 0;
    return { phrase, present: occurrences > 0, occurrences };
  });
}

export function phraseRanges(text: string, phrases: string[]): {start: number; end: number}[] {
  const ranges = phrases.filter(Boolean).flatMap(phrase =>
    [...text.matchAll(phrasePattern(phrase))].map(match => ({start:match.index, end:match.index + match[0].length})))
    .sort((a,b) => a.start - b.start || b.end - a.end);
  const merged: {start:number; end:number}[] = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
    else merged.push({...range});
  }
  return merged;
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}

export function validateInput(value: unknown): ExperimentInput {
  const fail = (message: string): never => { throw new AppError('INVALID_INPUT', message); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('Supply a story and optional phrases.');
  const record = value as Record<string, unknown>;
  if (typeof record.story !== 'string') return fail('The original memory must be text.');
  if (record.story.length > 1500) return fail('Keep the original memory to 1,500 characters.');
  const story = record.story.trim();
  if (!story) return fail('Add a memory before starting.');
  const rawPhrases = record.phrases ?? [];
  if (!Array.isArray(rawPhrases) || rawPhrases.length > 5) return fail('Choose up to five phrases.');
  const phrases: string[] = [];
  for (const value of rawPhrases) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) {
      return fail('Each phrase must contain between 1 and 80 characters.');
    }
    const phrase = value.trim();
    if (phrases.some(existing => existing.toLocaleLowerCase() === phrase.toLocaleLowerCase())) {
      return fail('Each watched phrase must be different.');
    }
    if (!measurePhrases(story, [phrase])[0].present) return fail('Choose phrases that appear in the original memory.');
    phrases.push(phrase);
  }
  return {story, phrases};
}
