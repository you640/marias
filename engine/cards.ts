
import { Suit, Rank } from '../types';

export const SUITS: Suit[] = ['Srdce', 'Listy', 'Žalude', 'Gule'];
export const RANKS: Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Standard Mariáš Priority: A, 10, K, Q, J, 9, 8, 7
// Higher index = higher priority
export const STANDARD_PRIORITY: Rank[] = ['7', '8', '9', 'J', 'Q', 'K', '10', 'A'];
export const BETL_PRIORITY: Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const getRankValue = (rank: Rank): number => {
  if (rank === 'A' || rank === '10') return 10;
  return 0;
};

export const getPriorityIndex = (rank: Rank, isBetlDurch: boolean): number => {
  return isBetlDurch 
    ? BETL_PRIORITY.indexOf(rank) 
    : STANDARD_PRIORITY.indexOf(rank);
};
