import civics2025 from '../../content/us/civics-2025.json';
import civics2008 from '../../content/us/civics-2008.json';
import readingVocab from '../../content/us/reading-vocab.json';
import writingVocab from '../../content/us/writing-vocab.json';
import nationalDynamic from '../../content/us/officials/national-dynamic.json';
import governors from '../../content/us/officials/governors.json';
import stateCapitals from '../../content/us/officials/state-capitals.json';
import jurisdictionsData from '../../content/us/officials/jurisdictions.json';
import type {
  CivicsTestSet,
  NationalDynamicOfficials,
  GovernorEntry,
} from './types';

// Single source of truth: content/us/**/*.json at the repo root (shared across
// every country app we eventually build). Do not copy these files into the app -
// see metro.config.js watchFolders and content/us/officials/README.md.

export const CIVICS_2025 = civics2025 as unknown as CivicsTestSet;
export const CIVICS_2008 = civics2008 as unknown as CivicsTestSet;
export const READING_VOCAB = readingVocab;
export const WRITING_VOCAB = writingVocab;
export const NATIONAL_DYNAMIC = nationalDynamic as unknown as NationalDynamicOfficials;
export const GOVERNORS = governors.governors as Record<string, GovernorEntry>;
export const STATE_CAPITALS = stateCapitals.capitals as Record<string, string>;

/** D.C. and the five inhabited U.S. territories - USCIS's state-specific questions
 *  have explicit answers for these residents, so they're selectable too. */
export interface Jurisdiction {
  kind: string;
  capital: string | null;
  capitalAnswer: string | null;
  governor: string | null;
  governorAnswer: string | null;
  senatorAnswer: string;
}
export const JURISDICTIONS = jurisdictionsData.jurisdictions as Record<string, Jurisdiction>;

/** Every option the "my state" picker offers: the 50 states plus D.C. and the territories. */
export const ALL_JURISDICTION_NAMES = [...Object.keys(STATE_CAPITALS), ...Object.keys(JURISDICTIONS)].sort();

export const isState = (name: string) => name in STATE_CAPITALS;

/** What to show for "What is the capital of your state?" - a real capital, or the
 *  official answer for a place that has none. */
export function capitalAnswerFor(name: string): string | null {
  if (isState(name)) return STATE_CAPITALS[name] ?? null;
  const j = JURISDICTIONS[name];
  return j ? (j.capital ?? j.capitalAnswer) : null;
}

/** What to show for "Who is the governor of your state now?" - null when we have
 *  no verified answer (territory governors), so callers can say so honestly. */
export function governorAnswerFor(name: string): string | null {
  if (isState(name)) return GOVERNORS[name]?.name ?? null;
  const j = JURISDICTIONS[name];
  return j ? (j.governor ?? j.governorAnswer) : null;
}

export function getCivicsSet(version: '2008' | '2025'): CivicsTestSet {
  return version === '2025' ? CIVICS_2025 : CIVICS_2008;
}

export function getAllQuestions(version: '2008' | '2025') {
  return getCivicsSet(version).categories.flatMap((c) => c.questions);
}

export function getCategories(version: '2008' | '2025') {
  return getCivicsSet(version).categories;
}

/** The USCIS section/subsection a question belongs to (used for "what to study" guidance). */
export function findCategory(version: '2008' | '2025', questionId: number) {
  return getCategories(version).find((c) => c.questions.some((q) => q.id === questionId));
}

/** Questions in a category, e.g. to open Flashcards filtered to one topic. */
export function getQuestionsInCategory(version: '2008' | '2025', categoryId: string) {
  return getCategories(version).find((c) => c.id === categoryId)?.questions ?? [];
}

/** Resolves a DYNAMIC:field placeholder answer to the current real value. */
export function resolveDynamicAnswer(placeholder: string): string {
  const field = placeholder.replace('DYNAMIC:', '') as keyof NationalDynamicOfficials;
  const value = NATIONAL_DYNAMIC[field];
  return value !== undefined ? String(value) : placeholder;
}

/**
 * True when the question asks for ONE answer but USCIS lists many acceptable ones
 * ("Name one American Indian tribe" has 25). Without saying so, the card reads as
 * 25 things to memorise instead of a menu to pick from.
 */
export function acceptsAnyOne(question: string, answerCount: number): boolean {
  if (answerCount <= 3) return false;
  return /\bname one\b|\bone example\b|\bone reason\b|\bone state\b|\bone power\b|\bone thing\b|\bname five\b|\bname three\b/i.test(
    question
  );
}

export function resolveAnswers(answers: string[]): string[] {
  return answers.map((a) => (a.startsWith('DYNAMIC:') ? resolveDynamicAnswer(a) : a));
}
