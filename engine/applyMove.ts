
import { GameState, Card } from '../types';
import { getLegalMoves } from './legalMoves';
import { determineTrickWinner } from './scoring';
import { ANNOUNCEMENT_NORMAL, ANNOUNCEMENT_TRUMP } from './rules';

export const applyMove = (state: GameState, card: Card): GameState => {
  if (state.phase !== 'PLAYING') return state;

  const playerIndex = state.currentPlayerIndex;
  const legalMoves = getLegalMoves(state, playerIndex);
  
  const isLegal = legalMoves.some(m => m.suit === card.suit && m.rank === card.rank);
  if (!isLegal) throw new Error("Illegal move");

  // New state copy
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const player = newState.players[playerIndex];

  // Remove card from hand
  player.hand = player.hand.filter(c => !(c.suit === card.suit && c.rank === card.rank));

  // Handle Announcements (Hlášky)
  const isLead = newState.currentTrick.cards.length === 0;
  if (isLead) {
    const hasKing = player.hand.some(c => c.suit === card.suit && c.rank === 'K') || card.rank === 'K';
    const hasQueen = player.hand.some(c => c.suit === card.suit && c.rank === 'Q') || card.rank === 'Q';
    if (hasKing && hasQueen) {
      const value = card.suit === newState.trumpSuit ? ANNOUNCEMENT_TRUMP : ANNOUNCEMENT_NORMAL;
      player.announcements.push({ suit: card.suit, value });
    }
  }

  // Add to trick
  newState.currentTrick.cards.push({ playerIndex, card });

  // Advance player
  if (newState.currentTrick.cards.length < 3) {
    newState.currentPlayerIndex = (playerIndex + 1) % 3;
  } else {
    // End of trick
    const winnerIndex = determineTrickWinner(
      newState.currentTrick, 
      newState.trumpSuit, 
      newState.contract === 'Betl' || newState.contract === 'Durch'
    );
    
    // Winner collects cards
    newState.players[winnerIndex].collectedCards.push(...newState.currentTrick.cards.map(tc => tc.card));
    
    // Archive trick
    newState.history.push(newState.currentTrick);
    newState.currentTrick = { leadPlayerIndex: winnerIndex, cards: [] };
    newState.currentPlayerIndex = winnerIndex;

    // Check if game finished
    if (newState.players.every(p => p.hand.length === 0)) {
      newState.phase = 'FINISHED';
    }
  }

  return newState;
};