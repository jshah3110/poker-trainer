import { useGameStore } from './store/game-store';
import { Table } from './components/Table';
import './App.css';

function StartScreen() {
  const startSession = useGameStore(s => s.startSession);

  return (
    <div className="relative h-full flex flex-col items-center justify-center gap-8 bg-[var(--felt-dark)] px-8 overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-900/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Logo / title */}
        <div className="text-center fade-stagger">
          <div className="text-6xl mb-3 animate-bounce" style={{ animationDuration: '2s' }}>
            🃏
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Poker Trainer</h1>
          <p className="text-green-400/70 text-sm mt-2 tracking-wide">
            Heads-Up Texas Hold'em
          </p>
        </div>

        {/* Stats placeholder */}
        <div className="w-full max-w-xs bg-black/30 rounded-2xl p-4 border border-gray-800 text-center mt-8 fade-stagger">
          <p className="text-gray-500 text-sm">Your stats will appear here after sessions</p>
        </div>

        {/* Play button */}
        <div className="w-full max-w-xs mt-8 fade-stagger">
          <button
            onClick={() => startSession()}
            className="btn-ripple w-full py-5 rounded-2xl bg-gradient-to-b from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 active:from-green-600 active:to-green-800 text-white text-xl font-bold shadow-2xl transition-all duration-200 hover:shadow-[0_0_20px_rgba(34,197,94,0.6)] active:scale-95 border border-green-400/30"
          >
            Play Now
          </button>
        </div>

        {/* Config hint */}
        <p className="text-gray-600 text-xs text-center mt-6 fade-stagger">
          1/2 blinds · 200 chips · vs Alex (TAG)
        </p>
      </div>
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
