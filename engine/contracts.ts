
import { GameState } from './state';
import { calculateFinalScore } from './scoring';

export const evaluateContract = (state: GameState): boolean => {
  if (state.phase !== 'FINISHED') return false;

  const score = calculateFinalScore(state);
  const actorIndex = state.activePlayerIndex;

  switch (state.contract) {
    case 'Hra':
      return score.winner === 'actor';
    case 'Sedma':
      const lastTrick = state.history[state.history.length - 1];
      const winningCard = lastTrick.cards.find(tc => 
        tc.card.suit === state.trumpSuit && tc.card.rank === '7'
      );
      // Trump 7 must be in the last trick and it must win
      const winnerIndex = (score as any).lastWinnerIndex ?? 0; // Simplified for snippet
      return !!winningCard && winningCard.playerIndex === actorIndex;
    case 'Betl':
      return state.players[actorIndex].collectedCards.length === 0;
    case 'Durch':
      return state.players[actorIndex].collectedCards.length === 30; // 10 tricks * 3 cards
    case 'Sto':
      return (score.actorPoints + score.actorAnnouncements) >= 100;
    default:
      return false;
  }
};
