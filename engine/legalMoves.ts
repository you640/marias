
import { Card, getPriorityIndex } from './cards';
import { GameState } from './state';

export const getLegalMoves = (state: GameState, playerIndex: number): Card[] => {
  const hand = state.players[playerIndex].hand;
  const trick = state.currentTrick;
  const isBetlDurch = state.contract === 'Betl' || state.contract === 'Durch';

  if (trick.cards.length === 0) {
    return hand;
  }

  const leadCard = trick.cards[0].card;
  const trumpSuit = state.trumpSuit;
  
  // 1. Try to follow suit and beat
  const cardsInSuit = hand.filter(c => c.suit === leadCard.suit);
  if (cardsInSuit.length > 0) {
    const highestInTrick = trick.cards
      .filter(tc => tc.card.suit === leadCard.suit)
      .reduce((prev, curr) => 
        getPriorityIndex(curr.card.rank, isBetlDurch) > getPriorityIndex(prev.rank, isBetlDurch) 
          ? curr.card : prev, 
        leadCard
      );

    const beatingCards = cardsInSuit.filter(c => 
      getPriorityIndex(c.rank, isBetlDurch) > getPriorityIndex(highestInTrick.rank, isBetlDurch)
    );

    if (beatingCards.length > 0) return beatingCards;
    return cardsInSuit; // Must follow suit even if can't beat
  }

  // 2. If no suit, try to play trump (unless Betl/Durch)
  if (!isBetlDurch && trumpSuit) {
    const trumpsInHand = hand.filter(c => c.suit === trumpSuit);
    if (trumpsInHand.length > 0) {
      const highestTrumpInTrick = trick.cards
        .filter(tc => tc.card.suit === trumpSuit)
        .reduce((prev, curr) => 
          getPriorityIndex(curr.card.rank, false) > getPriorityIndex(prev.card.rank, false) 
            ? curr : prev, 
          null as any
        );

      if (highestTrumpInTrick) {
        const overtrumps = trumpsInHand.filter(c => 
          getPriorityIndex(c.rank, false) > getPriorityIndex(highestTrumpInTrick.card.rank, false)
        );
        if (overtrumps.length > 0) return overtrumps;
      }
      return trumpsInHand;
    }
  }

  // 3. Discard anything
  return hand;
};
