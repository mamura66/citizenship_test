/* Every word the app says for itself, in every language it speaks.
 *
 * WHY THIS EXISTS. A German sitting the Einbürgerungstest reads German questions. Until
 * this file, the app then wrapped them in English buttons and English headings, which is
 * the same mistake as an English-language app for the US test written in British English -
 * it tells the person the product was not built for them.
 *
 * THE RULES
 *
 * 1. The interface language comes from the content pack's `language` field, not from the
 *    country code. Content is the source of truth here as everywhere, and a pack is the
 *    only thing that knows what language its questions are in.
 * 2. Nothing in here is question or answer text. Official wording is already correct in
 *    its own language and is never translated, never re-capitalised, never "improved".
 * 3. Anything missing from `de` or `es` falls back to `en` rather than showing a key. A
 *    missing translation should look like an untranslated app, not a broken one.
 * 4. `en` is the reference. The English strings are byte-for-byte what the app said before
 *    this file existed, because the United States product is live and its copy has been
 *    reviewed.
 *
 * TRANSLATION NOTES, honestly stated
 *
 * These were written by the same machine that wrote the code, and the strings marked
 * REVIEW below are the ones where a native speaker should have the final word - either
 * because the term is a term of art or because the register (formal / informal) is a
 * judgement call rather than a fact.
 *
 * - German addresses the reader as "Sie". That is what BAMF's own material does, and an
 *   official test is the wrong place to be familiar.
 * - Spanish addresses the reader as "tu". Warmer, and the ordinary register for a study
 *   app; the Instituto Cervantes manual itself is largely impersonal.
 * - Official names are left in their own language: "Einbürgerungstest", "prueba CCSE",
 *   "Bundesland". Translating the name of the exam somebody has to sit would be actively
 *   unhelpful.
 * - INTERVIEW MODE IS NOT AN INTERVIEW OUTSIDE THE UNITED STATES. The US naturalisation
 *   civics test is asked out loud by an officer. The Einbürgerungstest and the CCSE are
 *   written multiple-choice papers. So the German and Spanish copy for that mode describes
 *   what it actually does - the question is read aloud and you answer out loud - and drops
 *   the officer. The mode is still useful there; calling it an interview would not be true.
 */

const STRINGS = {
  /* ------------------------------------------------------------------ English */
  en: {
    // shell
    'boot.loading': 'Loading your account…',
    'brand': 'Prepare for Citizenship',

    // country gate
    'gate.title': "Which country's citizenship test are you taking?",
    'gate.explain': "This sets your questions, your pass mark and your local answers. It stays fixed to your account once you choose, so pick the country you're actually applying in.",
    'gate.coming': 'Coming',
    // One sentence that works whether one country is live or five. Deliberately phrased so
    // no verb has to agree with the list: "the United States" is plural in German
    // ("die Vereinigten Staaten"), which is exactly how a sentence built from
    // "{country} is live" breaks the moment it is translated.
    'gate.note': 'Today you can choose {countries}. The others are listed so you can see where this is going — each one is a content pack, not a different website.',
    'gate.note.none': 'No country is ready to choose in this browser right now. Each one is a content pack, not a different website — so this list fills in as they land.',
    'gate.setting': 'Setting up your questions…',
    'list.and': 'and',

    /* Country names, as a label on a button and as a phrase inside a sentence. Two forms
     * because "the United States" is right in prose and wrong on a button, and because the
     * article is part of the name in most languages. `.prose` falls back to the label. */
    'country.us': 'United States',
    'country.us.prose': 'the United States',
    'country.de': 'Germany',
    'country.es': 'Spain',
    'country.ca': 'Canada',
    'country.uk': 'United Kingdom',
    'country.uk.prose': 'the United Kingdom',
    'country.au': 'Australia',

    // rail
    'rail.version': 'Test version',
    'rail.versionNote': 'Study the version that applies to your own application.',
    'rail.versionsLabel': 'Which version of the {test} to study',
    'rail.versionSwitchConfirm': 'Switching test version discards the practice test you have in progress. Continue?',
    'rail.versionSwitched': 'Now studying the {label}.',
    'rail.versionFailed': 'That version could not be loaded. You are still on the one you were using.',
    'rail.mode': 'Mode',
    'rail.sections': 'Sections',
    'rail.allSections': 'All sections',
    'rail.backToSite': '← Back to the website',
    'rail.support': 'Support',
    'rail.terms': 'Terms',
    'rail.privacy': 'Privacy',
    'rail.signOut': 'Sign out',
    'who.fullAccess': 'Full access',
    'who.freeAccount': 'Free account',

    // modes
    'mode.study': 'Study',
    'mode.practice': 'Practice test',
    'mode.interview': 'Interview',
    'mode.performance': 'Performance',
    'mode.insights': 'Insights',
    'badge.paid': 'Paid',
    'badge.owner': 'Owner',

    // theme
    'theme.dark': 'Dark',
    'theme.light': 'Light',
    'theme.toDark': 'Switch to dark mode',
    'theme.toLight': 'Switch to light mode',

    // study
    'study.crumbAll': 'All sections · free forever',
    'study.title': 'Flashcards',
    'study.sub': 'Every official question, free forever. Click the card to see the accepted answers.',
    /* Used instead of the line above when the pack says the official pool is NOT published
     * and what it holds is a published practice set. Claiming "every official question"
     * over a twenty-question sample would be the plainest kind of lie, and the pack is the
     * only thing that knows which it is. */
    'study.subSubset': 'Free forever. Click the card to see the accepted answers.',
    'pack.about': 'About these questions',
    'pack.licence': 'Official material from {attribution}, reproduced under {licence}.',
    'pack.licenceLink': 'Licence terms',
    'pack.extraRule': 'One more rule',
    /* Stated on every screen that shows a question. For the German catalogue that is a
     * legal duty (section 63 UrhG requires the source), not a nicety. */
    'pack.source': 'Source: {attribution}',
    /* Alt text for a figure the question is answered from. Deliberately not a description:
     * nothing here could honestly describe a ballot paper or a locator map, and inventing
     * one would be worse than saying what the picture is for. */
    'study.figureAlt': 'The picture printed with this question in the official catalogue',
    'study.empty': 'No questions in this section.',
    'study.questionLabel': 'Question {id}',
    'study.clickReveal': 'Click to reveal',
    'study.clickBack': 'Click to go back',
    'study.acceptedAnswers': 'Accepted answers · {n}',
    'study.answer': 'Answer',
    'study.anyOne': 'Any one of these is accepted.',
    'study.officialOptions': 'The options as they are printed',
    /* Said on a card whose options are picture references. The official catalogue prints
     * the pictures; this app does not carry them, so the card says so instead of showing
     * four options reading "Bild 1" as though they were answers. */
    'study.needsPicture': 'This question is answered from pictures printed in the official catalogue. They are not reproduced here, so it is not asked in a practice test.',
    'study.needsPicturePage': 'This question is answered from pictures printed in the official catalogue (page {page}). They are not reproduced here, so it is not asked in a practice test.',
    'study.correctAnswer': 'Correct answer',
    'study.card': 'Card {n}',
    'btn.previous': 'Previous',
    'btn.nextQuestion': 'Next question',

    // practice
    'practice.crumb': 'Practice test',
    'practice.title': 'Practice test',
    'practice.sub': "In the real interview you're asked up to {asked} questions and need {pass} correct to pass. This test uses the same format.",
    'practice.subUnknown': 'This test uses the same format as the real one.',
    'practice.card': '{asked} questions · {pass} to pass',
    'practice.cardUnknown': 'Same format as the real test',
    'practice.unlimited': 'Unlimited tests are part of your access.',
    'practice.firstFree': 'Your first full test is free.',
    'practice.unavailable': 'This question pool does not say how many questions the real test asks or how many you need to pass, so a practice test in the real format cannot be built yet. Everything in Study is available.',
    'btn.startTest': 'Start test',
    'practice.questionOf': 'Question {n} of {total}',
    'practice.selectOne': 'Select one answer',
    'practice.selectN': 'Select {n} answers',
    'practice.optsLabel': '{instruction}: {question}',
    'opt.correctYours': 'Correct, your answer',
    'opt.correct': 'Correct answer',
    'opt.yoursIncorrect': 'Your answer, incorrect',
    'opt.selected': 'Selected',
    'btn.seeResults': 'See results',
    'verdict.correct': 'Correct.',
    'verdict.incorrect': 'Not correct.',
    'verdict.answerIs': 'The answer is {answers}.',
    'verdict.answersAre': 'The answers are {answers}.',

    // paused test
    'paused.title': 'You have a test in progress',
    'paused.sub': 'Paused at question {n} of {total}. Nothing you have answered is lost.',
    'paused.label': 'Paused',
    'paused.correctSoFar': '{n} correct so far · {pass} needed to pass.',
    'paused.correctSoFarNoMark': '{n} correct so far.',
    'btn.resumeTest': 'Resume test',
    'btn.discardTest': 'Discard and start a new test',
    'paused.freeNote': 'This is your free test. Resuming picks it up where you left off.',

    // results
    'results.crumb': 'Results',
    'results.pass': 'Pass',
    'results.notYet': 'Not yet',
    'results.sub': '{correct} of {total} correct ({pct}%) — you needed {pass} to pass.',
    'results.review.one': 'Review the {n} you missed',
    'results.review.other': 'Review the {n} you missed',
    'btn.backToPractice': 'Back to practice',

    // interview / read-aloud
    'interview.crumb': 'Interview',
    'interview.title': 'Interview practice',
    'interview.sub': 'The question is read aloud, the way the officer will ask it. You answer out loud, then check yourself.',
    'interview.label': 'Practice interviewer',
    'btn.readAloud': 'Read it aloud',
    'interview.noSpeech': 'Speech not supported here',
    'btn.revealAnswer': 'Reveal the answer',
    'btn.anotherQuestion': 'Another question',
    'interview.privacy': 'Your browser speaks the question. The microphone is never used and no audio is recorded.',

    // performance
    'perf.label': 'Performance',
    'perf.whereYouStand': 'Where you stand',
    'perf.onTrack': 'On track',
    'perf.notThereYet': 'Not there yet',
    'perf.headlineEmpty': 'Nothing here is estimated. Answer a question and this fills in with your own results.',
    'perf.headlineAbove': 'You are answering above the {pct}% pass mark.',
    'perf.headlineBelow': 'You are below the {pct}% pass mark.',
    'perf.headlineNoMark': 'This is your accuracy on the questions you have actually answered.',
    'perf.weakest': 'Weakest: {label} at {pct}%.',
    'perf.startWith': 'Start with {label}, at {pct}%.',
    'perf.poolSeen': 'Of the pool seen',
    'perf.testsFinished': 'Tests finished',
    'perf.dayStreak': 'Day streak',
    'perf.latestScore': 'Latest score',
    'perf.answersRecorded': 'Answers recorded',
    'perf.map': 'Your map of the test',
    'perf.notAskedYet': 'Not asked yet',
    'perf.answeredRight': 'Answered correctly',
    'perf.answeredWrong': 'Answered wrongly',
    'perf.keyRight': 'right',
    'perf.keyWrong': 'wrong',
    'perf.keyUnasked': 'not asked yet',
    'perf.scores': 'Scores · last {n}',
    'perf.answersPerDay': 'Answers per day · {days}',
    'perf.answersOn.one': '{n} answer on {when}',
    'perf.answersOn.other': '{n} answers on {when}',
    'perf.nothingOn': 'Nothing on {when}',
    'perf.accuracyBySection': 'Accuracy by section · weakest first',
    'perf.studySection': 'Study {label}, currently {pct}% correct',
    'perf.notTested.one': 'Not tested yet · {n} section',
    'perf.notTested.other': 'Not tested yet · {n} sections',
    'perf.notTestedNote': 'Shown separately on purpose: never having been asked is not the same as getting it wrong.',
    'perf.ringNone': 'No answers recorded yet',
    'perf.ringLabel': 'Accuracy {pct} percent, pass mark {passPct} percent',
    'perf.ringLabelNoMark': 'Accuracy {pct} percent',
    'perf.accuracyCap': 'ACCURACY',
    'perf.trendLabel': 'Your last {n} scores, oldest first, most recent {pct} percent',
    'perf.passMarkCap': '{pct}% pass mark',
    'btn.takeTest': 'Take a practice test',

    // paywall and purchase
    'paywall.title': '{what} is part of full access',
    'paywall.body': "Everything you're studying stays free. Full access adds unlimited practice tests and interview practice.",
    'paywall.oneTime': 'One time · no subscription',
    'paywall.tax': 'Plus any tax your country charges. Paddle shows you the total before you pay.',
    'paywall.unlockFor': 'Unlock for {price}',
    'paywall.unlimitedTests': 'Unlimited practice tests',
    'paywall.notOnSale': 'Not on sale yet',
    'paywall.salesPaused': 'Full access goes on sale shortly — our payment provider is still finishing our account checks. Everything free is available now, and there is nothing to pay to keep studying.',
    'paywall.notConfigured': 'Full access is not on sale on the website yet. Everything free is available now.',
    'paywall.opening': 'Opening checkout…',
    'paywall.windowFailed': 'The payment window could not load. Check your connection and try again.',
    'paywall.footer': 'Payment is handled by Paddle, our reseller. Your card details never reach us. One-time payment, no subscription — see <a href="/refunds">refunds</a> and <a href="/terms">terms</a>.',
    'checkout.failed': 'The checkout could not open ({detail}). Nothing has been charged. Please try again, or contact support and we will sort it out.',
    'confirm.title': 'Thank you — confirming your payment',
    'confirm.sub': 'This usually takes a couple of seconds.',
    'confirm.waiting': 'Your bank is still processing the payment. Waiting…',
    'confirm.stuck': 'Your payment went through, but the confirmation has not reached us yet. It normally arrives within a minute or two. Check again below — and if full access is still missing, send us the receipt Paddle emailed you and we will put it right straight away.',
    'btn.checkAgain': 'Check again',
    'btn.contactSupport': 'Contact support',
    'sandbox.banner': 'Paddle sandbox — payments on this page are tests, no money moves.',

    // failure
    'error.bootTitle': 'Something went wrong loading your account',
    'error.tryAgain': 'Try again',

    /* Insights is the owner's own analytics dashboard. English only, deliberately: there is
     * exactly one account that can open it, and it reads English. Routed through t() anyway
     * so it is translatable the day that stops being true. */
    'ins.crumb': 'Insights',
    'ins.title': 'Site insights',
    'ins.sub': 'Where visitors come from, and how many got as far as an account, a checkout and a payment.',
    'ins.range': '{n} days',
    'ins.loading': 'Loading…',
    'ins.notAvailable': 'Not available',
    'ins.migrationNote': 'If this says the tables are missing, the migration has not been applied to the live database yet.',
    'ins.pageViews': 'Page views',
    'ins.accountsCreated': 'Accounts created',
    'ins.checkoutsOpened': 'Checkouts opened',
    'ins.paymentsCompleted': 'Payments completed',
    'ins.refunds': 'Refunds',
    'ins.viewsPerDay': 'Page views per day · {days}',
    'ins.viewsOn.one': '{n} view on {day}',
    'ins.viewsOn.other': '{n} views on {day}',
    'ins.rangeNote': '{from} to {to} · peak {peak} in a day',
    'ins.howFar': 'How far people got',
    'ins.funnelNote': 'Four separate counts, not one journey. Nothing here identifies a visitor, so we cannot tell which view became an account.',
    'ins.whereVisitors': 'Where visitors are',
    'ins.noViews': 'No views recorded in this range yet.',
    'ins.mostViewed': 'Most-viewed pages',
    'ins.nothingRecorded': 'Nothing recorded in this range yet.',
    'ins.accountsCheckouts': 'Accounts and checkouts by country',
    'ins.accountsThenCheckouts': 'Accounts, then checkouts opened.',
    'ins.noAccounts': 'No accounts or checkouts recorded in this range yet.',
    'ins.yourVisits': 'Your own visits',
    'ins.dontCount': "Don't count my visits",
    'ins.excludedOn': 'Your visits in this browser are not counted, and Google Analytics is switched off here too. Other browsers and devices are still counted separately.',
    'ins.excludedOff': 'Your own visits are being counted, which will flatter the numbers while traffic is low.',
  },

  /* ------------------------------------------------------------------ German */
  de: {
    'boot.loading': 'Ihr Konto wird geladen…',

    // REVIEW: "Für welches Land bereiten Sie sich vor?" was chosen over a literal
    // translation because there is no single German word for "citizenship test" that
    // covers every country's exam.
    'gate.title': 'Für welches Land bereiten Sie sich auf den Einbürgerungstest vor?',
    'gate.explain': 'Das bestimmt Ihre Fragen, Ihre Bestehensgrenze und die Antworten, die von Ihrem Wohnort abhängen. Die Auswahl bleibt dauerhaft mit Ihrem Konto verknüpft – wählen Sie also das Land, in dem Sie den Antrag wirklich stellen.',
    'gate.coming': 'Bald',
    'gate.note': 'Heute können Sie {countries} wählen. Die anderen stehen hier, damit Sie sehen, wohin das führt – jedes Land ist ein Fragenpaket, keine eigene Website.',
    'gate.note.none': 'In diesem Browser steht derzeit kein Land zur Auswahl. Jedes Land ist ein Fragenpaket, keine eigene Website – diese Liste füllt sich also, sobald die Fragen da sind.',
    'gate.setting': 'Ihre Fragen werden eingerichtet…',
    'list.and': 'und',

    'country.us': 'Vereinigte Staaten',
    'country.us.prose': 'die Vereinigten Staaten',
    'country.de': 'Deutschland',
    'country.es': 'Spanien',
    'country.ca': 'Kanada',
    'country.uk': 'Vereinigtes Königreich',
    'country.uk.prose': 'das Vereinigte Königreich',
    'country.au': 'Australien',

    'rail.version': 'Testversion',
    'rail.versionNote': 'Lernen Sie die Version, die für Ihren eigenen Antrag gilt.',
    'rail.versionsLabel': 'Welche Version des {test} Sie lernen möchten',
    'rail.versionSwitchConfirm': 'Wenn Sie die Testversion wechseln, wird der laufende Übungstest verworfen. Fortfahren?',
    'rail.versionSwitched': 'Sie lernen jetzt {label}.',
    'rail.versionFailed': 'Diese Version konnte nicht geladen werden. Sie sind weiterhin bei der bisherigen.',
    'rail.mode': 'Bereich',
    'rail.sections': 'Abschnitte',
    'rail.allSections': 'Alle Abschnitte',
    'rail.backToSite': '← Zurück zur Website',
    'rail.support': 'Hilfe',
    'rail.terms': 'AGB',
    'rail.privacy': 'Datenschutz',
    'rail.signOut': 'Abmelden',
    'who.fullAccess': 'Vollzugriff',
    'who.freeAccount': 'Kostenloses Konto',

    'mode.study': 'Lernen',
    'mode.practice': 'Übungstest',
    // REVIEW: not "Interview". The Einbürgerungstest is a written multiple-choice test,
    // so this mode is named for what it does - practising out loud.
    'mode.interview': 'Laut üben',
    'mode.performance': 'Mein Stand',
    'mode.insights': 'Statistik',
    'badge.paid': 'Bezahlt',
    'badge.owner': 'Inhaber',

    'theme.dark': 'Dunkel',
    'theme.light': 'Hell',
    'theme.toDark': 'Zum dunklen Modus wechseln',
    'theme.toLight': 'Zum hellen Modus wechseln',

    'study.crumbAll': 'Alle Abschnitte · dauerhaft kostenlos',
    'study.title': 'Lernkarten',
    'study.sub': 'Alle amtlichen Fragen, dauerhaft kostenlos. Klicken Sie auf die Karte, um die anerkannten Antworten zu sehen.',
    'study.subSubset': 'Dauerhaft kostenlos. Klicken Sie auf die Karte, um die anerkannten Antworten zu sehen.',
    'pack.about': 'Über diese Fragen',
    'pack.licence': 'Amtliches Material von {attribution}, wiedergegeben unter {licence}.',
    'pack.licenceLink': 'Lizenzbedingungen',
    'pack.extraRule': 'Noch eine Regel',
    'pack.source': 'Quelle: {attribution}',
    'study.figureAlt': 'Das Bild, das im amtlichen Fragenkatalog zu dieser Frage abgedruckt ist',
    'study.empty': 'In diesem Abschnitt gibt es keine Fragen.',
    // REVIEW: the official catalogue numbers each item "Aufgabe 1", "Aufgabe 2".
    'study.questionLabel': 'Aufgabe {id}',
    'study.clickReveal': 'Klicken, um die Antwort zu sehen',
    'study.clickBack': 'Klicken, um zurückzugehen',
    'study.acceptedAnswers': 'Anerkannte Antworten · {n}',
    'study.answer': 'Antwort',
    'study.anyOne': 'Eine dieser Antworten genügt.',
    'study.officialOptions': 'Die Antwortmöglichkeiten im amtlichen Wortlaut',
    'study.needsPicture': 'Diese Frage wird anhand von Bildern beantwortet, die im amtlichen Gesamtfragenkatalog abgedruckt sind. Sie sind hier nicht wiedergegeben, deshalb kommt die Frage im Übungstest nicht vor.',
    'study.needsPicturePage': 'Diese Frage wird anhand von Bildern beantwortet, die im amtlichen Gesamtfragenkatalog abgedruckt sind (Seite {page}). Sie sind hier nicht wiedergegeben, deshalb kommt die Frage im Übungstest nicht vor.',
    'study.correctAnswer': 'Richtige Antwort',
    'study.card': 'Karte {n}',
    'btn.previous': 'Zurück',
    'btn.nextQuestion': 'Nächste Frage',

    'practice.crumb': 'Übungstest',
    'practice.title': 'Übungstest',
    // REVIEW: "Bestehensgrenze" is the term used for the pass mark; BAMF's own wording is
    // "Sie haben den Test bestanden, wenn Sie mindestens 17 Fragen richtig beantwortet
    // haben." This sentence follows that phrasing.
    'practice.sub': 'Im echten Test werden Ihnen {asked} Fragen gestellt, und Sie haben bestanden, wenn Sie mindestens {pass} richtig beantworten. Dieser Übungstest hat dasselbe Format.',
    'practice.subUnknown': 'Dieser Übungstest hat dasselbe Format wie der echte Test.',
    'practice.card': '{asked} Fragen · {pass} zum Bestehen',
    'practice.cardUnknown': 'Dasselbe Format wie der echte Test',
    'practice.unlimited': 'Unbegrenzte Übungstests sind in Ihrem Zugang enthalten.',
    'practice.firstFree': 'Ihr erster vollständiger Test ist kostenlos.',
    'practice.unavailable': 'Dieses Fragenpaket gibt nicht an, wie viele Fragen der echte Test stellt und wie viele richtig sein müssen. Ein Übungstest im echten Format lässt sich daher noch nicht erstellen. Der Lernbereich ist vollständig verfügbar.',
    'btn.startTest': 'Test starten',
    'practice.questionOf': 'Frage {n} von {total}',
    'practice.selectOne': 'Eine Antwort auswählen',
    'practice.selectN': '{n} Antworten auswählen',
    'practice.optsLabel': '{instruction}: {question}',
    'opt.correctYours': 'Richtig, Ihre Antwort',
    'opt.correct': 'Richtige Antwort',
    'opt.yoursIncorrect': 'Ihre Antwort, falsch',
    'opt.selected': 'Ausgewählt',
    'btn.seeResults': 'Ergebnis ansehen',
    'verdict.correct': 'Richtig.',
    'verdict.incorrect': 'Nicht richtig.',
    'verdict.answerIs': 'Die richtige Antwort ist {answers}.',
    'verdict.answersAre': 'Die richtigen Antworten sind {answers}.',

    'paused.title': 'Sie haben einen laufenden Test',
    'paused.sub': 'Angehalten bei Frage {n} von {total}. Nichts von dem, was Sie beantwortet haben, ist verloren.',
    'paused.label': 'Angehalten',
    'paused.correctSoFar': 'Bisher {n} richtig · {pass} zum Bestehen nötig.',
    'paused.correctSoFarNoMark': 'Bisher {n} richtig.',
    'btn.resumeTest': 'Test fortsetzen',
    'btn.discardTest': 'Verwerfen und neuen Test starten',
    'paused.freeNote': 'Das ist Ihr kostenloser Test. Beim Fortsetzen geht es dort weiter, wo Sie aufgehört haben.',

    'results.crumb': 'Ergebnis',
    'results.pass': 'Bestanden',
    'results.notYet': 'Noch nicht bestanden',
    'results.sub': '{correct} von {total} richtig ({pct} %) – zum Bestehen brauchten Sie {pass}.',
    'results.review.one': 'Die {n} falsche Antwort ansehen',
    'results.review.other': 'Die {n} falschen Antworten ansehen',
    'btn.backToPractice': 'Zurück zum Übungstest',

    'interview.crumb': 'Laut üben',
    'interview.title': 'Laut üben',
    // REVIEW: deliberately not a translation of the English. The German test has no
    // officer asking questions, so promising one would be wrong.
    'interview.sub': 'Die Frage wird vorgelesen. Sie antworten laut und prüfen sich anschließend selbst.',
    'interview.label': 'Vorgelesene Frage',
    'btn.readAloud': 'Vorlesen',
    'interview.noSpeech': 'Sprachausgabe hier nicht verfügbar',
    'btn.revealAnswer': 'Antwort anzeigen',
    'btn.anotherQuestion': 'Andere Frage',
    'interview.privacy': 'Ihr Browser liest die Frage vor. Das Mikrofon wird nie verwendet, und es wird kein Ton aufgezeichnet.',

    'perf.label': 'Mein Stand',
    'perf.whereYouStand': 'Wo Sie stehen',
    'perf.onTrack': 'Auf gutem Weg',
    'perf.notThereYet': 'Noch nicht am Ziel',
    'perf.headlineEmpty': 'Hier wird nichts geschätzt. Beantworten Sie eine Frage, und diese Seite füllt sich mit Ihren eigenen Ergebnissen.',
    'perf.headlineAbove': 'Sie antworten über der Bestehensgrenze von {pct} %.',
    'perf.headlineBelow': 'Sie liegen unter der Bestehensgrenze von {pct} %.',
    'perf.headlineNoMark': 'So genau haben Sie die Fragen beantwortet, die Sie tatsächlich bearbeitet haben.',
    'perf.weakest': 'Am schwächsten: {label} mit {pct} %.',
    // Deliberately a colon and not a preposition. "Beginnen Sie mit {label}" needs the
    // section name in the dative with an article ("mit den Allgemeinen Fragen"), and the
    // name comes out of the content pack - so no sentence here may govern its case. Seen
    // on screen as "Beginnen Sie mit Allgemeine Fragen", which is wrong German.
    'perf.startWith': 'Fangen Sie hier an: {label}, derzeit {pct} %.',
    'perf.poolSeen': 'Vom Katalog gesehen',
    'perf.testsFinished': 'Abgeschlossene Tests',
    'perf.dayStreak': 'Tage in Folge',
    'perf.latestScore': 'Letztes Ergebnis',
    'perf.answersRecorded': 'Erfasste Antworten',
    'perf.map': 'Ihre Karte des Tests',
    'perf.notAskedYet': 'Noch nicht gefragt',
    'perf.answeredRight': 'Richtig beantwortet',
    'perf.answeredWrong': 'Falsch beantwortet',
    'perf.keyRight': 'richtig',
    'perf.keyWrong': 'falsch',
    'perf.keyUnasked': 'noch nicht gefragt',
    'perf.scores': 'Ergebnisse · letzte {n}',
    'perf.answersPerDay': 'Antworten pro Tag · {days}',
    'perf.answersOn.one': '{n} Antwort am {when}',
    'perf.answersOn.other': '{n} Antworten am {when}',
    'perf.nothingOn': 'Nichts am {when}',
    'perf.accuracyBySection': 'Trefferquote nach Abschnitt · schwächste zuerst',
    'perf.studySection': '{label} lernen, derzeit {pct} % richtig',
    'perf.notTested.one': 'Noch nicht geprüft · {n} Abschnitt',
    'perf.notTested.other': 'Noch nicht geprüft · {n} Abschnitte',
    'perf.notTestedNote': 'Absichtlich getrennt aufgeführt: nie gefragt worden zu sein ist nicht dasselbe wie falsch geantwortet zu haben.',
    'perf.ringNone': 'Noch keine Antworten erfasst',
    'perf.ringLabel': 'Trefferquote {pct} Prozent, Bestehensgrenze {passPct} Prozent',
    'perf.ringLabelNoMark': 'Trefferquote {pct} Prozent',
    'perf.accuracyCap': 'TREFFERQUOTE',
    'perf.trendLabel': 'Ihre letzten {n} Ergebnisse, älteste zuerst, jüngstes {pct} Prozent',
    'perf.passMarkCap': 'Bestehensgrenze {pct} %',
    'btn.takeTest': 'Übungstest machen',

    'paywall.title': '{what} ist Teil des Vollzugriffs',
    'paywall.body': 'Alles, was Sie zum Lernen brauchen, bleibt kostenlos. Der Vollzugriff fügt unbegrenzte Übungstests und das laute Üben hinzu.',
    'paywall.oneTime': 'Einmalig · kein Abonnement',
    'paywall.tax': 'Zuzüglich der in Ihrem Land anfallenden Steuer. Paddle zeigt Ihnen den Gesamtbetrag, bevor Sie bezahlen.',
    'paywall.unlockFor': 'Für {price} freischalten',
    'paywall.unlimitedTests': 'Unbegrenzte Übungstests',
    'paywall.notOnSale': 'Noch nicht im Verkauf',
    'paywall.salesPaused': 'Der Vollzugriff ist in Kürze erhältlich – unser Zahlungsdienstleister prüft unser Konto noch. Alles Kostenlose ist jetzt verfügbar, und zum Weiterlernen müssen Sie nichts bezahlen.',
    'paywall.notConfigured': 'Der Vollzugriff ist auf der Website noch nicht erhältlich. Alles Kostenlose ist jetzt verfügbar.',
    'paywall.opening': 'Kasse wird geöffnet…',
    'paywall.windowFailed': 'Das Zahlungsfenster konnte nicht geladen werden. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
    'paywall.footer': 'Die Zahlung wird von Paddle abgewickelt, unserem Wiederverkäufer. Ihre Kartendaten erreichen uns nie. Einmalige Zahlung, kein Abonnement – siehe <a href="/refunds">Rückerstattungen</a> und <a href="/terms">AGB</a>.',
    'checkout.failed': 'Die Kasse konnte nicht geöffnet werden ({detail}). Es wurde nichts abgebucht. Bitte versuchen Sie es erneut oder wenden Sie sich an die Hilfe – wir klären das.',
    'confirm.title': 'Danke – Ihre Zahlung wird bestätigt',
    'confirm.sub': 'Das dauert normalerweise ein paar Sekunden.',
    'confirm.waiting': 'Ihre Bank verarbeitet die Zahlung noch. Bitte warten…',
    'confirm.stuck': 'Ihre Zahlung ist durchgegangen, aber die Bestätigung hat uns noch nicht erreicht. Normalerweise kommt sie innerhalb von ein bis zwei Minuten. Prüfen Sie es unten noch einmal – und falls der Vollzugriff weiterhin fehlt, senden Sie uns die Quittung, die Paddle Ihnen per E-Mail geschickt hat, dann bringen wir das sofort in Ordnung.',
    'btn.checkAgain': 'Erneut prüfen',
    'btn.contactSupport': 'Hilfe kontaktieren',
    'sandbox.banner': 'Paddle-Sandbox – Zahlungen auf dieser Seite sind Tests, es wird kein Geld bewegt.',

    'error.bootTitle': 'Beim Laden Ihres Kontos ist etwas schiefgegangen',
    'error.tryAgain': 'Erneut versuchen',
  },

  /* ------------------------------------------------------------------ Spanish */
  es: {
    'boot.loading': 'Cargando tu cuenta…',

    // REVIEW: "examen de nacionalidad" is the everyday name; the CCSE itself is a
    // "prueba", which is why the country row calls it "Prueba CCSE".
    'gate.title': '¿De qué país vas a hacer el examen de nacionalidad?',
    'gate.explain': 'Esto fija tus preguntas, tu nota de corte y las respuestas que dependen de dónde vives. Queda asociado a tu cuenta de forma permanente, así que elige el país en el que realmente vas a presentar la solicitud.',
    'gate.coming': 'Pronto',
    'gate.note': 'Hoy puedes elegir {countries}. Los demás aparecen para que veas hacia dónde va esto: cada uno es un paquete de preguntas, no otra web.',
    'gate.note.none': 'Ahora mismo no hay ningún país para elegir en este navegador. Cada país es un paquete de preguntas, no otra web, así que esta lista se irá completando a medida que lleguen.',
    'gate.setting': 'Preparando tus preguntas…',
    'list.and': 'y',

    'country.us': 'Estados Unidos',
    // No article in Spanish, so the prose form is the same as the label. Stated rather
    // than left out: an absent .prose key falls back to English, and "the United States"
    // inside a Spanish sentence is exactly the bug that would produce.
    'country.us.prose': 'Estados Unidos',
    'country.de': 'Alemania',
    'country.es': 'España',
    'country.ca': 'Canadá',
    'country.uk': 'Reino Unido',
    'country.uk.prose': 'el Reino Unido',
    'country.au': 'Australia',

    'rail.version': 'Versión del examen',
    'rail.versionNote': 'Estudia la versión que se aplica a tu propia solicitud.',
    'rail.versionsLabel': 'Qué versión de {test} quieres estudiar',
    'rail.versionSwitchConfirm': 'Si cambias de versión se descartará el examen de práctica que tienes en curso. ¿Continuar?',
    'rail.versionSwitched': 'Ahora estás estudiando {label}.',
    'rail.versionFailed': 'No se ha podido cargar esa versión. Sigues en la que estabas usando.',
    'rail.mode': 'Modo',
    // REVIEW: the CCSE manual calls its five sections "tareas". "Secciones" is the neutral
    // word and works for any country; "Tareas" would match the manual exactly.
    'rail.sections': 'Secciones',
    'rail.allSections': 'Todas las secciones',
    'rail.backToSite': '← Volver a la web',
    'rail.support': 'Ayuda',
    'rail.terms': 'Términos',
    'rail.privacy': 'Privacidad',
    'rail.signOut': 'Cerrar sesión',
    'who.fullAccess': 'Acceso completo',
    'who.freeAccount': 'Cuenta gratuita',

    'mode.study': 'Estudiar',
    'mode.practice': 'Examen de práctica',
    // REVIEW: not "entrevista". The CCSE is a written test, so this mode is named for what
    // it does - practising out loud.
    'mode.interview': 'En voz alta',
    'mode.performance': 'Tu progreso',
    'mode.insights': 'Estadísticas',
    'badge.paid': 'De pago',
    'badge.owner': 'Propietario',

    'theme.dark': 'Oscuro',
    'theme.light': 'Claro',
    'theme.toDark': 'Cambiar al modo oscuro',
    'theme.toLight': 'Cambiar al modo claro',

    'study.crumbAll': 'Todas las secciones · gratis siempre',
    'study.title': 'Tarjetas',
    'study.sub': 'Todas las preguntas oficiales, gratis siempre. Haz clic en la tarjeta para ver las respuestas aceptadas.',
    'study.subSubset': 'Gratis siempre. Haz clic en la tarjeta para ver las respuestas aceptadas.',
    'pack.about': 'Sobre estas preguntas',
    'pack.licence': 'Material oficial de {attribution}, reproducido con la licencia {licence}.',
    'pack.licenceLink': 'Términos de la licencia',
    'pack.extraRule': 'Una regla más',
    'pack.source': 'Fuente: {attribution}',
    'study.figureAlt': 'La imagen que acompaña a esta pregunta en el manual oficial',
    'study.empty': 'No hay preguntas en esta sección.',
    'study.questionLabel': 'Pregunta {id}',
    'study.clickReveal': 'Haz clic para ver la respuesta',
    'study.clickBack': 'Haz clic para volver',
    'study.acceptedAnswers': 'Respuestas aceptadas · {n}',
    'study.answer': 'Respuesta',
    'study.anyOne': 'Con cualquiera de estas es suficiente.',
    'study.officialOptions': 'Las opciones tal como están publicadas',
    'study.needsPicture': 'Esta pregunta se responde a partir de imágenes que aparecen en el manual oficial. Aquí no se reproducen, así que no se incluye en los exámenes de práctica.',
    'study.needsPicturePage': 'Esta pregunta se responde a partir de imágenes que aparecen en el manual oficial (página {page}). Aquí no se reproducen, así que no se incluye en los exámenes de práctica.',
    'study.correctAnswer': 'Respuesta correcta',
    'study.card': 'Tarjeta {n}',
    'btn.previous': 'Anterior',
    'btn.nextQuestion': 'Siguiente pregunta',

    'practice.crumb': 'Examen de práctica',
    'practice.title': 'Examen de práctica',
    // REVIEW: the Instituto Cervantes wording is "para superar la prueba hay que responder
    // correctamente al menos 15 de las 25 preguntas"; this follows it.
    'practice.sub': 'En el examen real te hacen {asked} preguntas y hay que acertar al menos {pass} para superarlo. Esta práctica usa el mismo formato.',
    'practice.subUnknown': 'Esta práctica usa el mismo formato que el examen real.',
    'practice.card': '{asked} preguntas · {pass} para superarlo',
    'practice.cardUnknown': 'El mismo formato que el examen real',
    'practice.unlimited': 'Los exámenes ilimitados están incluidos en tu acceso.',
    'practice.firstFree': 'Tu primer examen completo es gratis.',
    'practice.unavailable': 'Este paquete de preguntas no indica cuántas preguntas tiene el examen real ni cuántas hay que acertar, así que todavía no se puede montar una práctica con el formato real. Todo el apartado de estudio está disponible.',
    'btn.startTest': 'Empezar examen',
    'practice.questionOf': 'Pregunta {n} de {total}',
    'practice.selectOne': 'Elige una respuesta',
    'practice.selectN': 'Elige {n} respuestas',
    'practice.optsLabel': '{instruction}: {question}',
    'opt.correctYours': 'Correcta, tu respuesta',
    'opt.correct': 'Respuesta correcta',
    'opt.yoursIncorrect': 'Tu respuesta, incorrecta',
    'opt.selected': 'Seleccionada',
    'btn.seeResults': 'Ver resultado',
    'verdict.correct': 'Correcto.',
    'verdict.incorrect': 'Incorrecto.',
    'verdict.answerIs': 'La respuesta es {answers}.',
    'verdict.answersAre': 'Las respuestas son {answers}.',

    'paused.title': 'Tienes un examen en curso',
    'paused.sub': 'Pausado en la pregunta {n} de {total}. No se ha perdido nada de lo que has respondido.',
    'paused.label': 'Pausado',
    'paused.correctSoFar': '{n} correctas hasta ahora · {pass} para superarlo.',
    'paused.correctSoFarNoMark': '{n} correctas hasta ahora.',
    'btn.resumeTest': 'Continuar el examen',
    'btn.discardTest': 'Descartar y empezar otro',
    'paused.freeNote': 'Este es tu examen gratuito. Al continuar retomas donde lo dejaste.',

    'results.crumb': 'Resultado',
    // REVIEW: the CCSE result is reported as APTO / NO APTO. "Apto" and "Todavía no" keep
    // that vocabulary without printing a grade the app has not awarded.
    'results.pass': 'Apto',
    'results.notYet': 'Todavía no',
    'results.sub': '{correct} de {total} correctas ({pct} %) — necesitabas {pass} para superarlo.',
    'results.review.one': 'Repasa la {n} que has fallado',
    'results.review.other': 'Repasa las {n} que has fallado',
    'btn.backToPractice': 'Volver a la práctica',

    'interview.crumb': 'En voz alta',
    'interview.title': 'Práctica en voz alta',
    // REVIEW: deliberately not a translation of the English. There is no examiner asking
    // the CCSE out loud, so promising one would be wrong.
    'interview.sub': 'La pregunta se lee en voz alta. Tú respondes en voz alta y después te corriges.',
    'interview.label': 'Pregunta leída',
    'btn.readAloud': 'Leer en voz alta',
    'interview.noSpeech': 'La lectura en voz alta no está disponible aquí',
    'btn.revealAnswer': 'Ver la respuesta',
    'btn.anotherQuestion': 'Otra pregunta',
    'interview.privacy': 'Tu navegador lee la pregunta. El micrófono no se usa nunca y no se graba ningún audio.',

    'perf.label': 'Tu progreso',
    'perf.whereYouStand': 'Cómo vas',
    'perf.onTrack': 'Vas bien',
    'perf.notThereYet': 'Aún no llegas',
    'perf.headlineEmpty': 'Aquí no se estima nada. Responde una pregunta y esto se irá completando con tus propios resultados.',
    'perf.headlineAbove': 'Estás respondiendo por encima de la nota de corte del {pct} %.',
    'perf.headlineBelow': 'Estás por debajo de la nota de corte del {pct} %.',
    'perf.headlineNoMark': 'Este es tu acierto en las preguntas que has respondido de verdad.',
    'perf.weakest': 'Lo más flojo: {label}, con un {pct} %.',
    'perf.startWith': 'Empieza por {label}, con un {pct} %.',
    'perf.poolSeen': 'Del total de preguntas vistas',
    'perf.testsFinished': 'Exámenes terminados',
    'perf.dayStreak': 'Días seguidos',
    'perf.latestScore': 'Último resultado',
    'perf.answersRecorded': 'Respuestas registradas',
    'perf.map': 'Tu mapa del examen',
    'perf.notAskedYet': 'Todavía sin preguntar',
    'perf.answeredRight': 'Respondida correctamente',
    'perf.answeredWrong': 'Respondida mal',
    'perf.keyRight': 'correctas',
    'perf.keyWrong': 'falladas',
    'perf.keyUnasked': 'todavía sin preguntar',
    'perf.scores': 'Resultados · últimos {n}',
    'perf.answersPerDay': 'Respuestas por día · {days}',
    'perf.answersOn.one': '{n} respuesta el {when}',
    'perf.answersOn.other': '{n} respuestas el {when}',
    'perf.nothingOn': 'Nada el {when}',
    'perf.accuracyBySection': 'Acierto por sección · las más flojas primero',
    'perf.studySection': 'Estudiar {label}, ahora mismo un {pct} % de acierto',
    'perf.notTested.one': 'Sin examinar todavía · {n} sección',
    'perf.notTested.other': 'Sin examinar todavía · {n} secciones',
    'perf.notTestedNote': 'Se muestran aparte a propósito: que nunca te lo hayan preguntado no es lo mismo que fallarlo.',
    'perf.ringNone': 'Todavía no hay respuestas registradas',
    'perf.ringLabel': 'Acierto {pct} por ciento, nota de corte {passPct} por ciento',
    'perf.ringLabelNoMark': 'Acierto {pct} por ciento',
    'perf.accuracyCap': 'ACIERTO',
    'perf.trendLabel': 'Tus últimos {n} resultados, del más antiguo al más reciente, el último un {pct} por ciento',
    'perf.passMarkCap': 'Nota de corte {pct} %',
    'btn.takeTest': 'Hacer un examen de práctica',

    'paywall.title': '{what} forma parte del acceso completo',
    'paywall.body': 'Todo lo que estás estudiando sigue siendo gratis. El acceso completo añade exámenes de práctica ilimitados y la práctica en voz alta.',
    'paywall.oneTime': 'Un solo pago · sin suscripción',
    'paywall.tax': 'Más los impuestos que cobre tu país. Paddle te muestra el total antes de pagar.',
    'paywall.unlockFor': 'Desbloquear por {price}',
    'paywall.unlimitedTests': 'Exámenes de práctica ilimitados',
    'paywall.notOnSale': 'Todavía no está a la venta',
    'paywall.salesPaused': 'El acceso completo estará a la venta en breve: nuestro proveedor de pagos aún está terminando de verificar nuestra cuenta. Todo lo gratuito está disponible ya, y no hay que pagar nada para seguir estudiando.',
    'paywall.notConfigured': 'El acceso completo todavía no está a la venta en la web. Todo lo gratuito está disponible ya.',
    'paywall.opening': 'Abriendo el pago…',
    'paywall.windowFailed': 'No se ha podido cargar la ventana de pago. Comprueba tu conexión e inténtalo de nuevo.',
    'paywall.footer': 'El pago lo gestiona Paddle, nuestro revendedor. Los datos de tu tarjeta no llegan nunca a nosotros. Pago único, sin suscripción: consulta <a href="/refunds">reembolsos</a> y <a href="/terms">términos</a>.',
    'checkout.failed': 'No se ha podido abrir el pago ({detail}). No se ha cobrado nada. Inténtalo de nuevo o escribe a ayuda y lo resolvemos.',
    'confirm.title': 'Gracias — estamos confirmando tu pago',
    'confirm.sub': 'Normalmente tarda un par de segundos.',
    'confirm.waiting': 'Tu banco todavía está procesando el pago. Esperando…',
    'confirm.stuck': 'Tu pago se ha realizado, pero la confirmación aún no nos ha llegado. Normalmente llega en uno o dos minutos. Vuelve a comprobarlo abajo y, si sigue faltando el acceso completo, mándanos el recibo que te ha enviado Paddle por correo y lo arreglamos enseguida.',
    'btn.checkAgain': 'Comprobar de nuevo',
    'btn.contactSupport': 'Contactar con ayuda',
    'sandbox.banner': 'Sandbox de Paddle — los pagos de esta página son pruebas, no se mueve dinero.',

    'error.bootTitle': 'Algo ha ido mal al cargar tu cuenta',
    'error.tryAgain': 'Inténtalo de nuevo',
  },
};

/* ------------------------------------------------------------------ the machinery */

const FALLBACK_LANG = 'en';
let currentLang = FALLBACK_LANG;
/* The full BCP-47 tag as the pack gave it, which is what goes on <html lang> and what
   dates are formatted against. `currentLang` is just its base, for looking strings up. */
let currentTag = FALLBACK_LANG;

/** The languages this build actually has strings for. */
const LANGUAGES = Object.keys(STRINGS);

/** Keys asked for and not found, reported once each. A missing key is a bug in the code,
 *  not in the translation, so it belongs in the console rather than on screen. */
const missing = new Set();

function raw(lang, key) {
  const table = STRINGS[lang];
  return table ? table[key] : undefined;
}

/** Fills {placeholders}. Values are inserted as text by the caller in every case except
 *  the two strings that carry links (paywall.footer), which are written as HTML on
 *  purpose - see the call site. */
function fill(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name) =>
    (Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole));
}

/** One string, in the current language, falling back to English. */
function t(key, vars) {
  let s = raw(currentLang, key);
  if (s === undefined) s = raw(FALLBACK_LANG, key);
  if (s === undefined) {
    if (!missing.has(key)) { missing.add(key); console.error(`missing string: ${key}`); }
    return key;
  }
  return fill(s, vars);
}

/** A string in the current language only, or undefined.
 *
 *  For the handful of places where falling back to English would be worse than showing
 *  nothing - a country name's in-sentence form, where the English fallback would drop "the
 *  United States" into the middle of a Spanish sentence. Everything else wants t(). */
function tOwn(key, vars) {
  const s = raw(currentLang, key);
  return s === undefined ? undefined : fill(s, vars);
}

/** A string with a one/other form. German and Spanish both split at exactly one, the same
 *  as English, so one rule covers all three. A language with more forms would need its own
 *  rule here rather than more keys. */
function tn(key, n, vars) {
  return t(`${key}.${n === 1 ? 'one' : 'other'}`, { n, ...vars });
}

/** Sets the interface language, and tells the document about it.
 *
 *  <html lang> is not decoration: it is what a screen reader uses to choose a voice, and
 *  what a browser uses to pick hyphenation and quotation marks. German questions read out
 *  by an English voice are close to unintelligible. */
function baseTag(lang) {
  return String(lang || '').toLowerCase().split('-')[0];
}

function setLanguage(lang) {
  // A pack's `language` is a BCP-47 tag and may carry a region: "en-AU", "de-DE", "es-ES".
  // The strings are per language, so the region is dropped for the lookup - but the full
  // tag is what goes on <html lang>, because a browser choosing a voice or a date format
  // should have the region if the pack knew it.
  const next = LANGUAGES.includes(baseTag(lang)) ? baseTag(lang) : FALLBACK_LANG;
  currentLang = next;
  currentTag = /^[a-z]{2}(-[a-zA-Z]{2})?$/.test(String(lang || '')) ? String(lang) : next;
  if (typeof document !== 'undefined') document.documentElement.setAttribute('lang', currentTag);
  return next;
}

const currentLanguage = () => currentLang;

/** The language to use before any pack has loaded - on the country picker, which is the
 *  one screen shown to an account that has no country and therefore no pack. The browser's
 *  own preference is the only signal available there, and it is a better guess than
 *  English-for-everybody. Once a pack loads, its language wins. */
function preferredLanguage() {
  const wanted = (typeof navigator !== 'undefined' && navigator.languages && navigator.languages.length)
    ? navigator.languages
    : [(typeof navigator !== 'undefined' && navigator.language) || FALLBACK_LANG];
  for (const tag of wanted) {
    if (LANGUAGES.includes(baseTag(tag))) return baseTag(tag);
  }
  return FALLBACK_LANG;
}

/** Locale for dates and numbers. The pack's full tag when it had one, so an Australian
 *  pack formats dates as en-AU rather than as en-US. */
const currentLocale = () => currentTag;
