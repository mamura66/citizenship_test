/* The shape of a question pack, for any country.
 *
 * These started out describing the USCIS civics test only, which is why the US-specific
 * fields still carry their original names. Everything a second country needed is optional,
 * so the US packs continue to satisfy the type unchanged - and, importantly, a pack that
 * simply does not state a fact (Germany publishes no topic taxonomy; Australia's sample
 * paper states no time limit) leaves the field absent rather than carrying a default that
 * the UI would then present as official.
 */

export interface CivicsQuestion {
  id: number;
  question: string;
  answers: string[];

  /* ---- multiple-choice packs: Germany, Spain, Australia ------------------------------
   * The US test is free recall - an officer asks, the applicant answers aloud, and there
   * are no options to choose from. The Einbuergerungstest is a written paper with four
   * printed options. Both shapes are real, so a question carries options only when its
   * own test does; nothing invents distractors for a test that has none, and nothing
   * strips them from a test whose wrong answers are themselves official. */
  options?: string[];
  /** Index into `options`. Never trusted alone: `answers` stays authoritative. */
  correctIndex?: number;

  /* ---- artwork ---------------------------------------------------------------------- */
  /** One figure shown above the options, e.g. a state locator map. Pack-relative. */
  image?: string;
  /** One picture per option, index-aligned with `options`. Do not reorder. */
  optionImages?: string[];
  /** The question cannot be answered without seeing its picture. */
  requiresImage?: boolean;
  /** A rights holder named in the source. A `(c)` credit here means it is not ours. */
  imageCredit?: string;
  /** Why we ship no picture for a question that has one in the official document. */
  imageOmitted?: string;
  imageSource?: string;
  imageSourcePage?: number;
  imageDescription?: string;

  /* ---- held back --------------------------------------------------------------------
   * A question we hold in the pack for completeness but must not serve. Germany's
   * question 55 asks what a photograph shows and the photograph is somebody else's
   * copyright, so there is no answer we can put on screen. Absent means servable. */
  servable?: boolean;
  notServableReason?: string;

  /** The number the official document gives this question, which is what a learner
   *  cross-referencing the real catalogue will look for. */
  officialNumber?: number;
  /** Which sub-national area this question belongs to (a German Bundesland). */
  state?: string;

  /* ---- United States ---------------------------------------------------------------- */
  senior65_20?: boolean;
  stateSpecific?: boolean;
  stateSpecificType?: 'senator' | 'houseRep' | 'governor' | 'capital';
  dynamic?: boolean;
  note?: string;
}

export interface CivicsCategory {
  id: string;
  section: string;
  /** Absent for packs whose official document publishes no sub-grouping. */
  subsection?: string;
  questions: CivicsQuestion[];
  /** Set on entries in `stateCategories`. */
  state?: string;
  stateCode?: string;
}

export interface PackLicence {
  name: string;
  url: string;
  attribution: string;
  /** 'cleared', or one of the held values that keeps a pack off the website. */
  reviewStatus?: string;
  obligations?: string[];
  notCleared?: string;
}

export interface CivicsTestSet {
  /** A date or year string, not an enum: '2025', '2008', '2025-05-07'. */
  version: string;
  source: string;
  sourceRetrieved: string;
  totalQuestions: number;
  categories: CivicsCategory[];

  /** BCP-47, possibly with a region: 'en-US', 'de', 'es-ES'. */
  language?: string;
  country?: string;
  officialTestName?: string;

  /* How the real test runs. Absent means the official document does not say, and the UI
   * must then say so rather than borrow another country's numbers. */
  askedPerInterview?: number;
  askedPerTest?: number;
  passRequirement?: number;
  timeLimitMinutes?: number;

  /** Sub-national questions kept separate: a candidate answers only their own area's. */
  stateCategories?: CivicsCategory[];
  stateQuestionsTotal?: number;

  licence?: PackLicence;
  /** Shown to the user, in the pack's own language, saying what this content is. */
  disclosure?: string;
  disclosureEn?: string;
  contentType?: 'official-full-pool' | 'official-practice-subset';
  officialPoolPublished?: boolean;
}

export interface NationalDynamicOfficials {
  lastVerified: string;
  president: string;
  presidentParty: string;
  vicePresident: string;
  speakerOfTheHouse: string;
  chiefJustice: string;
  supremeCourtSeats: number;
}

export interface GovernorEntry {
  name: string;
  party: string;
}
