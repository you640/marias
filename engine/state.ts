
import { Card, Suit } from './cards';

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

export interface GameState {
  players: PlayerState[];
  talon: Card[];
  trumpSuit: Suit | null;
  contract: ContractType;
  currentPlayerIndex: number;
  currentTrick: Trick;
  history: Trick[];
  phase: 'BIDDING' | 'TALON' | 'PLAYING' | 'FINISHED';
  activePlayerIndex: number; // The "Actor"
  seed: number;
}

export const createInitialState = (seed: number): GameState => ({
  players: [
    { id: 0, hand: [], collectedCards: [], announcements: [] },
    { id: 1, hand: [], collectedCards: [], announcements: [] },
    // Fixed duplicate id property here
    { id: 2, hand: [], collectedCards: [], announcements: [] }
  ],
  talon: [],
  trumpSuit: null,
  contract: 'Hra',
  currentPlayerIndex: 0,
  currentTrick: { leadPlayerIndex: 0, cards: [] },
  history: [],
  phase: 'BIDDING',
  activePlayerIndex: 0,
  seed
});
