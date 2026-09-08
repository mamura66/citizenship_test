/* Interface strings, by language.
 *
 * The app had none of this: every label was an English literal, which was correct while
 * the only test was the American one. It is not correct for a German user studying the
 * Einbürgerungstest, and a few of the English labels are not merely untranslated but
 * actually wrong outside the United States - see `mode.interview` below.
 *
 * The language comes from the pack's own `language` field, not from the phone's locale:
 * what matters is which test the questions are in. Someone studying the German test on an
 * English phone is reading German questions and should get German labels around them.
 *
 * `en` is the source of truth for meaning and is byte-identical to what the app said
 * before, because the US product is live.
 */

export type Lang = 'en' | 'de';

type Table = Record<string, string>;

const en: Table = {
  'country.title': 'Which test are you preparing for?',
  'country.explain':
    'This sets your questions, the pass mark and the sections you study. Your progress is kept separately for each test, so switching back and forth loses nothing.',
  'country.current': 'Your test',
  'country.change': 'Change test',
  'country.official': 'Official test',

  'tab.home': 'Home',
  'tab.study': 'Study',
  'tab.practice': 'Practice',
  'tab.interview': 'Interview',
  'tab.settings': 'Settings',

  'study.title': 'Flashcards',
  'study.allTopics': 'All topics',
  'study.pickTopic': 'tap to pick a topic',
  'study.tapToReveal': 'Tap to see the accepted answers',
  'study.starred': 'Starred',
  'study.answer': 'Answer',
  'study.acceptedAnswers': 'Accepted answers',
  'study.chooseOne': 'Choose one',
  'study.correctAnswer': 'Correct answer',
  'study.pictureMissing':
    'This question is asked with a picture we are not able to show, so it is left out.',
  'study.chooseTopic': 'Choose a topic to study',
  'study.flip': 'Tap to flip',
  'study.flipBack': 'Tap to flip back',
  'study.showQuestion': 'Show question',
  'study.showAnswer': 'Show answer',
  'study.star': 'Star this question for review',
  'study.unstar': 'Remove star',
  'study.readQuestion': 'Read question',
  'study.readBoth': 'Read question & answer',
  'study.previous': 'Previous',
  'study.next': 'Next',
  'study.sequential': 'Sequential',
  'study.random': 'Random',
  'study.emptyStarred': 'Nothing starred here yet. Tap the star on a card to build a review deck.',
  'study.emptyFiltered': 'No cards match these filters.',

  'practice.title': 'Practice test',
  'practice.formatUnknown':
    'The official document does not state how many questions are asked or how many you need right, so this practice test does not claim a pass mark.',
  'practice.realTest': 'In the real test',
  'practice.askedAndPass': 'you are asked {asked} questions and need {pass} correct.',
  'practice.timeLimit': 'You have {minutes} minutes.',
  'practice.question': 'Question',
  'practice.score': 'Score',
  'practice.adjust': 'Adjust the settings above to make practice easier or harder than the real thing.',
  'practice.numQuestions': 'Number of questions',
  'practice.passThreshold': 'Pass threshold',
  'practice.all': 'All',

  'q.number': 'Question {n}',
  'q.official': 'Official question {n}',

  'source.label': 'Source',
  'licence.label': 'Licence terms',
  'about.theseQuestions': 'About these questions',
};

/* German. Register is "Sie", which is what BAMF itself uses when addressing candidates.
 *
 * Two entries are corrections rather than translations, and both are deliberate:
 *
 *  - There is no interview in the German process. The Einbürgerungstest is a written
 *    multiple-choice paper; nobody asks the questions aloud. Calling the read-aloud mode
 *    an "Interview" would tell a user something false about their own test, so it is
 *    "Laut üben" - practising aloud.
 *  - "Aufgabe" is what the official catalogue calls a numbered item, so a German user
 *    cross-referencing the real document finds the same word.
 */
const de: Table = {
  'country.title': 'Für welchen Test bereiten Sie sich vor?',
  'country.explain':
    'Das bestimmt Ihre Fragen, die Bestehensgrenze und die Abschnitte, die Sie lernen. Ihr Lernstand wird für jeden Test getrennt gespeichert – ein Wechsel geht also nicht verloren.',
  'country.current': 'Ihr Test',
  'country.change': 'Test wechseln',
  'country.official': 'Amtlicher Test',

  'tab.home': 'Start',
  'tab.study': 'Lernen',
  'tab.practice': 'Übungstest',
  // Not "Interview": the Einbürgerungstest is a written paper and no officer asks the
  // questions aloud, so naming it an interview would describe a process that does not
  // exist. This mode reads the question out so you can answer aloud and check yourself.
  'tab.interview': 'Laut üben',
  'tab.settings': 'Einstellungen',

  'study.title': 'Lernkarten',
  'study.allTopics': 'Alle Abschnitte',
  'study.pickTopic': 'tippen, um einen Abschnitt zu wählen',
  'study.tapToReveal': 'Tippen, um die Antwort zu sehen',
  'study.starred': 'Markiert',
  'study.answer': 'Antwort',
  'study.acceptedAnswers': 'Anerkannte Antworten',
  'study.chooseOne': 'Eine Antwort auswählen',
  'study.correctAnswer': 'Richtige Antwort',
  'study.pictureMissing':
    'Diese Frage wird mit einem Bild gestellt, das wir nicht zeigen dürfen. Sie wird deshalb nicht abgefragt.',
  'study.chooseTopic': 'Abschnitt zum Lernen wählen',
  'study.flip': 'Tippen zum Umdrehen',
  'study.flipBack': 'Tippen, um zurückzudrehen',
  'study.showQuestion': 'Frage anzeigen',
  'study.showAnswer': 'Antwort anzeigen',
  'study.star': 'Diese Frage zum Wiederholen markieren',
  'study.unstar': 'Markierung entfernen',
  'study.readQuestion': 'Frage vorlesen',
  'study.readBoth': 'Frage und Antwort vorlesen',
  'study.previous': 'Zurück',
  'study.next': 'Weiter',
  'study.sequential': 'Der Reihe nach',
  'study.random': 'Zufällig',
  'study.emptyStarred': 'Hier ist noch nichts markiert. Tippen Sie auf den Stern einer Karte, um eine Wiederholungsliste anzulegen.',
  'study.emptyFiltered': 'Keine Karten passen zu diesen Filtern.',

  'practice.title': 'Übungstest',
  'practice.formatUnknown':
    'Im amtlichen Dokument steht nicht, wie viele Fragen gestellt werden oder wie viele richtig sein müssen. Dieser Übungstest nennt daher keine Bestehensgrenze.',
  'practice.realTest': 'Im echten Test',
  'practice.askedAndPass': 'werden {asked} Fragen gestellt, und {pass} müssen richtig sein.',
  'practice.timeLimit': 'Sie haben {minutes} Minuten Zeit.',
  'practice.question': 'Frage',
  'practice.score': 'Ergebnis',
  'practice.adjust': 'Mit den Einstellungen oben können Sie leichter oder schwerer üben als im echten Test.',
  'practice.numQuestions': 'Anzahl der Fragen',
  'practice.passThreshold': 'Bestehensgrenze',
  'practice.all': 'Alle',

  'q.number': 'Frage {n}',
  'q.official': 'Aufgabe {n}',

  'source.label': 'Quelle',
  'licence.label': 'Lizenzbedingungen',
  'about.theseQuestions': 'Über diese Fragen',
};

const TABLES: Record<Lang, Table> = { en, de };

/** The base language subtag of a BCP-47 tag we have a table for, else English. */
export function langOf(bcp47: string | undefined | null): Lang {
  const base = String(bcp47 || 'en').toLowerCase().split('-')[0];
  return base in TABLES ? (base as Lang) : 'en';
}

/**
 * Look up a string, filling `{placeholders}`.
 *
 * A missing key falls back to English and then to the key itself, and says so in
 * development. Returning the key is deliberately ugly: a blank label looks like a layout
 * bug and gets ignored, whereas `practice.askedAndPass` on screen gets fixed.
 */
export function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let s = TABLES[lang]?.[key] ?? en[key];
  if (s === undefined) {
    if (__DEV__) console.error(`[strings] no such key: ${key}`);
    return key;
  }
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

/** Bound to one language, for a screen that has already worked out which it is. */
export function translator(lang: Lang) {
  return (key: string, vars?: Record<string, string | number>) => t(lang, key, vars);
}
