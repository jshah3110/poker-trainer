import { useShallow } from 'zustand/react/shallow';
import { useGameStore, HERO_ID } from '../store/game-store';
import { formatChips } from '../utils/format';

export function HandResult() {
  const { session, dismissResult } = useGameStore(
    useShallow(s => ({ session: s.session, dismissResult: s.dismissResult }))
  );

  const hand = session?.currentHand;
  if (!hand?.results) return null;

  const results = hand.results;
  const heroResult = results.find(r => r.playerId === HERO_ID);
  const heroWon = (heroResult?.amountWon ?? 0) > 0;
  const isSplit = results.filter(r => r.amountWon > 0).length > 1;

  const headline = isSplit
    ? 'Split Pot'
    : heroWon
      ? '🏆 You Win!'
      : 'You Lose';

  const headlineColor = isSplit
    ? 'text-yellow-300'
    : heroWon
      ? 'text-green-400'
      : 'text-red-400';

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismissResult} />

      {/* Card */}
      <div className="modal-entrance relative bg-gray-900 border border-gray-700 rounded-2xl p-6 mx-6 w-full max-w-sm shadow-2xl">
        <h2 className={`text-3xl font-bold text-center mb-4 ${headlineColor} fade-stagger`}>
          {headline}
        </h2>

        <div className="space-y-2 mb-5">
          {results.map((r, idx) => {
            const player = session?.players.find(p => p.id === r.playerId);
            const isHero = r.playerId === HERO_ID;
            return (
              <div
                key={r.playerId}
                className={`fade-stagger flex items-center justify-between rounded-lg px-3 py-2 ${isHero ? 'bg-gray-800' : 'bg-gray-800/50'}`}
                style={{ animationDelay: `${100 + idx * 100}ms` }}
              >
                <div>
                  <span className={`font-semibold text-sm ${isHero ? 'text-white' : 'text-gray-300'}`}>
                    {player?.name ?? r.playerId}
                  </span>
                  {r.hand && (
                    <div className="text-xs text-gray-400 mt-0.5">{r.hand.description}</div>
                  )}
                </div>
                <div className={`font-bold text-sm ${r.amountWon > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                  {r.amountWon > 0 ? `+${formatChips(r.amountWon)}` : '—'}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={dismissResult}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-base transition-all duration-200 active:scale-95 shadow-lg hover:shadow-[0_0_15px_rgba(37,99,235,0.4)]"
        >
          Next Hand →
        </button>
      </div>
    </div>
  );
}
