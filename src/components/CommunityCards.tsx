import type { Card } from '../types';
import { CardComponent } from './CardComponent';

interface Props {
  cards: Card[];
}

export function CommunityCards({ cards }: Props) {
  // Always show 5 slots
  const slots = Array.from({ length: 5 }, (_, i) => cards[i]);

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {slots.map((card, i) => (
        <CardComponent
          key={i}
          card={card}
          faceDown={!card}
          animateIn={!!card}
        />
      ))}
    </div>
  );
}
