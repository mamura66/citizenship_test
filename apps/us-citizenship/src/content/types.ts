export interface CivicsQuestion {
  id: number;
  question: string;
  answers: string[];
  senior65_20: boolean;
  stateSpecific: boolean;
  stateSpecificType?: 'senator' | 'houseRep' | 'governor' | 'capital';
  dynamic?: boolean;
  note?: string;
}

export interface CivicsCategory {
  id: string;
  section: string;
  subsection: string;
  questions: CivicsQuestion[];
}

export interface CivicsTestSet {
  version: '2008' | '2025';
  source: string;
  sourceRetrieved: string;
  totalQuestions: number;
  askedPerInterview: number;
  passRequirement: number;
  categories: CivicsCategory[];
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
