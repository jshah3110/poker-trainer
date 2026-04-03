import { useState, useEffect } from 'react';
import { formatChips } from '../utils/format';

interface Props {
  pot: number;
}

export function PotDisplay({ pot }: Props) {
  const [prevPot, setPrevPot] = useState(pot);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (pot > prevPot) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 600);
      setPrevPot(pot);
      return () => clearTimeout(timer);
    }
    setPrevPot(pot);
  }, [pot, prevPot]);

  return (
    <div className="flex items-center justify-center">
      <div className={`flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-full border border-yellow-700/50 transition-all duration-200 ${
        isPulsing ? 'pot-pulse' : ''
      } ${isPulsing ? 'shadow-[0_0_15px_rgba(212,168,67,0.8)]' : ''}`}>
        <span className="text-yellow-400 text-xs font-semibold uppercase tracking-wide">Pot</span>
        <span className="text-white font-bold text-base">{formatChips(pot)}</span>
      </div>
    </div>
  );
}
