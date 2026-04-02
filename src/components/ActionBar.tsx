import { useState } from 'react';
import { useGameStore } from '../store/game-store';
import { useUIStore } from '../store/ui-store';
import { BetSlider } from './BetSlider';
import { formatChips } from '../utils/format';

export function ActionBar() {
  const { validActions, playerAction, isBotThinking } = useGameStore(s => ({
    validActions: s.validActions,
    playerAction: s.playerAction,
    isBotThinking: s.isBotThinking,
  }));
  const { showBetSlider, setShowBetSlider, setBetSliderValue } = useUIStore();
  const session = useGameStore(s => s.session);
  const pot = session?.currentHand?.pot ?? 0;

  const [isActing, setIsActing] = useState(false);

  if (!validActions || isBotThinking) {
    return (
      <div className="flex items-center justify-center h-16 text-gray-500 text-sm">
        {isBotThinking ? 'Opponent is thinking…' : ''}
      </div>
    );
  }

  function act(type: Parameters<typeof playerAction>[0], amount = 0) {
    setIsActing(true);
    setShowBetSlider(false);
    playerAction(type, amount);
    setTimeout(() => setIsActing(false), 300);
  }

  if (showBetSlider) {
    return (
      <BetSlider
        minRaise={validActions.minRaise}
        maxRaise={validActions.maxRaise}
        pot={pot}
        onConfirm={(amount) => {
          // If amount equals max (all chips), treat as all-in
          if (amount >= validActions.maxRaise) {
            act('all-in', amount);
          } else {
            act('raise', amount);
          }
        }}
        onCancel={() => {
          setShowBetSlider(false);
          setBetSliderValue(0);
        }}
      />
    );
  }

  return (
    <div className="flex gap-2 px-2 pb-2">
      {/* Fold */}
      <button
        disabled={isActing}
        onClick={() => act('fold')}
        className="flex-1 py-4 rounded-2xl bg-red-700 active:bg-red-600 text-white font-bold text-base shadow-lg transition-transform active:scale-95 disabled:opacity-50"
      >
        Fold
      </button>

      {/* Check or Call */}
      {validActions.canCheck ? (
        <button
          disabled={isActing}
          onClick={() => act('check')}
          className="flex-[1.4] py-4 rounded-2xl bg-green-700 active:bg-green-600 text-white font-bold text-base shadow-lg transition-transform active:scale-95 disabled:opacity-50"
        >
          Check
        </button>
      ) : validActions.canCall ? (
        <button
          disabled={isActing}
          onClick={() => act('call', validActions.callAmount)}
          className="flex-[1.4] py-4 rounded-2xl bg-green-700 active:bg-green-600 text-white font-bold text-base shadow-lg transition-transform active:scale-95 disabled:opacity-50"
        >
          Call {formatChips(validActions.callAmount)}
        </button>
      ) : null}

      {/* Raise / All-in */}
      {validActions.canRaise ? (
        <button
          disabled={isActing}
          onClick={() => {
            setBetSliderValue(validActions.minRaise);
            setShowBetSlider(true);
          }}
          className="flex-[1.4] py-4 rounded-2xl bg-blue-700 active:bg-blue-600 text-white font-bold text-base shadow-lg transition-transform active:scale-95 disabled:opacity-50"
        >
          Raise
        </button>
      ) : (
        <button
          disabled={isActing}
          onClick={() => act('all-in', validActions.maxRaise)}
          className="flex-[1.4] py-4 rounded-2xl bg-blue-700 active:bg-blue-600 text-white font-bold text-base shadow-lg transition-transform active:scale-95 disabled:opacity-50"
        >
          All-In
        </button>
      )}
    </div>
  );
}
