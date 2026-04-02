import type { Card } from '../types';
import { SUIT_SYMBOLS } from '../engine/constants';

export function formatChips(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)     return `${(amount / 1_000).toFixed(1)}K`;
  return String(amount);
}

export function formatCard(card: Card): string {
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

export function isSuitRed(suit: Card['suit']): boolean {
  return suit === 'h' || suit === 'd';
}
