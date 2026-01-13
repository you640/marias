
/* Import types correctly from their definition sources */
import { GameState, Card } from '../types';
import { getLegalMoves } from './legalMoves';
import { getPriorityIndex, getRankValue } from './cards';

export const getBotMove = (state: GameState, playerIndex: number): Card => {
  const legalMoves = getLegalMoves(state, playerIndex);
  if (legalMoves.length === 0) throw new Error("No legal moves for bot");

  const isBetlDurch = state.contract === 'Betl' || state.contract === 'Durch';
  
  // Heuristic:
  // 1. If leading: Play a high card but try to save Aces/Tens for winning tricks
  if (state.currentTrick.cards.length === 0) {
    // Sort by priority, pick highest non-point card if possible
    return legalMoves.sort((a, b) => 
      getPriorityIndex(b.rank, isBetlDurch) - getPriorityIndex(a.rank, isBetlDurch)
    )[0];
  }

  // 2. If following:
  // Find cards that can win the trick
  const leadCard = state.currentTrick.cards[0].card;
  const currentWinnerIndex = determineCurrentWinner(state);
  const currentBestCard = state.currentTrick.cards.find(c => c.playerIndex === currentWinnerIndex)!.card;

  const winningMoves = legalMoves.filter(move => {
    // Simplified winning check for bot
    if (move.suit === currentBestCard.suit) {
        return getPriorityIndex(move.rank, isBetlDurch) > getPriorityIndex(currentBestCard.rank, isBetlDurch);
    }
    if (state.trumpSuit && move.suit === state.trumpSuit && currentBestCard.suit !== state.trumpSuit) {
        return true;
    }
    return false;
  });

  if (winningMoves.length > 0) {
    // Win with the SMALLEST possible winning card to save high cards
    return winningMoves.sort((a, b) => 
      getPriorityIndex(a.rank, isBetlDurch) - getPriorityIndex(b.rank, isBetlDurch)
    )[0];
  }

  // If can't win, throw away the smallest card
  return legalMoves.sort((a, b) => 
    getPriorityIndex(a.rank, isBetlDurch) - getPriorityIndex(b.rank, isBetlDurch)
  )[0];
};

function determineCurrentWinner(state: GameState): number {
    const trick = state.currentTrick;
    const isBetlDurch = state.contract === 'Betl' || state.contract === 'Durch';
    const trumpSuit = state.trumpSuit;
    let winner = trick.cards[0];

    for (let i = 1; i < trick.cards.length; i++) {
        const current = trick.cards[i];
        if (!isBetlDurch && trumpSuit) {
            if (current.card.suit === trumpSuit && winner.card.suit !== trumpSuit) winner = current;
            else if (current.card.suit === winner.card.suit && getPriorityIndex(current.card.rank, false) > getPriorityIndex(winner.card.rank, false)) winner = current;
        } else {
            if (current.card.suit === winner.card.suit && getPriorityIndex(current.card.rank, isBetlDurch) > getPriorityIndex(winner.card.rank, isBetlDurch)) winner = current;
        }
    }
    return winner.playerIndex;
}