import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { CameraCapture } from '../components/CameraCapture';
import { ManualScoreEntry } from '../components/ManualScoreEntry';
import { EndRow } from '../components/ScoreDisplay';
import { useApi } from '../hooks/useApi';
import type { RoundWithEnds, AiScoreResponse, Arrow } from '../api/client';
import { clsx } from 'clsx';

type EntryMode = 'idle' | 'camera' | 'manual' | 'ai-review';

interface AiReviewState {
  response: AiScoreResponse;
  endNumber: number;
}

export function RoundPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const api = useApi();
  const queryClient = useQueryClient();

  const [entryMode, setEntryMode] = useState<EntryMode>('idle');
  const [editingEndId, setEditingEndId] = useState<string | null>(null);
  const [aiReview, setAiReview] = useState<AiReviewState | null>(null);

  const { data: round, isLoading } = useQuery<RoundWithEnds>({
    queryKey: ['round', id],
    queryFn: () => api!.get<RoundWithEnds>(`/rounds/${id}`),
    enabled: !!api && !!id,
    refetchInterval: entryMode === 'idle' ? false : 3000,
  });

  // Upload image to AI
  const { mutate: analyzeImage, isPending: isAnalyzing } = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('image', file);
      form.append('round_id', id!);
      form.append('end_number', String(nextEndNumber));
      return api!.postForm<AiScoreResponse>('/analyze', form);
    },
    onSuccess: (result) => {
      setAiReview({ response: result, endNumber: nextEndNumber });
      setEntryMode('ai-review');
      queryClient.invalidateQueries({ queryKey: ['round', id] });
    },
    onError: () => {
      // Fall back to manual entry
      setEntryMode('manual');
    },
  });

  // Manual entry / override
  const { mutate: saveManual, isPending: isSavingManual } = useMutation({
    mutationFn: (arrows: Arrow[]) =>
      api!.post('/analyze/manual', {
        round_id: id,
        end_number: editingEndId ? undefined : nextEndNumber,
        arrows,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['round', id] });
      setEntryMode('idle');
      setEditingEndId(null);
    },
  });

  // Override an existing end
  const { mutate: overrideEnd, isPending: isOverriding } = useMutation({
    mutationFn: ({ endId, arrows }: { endId: string; arrows: Arrow[] }) =>
      api!.patch(`/analyze/ends/${endId}`, { arrows }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['round', id] });
      setEntryMode('idle');
      setEditingEndId(null);
    },
  });

  // Complete round
  const { mutate: completeRound, isPending: isCompleting } = useMutation({
    mutationFn: () => api!.patch(`/rounds/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['round', id] });
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
    },
  });

  if (isLoading || !round) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const nextEndNumber = (round.ends_completed ?? 0) + 1;
  const isComplete = round.status === 'completed';
  const isFinished = round.ends_completed >= round.ends_total;
  const maxScore = round.ends_total * round.arrows_per_end * round.max_arrow_score;

  // Compute running totals
  let runningTotal = 0;
  const endsWithRunning = round.ends.map((e) => {
    runningTotal += e.total_score;
    return { ...e, runningTotal };
  });

  const editingEnd = editingEndId ? round.ends.find((e) => e.id === editingEndId) : null;

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => navigate('/')} className="tap-highlight-none">
          <ArrowLeft size={22} className="text-gray-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{round.label}</h1>
          <p className="text-sm text-gray-500">
            {round.ends_completed}/{round.ends_total} ends
            {round.notes && ` · ${round.notes}`}
          </p>
        </div>
        {isComplete && (
          <CheckCircle2 size={22} className="text-green-500 shrink-0" />
        )}
      </div>

      {/* Score summary */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-end gap-4">
            <div>
              <div className="text-4xl font-black font-mono text-white">
                {round.total_score ?? 0}
              </div>
              <div className="text-sm text-gray-500">of {maxScore}</div>
            </div>
            <div className="flex-1">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, ((round.total_score ?? 0) / maxScore) * 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>{Math.round(((round.total_score ?? 0) / maxScore) * 100)}%</span>
                <span>{round.x_count}X</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entry section */}
      {!isComplete && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-white">
              {isFinished ? 'All ends complete' : `End ${nextEndNumber}`}
            </h2>
          </CardHeader>
          <CardContent>
            {isFinished ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">
                  You've shot all {round.ends_total} ends. Ready to save your final score?
                </p>
                <Button
                  className="w-full"
                  onClick={() => completeRound()}
                  loading={isCompleting}
                >
                  <CheckCircle2 size={18} className="mr-2" />
                  Complete Round — {round.total_score} pts
                </Button>
              </div>
            ) : entryMode === 'idle' ? (
              <div className="space-y-3">
                <CameraCapture
                  onCapture={(file) => {
                    setEntryMode('camera');
                    analyzeImage(file);
                  }}
                  disabled={isAnalyzing}
                />
                {isAnalyzing && (
                  <div className="flex items-center gap-3 text-sm text-brand-400 bg-brand-900/20 rounded-xl p-3">
                    <div className="animate-spin w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full shrink-0" />
                    Analyzing target with AI…
                  </div>
                )}
                <button
                  onClick={() => setEntryMode('manual')}
                  className="w-full text-sm text-gray-500 hover:text-gray-300 py-2 tap-highlight-none flex items-center justify-center gap-2"
                >
                  <Pencil size={14} />
                  Enter scores manually instead
                </button>
              </div>
            ) : entryMode === 'ai-review' && aiReview ? (
              <div className="space-y-4">
                <div className={clsx(
                  'rounded-xl p-3 text-sm',
                  aiReview.response.confidence >= 0.85
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-yellow-900/30 text-yellow-400'
                )}>
                  <div className="flex items-center gap-2 font-medium">
                    {aiReview.response.confidence >= 0.85
                      ? <CheckCircle2 size={16} />
                      : <AlertTriangle size={16} />}
                    AI confidence: {Math.round(aiReview.response.confidence * 100)}%
                  </div>
                  {aiReview.response.notes && (
                    <p className="mt-1 text-xs opacity-80">{aiReview.response.notes}</p>
                  )}
                </div>

                <ManualScoreEntry
                  arrowCount={round.arrows_per_end}
                  maxScore={round.max_arrow_score}
                  initialArrows={aiReview.response.arrows}
                  onSubmit={(arrows) => {
                    // If unchanged, just go idle (end was already saved by AI route)
                    const changed = arrows.some(
                      (a, i) =>
                        a.score !== aiReview.response.arrows[i].score ||
                        a.is_x !== aiReview.response.arrows[i].is_x
                    );
                    if (changed) {
                      overrideEnd({ endId: aiReview.response.end_id, arrows });
                    } else {
                      setEntryMode('idle');
                      setAiReview(null);
                    }
                  }}
                  onCancel={() => {
                    setEntryMode('idle');
                    setAiReview(null);
                  }}
                  loading={isOverriding}
                />
              </div>
            ) : entryMode === 'manual' ? (
              <ManualScoreEntry
                arrowCount={round.arrows_per_end}
                maxScore={round.max_arrow_score}
                onSubmit={saveManual}
                onCancel={() => setEntryMode('idle')}
                loading={isSavingManual}
              />
            ) : null}

            {/* Edit existing end overlay */}
            {editingEndId && editingEnd && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Edit End {editingEnd.end_number}
                </h3>
                <ManualScoreEntry
                  arrowCount={round.arrows_per_end}
                  maxScore={round.max_arrow_score}
                  initialArrows={editingEnd.arrows}
                  onSubmit={(arrows) => overrideEnd({ endId: editingEndId, arrows })}
                  onCancel={() => setEditingEndId(null)}
                  loading={isOverriding}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scorecard */}
      {round.ends.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Scorecard</h2>
              <div className="flex text-xs text-gray-600 gap-4">
                <span>End</span>
                <span className="w-8 text-center">Tot</span>
                <span className="w-12 text-right">Run</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {endsWithRunning.map((e) => (
              <EndRow
                key={e.id}
                endNumber={e.end_number}
                arrows={e.arrows}
                total={e.total_score}
                runningTotal={e.runningTotal}
                isAi={e.scoring_method === 'ai'}
                onEdit={
                  !isComplete
                    ? () => {
                        setEditingEndId(e.id);
                        setEntryMode('idle');
                        setAiReview(null);
                      }
                    : undefined
                }
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
