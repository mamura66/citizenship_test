/* Which countries the app can teach, and the packs behind them.
 *
 * The imports are static and always will be: Metro resolves `require`/`import` at build
 * time, so a pack cannot be chosen by building a path at runtime. That is a feature here -
 * a country exists in this app only if its pack is really bundled, so the picker cannot
 * offer a test we have no questions for.
 *
 * Adding a country is: put the pack under `content/<code>/`, run
 * `tools/gen-app-image-map.py` if it has artwork, and add one entry to COUNTRIES.
 */

import civics2025 from '../../content/us/civics-2025.json';
import civics2008 from '../../content/us/civics-2008.json';
import einbuergerungstest from '../../content/de/einbuergerungstest.json';

import type { CivicsCategory, CivicsQuestion, CivicsTestSet } from './types';
import { packImage, type PackImage } from './images.generated';

export type CountryCode = 'us' | 'de';

export interface TestVersion {
  id: string;
  /** What the picker calls it, in the user's own language. */
  label: string;
  /** A sentence saying who this version applies to. Absent when there is only one. */
  note?: string;
  pack: CivicsTestSet;
}

export interface CountryDef {
  code: CountryCode;
  /** English, for our own logs and the US UI. */
  name: string;
  /** What the country calls itself - what a German user should see. */
  nativeName: string;
  flag: string;
  /** BCP-47 of the questions, taken from the pack rather than assumed. */
  language: string;
  /** The official name of the test, for Settings. */
  officialTestName: string;
  versions: TestVersion[];
  /** Which sub-national dimension the test has, if any. */
  regionKind: 'us-jurisdiction' | 'de-bundesland' | null;
}

const US_2025 = civics2025 as unknown as CivicsTestSet;
const US_2008 = civics2008 as unknown as CivicsTestSet;
const DE_PACK = einbuergerungstest as unknown as CivicsTestSet;

export const COUNTRIES: CountryDef[] = [
  {
    code: 'us',
    name: 'United States',
    nativeName: 'United States',
    flag: '🇺🇸',
    language: US_2025.language || 'en-US',
    officialTestName: US_2025.officialTestName || 'USCIS Civics Test',
    regionKind: 'us-jurisdiction',
    versions: [
      {
        id: '2025',
        label: '2025 test',
        note: 'For applications filed on or after 20 October 2025.',
        pack: US_2025,
      },
      {
        id: '2008',
        label: '2008 test',
        note: 'For applications filed before 20 October 2025.',
        pack: US_2008,
      },
    ],
  },
  {
    code: 'de',
    name: 'Germany',
    nativeName: 'Deutschland',
    flag: '🇩🇪',
    language: DE_PACK.language || 'de',
    officialTestName: DE_PACK.officialTestName || 'Einbürgerungstest',
    regionKind: 'de-bundesland',
    versions: [{ id: DE_PACK.version, label: 'Einbürgerungstest', pack: DE_PACK }],
  },
];

export const DEFAULT_COUNTRY: CountryCode = 'us';

export function getCountry(code: string | null | undefined): CountryDef {
  return COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];
}

export function getVersion(code: string | null | undefined, versionId?: string | null): TestVersion {
  const country = getCountry(code);
  return country.versions.find((v) => v.id === versionId) || country.versions[0];
}

export function getPack(code: string | null | undefined, versionId?: string | null): CivicsTestSet {
  return getVersion(code, versionId).pack;
}

/* ---------------------------------------------------------------------------------------
 * What may be asked
 * ------------------------------------------------------------------------------------ */

/**
 * True when a question can honestly be put in front of someone.
 *
 * Two reasons one cannot. A pack may hold a question back over rights it does not have -
 * Germany's question 55 asks what a photograph shows, and the photograph is a third
 * party's copyright, so there is no answer we can display. And a question that needs its
 * picture to be answerable is useless without the file: four tiles reading
 * "Bild 1".."Bild 4" with nothing in them is not a question, it is a bug wearing one.
 */
export function isAskable(country: string, q: CivicsQuestion): boolean {
  if (q.servable === false) return false;
  if (q.requiresImage) {
    const hasFigure = !!packImage(country, q.image);
    const hasOptions =
      !!q.optionImages?.length && q.optionImages.every((p) => !!packImage(country, p));
    if (!hasFigure && !hasOptions) return false;
  }
  return true;
}

/** Every question the pack contains, including the ones we cannot serve. */
export function allQuestions(pack: CivicsTestSet): CivicsQuestion[] {
  return [...(pack.categories || []), ...(pack.stateCategories || [])].flatMap(
    (c) => c.questions || []
  );
}

/** Every question we may actually ask, nationwide plus sub-national. */
export function askableQuestions(code: string, versionId?: string | null): CivicsQuestion[] {
  const pack = getPack(code, versionId);
  return allQuestions(pack).filter((q) => isAskable(code, q));
}

/** The nationwide sections, with unaskable questions already removed. */
export function sections(code: string, versionId?: string | null): CivicsCategory[] {
  const pack = getPack(code, versionId);
  return (pack.categories || [])
    .map((c) => ({ ...c, questions: (c.questions || []).filter((q) => isAskable(code, q)) }))
    .filter((c) => c.questions.length > 0);
}

/**
 * The sub-national sections - Germany's sixteen Bundesländer.
 *
 * Kept apart from `sections` on purpose: a candidate answers only the questions of the
 * Bundesland they live in, so mixing all sixteen into one pool would ask fifteen sets of
 * questions that cannot come up, and grading against them would report a readiness that
 * is not real.
 */
export function regionSections(code: string, versionId?: string | null): CivicsCategory[] {
  const pack = getPack(code, versionId);
  return (pack.stateCategories || [])
    .map((c) => ({ ...c, questions: (c.questions || []).filter((q) => isAskable(code, q)) }))
    .filter((c) => c.questions.length > 0);
}

/** The names a region picker should offer, in the pack's own order. */
export function regionNames(code: string, versionId?: string | null): string[] {
  return regionSections(code, versionId).map((c) => c.state || c.section);
}

/**
 * The questions a specific candidate can actually be asked.
 *
 * Nationwide questions, plus the sub-national set for the one region they live in - and
 * only that one. A German candidate answers the 300 general questions plus the 10 for
 * their own Bundesland; the other 150 cannot come up. Putting all sixteen sets in a
 * practice test would ask questions that will never be asked and then report a readiness
 * built partly on them, which is the same "real data about a test you are not taking"
 * failure the country lock exists to prevent.
 *
 * With no region chosen, the sub-national questions are left out rather than guessed at.
 */
export function questionsForRegion(
  code: string,
  versionId: string | null | undefined,
  region: string | null | undefined
): CivicsQuestion[] {
  const nationwide = sections(code, versionId).flatMap((c) => c.questions);
  if (!region) return nationwide;
  const own = regionSections(code, versionId).find((c) => (c.state || c.section) === region);
  return own ? [...nationwide, ...own.questions] : nationwide;
}

/* ---------------------------------------------------------------------------------------
 * How the real test runs
 * ------------------------------------------------------------------------------------ */

export interface PackFormat {
  /** How many questions the real test asks. Null when the pack does not say. */
  asked: number | null;
  /** How many must be right. Null when the pack does not say. */
  passMark: number | null;
  timeLimitMinutes: number | null;
  /** True when the questions are printed with options to choose from. */
  multipleChoice: boolean;
}

/**
 * Read the test's format out of the pack, and return nulls where it is silent.
 *
 * Never a default. An earlier version of the website fell back to `askedPerInterview || 10`
 * and `passRequirement || ceil(asked * 0.6)`, which drew a 60% pass line on a German test
 * whose real mark is 17 of 33 - a number we would have invented and shown as fact. A null
 * makes the caller say "the official document does not state this" instead.
 */
export function packFormat(code: string, versionId?: string | null): PackFormat {
  const pack = getPack(code, versionId);
  const asked = pack.askedPerTest ?? pack.askedPerInterview ?? null;
  const first = allQuestions(pack).find((q) => !!q.options?.length);
  return {
    asked: typeof asked === 'number' ? asked : null,
    passMark: typeof pack.passRequirement === 'number' ? pack.passRequirement : null,
    timeLimitMinutes: typeof pack.timeLimitMinutes === 'number' ? pack.timeLimitMinutes : null,
    multipleChoice: !!first,
  };
}

/** True when this question is answered by picking a printed option. */
export function isMultipleChoice(q: CivicsQuestion): boolean {
  return !!q.options && q.options.length >= 2;
}

/* ---------------------------------------------------------------------------------------
 * Artwork
 * ------------------------------------------------------------------------------------ */

export interface QuestionArt {
  /** A single figure to show above the options. */
  figure?: PackImage;
  /** One picture per option, index-aligned with `options`. */
  optionArt?: (PackImage | undefined)[];
  /** A rights holder to print under the picture, when the source names one. */
  credit?: string;
}

/**
 * The bundled artwork for a question, resolved through the generated map.
 *
 * Pictures are shown on a white tile in both themes and never filtered or blended. Several
 * are black line art - Germany's question 21 offers a black Chi-Rho - and on a dark ground
 * with the alpha preserved the option disappears entirely. The files are already
 * composited onto white, which is how the official document prints them, so the tile is
 * the honest rendering rather than a workaround.
 */
export function questionArt(country: string, q: CivicsQuestion): QuestionArt {
  const art: QuestionArt = {};
  const figure = packImage(country, q.image);
  if (figure) art.figure = figure;
  if (q.optionImages?.length) {
    art.optionArt = q.optionImages.map((p) => packImage(country, p));
  }
  // Only a credit that names a rights holder is worth printing; our own source note is
  // already covered by the pack-level attribution shown with every question.
  if (q.imageCredit && q.imageCredit.includes('©')) art.credit = q.imageCredit;
  return art;
}

/**
 * The source credit that must appear wherever a question is shown.
 *
 * For Germany this is not a courtesy: the catalogue is an official work under section 5(2)
 * UrhG, which removes copyright but keeps the source-attribution duty of section 63. The
 * string comes from the pack so it cannot drift from what was cleared.
 */
export function attribution(code: string, versionId?: string | null): string | null {
  return getPack(code, versionId).licence?.attribution || null;
}

/** What this content is, in the pack's own language, when it says. */
export function disclosure(code: string, versionId?: string | null): string | null {
  return getPack(code, versionId).disclosure || null;
}
