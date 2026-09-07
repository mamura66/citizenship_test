// What each official USCIS section covers, in plain language.
//
// Deliberately phrased as *what to review*, never as the facts themselves. The
// facts live in the official question set, where they are sourced and verifiable;
// restating them here would create a second, unsourced copy that could drift out
// of date or contradict USCIS. So a topic description tells you what ground the
// section covers, and the flashcards give you the official answers.
//
// Keys are category ids from content/us/civics-2025.json and civics-2008.json.
// The two test versions name some sections differently, so both are keyed.

export const TOPIC_GUIDE: Record<string, string> = {
  'am-gov-principles':
    'The founding ideas: what the Constitution and the Declaration of Independence do, the Bill of Rights, the rule of law, and why power is split across three branches.',
  'principles-of-democracy':
    'The founding ideas: what the Constitution and the Declaration of Independence do, the Bill of Rights, the rule of law, and why power is split across three branches.',
  'am-gov-system':
    'How the three branches work together: who writes, signs and vetoes laws, the numbers and term lengths for Congress and the President, and the roles of the Cabinet and the Supreme Court.',
  'system-of-government':
    'How the three branches work together: who writes, signs and vetoes laws, the numbers and term lengths for Congress and the President, and the roles of the Cabinet and the Supreme Court.',
  'rights-responsibilities':
    "Citizens' rights and duties: the First Amendment freedoms, who may vote and how, and the promises made in the Oath of Allegiance.",
  'colonial-independence':
    'The colonial period and the road to independence: why colonists came, the Declaration of Independence, the Constitutional Convention, and what the founders did.',
  '1800s':
    "The 1800s: how the country grew, the century's wars, the Civil War and its causes, Lincoln's role, and the end of slavery.",
  'recent-history':
    'The 1900s onward: the World Wars, the Cold War, the civil rights movement, September 11, and the people and events USCIS lists for this period.',
  'geography-symbols-holidays':
    'US geography (oceans, rivers, borders, the capital), the national symbols (the flag, the anthem, the Statue of Liberty) and the national holidays.',
  geography:
    'US geography: the oceans, the longest rivers, the countries on each border, the capital, and the territories.',
  symbols:
    "The national symbols: what the flag's stripes and stars stand for, the national anthem, and the Statue of Liberty.",
  holidays: 'The national holidays USCIS lists, especially Independence Day and its date.',
};

/** Falls back to a safe, non-factual line for any section without a written guide. */
export function topicGuideFor(categoryId: string): string {
  return TOPIC_GUIDE[categoryId] ?? 'Review this section of the official USCIS study materials.';
}

/** "AMERICAN GOVERNMENT" -> "American Government" for display. */
export function titleCaseSection(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+|\/)/)
    .map((w) => (w.trim() && w !== '/' ? w[0].toUpperCase() + w.slice(1) : w))
    .join('');
}

/** Strips the official "A: " / "B: " prefix from a subsection label. */
export function subsectionLabel(s: string): string {
  return s.replace(/^[A-Z]:\s*/, '');
}
