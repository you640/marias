
import { GameState, Card, Suit, ContractType } from '../types';
import { getLegalMoves } from './legalMoves';
import { determineTrickWinner } from './scoring';
import { RULESET } from './ruleset';

export type Move = 
  | { type: 'CHOOSE_TRUMP'; suit: Suit }
  | { type: 'CHOOSE_CONTRACT'; contract: ContractType }
  | { type: 'DISCARD_TALON'; cards: Card[] }
  | { type: 'PLAY_CARD'; card: Card };

export const applyMove = (state: GameState, move: Move): GameState => {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const player = newState.players[newState.currentPlayerIndex];

  switch (move.type) {
    case 'CHOOSE_TRUMP':
      if (newState.phase !== 'BIDDING') return state;
      newState.trumpSuit = move.suit;
      return newState;

    case 'CHOOSE_CONTRACT':
      if (newState.phase !== 'BIDDING') return state;
      newState.contract = move.contract;
      newState.phase = 'TALON';
      return newState;

    case 'DISCARD_TALON':
      if (newState.phase !== 'TALON') return state;
      // Validation
      if (move.cards.length !== 2) throw new Error("Must discard exactly 2 cards");
      
      const isSuitGame = newState.contract !== 'Betl' && newState.contract !== 'Durch';
      if (isSuitGame && RULESET.talon_constraints.no_ace_ten_in_suit_game) {
        if (move.cards.some(c => c.rank === 'A' || c.rank === '10')) {
          throw new Error("Cannot discard Aces or Tens in a suit game");
        }
      }
      
      if (newState.contract === 'Sedma' || newState.contract === '100+7') {
        if (move.cards.some(c => c.suit === newState.trumpSuit && c.rank === '7')) {
          throw new Error("Cannot discard trump 7 when playing Sedma");
        }
      }

      newState.talon = move.cards;
      player.hand = player.hand.filter(h => !move.cards.some(m => m.suit === h.suit && m.rank === h.rank));
      newState.phase = 'PLAYING';
      return newState;

    case 'PLAY_CARD':
      if (newState.phase !== 'PLAYING') return state;
      const legal = getLegalMoves(newState, newState.currentPlayerIndex);
      if (!legal.some(l => l.suit === move.card.suit && l.rank === move.card.rank)) {
        throw new Error("Illegal card move");
      }

      // Check for melds (Hlášky)
      if (newState.currentTrick.cards.length === 0) {
        const hasKing = player.hand.some(c => c.suit === move.card.suit && c.rank === 'K') || move.card.rank === 'K';
        const hasQueen = player.hand.some(c => c.suit === move.card.suit && c.rank === 'Q') || move.card.rank === 'Q';
        if (hasKing && hasQueen) {
          const val = move.card.suit === newState.trumpSuit ? RULESET.points.MELD_TRUMP : RULESET.points.MELD_NORMAL;
          player.announcements.push({ suit: move.card.suit, value: val });
        }
      }

      // Remove card
      player.hand = player.hand.filter(h => !(h.suit === move.card.suit && h.rank === move.card.rank));
      newState.currentTrick.cards.push({ playerIndex: newState.currentPlayerIndex, card: move.card });

      if (newState.currentTrick.cards.length < 3) {
        newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % 3;
      } else {
        const winnerIdx = determineTrickWinner(
          newState.currentTrick, 
          newState.trumpSuit, 
          newState.contract === 'Betl' || newState.contract === 'Durch'
        );
        newState.players[winnerIdx].collectedCards.push(...newState.currentTrick.cards.map(tc => tc.card));
        newState.history.push(newState.currentTrick);
        newState.currentTrick = { leadPlayerIndex: winnerIdx, cards: [] };
        newState.currentPlayerIndex = winnerIdx;

        if (newState.players.every(p => p.hand.length === 0)) {
          newState.phase = 'FINISHED';
        }
      }
      return newState;

    default:
      return state;
  }
};
