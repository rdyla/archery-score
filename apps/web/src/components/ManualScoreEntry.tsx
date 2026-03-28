import { useState } from 'react';
import { clsx } from 'clsx';
import { Button } from './ui/Button';
import type { Arrow } from '../api/client';

interface ManualScoreEntryProps {
  arrowCount: number;
  maxScore?: number;
  initialArrows?: Arrow[];
  onSubmit: (arrows: Arrow[]) => void;
  onCancel?: () => void;
  loading?: boolean;
}

const SCORE_OPTIONS = ['X', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1', 'M'] as const;
type ScoreOption = (typeof SCORE_OPTIONS)[number];

function parseScore(s: ScoreOption): Arrow {
  if (s === 'X') return { score: 10, is_x: true };
  if (s === 'M') return { score: 0, is_x: false };
  return { score: parseInt(s, 10), is_x: false };
}

export function ManualScoreEntry({
  arrowCount,
  maxScore = 10,
  initialArrows,
  onSubmit,
  onCancel,
  loading,
}: ManualScoreEntryProps) {
  const [selections, setSelections] = useState<(ScoreOption | null)[]>(
    initialArrows
      ? initialArrows.map((a) => (a.is_x ? 'X' : a.score === 0 ? 'M' : String(a.score) as ScoreOption))
      : Array(arrowCount).fill(null)
  );

  const [activeArrow, setActiveArrow] = useState<number>(0);

  const selectScore = (score: ScoreOption) => {
    const updated = [...selections];
    updated[activeArrow] = score;
    setSelections(updated);
    if (activeArrow < arrowCount - 1) {
      setActiveArrow(activeArrow + 1);
    }
  };

  const handleSubmit = () => {
    if (selections.some((s) => s === null)) return;
    onSubmit(selections.map((s) => parseScore(s!)));
  };

  const allFilled = selections.every((s) => s !== null);
  const visibleScores = SCORE_OPTIONS.filter((s) => {
    if (s === 'X') return maxScore >= 10;
    if (s === 'M') return true;
    const n = parseInt(s, 10);
    return n <= maxScore;
  });

  return (
    <div className="space-y-5">
      {/* Arrow position selector */}
      <div className="flex gap-2 justify-center">
        {selections.map((val, i) => (
          <button
            key={i}
            onClick={() => setActiveArrow(i)}
            className={clsx(
              'w-12 h-12 rounded-full font-mono text-base font-bold transition-all tap-highlight-none',
              activeArrow === i
                ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-gray-900'
                : '',
              val === null
                ? 'bg-gray-800 text-gray-500'
                : val === 'X'
                ? 'bg-yellow-400 text-yellow-900'
                : val === 'M'
                ? 'bg-gray-700 text-gray-400'
                : parseInt(val) >= 9
                ? 'bg-yellow-400 text-yellow-900'
                : parseInt(val) >= 7
                ? 'bg-red-500 text-white'
                : parseInt(val) >= 5
                ? 'bg-blue-500 text-white'
                : 'bg-gray-600 text-white'
            )}
          >
            {val ?? (i + 1)}
          </button>
        ))}
      </div>

      {/* Score buttons */}
      <div className="grid grid-cols-4 gap-2">
        {visibleScores.map((s) => (
          <button
            key={s}
            onClick={() => selectScore(s)}
            className={clsx(
              'h-14 rounded-xl font-mono text-lg font-bold transition-all tap-highlight-none',
              'active:scale-95',
              s === 'X'
                ? 'bg-yellow-400 text-yellow-900'
                : s === 'M'
                ? 'bg-gray-800 text-gray-400 border border-gray-700'
                : parseInt(s) >= 9
                ? 'bg-yellow-300 text-yellow-900'
                : parseInt(s) >= 7
                ? 'bg-red-500 text-white'
                : parseInt(s) >= 5
                ? 'bg-blue-500 text-white'
                : parseInt(s) >= 3
                ? 'bg-gray-700 text-white'
                : 'bg-gray-600 text-gray-300'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!allFilled}
          loading={loading}
          className="flex-1"
        >
          Save End
        </Button>
      </div>
    </div>
  );
}
