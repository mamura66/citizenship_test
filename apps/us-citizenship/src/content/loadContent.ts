import civics2025 from '../../content/us/civics-2025.json';
import civics2008 from '../../content/us/civics-2008.json';
import readingVocab from '../../content/us/reading-vocab.json';
import writingVocab from '../../content/us/writing-vocab.json';
import stateCapitals from '../../content/us/officials/state-capitals.json';
import jurisdictionsData from '../../content/us/officials/jurisdictions.json';
import { askableQuestions, getPack, regionSections, sections } from './countries';
import { officials } from './officialsStore';
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
/* The officials are read through the live store, not module constants.
 *
 * They used to be `const`s imported straight from the JSON, which meant every consumer
 * captured the bundled names at import time and a wrong governor could only be fixed by a
 * release. `officialsStore` seeds itself from the same bundled JSON - so nothing here is
 * ever empty - and swaps in a validated remote copy when one lands. Read them through the
 * functions, at the moment of use, not once at the top of a module. */
export function nationalDynamic(): NationalDynamicOfficials {
  return officials().national;
}
export function governors(): Record<string, GovernorEntry> {
  return officials().governors;
}
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
  if (isState(name)) return governors()[name]?.name ?? null;
  const j = JURISDICTIONS[name];
  return j ? (j.governor ?? j.governorAnswer) : null;
}

/* Reading a pack.
 *
 * These take the country as well as the version now. They delegate to
 * `content/countries.ts`, which is the one place that knows which packs exist and which
 * questions may honestly be asked - a question held back over image rights, or one that
 * needs a picture we do not ship, is filtered out here rather than in each screen.
 *
 * For the United States this is a no-op: no US question is held back and none needs a
 * picture, so the same categories and the same questions come back as before.
 */
export function getCivicsSet(country: string, version: string): CivicsTestSet {
  return getPack(country, version);
}

/** Every question that may be asked, nationwide plus any sub-national set. */
export function getAllQuestions(country: string, version: string) {
  return askableQuestions(country, version);
}

/** The nationwide sections, with unaskable questions already removed. */
export function getCategories(country: string, version: string) {
  return sections(country, version);
}

/** The sub-national sections - Germany's sixteen Bundesländer. Empty for the US. */
export function getRegionCategories(country: string, version: string) {
  return regionSections(country, version);
}

/** The section a question belongs to (used for "what to study" guidance). */
export function findCategory(country: string, version: string, questionId: number) {
  return (
    getCategories(country, version).find((c) => c.questions.some((q) => q.id === questionId)) ||
    getRegionCategories(country, version).find((c) => c.questions.some((q) => q.id === questionId))
  );
}

/** Questions in a category, e.g. to open Flashcards filtered to one topic. */
export function getQuestionsInCategory(country: string, version: string, categoryId: string) {
  const all = [...getCategories(country, version), ...getRegionCategories(country, version)];
  return all.find((c) => c.id === categoryId)?.questions ?? [];
}

/** Resolves a DYNAMIC:field placeholder answer to the current real value. */
export function resolveDynamicAnswer(placeholder: string): string {
  const field = placeholder.replace('DYNAMIC:', '') as keyof NationalDynamicOfficials;
  const value = nationalDynamic()[field];
  return value !== undefined ? String(value) : placeholder;
}

/**
 * True when the question asks for ONE answer but USCIS lists many acceptable ones
 * ("Name one American Indian tribe" has 25). Without saying so, the card reads as
 * 25 things to memorize instead of a menu to pick from.
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
