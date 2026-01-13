
export type Suit = 'Srdce' | 'Listy' | 'Žalude' | 'Gule';
export type Rank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type ContractType = 'Hra' | 'Sedma' | 'Sto' | '100+7' | 'Betl' | 'Durch';

export interface PlayerState {
  id: number;
  hand: Card[];
  collectedCards: Card[];
  announcements: { suit: Suit; value: number }[];
}

export interface Trick {
  leadPlayerIndex: number;
  cards: { playerIndex: number; card: Card }[];
}

export interface ScoreRecord {
  id: string;
  timestamp: number;
  actorIndex: number;
  contract: ContractType;
  flekLevel: number; // 0=Dobrá, 1=Flek, 2=Re...
  isWon: boolean;
  isAnnounced: boolean;
  value: number; // Single unit value (how much 1 player pays)
}

export interface GameState {
  players: PlayerState[];
  talon: Card[];
  trumpSuit: Suit | null;
  contract: ContractType;
  currentPlayerIndex: number;
  currentTrick: Trick;
  history: Trick[];
  phase: 'BIDDING' | 'TALON' | 'PLAYING' | 'FINISHED';
  activePlayerIndex: number; // The Actor
  seed: number;
}

export interface DictionaryEntry {
  term: string;
  definition: string;
}

export interface Ruleset {
  version: string;
  players: number;
  deck: any;
  mechanics: any;
  legal_moves: string[];
  scoring: any;
  contracts: any;
  flek_multiplier: any;
}

export interface LegalMoveExample {
  id: number;
  description: string;
  leadCard: Card | null;
  previousPlayed: Card[];
  trumpSuit: Suit | null;
  hand: Card[];
  allowedCards: Card[];
}
