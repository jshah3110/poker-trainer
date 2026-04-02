import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHands } from '../evaluator';
import { HandRank } from '../../types';
import type { Card } from '../../types';

function c(str: string): Card {
  return { rank: str[0] as Card['rank'], suit: str[1] as Card['suit'] };
}
function cards(...strs: string[]): Card[] {
  return strs.map(c);
}

// ─── Hand rank identification ──────────────────────────────────────────────

describe('Royal Flush', () => {
  it('identifies a royal flush', () => {
    const result = evaluateHand(cards('Ah', 'Kh', 'Qh', 'Jh', 'Th'));
    expect(result.rank).toBe(HandRank.RoyalFlush);
  });
});

describe('Straight Flush', () => {
  it('identifies a straight flush', () => {
    const result = evaluateHand(cards('9s', '8s', '7s', '6s', '5s'));
    expect(result.rank).toBe(HandRank.StraightFlush);
  });

  it('straight flush high is correct', () => {
    const result = evaluateHand(cards('9s', '8s', '7s', '6s', '5s'));
    expect(result.description).toContain('9');
  });
});

describe('Four of a Kind', () => {
  it('identifies four of a kind', () => {
    const result = evaluateHand(cards('Ah', 'Ad', 'Ac', 'As', 'Kh'));
    expect(result.rank).toBe(HandRank.FourOfAKind);
  });

  it('description mentions the quad rank', () => {
    const result = evaluateHand(cards('Ah', 'Ad', 'Ac', 'As', 'Kh'));
    expect(result.description).toContain('Aces');
  });
});

describe('Full House', () => {
  it('identifies a full house', () => {
    const result = evaluateHand(cards('Kh', 'Kd', 'Kc', 'Ah', 'Ad'));
    expect(result.rank).toBe(HandRank.FullHouse);
  });

  it('description mentions both ranks', () => {
    const result = evaluateHand(cards('Kh', 'Kd', 'Kc', 'Ah', 'Ad'));
    expect(result.description).toContain('Kings');
    expect(result.description).toContain('Aces');
  });
});

describe('Flush', () => {
  it('identifies a flush', () => {
    const result = evaluateHand(cards('Ah', '9h', '7h', '4h', '2h'));
    expect(result.rank).toBe(HandRank.Flush);
  });
});

describe('Straight', () => {
  it('identifies a Broadway straight (A-high)', () => {
    const result = evaluateHand(cards('Ah', 'Kd', 'Qc', 'Js', 'Th'));
    expect(result.rank).toBe(HandRank.Straight);
    expect(result.description).toContain('Ace');
  });

  it('identifies a wheel straight (A-2-3-4-5)', () => {
    const result = evaluateHand(cards('Ah', '2d', '3c', '4s', '5h'));
    expect(result.rank).toBe(HandRank.Straight);
    expect(result.description).toContain('5');
  });

  it('wheel straight scores less than a 6-high straight', () => {
    const wheel = evaluateHand(cards('Ah', '2d', '3c', '4s', '5h'));
    const sixHigh = evaluateHand(cards('2h', '3d', '4c', '5s', '6h'));
    expect(compareHands(sixHigh, wheel)).toBeGreaterThan(0);
  });
});

describe('Three of a Kind', () => {
  it('identifies three of a kind', () => {
    const result = evaluateHand(cards('Qh', 'Qd', 'Qc', 'Ah', 'Kh'));
    expect(result.rank).toBe(HandRank.ThreeOfAKind);
  });
});

describe('Two Pair', () => {
  it('identifies two pair', () => {
    const result = evaluateHand(cards('Ah', 'Ad', 'Kh', 'Kd', '2c'));
    expect(result.rank).toBe(HandRank.TwoPair);
  });
});

describe('Pair', () => {
  it('identifies a pair', () => {
    const result = evaluateHand(cards('Ah', 'Ad', 'Kh', 'Qd', '2c'));
    expect(result.rank).toBe(HandRank.Pair);
  });
});

describe('High Card', () => {
  it('identifies a high card hand', () => {
    const result = evaluateHand(cards('Ah', 'Kd', 'Qc', 'Js', '9h'));
    expect(result.rank).toBe(HandRank.HighCard);
  });
});

// ─── Hand ranking order ────────────────────────────────────────────────────

describe('Hand rank ordering', () => {
  const royalFlush    = evaluateHand(cards('Ah', 'Kh', 'Qh', 'Jh', 'Th'));
  const straightFlush = evaluateHand(cards('9s', '8s', '7s', '6s', '5s'));
  const quads         = evaluateHand(cards('Ah', 'Ad', 'Ac', 'As', 'Kh'));
  const fullHouse     = evaluateHand(cards('Kh', 'Kd', 'Kc', 'Ah', 'Ad'));
  const flush         = evaluateHand(cards('Ah', '9h', '7h', '4h', '2h'));
  const straight      = evaluateHand(cards('Ah', 'Kd', 'Qc', 'Js', 'Th'));
  const trips         = evaluateHand(cards('Qh', 'Qd', 'Qc', 'Ah', 'Kh'));
  const twoPair       = evaluateHand(cards('Ah', 'Ad', 'Kh', 'Kd', '2c'));
  const pair          = evaluateHand(cards('Ah', 'Ad', 'Kh', 'Qd', '2c'));
  const highCard      = evaluateHand(cards('Ah', 'Kd', 'Qc', 'Js', '9h'));

  const ranked = [royalFlush, straightFlush, quads, fullHouse, flush, straight, trips, twoPair, pair, highCard];

  it('each hand beats the next', () => {
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(compareHands(ranked[i]!, ranked[i + 1]!)).toBeGreaterThan(0);
    }
  });
});

// ─── Kicker comparisons ────────────────────────────────────────────────────

describe('Kicker comparisons', () => {
  it('pair of aces with K kicker beats pair of aces with Q kicker', () => {
    const aak = evaluateHand(cards('Ah', 'Ad', 'Kh', 'Qd', '2c'));
    const aaq = evaluateHand(cards('Ah', 'Ad', 'Qh', 'Jd', '2c'));
    expect(compareHands(aak, aaq)).toBeGreaterThan(0);
  });

  it('higher pair wins over lower pair (same kickers)', () => {
    const aaKQ2 = evaluateHand(cards('Ah', 'Ad', 'Kh', 'Qd', '2c'));
    const kkAQ2 = evaluateHand(cards('Kh', 'Kd', 'Ah', 'Qd', '2c'));
    expect(compareHands(aaKQ2, kkAQ2)).toBeGreaterThan(0);
  });

  it('higher two pair wins (top pair decides)', () => {
    const aakk = evaluateHand(cards('Ah', 'Ad', 'Kh', 'Kd', '2c'));
    const aaqq = evaluateHand(cards('Ah', 'Ad', 'Qh', 'Qd', '2c'));
    expect(compareHands(aakk, aaqq)).toBeGreaterThan(0);
  });

  it('identical hands tie (score is equal)', () => {
    const a = evaluateHand(cards('Ah', 'Ad', 'Kh', 'Qd', '2c'));
    const b = evaluateHand(cards('As', 'Ac', 'Kd', 'Qs', '2h'));
    expect(compareHands(a, b)).toBe(0);
  });

  it('flush: higher card wins', () => {
    const aceFlush  = evaluateHand(cards('Ah', '9h', '7h', '4h', '2h'));
    const kingFlush = evaluateHand(cards('Kh', '9h', '7h', '4h', '2h'));
    expect(compareHands(aceFlush, kingFlush)).toBeGreaterThan(0);
  });

  it('four of a kind: higher quad wins', () => {
    const aQuads = evaluateHand(cards('Ah', 'Ad', 'Ac', 'As', 'Kh'));
    const kQuads = evaluateHand(cards('Kh', 'Kd', 'Kc', 'Ks', 'Ah'));
    expect(compareHands(aQuads, kQuads)).toBeGreaterThan(0);
  });
});

// ─── 7-card evaluation ─────────────────────────────────────────────────────

describe('7-card evaluation', () => {
  it('finds the best 5 of 7', () => {
    // Hero has Ah Ad; board is Ac As 2h 3d 4c — should detect quads
    const result = evaluateHand(cards('Ah', 'Ad', 'Ac', 'As', '2h', '3d', '4c'));
    expect(result.rank).toBe(HandRank.FourOfAKind);
  });

  it('picks flush over pair when flush is in 7 cards', () => {
    // 5 hearts + pair of spades
    const result = evaluateHand(cards('Ah', '9h', '7h', '4h', '2h', 'Ks', 'Kd'));
    expect(result.rank).toBe(HandRank.Flush);
  });

  it('picks straight over high card', () => {
    const result = evaluateHand(cards('Ah', 'Kd', 'Qc', 'Js', 'Th', '2d', '3c'));
    expect(result.rank).toBe(HandRank.Straight);
  });

  it('result has exactly 5 bestCards', () => {
    const result = evaluateHand(cards('Ah', 'Ad', 'Kh', 'Kd', 'Qc', '2s', '3d'));
    expect(result.bestCards).toHaveLength(5);
  });
});

// ─── compareHands ──────────────────────────────────────────────────────────

describe('compareHands', () => {
  it('returns positive when a > b', () => {
    const a = evaluateHand(cards('Ah', 'Ad', 'Ac', 'As', 'Kh'));
    const b = evaluateHand(cards('Kh', 'Kd', 'Kc', 'Ks', 'Ah'));
    expect(compareHands(a, b)).toBeGreaterThan(0);
  });

  it('returns negative when a < b', () => {
    const a = evaluateHand(cards('Kh', 'Kd', 'Kc', 'Ks', 'Ah'));
    const b = evaluateHand(cards('Ah', 'Ad', 'Ac', 'As', 'Kh'));
    expect(compareHands(a, b)).toBeLessThan(0);
  });

  it('returns 0 for identical scores', () => {
    const hand = evaluateHand(cards('Ah', 'Kd', 'Qc', 'Js', '9h'));
    expect(compareHands(hand, hand)).toBe(0);
  });
});
