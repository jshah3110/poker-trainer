import { useGameStore } from './store/game-store';
import { Table } from './components/Table';
import './App.css';

function StartScreen() {
  const startSession = useGameStore(s => s.startSession);

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 bg-[var(--felt-dark)] px-8">
      {/* Logo / title */}
      <div className="text-center">
        <div className="text-6xl mb-3">🃏</div>
        <h1 className="text-4xl font-bold text-white tracking-tight">Poker Trainer</h1>
        <p className="text-green-400/70 text-sm mt-2 tracking-wide">
          Heads-Up Texas Hold'em
        </p>
      </div>

      {/* Stats placeholder */}
      <div className="w-full max-w-xs bg-black/30 rounded-2xl p-4 border border-gray-800 text-center">
        <p className="text-gray-500 text-sm">Your stats will appear here after sessions</p>
      </div>

      {/* Play button */}
      <button
        onClick={() => startSession()}
        className="w-full max-w-xs py-5 rounded-2xl bg-green-600 active:bg-green-500 text-white text-xl font-bold shadow-xl transition-transform active:scale-95"
      >
        Play Now
      </button>

      {/* Config hint */}
      <p className="text-gray-600 text-xs text-center">
        1/2 blinds · 200 chips · vs Alex (TAG)
      </p>
    </div>
  );
}

export default function App() {
  const session = useGameStore(s => s.session);

  return (
    <div className="h-full w-full">
      {session ? <Table /> : <StartScreen />}
    </div>
  );
}
