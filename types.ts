
export type Suit = 'Srdce' | 'Listy' | 'Žalude' | 'Gule';
export type Rank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type GameType = 'Hra' | 'Sedma' | 'Sto' | 'Betl' | 'Durch' | '100+7';

export interface LegalMoveExample {
  id: number;
  description: string;
  leadCard: Card | null;
  previousPlayed: Card[];
  trumpSuit: Suit | null;
  hand: Card[];
  allowedCards: Card[];
  ruleViolated?: string;
}

export interface DictionaryEntry {
  term: string;
  definition: string;
}

export interface Ruleset {
  dictionary: DictionaryEntry[];
  deckModel: {
    suitGameOrder: Rank[];
    betlDurchOrder: Rank[];
  };
  scoring: {
    ace: number;
    ten: number;
    ultimo: number;
    announcement20: number;
    announcement40: number;
  };
  flekLevels: string[];
}
