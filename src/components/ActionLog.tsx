import { useGameStore } from '../store/game-store';
import type { Street } from '../types';

export function ActionLog() {
  const session = useGameStore(s => s.session);
  const hand = session?.currentHand;
  if (!hand) return null;

  const streets: Street[] = ['preflop', 'flop', 'turn', 'river'];
  const allActions = streets.flatMap(street =>
    hand.actions[street].map(action => ({ ...action, street }))
  );

  if (allActions.length === 0) return null;

  return (
    <div className="mx-2 max-h-20 overflow-y-auto">
      <div className="flex flex-wrap gap-1 justify-center">
        {allActions.slice(-8).map((action, i) => {
          const player = session?.players.find(p => p.id === action.playerId);
          const name = player?.name ?? action.playerId;
          const label = action.type === 'fold' ? `${name} folds`
            : action.type === 'check' ? `${name} checks`
            : action.type === 'call' ? `${name} calls ${action.amount}`
            : action.type === 'raise' ? `${name} raises ${action.amount}`
            : `${name} all-in ${action.amount}`;

          return (
            <span key={i} className="text-xs text-gray-400 bg-black/30 px-2 py-0.5 rounded-full">
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
