
import { GameState } from '../types';

export const createInitialState = (seed: number): GameState => ({
  players: [
    { id: 0, hand: [], collectedCards: [], announcements: [] },
    { id: 1, hand: [], collectedCards: [], announcements: [] },
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
