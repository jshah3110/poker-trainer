import type { Card } from './card';

export type PlayerId = string;
export type PlayerType = 'human' | 'bot';

export interface Player {
  id: PlayerId;
  name: string;
  type: PlayerType;
  chips: number;
  holeCards: Card[];
  seatIndex: number;
  isSittingOut: boolean;
  botProfileId: string | null;
}
