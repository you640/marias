
import { GameState, PlayerState } from './state';
import { getRankValue, getPriorityIndex } from './cards';
import { POINTS_ULTIMO } from './rules';

export interface ScoreResult {
  actorPoints: number;
  defensePoints: number;
  actorAnnouncements: number;
  defenseAnnouncements: number;
  winner: 'actor' | 'defense';
}

export const calculateFinalScore = (state: GameState): ScoreResult => {
  const actorIndex = state.activePlayerIndex;
  
  const getPoints = (player: PlayerState) => 
    player.collectedCards.reduce((acc, c) => acc + getRankValue(c.rank), 0);
  
  const getAnnouncePoints = (player: PlayerState) => 
    player.announcements.reduce((acc, a) => acc + a.value, 0);

  const actor = state.players[actorIndex];
  const defense = state.players.filter(p => p.id !== actorIndex);

  let actorPoints = getPoints(actor);
  let defensePoints = defense.reduce((acc, p) => acc + getPoints(p), 0);

  // Ultimo
  const lastTrick = state.history[state.history.length - 1];
  const lastWinnerIndex = determineTrickWinner(lastTrick, state.trumpSuit, state.contract === 'Betl' || state.contract === 'Durch');
  if (lastWinnerIndex === actorIndex) actorPoints += POINTS_ULTIMO;
  else defensePoints += POINTS_ULTIMO;

  const actorAnnouncements = getAnnouncePoints(actor);
  const defenseAnnouncements = defense.reduce((acc, p) => acc + getAnnouncePoints(p), 0);

  const actorTotal = actorPoints + actorAnnouncements;
  const defenseTotal = defensePoints + defenseAnnouncements;

  return {
    actorPoints,
    defensePoints,
    actorAnnouncements,
    defenseAnnouncements,
    winner: actorTotal > defenseTotal ? 'actor' : 'defense'
  };
};

export const determineTrickWinner = (trick: any, trumpSuit: any, isBetlDurch: boolean): number => {
  const leadCard = trick.cards[0].card;
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
      if (current.card.suit === leadCard.suit && best.card.suit === leadCard.suit) {
        if (currentPriority > bestPriority) winner = current;
      }
    }
  }
  return winner.playerIndex;
};
