
import { GameState } from '../types';
import { calculateFinalScore } from './scoring';

export const evaluateContract = (state: GameState): boolean => {
  if (state.phase !== 'FINISHED') return false;

  const score = calculateFinalScore(state);
  const actorIndex = state.activePlayerIndex;
  const actor = state.players[actorIndex];

  switch (state.contract) {
    case 'Hra':
      // Aktér musí mať viac bodov ako celá obrana dohromady
      return (score.actorPoints + score.actorAnnouncements) > (score.defensePoints + score.defenseAnnouncements);
    
    case 'Sedma':
      // Posledný štych musí vyhrať aktér a víťazná karta musí byť tromfová 7
      const lastTrick = state.history[state.history.length - 1];
      const winningCardEntry = lastTrick.cards.find(tc => 
        tc.card.suit === state.trumpSuit && tc.card.rank === '7'
      );
      // Musíme zistiť, kto reálne vyhral štych (index)
      // determineTrickWinner je v scoring.ts, tu predpokladáme, že historia štychu obsahuje info o víťazovi
      // V našej implementácii applyMove víťaz vynáša ďalší štych, takže môžeme zistiť víťaza z history.
      return !!winningCardEntry && winningCardEntry.playerIndex === actorIndex;

    case 'Sto':
      return (score.actorPoints + score.actorAnnouncements) >= 100;

    case '100+7':
      const isSto = (score.actorPoints + score.actorAnnouncements) >= 100;
      const lastT = state.history[state.history.length - 1];
      const hasSeven = lastT.cards.some(tc => tc.card.suit === state.trumpSuit && tc.card.rank === '7' && tc.playerIndex === actorIndex);
      return isSto && hasSeven;

    case 'Betl':
      // Aktér nesmie zobrať ani jeden štych
      return actor.collectedCards.length === 0;

    case 'Durch':
      // Aktér musí zobrať všetky štychy (10 štychov * 3 karty = 30)
      return actor.collectedCards.length === 30;

    default:
      return false;
  }
};
