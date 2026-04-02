import type { PlayerId } from './player';

export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';
export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export interface Action {
  playerId: PlayerId;
  type: ActionType;
  amount: number;
  timestamp: number;
}
