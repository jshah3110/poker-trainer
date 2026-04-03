import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../store/game-store';
import { useUIStore } from '../store/ui-store';
import { BetSlider } from './BetSlider';
import { formatChips } from '../utils/format';

export function ActionBar() {
  const { validActions, playerAction, isBotThinking } = useGameStore(
    useShallow(s => ({ validActions: s.validActions, playerAction: s.playerAction, isBotThinking: s.isBotThinking }))
  );
  const { showBetSlider, setShowBetSlider, setBetSliderValue } = useUIStore(
    useShallow(s => ({ showBetSlider: s.showBetSlider, setShowBetSlider: s.setShowBetSlider, setBetSliderValue: s.setBetSliderValue }))
  );
  const pot = useGameStore(s => s.session?.currentHand?.pot ?? 0);

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
        className="btn-ripple flex-1 py-4 rounded-2xl bg-red-700 hover:bg-red-600 active:bg-red-500 text-white font-bold text-base shadow-lg hover:shadow-[0_0_20px_rgba(220,38,38,0.6)] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Fold
      </button>

      {/* Check or Call */}
      {validActions.canCheck ? (
        <button
          disabled={isActing}
          onClick={() => act('check')}
          className="btn-ripple flex-[1.4] py-4 rounded-2xl bg-green-700 hover:bg-green-600 active:bg-green-500 text-white font-bold text-base shadow-lg hover:shadow-[0_0_20px_rgba(34,197,94,0.6)] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Check
        </button>
      ) : validActions.canCall ? (
        <button
          disabled={isActing}
          onClick={() => act('call', validActions.callAmount)}
          className="btn-ripple flex-[1.4] py-4 rounded-2xl bg-green-700 hover:bg-green-600 active:bg-green-500 text-white font-bold text-base shadow-lg hover:shadow-[0_0_20px_rgba(34,197,94,0.6)] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="btn-ripple flex-[1.4] py-4 rounded-2xl bg-blue-700 hover:bg-blue-600 active:bg-blue-500 text-white font-bold text-base shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Raise
        </button>
      ) : (
        <button
          disabled={isActing}
          onClick={() => act('all-in', validActions.maxRaise)}
          className="btn-ripple flex-[1.4] py-4 rounded-2xl bg-blue-700 hover:bg-blue-600 active:bg-blue-500 text-white font-bold text-base shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          All-In
        </button>
      )}
    </div>
  );
}
