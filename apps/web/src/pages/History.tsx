import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Trophy, Target, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { useApi } from '../hooks/useApi';
import type { Round } from '../api/client';

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function HistoryPage() {
  const api = useApi();
  const { data: rounds = [], isLoading } = useQuery<Round[]>({
    queryKey: ['rounds'],
    queryFn: () => api!.get<Round[]>('/rounds'),
    enabled: !!api,
  });

  const completed = rounds.filter((r) => r.status === 'completed');
  const byLabel = completed.reduce<Record<string, Round[]>>((acc, r) => {
    acc[r.label] = acc[r.label] ?? [];
    acc[r.label].push(r);
    return acc;
  }, {});

  const bests: Record<string, number> = {};
  for (const [label, rs] of Object.entries(byLabel)) {
    bests[label] = Math.max(...rs.map((r) => r.total_score ?? 0));
  }

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-white">History</h1>
        <p className="text-sm text-gray-500">{completed.length} rounds completed</p>
      </div>

      {/* Personal bests */}
      {Object.keys(bests).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Trophy size={14} />
            Personal Bests
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(bests).map(([label, score]) => (
              <Card key={label}>
                <CardContent className="py-3 text-center">
                  <div className="text-2xl font-black font-mono text-white">{score}</div>
                  <div className="text-xs text-gray-500 mt-0.5 truncate">{label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* All rounds */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Target size={14} />
          All Rounds
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : completed.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <Target size={40} className="mx-auto mb-2 opacity-30" />
            <p>No completed rounds yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {completed.map((r) => (
              <Link key={r.id} to={`/rounds/${r.id}`}>
                <Card className="hover:border-gray-700 transition-colors active:scale-[0.99] tap-highlight-none">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white">{r.label}</div>
                        <div className="text-xs text-gray-500">{formatDate(r.created_at)}</div>
                      </div>
                      <div className="text-2xl font-black font-mono text-white">
                        {r.total_score ?? '—'}
                      </div>
                      {r.x_count > 0 && (
                        <span className="text-xs text-yellow-400 font-mono">{r.x_count}X</span>
                      )}
                      <ChevronRight size={16} className="text-gray-600" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
