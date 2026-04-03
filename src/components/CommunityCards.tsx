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
      {slots.map((card, i) => {
        // Stagger reveals: 0, 150, 300, 450, 600ms
        const delay = i * 150;
        return (
          <div
            key={i}
            style={{
              animation: card ? `dealCard 0.3s ease-out ${delay}ms both` : 'none',
            }}
          >
            <CardComponent
              card={card}
              faceDown={!card}
              animateIn={false}
            />
          </div>
        );
      })}
    </div>
  );
}
