import type { Card, HandEvalResult } from '../types';
import { HandRank } from '../types';
import { RANK_VALUES } from './constants';

/**
 * Evaluate the best 5-card hand from the given cards (accepts 5 or 7 cards).
 * For 7 cards, checks all C(7,5) = 21 combinations and returns the best.
 */
export function evaluateHand(cards: Card[]): HandEvalResult {
  if (cards.length === 5) return evaluate5(cards);
  if (cards.length === 7) return evaluateBest5of7(cards);
  if (cards.length === 6) return evaluateBest5ofN(cards);
  throw new Error(`Expected 5, 6, or 7 cards — got ${cards.length}`);
}

function evaluateBest5of7(cards: Card[]): HandEvalResult {
  let best: HandEvalResult | null = null;
  for (let i = 0; i < 7; i++) {
    for (let j = i + 1; j < 7; j++) {
      const five = cards.filter((_, idx) => idx !== i && idx !== j);
      const result = evaluate5(five);
      if (!best || result.score > best.score) best = result;
    }
  }
  return best!;
}

function evaluateBest5ofN(cards: Card[]): HandEvalResult {
  let best: HandEvalResult | null = null;
  const n = cards.length;
  // Generate all C(n,5) combinations
  for (let i = 0; i < n - 4; i++) {
    for (let j = i + 1; j < n - 3; j++) {
      for (let k = j + 1; k < n - 2; k++) {
        for (let l = k + 1; l < n - 1; l++) {
          for (let m = l + 1; m < n; m++) {
            const five = [cards[i]!, cards[j]!, cards[k]!, cards[l]!, cards[m]!];
            const result = evaluate5(five);
            if (!best || result.score > best.score) best = result;
          }
        }
      }
    }
  }
  return best!;
}

function evaluate5(cards: Card[]): HandEvalResult {
  const values = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  // Flush: all same suit
  const isFlush = suits.every(s => s === suits[0]);

  // Straight detection via rank bitmask
  const rankBits = values.reduce((bits, v) => bits | (1 << v), 0);
  let isStraight = false;
  let straightHigh = 0;

  // Check for 5 consecutive bits
  const uniqueVals = [...new Set(values)];
  if (uniqueVals.length === 5) {
    if (values[0]! - values[4]! === 4) {
      isStraight = true;
      straightHigh = values[0]!;
    }
    // Wheel: A-2-3-4-5 — ace plays as 1
    if (rankBits === ((1 << 14) | (1 << 5) | (1 << 4) | (1 << 3) | (1 << 2))) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  // Rank frequency map, sorted: highest frequency first, then highest rank
  const freqMap = new Map<number, number>();
  for (const v of values) freqMap.set(v, (freqMap.get(v) ?? 0) + 1);

  const freqs = [...freqMap.entries()].sort((a, b) =>
    b[1] !== a[1] ? b[1] - a[1] : b[0] - a[0]
  );
  const counts = freqs.map(f => f[1]);
  const ranked = freqs.map(f => f[0]);

  // Classify hand
  if (isFlush && isStraight) {
    if (straightHigh === 14) return makeResult(HandRank.RoyalFlush, [14], cards);
    return makeResult(HandRank.StraightFlush, [straightHigh], cards);
  }
  if (counts[0] === 4) return makeResult(HandRank.FourOfAKind, ranked, cards);
  if (counts[0] === 3 && counts[1] === 2) return makeResult(HandRank.FullHouse, ranked, cards);
  if (isFlush) return makeResult(HandRank.Flush, values, cards);
  if (isStraight) return makeResult(HandRank.Straight, [straightHigh], cards);
  if (counts[0] === 3) return makeResult(HandRank.ThreeOfAKind, ranked, cards);
  if (counts[0] === 2 && counts[1] === 2) return makeResult(HandRank.TwoPair, ranked, cards);
  if (counts[0] === 2) return makeResult(HandRank.Pair, ranked, cards);
  return makeResult(HandRank.HighCard, values, cards);
}

function makeResult(rank: HandRank, kickers: number[], cards: Card[]): HandEvalResult {
  // Score: rank * 1_000_000 + weighted kicker chain
  // Each position gets 15^(4-i) weight so kicker ordering is correct
  let score = rank * 1_000_000;
  for (let i = 0; i < Math.min(kickers.length, 5); i++) {
    score += (kickers[i] ?? 0) * Math.pow(15, 4 - i);
  }
  return {
    score: Math.round(score),
    rank,
    description: describeHand(rank, kickers),
    bestCards: [...cards],
  };
}

const RANK_NAMES: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace',
};
const PLURAL_RANK_NAMES: Record<number, string> = {
  2: 'Twos', 3: 'Threes', 4: 'Fours', 5: 'Fives', 6: 'Sixes',
  7: 'Sevens', 8: 'Eights', 9: 'Nines', 10: 'Tens',
  11: 'Jacks', 12: 'Queens', 13: 'Kings', 14: 'Aces',
};

function describeHand(rank: HandRank, kickers: number[]): string {
  const k = (i: number) => RANK_NAMES[kickers[i] ?? 0] ?? '?';
  const pk = (i: number) => PLURAL_RANK_NAMES[kickers[i] ?? 0] ?? '?';
  switch (rank) {
    case HandRank.RoyalFlush:     return 'Royal Flush';
    case HandRank.StraightFlush:  return `Straight Flush, ${k(0)} high`;
    case HandRank.FourOfAKind:    return `Four of a Kind, ${pk(0)}`;
    case HandRank.FullHouse:      return `Full House, ${pk(0)} full of ${pk(1)}`;
    case HandRank.Flush:          return `Flush, ${k(0)} high`;
    case HandRank.Straight:       return `Straight, ${k(0)} high`;
    case HandRank.ThreeOfAKind:   return `Three of a Kind, ${pk(0)}`;
    case HandRank.TwoPair:        return `Two Pair, ${pk(0)} and ${pk(1)}`;
    case HandRank.Pair:           return `Pair of ${pk(0)}`;
    case HandRank.HighCard:       return `${k(0)} high`;
  }
}

/**
 * Compare two hands. Returns positive if a > b, negative if a < b, 0 for tie.
 */
export function compareHands(a: HandEvalResult, b: HandEvalResult): number {
  return a.score - b.score;
}
