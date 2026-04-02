import type { Card } from '../types';
import { SUIT_SYMBOLS } from '../engine/constants';

interface Props {
  card?: Card;       // undefined = face-down
  faceDown?: boolean;
  small?: boolean;
  animateIn?: boolean;
}

export function CardComponent({ card, faceDown = false, small = false, animateIn = false }: Props) {
  const isRed = card && (card.suit === 'h' || card.suit === 'd');
  const base = small
    ? 'w-9 h-14 rounded-md text-xs'
    : 'w-14 h-20 rounded-lg text-base';

  if (!card || faceDown) {
    return (
      <div className={`${base} bg-blue-800 border-2 border-blue-600 flex items-center justify-center shadow-lg ${animateIn ? 'card-deal' : ''}`}>
        <div className="w-full h-full rounded-md opacity-40"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, #1e40af 0px, #1e40af 2px, #1e3a8a 2px, #1e3a8a 8px)' }} />
      </div>
    );
  }

  return (
    <div className={`${base} bg-[var(--card-white)] border border-gray-300 flex flex-col items-start justify-between p-1 shadow-lg select-none ${animateIn ? 'card-deal' : ''}`}>
      <div className={`font-bold leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        <div>{card.rank === 'T' ? '10' : card.rank}</div>
        <div>{SUIT_SYMBOLS[card.suit]}</div>
      </div>
      <div className={`self-end rotate-180 font-bold leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        <div>{card.rank === 'T' ? '10' : card.rank}</div>
        <div>{SUIT_SYMBOLS[card.suit]}</div>
      </div>
    </div>
  );
}
