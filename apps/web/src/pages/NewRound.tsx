import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useApi } from '../hooks/useApi';
import type { Round } from '../api/client';
import { clsx } from 'clsx';

const PRESETS = [
  { id: '300', label: 'Vegas 300', desc: '10 ends · 3 arrows · max 300', ends: 10 },
  { id: '600', label: '600 Round', desc: '20 ends · 3 arrows · max 600', ends: 20 },
  { id: '900', label: '900 Round', desc: '30 ends · 3 arrows · max 900', ends: 30 },
  { id: 'custom', label: 'Custom Round', desc: 'Set your own ends and arrows', ends: 0 },
] as const;

type PresetId = (typeof PRESETS)[number]['id'];

export function NewRoundPage() {
  const navigate = useNavigate();
  const api = useApi();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<PresetId>('300');
  const [customEnds, setCustomEnds] = useState('10');
  const [customArrows, setCustomArrows] = useState('3');
  const [customLabel, setCustomLabel] = useState('');
  const [notes, setNotes] = useState('');

  const { mutate: createRound, isPending } = useMutation({
    mutationFn: (body: Record<string, unknown>) => api!.post<Round>('/rounds', body),
    onSuccess: (round) => {
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
      navigate(`/rounds/${round.id}`);
    },
  });

  const handleStart = () => {
    if (selected === 'custom') {
      const ends = parseInt(customEnds, 10);
      const arrows = parseInt(customArrows, 10);
      if (!customLabel.trim() || isNaN(ends) || isNaN(arrows)) return;
      createRound({ label: customLabel, ends_total: ends, arrows_per_end: arrows, notes: notes || null });
    } else {
      createRound({ preset: selected, notes: notes || null });
    }
  };

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => navigate(-1)} className="tap-highlight-none">
          <ArrowLeft size={22} className="text-gray-400" />
        </button>
        <h1 className="text-xl font-bold text-white">New Round</h1>
      </div>

      {/* Preset selector */}
      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={clsx(
              'p-4 rounded-2xl border-2 text-left transition-all tap-highlight-none active:scale-95',
              selected === p.id
                ? 'border-brand-500 bg-brand-900/20'
                : 'border-gray-800 bg-gray-900 hover:border-gray-700'
            )}
          >
            <div className="font-semibold text-white">{p.label}</div>
            <div className="text-xs text-gray-500 mt-1">{p.desc}</div>
          </button>
        ))}
      </div>

      {/* Custom fields */}
      {selected === 'custom' && (
        <Card>
          <CardContent className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Round name</label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g. Club League Round"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Ends</label>
                <input
                  type="number"
                  value={customEnds}
                  min={1}
                  max={60}
                  onChange={(e) => setCustomEnds(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Arrows/end</label>
                <input
                  type="number"
                  value={customArrows}
                  min={1}
                  max={6}
                  onChange={(e) => setCustomArrows(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Equipment, conditions, etc."
          rows={2}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-500 resize-none"
        />
      </div>

      <Button size="lg" className="w-full" onClick={handleStart} loading={isPending}>
        Start Round
      </Button>
    </div>
  );
}
