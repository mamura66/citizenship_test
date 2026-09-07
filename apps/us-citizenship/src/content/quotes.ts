// Words for people who are about to become Americans.
//
// Selection rule: every quote must speak TO this audience - lawful permanent
// residents who have built a life here and are about to make it official. The
// tone is dignity and belonging, never pity. So: no "huddled masses", no legal
// boilerplate, no schoolbook passages everyone has already memorized.
//
// Verification rule: every quote is (a) a U.S. government work or otherwise
// public domain and (b) verified word-for-word against the primary source
// listed (presidential libraries, National Archives, UCSB American Presidency
// Project). Do NOT add quotes from memory or quote-aggregator sites - popular
// "presidential" quotes are frequently paraphrased or fabricated, and a
// citizenship app misquoting a president would undercut the trust it exists to
// build. Excerpts of longer passages use an ellipsis; attribution and source
// stay with each quote so the app can always show where the words come from.
//
// Balance rule: speakers span both parties and two centuries on purpose.

export interface Quote {
  text: string;
  attribution: string;
  source: string;
  sourceUrl: string;
}

export const QUOTES: Quote[] = [
  {
    text: 'You can go to live in France, but you cannot become a Frenchman. You can go to live in Germany or Turkey or Japan, but you cannot become a German, a Turk, or a Japanese. But anyone, from any corner of the Earth, can come to live in America and become an American.',
    attribution: 'Ronald Reagan, January 19, 1989',
    source: 'Remarks at the Presentation Ceremony for the Presidential Medal of Freedom - Ronald Reagan Presidential Library',
    sourceUrl: 'https://www.reaganlibrary.gov/archives/speech/remarks-presentation-ceremony-presidential-medal-freedom-5',
  },
  {
    text: 'Our beautiful America was built by a nation of strangers.',
    attribution: 'Lyndon B. Johnson, Liberty Island, October 3, 1965',
    source: 'Remarks at the Signing of the Immigration Bill - LBJ Presidential Library',
    sourceUrl: 'https://www.lbjlibrary.org/object/text/remarks-signing-immigration-bill-liberty-island-new-york-10-03-1965',
  },
  {
    text: 'Remember always that all of us, and you and I especially, are descended from immigrants and revolutionists.',
    attribution: 'Franklin D. Roosevelt, April 21, 1938',
    source: 'Remarks to the Daughters of the American Revolution - The American Presidency Project, UC Santa Barbara',
    sourceUrl: 'https://www.presidency.ucsb.edu/documents/remarks-the-daughters-the-american-revolution-washington-dc',
  },
  {
    text: 'The land flourished because it was fed from so many sources—because it was nourished by so many cultures and traditions and peoples.',
    attribution: 'Lyndon B. Johnson, Liberty Island, October 3, 1965',
    source: 'Remarks at the Signing of the Immigration Bill - LBJ Presidential Library',
    sourceUrl: 'https://www.lbjlibrary.org/object/text/remarks-signing-immigration-bill-liberty-island-new-york-10-03-1965',
  },
  {
    text: '…let me assert my firm belief that the only thing we have to fear is fear itself…',
    attribution: 'Franklin D. Roosevelt, Inaugural Address, March 4, 1933',
    source: 'The American Presidency Project, UC Santa Barbara',
    sourceUrl: 'https://www.presidency.ucsb.edu/documents/inaugural-address-8',
  },
  {
    // Original 18th-century spelling and ampersands preserved from the manuscript edition.
    text: 'The bosom of America is open to receive not only the opulent & respectable Stranger, but the oppressed & persecuted of all Nations & Religions…',
    attribution: 'George Washington, to newly arrived Irish immigrants in New York, December 2, 1783',
    source: 'The Papers of George Washington - Founders Online, National Archives',
    sourceUrl: 'https://founders.archives.gov/documents/Washington/99-01-02-12127',
  },
  {
    text: '…that government of the people, by the people, for the people, shall not perish from the earth.',
    attribution: 'Abraham Lincoln, Gettysburg Address, November 19, 1863',
    source: 'Bliss copy (the text inscribed in the Lincoln Memorial)',
    sourceUrl: 'https://www.abrahamlincolnonline.org/lincoln/speeches/gettysburg.htm',
  },
  {
    text: '…we are a country that is bound together not simply by ethnicity or bloodlines, but by fidelity to a set of ideas.',
    attribution: 'Barack Obama, naturalization ceremony at the White House, July 4, 2012',
    source: 'Remarks by the President at Naturalization Ceremony - White House archives, National Archives',
    sourceUrl: 'https://obamawhitehouse.archives.gov/the-press-office/2012/07/04/remarks-president-naturalization-ceremony',
  },
];

/** Shown on the very first screen. Reagan's line is the single clearest statement of what this user is about to do. */
export const WELCOME_QUOTE = QUOTES[0];

/** Deterministic "quote of the day": same quote all day, rotates daily. */
export function getDailyQuote(date: Date = new Date()): Quote {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}
