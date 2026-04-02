import type { Player } from '../types';
import type { HandState } from '../types';
import { CardComponent } from './CardComponent';
import { formatChips } from '../utils/format';

interface Props {
  player: Player;
  hand: HandState | null;
  isDealer: boolean;
  isActive: boolean;
  isBot?: boolean;
  isBotThinking?: boolean;
}

export function PlayerSeat({ player, hand, isDealer, isActive, isBot = false, isBotThinking = false }: Props) {
  const invested = hand?.streetInvestments[player.id] ?? 0;
  const isFolded = hand ? !hand.activePlayers.includes(player.id) : false;

  return (
    <div className={`flex flex-col items-center gap-2 transition-opacity duration-300 ${isFolded ? 'opacity-40' : 'opacity-100'}`}>
      {/* Name + dealer button row */}
      <div className="flex items-center gap-2">
        <span className="text-white font-semibold text-sm">{player.name}</span>
        {isDealer && (
          <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full">D</span>
        )}
        {isBotThinking && (
          <span className="text-gray-400 text-xs animate-pulse">thinking…</span>
        )}
      </div>

      {/* Cards */}
      <div className="flex gap-1">
        {isBot ? (
          // Bot: show face-down unless hand is complete (reveal at showdown)
          hand?.isComplete && player.holeCards.length > 0
            ? player.holeCards.map((card, i) => <CardComponent key={i} card={card} animateIn />)
            : player.holeCards.length > 0
              ? [0, 1].map(i => <CardComponent key={i} faceDown />)
              : [0, 1].map(i => <CardComponent key={i} faceDown />)
        ) : (
          // Hero: always face-up
          player.holeCards.length > 0
            ? player.holeCards.map((card, i) => <CardComponent key={i} card={card} animateIn />)
            : [0, 1].map(i => <CardComponent key={i} faceDown />)
        )}
      </div>

      {/* Chips row */}
      <div className="flex items-center gap-2">
        <div className={`text-sm font-bold px-3 py-1 rounded-full ${isActive ? 'bg-yellow-500 text-yellow-900' : 'bg-gray-700 text-white'}`}>
          {formatChips(player.chips)}
        </div>
        {invested > 0 && (
          <div className="text-xs text-yellow-300 font-semibold">
            bet {formatChips(invested)}
          </div>
        )}
      </div>
    </div>
  );
}
