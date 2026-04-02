import type { Card, Deck } from '../types';
import { ALL_CARDS } from './constants';

/**
 * Creates a fresh, ordered 52-card deck.
 */
export function createDeck(): Deck {
  return [...ALL_CARDS];
}

/**
 * Fisher-Yates shuffle using crypto.getRandomValues() for unbiased randomness.
 * Returns a new shuffled array (does not mutate input).
 */
export function shuffleDeck(deck: Deck): Deck {
  const arr = [...deck];
  const randomValues = new Uint32Array(arr.length);
  crypto.getRandomValues(randomValues);

  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomValues[i] % (i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }

  return arr;
}

/**
 * Deal `count` cards from the top of the deck.
 * Returns [dealt cards, remaining deck] — pure, no mutation.
 */
export function dealCards(deck: Deck, count: number): [Card[], Deck] {
  if (count > deck.length) {
    throw new Error(`Cannot deal ${count} cards from a deck of ${deck.length}`);
  }
  return [deck.slice(0, count), deck.slice(count)];
}
