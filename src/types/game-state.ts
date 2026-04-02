import type { Player } from './player';
import type { HandState } from './hand-state';

export interface GameConfig {
  smallBlind: number;
  bigBlind: number;
  startingStack: number;
  maxPlayers: number;
  autoAdvance: boolean;
  autoAdvanceDelay: number;
}

export interface GameSession {
  sessionId: string;
  startedAt: number;
  config: GameConfig;
  players: Player[];
  handsPlayed: number;
  currentHand: HandState | null;
}
