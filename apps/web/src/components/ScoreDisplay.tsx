import { clsx } from 'clsx';
import type { Arrow } from '../api/client';

interface ScorePillProps {
  arrow: Arrow;
  size?: 'sm' | 'md' | 'lg';
}

export function ScorePill({ arrow, size = 'md' }: ScorePillProps) {
  const label = arrow.is_x ? 'X' : arrow.score === 0 ? 'M' : String(arrow.score);

  const colorClass =
    arrow.is_x || arrow.score === 10
      ? 'bg-yellow-400 text-yellow-900 font-black'
      : arrow.score === 9
      ? 'bg-yellow-300 text-yellow-900 font-bold'
      : arrow.score >= 8
      ? 'bg-red-500 text-white font-bold'
      : arrow.score >= 7
      ? 'bg-red-400 text-white font-semibold'
      : arrow.score >= 6
      ? 'bg-blue-500 text-white font-semibold'
      : arrow.score >= 5
      ? 'bg-blue-400 text-white'
      : arrow.score >= 4
      ? 'bg-gray-700 text-white'
      : arrow.score >= 2
      ? 'bg-gray-500 text-white'
      : arrow.score === 1
      ? 'bg-gray-400 text-gray-900'
      : 'bg-gray-800 text-gray-500 font-bold'; // miss

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full font-mono',
        colorClass,
        {
          'w-7 h-7 text-xs': size === 'sm',
          'w-10 h-10 text-base': size === 'md',
          'w-14 h-14 text-xl': size === 'lg',
        }
      )}
    >
      {label}
    </span>
  );
}

interface EndRowProps {
  endNumber: number;
  arrows: Arrow[];
  total: number;
  runningTotal?: number;
  isAi?: boolean;
  onEdit?: () => void;
}

export function EndRow({ endNumber, arrows, total, runningTotal, isAi, onEdit }: EndRowProps) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-800 last:border-0">
      <span className="w-8 text-sm text-gray-500 font-mono text-center">{endNumber}</span>
      <div className="flex gap-2 flex-1">
        {arrows.map((a, i) => (
          <ScorePill key={i} arrow={a} size="sm" />
        ))}
      </div>
      <span className="w-8 text-center font-mono font-bold text-white">{total}</span>
      {runningTotal !== undefined && (
        <span className="w-12 text-right font-mono text-sm text-gray-400">{runningTotal}</span>
      )}
      {onEdit && (
        <button
          onClick={onEdit}
          className="text-xs text-gray-500 hover:text-brand-500 tap-highlight-none ml-1"
        >
          edit
        </button>
      )}
      {isAi && (
        <span className="text-xs text-brand-500 font-medium ml-1 hidden sm:block">AI</span>
      )}
    </div>
  );
}
