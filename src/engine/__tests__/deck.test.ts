import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, dealCards } from '../deck';

describe('createDeck', () => {
  it('returns 52 cards', () => {
    expect(createDeck()).toHaveLength(52);
  });

  it('has no duplicate cards', () => {
    const deck = createDeck();
    const keys = deck.map(c => `${c.rank}${c.suit}`);
    expect(new Set(keys).size).toBe(52);
  });

  it('contains all 4 suits', () => {
    const deck = createDeck();
    const suits = new Set(deck.map(c => c.suit));
    expect(suits).toEqual(new Set(['h', 'd', 'c', 's']));
  });

  it('contains all 13 ranks for each suit', () => {
    const deck = createDeck();
    const hearts = deck.filter(c => c.suit === 'h');
    expect(hearts).toHaveLength(13);
  });
});

describe('shuffleDeck', () => {
  it('returns 52 cards', () => {
    expect(shuffleDeck(createDeck())).toHaveLength(52);
  });

  it('contains the same cards as the input', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    const original = deck.map(c => `${c.rank}${c.suit}`).sort();
    const result = shuffled.map(c => `${c.rank}${c.suit}`).sort();
    expect(result).toEqual(original);
  });

  it('does not mutate the input deck', () => {
    const deck = createDeck();
    const copy = [...deck];
    shuffleDeck(deck);
    expect(deck).toEqual(copy);
  });

  it('produces a different order (probabilistic — should pass virtually always)', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    // Chance of identical order: 1/52! ≈ 0
    const same = deck.every((c, i) => c.rank === shuffled[i]?.rank && c.suit === shuffled[i]?.suit);
    expect(same).toBe(false);
  });
});

describe('dealCards', () => {
  it('returns the requested number of cards', () => {
    const [dealt] = dealCards(createDeck(), 5);
    expect(dealt).toHaveLength(5);
  });

  it('returns the correct remaining deck size', () => {
    const [, rest] = dealCards(createDeck(), 5);
    expect(rest).toHaveLength(47);
  });

  it('dealt cards come from the top of the deck', () => {
    const deck = createDeck();
    const [dealt] = dealCards(deck, 2);
    expect(dealt[0]).toEqual(deck[0]);
    expect(dealt[1]).toEqual(deck[1]);
  });

  it('remaining deck starts after dealt cards', () => {
    const deck = createDeck();
    const [, rest] = dealCards(deck, 2);
    expect(rest[0]).toEqual(deck[2]);
  });

  it('throws when requesting more cards than available', () => {
    expect(() => dealCards(createDeck(), 53)).toThrow();
  });

  it('can deal all 52 cards', () => {
    const [dealt, rest] = dealCards(createDeck(), 52);
    expect(dealt).toHaveLength(52);
    expect(rest).toHaveLength(0);
  });
});
