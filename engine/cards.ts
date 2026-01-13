
export type Suit = 'Srdce' | 'Listy' | 'Žalude' | 'Gule';
export type Rank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export const SUITS: Suit[] = ['Srdce', 'Listy', 'Žalude', 'Gule'];
export const RANKS: Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const TRUMP_ORDER: Rank[] = ['7', '8', '9', 'J', 'Q', 'K', '10', 'A']; // Descending for comparison: A=7, 10=6...
// Actually, standard Mariáš priority for trick taking: A, 10, K, Q, J, 9, 8, 7
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

export const areCardsEqual = (c1: Card, c2: Card): boolean => 
  c1.suit === c2.suit && c1.rank === c2.rank;

export const hasCard = (hand: Card[], card: Card): boolean =>
  hand.some(c => areCardsEqual(c, card));
