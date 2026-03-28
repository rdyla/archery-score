import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Plus, Target, Trophy, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useApi } from '../hooks/useApi';
import type { Round } from '../api/client';

function RoundCard({ round }: { round: Round }) {
  const pct =
    round.ends_total > 0 && round.total_score != null
      ? Math.round((round.total_score / (round.ends_total * 3 * round.max_arrow_score)) * 100)
      : null;

  return (
    <Link to={`/rounds/${round.id}`}>
      <Card className="hover:border-gray-700 transition-colors active:scale-[0.99] tap-highlight-none">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white truncate">{round.label}</span>
                {round.status === 'active' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-900 text-green-400 font-medium shrink-0">
                    Active
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500 mt-0.5">
                {new Date(round.created_at * 1000).toLocaleDateString()}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {round.total_score != null && (
                <div className="text-right">
                  <div className="text-2xl font-black font-mono text-white">
                    {round.total_score}
                  </div>
                  {pct != null && (
                    <div className="text-xs text-gray-500">{pct}%</div>
                  )}
                </div>
              )}
              <ChevronRight size={18} className="text-gray-600 shrink-0" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function HomePage() {
  const { user } = useUser();
  const api = useApi();

  const { data: rounds = [], isLoading } = useQuery<Round[]>({
    queryKey: ['rounds'],
    queryFn: () => api!.get<Round[]>('/rounds'),
    enabled: !!api,
  });

  const activeRounds = rounds.filter((r) => r.status === 'active');
  const recentCompleted = rounds.filter((r) => r.status === 'completed').slice(0, 3);

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">
            Hey, {user?.firstName ?? 'Archer'} 👋
          </h1>
          <p className="text-sm text-gray-500">Ready to shoot?</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden">
          {user?.imageUrl && (
            <img src={user.imageUrl} alt="avatar" className="w-full h-full object-cover" />
          )}
        </div>
      </div>

      {/* New Round CTA */}
      <Link to="/rounds/new">
        <Button size="lg" className="w-full">
          <Plus size={22} className="mr-2" />
          Start New Round
        </Button>
      </Link>

      {/* Active rounds */}
      {activeRounds.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Target size={14} />
            In Progress
          </h2>
          <div className="space-y-2">
            {activeRounds.map((r) => <RoundCard key={r.id} round={r} />)}
          </div>
        </section>
      )}

      {/* Recent completed */}
      {recentCompleted.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Trophy size={14} />
              Recent Rounds
            </h2>
            <Link to="/history" className="text-xs text-brand-500 font-medium">
              See all
            </Link>
          </div>
          <div className="space-y-2">
            {recentCompleted.map((r) => <RoundCard key={r.id} round={r} />)}
          </div>
        </section>
      )}

      {!isLoading && rounds.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <Target size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No rounds yet</p>
          <p className="text-sm mt-1">Start your first round above</p>
        </div>
      )}
    </div>
  );
}
