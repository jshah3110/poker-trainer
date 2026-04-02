import type { CardStr } from './card';
import type { PlayerId } from './player';
import type { ActionType, Street } from './action';
import type { GameConfig } from './game-state';

export interface HandHistory {
  handId: string;
  timestamp: number;
  config: Pick<GameConfig, 'smallBlind' | 'bigBlind'>;
  players: Array<{
    id: PlayerId;
    name: string;
    seatIndex: number;
    startingChips: number;
  }>;
  dealerIndex: number;
  heroCards: CardStr[];
  communityCards: CardStr[];
  actions: Array<{
    street: Street;
    playerId: PlayerId;
    type: ActionType;
    amount: number;
  }>;
  results: Array<{
    playerId: PlayerId;
    amountWon: number;
    hand: string | null;
    holeCards: CardStr[] | null;
  }>;
  totalPot: number;
}
