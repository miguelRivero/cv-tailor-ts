import { Loader2 } from 'lucide-react';
import type { PipelineState } from '@core/pipeline/machine';
import { Button } from '@/components/ui/button';

interface GenerateBarProps {
  pipelineState: PipelineState;
  canGenerate: boolean;
  isRetry: boolean;
  onGenerate: () => void;
  onCancel: () => void;
}

export function GenerateBar({
  pipelineState,
  canGenerate,
  isRetry,
  onGenerate,
  onCancel,
}: GenerateBarProps) {
  const isBusy = pipelineState.status === 'fetching-offer' || pipelineState.status === 'running';

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={onGenerate}
        disabled={!canGenerate || isBusy}
        className="font-heading h-12 flex-1 rounded-xl px-4 text-lg font-bold tracking-tight text-white hover:bg-[#B93A2E] disabled:bg-primary/70 disabled:text-white disabled:opacity-100"
      >
        {isBusy && <Loader2 className="size-5 animate-spin text-white" aria-hidden />}
        {isBusy ? 'Generating…' : isRetry ? 'Retry' : 'Generate'}
      </Button>
      {isBusy && (
        <Button
          variant="outline"
          className="h-12 rounded-xl bg-card px-4 text-card-foreground"
          onClick={onCancel}
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
