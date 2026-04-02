import type { Rank, Suit, Card } from '../types';

export const SUITS: Suit[] = ['h', 'd', 'c', 's'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

/** Prime numbers for each rank — used in hand evaluation */
export const RANK_PRIMES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 5, '5': 7, '6': 11, '7': 13,
  '8': 17, '9': 19, 'T': 23, 'J': 29, 'Q': 31, 'K': 37, 'A': 41,
};

/** Numeric value for each rank (for straights and comparisons) */
export const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  'h': '♥', 'd': '♦', 'c': '♣', 's': '♠',
};

export const ALL_CARDS: Card[] = SUITS.flatMap(suit =>
  RANKS.map(rank => ({ rank, suit }))
);
