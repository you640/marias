
/* Import types correctly from their definition sources */
import { GameState, Card, Suit } from '../types';
import { getLegalMoves } from './legalMoves';
import { getPriorityIndex, getRankValue, SUITS } from './cards';
import { determineTrickWinner } from './scoring';

export const getBotMove = (state: GameState, playerIndex: number): Card => {
  const legalMoves = getLegalMoves(state, playerIndex);
  if (legalMoves.length === 0) throw new Error("No legal moves for bot");

  const isBetlDurch = state.contract === 'Betl' || state.contract === 'Durch';
  const actorIndex = state.activePlayerIndex;
  const isDefense = playerIndex !== actorIndex;
  
  // Teammate logic: in Mariáš, the 2 non-actors play together.
  const teammateIndex = isDefense 
    ? [0, 1, 2].find(i => i !== playerIndex && i !== actorIndex) ?? -1
    : -1;

  // Track cards played to identify "boss" cards (highest remaining in suit)
  const playedCards = [
    ...state.history.flatMap(t => t.cards.map(tc => tc.card)),
    ...state.currentTrick.cards.map(tc => tc.card)
  ];

  const isBossCard = (card: Card): boolean => {
    if (isBetlDurch) return false; // Complexity of Betl/Durch bossing is different
    const suitCardsPlayed = playedCards.filter(c => c.suit === card.suit);
    const suitCardsInHand = state.players[playerIndex].hand.filter(c => c.suit === card.suit);
    
    // Total 8 cards per suit. If (played + in hand) includes all ranks higher than 'card', then 'card' is boss.
    const myPriority = getPriorityIndex(card.rank, false);
    for (let p = myPriority + 1; p < 8; p++) {
      const higherRank = getRankByPriority(p, false);
      const isHigherPlayed = suitCardsPlayed.some(c => c.rank === higherRank);
      const isHigherInHand = suitCardsInHand.some(c => c.rank === higherRank);
      if (!isHigherPlayed && !isHigherInHand) return false;
    }
    return true;
  };

  // 1. LEADING STRATEGY
  if (state.currentTrick.cards.length === 0) {
    // A. If we have a "Boss" card, lead it to win the trick.
    const bossCards = legalMoves.filter(isBossCard);
    if (bossCards.length > 0) {
      // Prioritize points if it's a boss card
      return bossCards.sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank))[0];
    }

    // B. If we are defense and have a strong trump hand, maybe draw trumps? 
    // (Simplified: just play a safe non-point card if we don't have a boss)
    const nonPoints = legalMoves.filter(c => getRankValue(c.rank) === 0 && c.suit !== state.trumpSuit);
    if (nonPoints.length > 0) {
      // Play highest non-point to force opponents
      return nonPoints.sort((a, b) => getPriorityIndex(b.rank, isBetlDurch) - getPriorityIndex(a.rank, isBetlDurch))[0];
    }

    // C. Default: play highest card we have
    return legalMoves.sort((a, b) => getPriorityIndex(b.rank, isBetlDurch) - getPriorityIndex(a.rank, isBetlDurch))[0];
  }

  // 2. FOLLOWING STRATEGY
  const currentWinnerIdx = determineCurrentWinner(state);
  const currentBestCard = state.currentTrick.cards.find(c => c.playerIndex === currentWinnerIdx)!.card;
  const isTeammateWinning = currentWinnerIdx === teammateIndex;

  const winningMoves = legalMoves.filter(move => {
    if (move.suit === currentBestCard.suit) {
      return getPriorityIndex(move.rank, isBetlDurch) > getPriorityIndex(currentBestCard.rank, isBetlDurch);
    }
    if (!isBetlDurch && state.trumpSuit && move.suit === state.trumpSuit && currentBestCard.suit !== state.trumpSuit) {
      return true;
    }
    return false;
  });

  if (winningMoves.length > 0) {
    // If teammate is already winning and we are in defense
    if (isTeammateWinning && isDefense) {
      // If we are the last player, let teammate keep the trick unless we have points to "grease"
      const isLastPlayer = state.currentTrick.cards.length === 2;
      if (isLastPlayer) {
        // Can we give teammate points?
        const points = legalMoves.filter(c => getRankValue(c.rank) > 0);
        if (points.length > 0) return points.sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank))[0];
      }
      // Otherwise win cheaply if we really want the lead, or play smallest legal
      return legalMoves.sort((a, b) => getPriorityIndex(a.rank, isBetlDurch) - getPriorityIndex(b.rank, isBetlDurch))[0];
    }

    // If opponent is winning, win as cheaply as possible
    return winningMoves.sort((a, b) => getPriorityIndex(a.rank, isBetlDurch) - getPriorityIndex(b.rank, isBetlDurch))[0];
  }

  // 3. DISCARDING STRATEGY (Cannot win)
  if (isTeammateWinning && isDefense) {
    // "Grease" teammate: Throw points (A, 10)
    const points = legalMoves.filter(c => getRankValue(c.rank) > 0);
    if (points.length > 0) {
      return points.sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank))[0];
    }
  }

  // Throw "Garbage": Small non-trump cards of suits that are already "broken" (opponents played them)
  const nonTrumps = legalMoves.filter(c => c.suit !== state.trumpSuit);
  if (nonTrumps.length > 0) {
    // Sort by rank (lowest first) and priority
    return nonTrumps.sort((a, b) => {
      const valA = getPriorityIndex(a.rank, isBetlDurch);
      const valB = getPriorityIndex(b.rank, isBetlDurch);
      return valA - valB;
    })[0];
  }

  // Absolute last resort
  return legalMoves.sort((a, b) => getPriorityIndex(a.rank, isBetlDurch) - getPriorityIndex(b.rank, isBetlDurch))[0];
};

function getRankByPriority(priority: number, isBetlDurch: boolean): string {
  const order = isBetlDurch 
    ? ['7', '8', '9', '10', 'J', 'Q', 'K', 'A']
    : ['7', '8', '9', 'J', 'Q', 'K', '10', 'A'];
  return order[priority];
}

function determineCurrentWinner(state: GameState): number {
  const trick = state.currentTrick;
  const isBetlDurch = state.contract === 'Betl' || state.contract === 'Durch';
  const trumpSuit = state.trumpSuit;
  let winner = trick.cards[0];

  for (let i = 1; i < trick.cards.length; i++) {
    const current = trick.cards[i];
    const best = winner;
    const currentPriority = getPriorityIndex(current.card.rank, isBetlDurch);
    const bestPriority = getPriorityIndex(best.card.rank, isBetlDurch);

    if (!isBetlDurch && trumpSuit) {
      if (current.card.suit === trumpSuit && best.card.suit !== trumpSuit) {
        winner = current;
      } else if (current.card.suit === trumpSuit && best.card.suit === trumpSuit) {
        if (currentPriority > bestPriority) winner = current;
      } else if (current.card.suit === best.card.suit && currentPriority > bestPriority) {
        winner = current;
      }
    } else {
      if (current.card.suit === trick.cards[0].card.suit && currentPriority > bestPriority) {
        winner = current;
      }
    }
  }
  return winner.playerIndex;
}
