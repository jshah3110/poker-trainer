import { formatChips } from '../utils/format';

interface Props {
  pot: number;
}

export function PotDisplay({ pot }: Props) {
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-full border border-yellow-700/50">
        <span className="text-yellow-400 text-xs font-semibold uppercase tracking-wide">Pot</span>
        <span className="text-white font-bold text-base">{formatChips(pot)}</span>
      </div>
    </div>
  );
}
