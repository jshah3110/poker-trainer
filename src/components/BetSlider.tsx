import { formatChips } from '../utils/format';
import { useUIStore } from '../store/ui-store';

interface Props {
  minRaise: number;
  maxRaise: number;
  pot: number;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}

export function BetSlider({ minRaise, maxRaise, pot, onConfirm, onCancel }: Props) {
  const { betSliderValue, setBetSliderValue } = useUIStore();

  // Presets
  const half    = Math.min(Math.max(Math.floor(pot * 0.5), minRaise), maxRaise);
  const twoThird = Math.min(Math.max(Math.floor(pot * 0.67), minRaise), maxRaise);
  const full    = Math.min(pot, maxRaise);

  const current = Math.min(Math.max(betSliderValue || minRaise, minRaise), maxRaise);

  return (
    <div className="flex flex-col gap-3 bg-black/60 rounded-2xl p-4 mx-2 border border-gray-700">
      {/* Preset buttons */}
      <div className="flex gap-2 justify-between">
        {[
          { label: 'Min',   value: minRaise },
          { label: '½ Pot', value: half },
          { label: '⅔ Pot', value: twoThird },
          { label: 'Pot',   value: full },
          { label: 'All-In',value: maxRaise },
        ].map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setBetSliderValue(value)}
            className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-colors
              ${current === value
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 active:bg-gray-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Slider */}
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={minRaise}
          max={maxRaise}
          step={1}
          value={current}
          onChange={e => setBetSliderValue(Number(e.target.value))}
          className="flex-1 accent-blue-500 h-2"
        />
        <span className="text-white font-bold text-sm w-14 text-right">
          {formatChips(current)}
        </span>
      </div>

      {/* Confirm / Cancel */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl bg-gray-700 text-gray-200 font-bold text-sm active:bg-gray-600"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(current)}
          className="flex-2 flex-[2] py-3 rounded-xl bg-blue-600 text-white font-bold text-sm active:bg-blue-500"
        >
          Raise to {formatChips(current)}
        </button>
      </div>
    </div>
  );
}
