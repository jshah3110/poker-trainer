import type { Card, Deck, HandEvalResult } from './card';
import type { PlayerId } from './player';
import type { Action, Street } from './action';

export interface HandState {
  handId: string;
  street: Street;
  communityCards: Card[];
  deck: Deck;
  pot: number;
  sidePots: SidePot[];
  actions: Record<Street, Action[]>;
  dealerIndex: number;
  activePlayerIndex: number | null;
  currentBet: number;
  minRaise: number;
  activePlayers: PlayerId[];
  allInPlayers: PlayerId[];
  streetInvestments: Record<PlayerId, number>;
  totalInvestments: Record<PlayerId, number>;
  isComplete: boolean;
  results: HandResult[] | null;
}

export interface HandResult {
  playerId: PlayerId;
  amountWon: number;
  hand: HandEvalResult | null;
  holeCards: Card[];
}

export interface SidePot {
  amount: number;
  eligiblePlayers: PlayerId[];
}
