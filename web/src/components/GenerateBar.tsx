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
      <Button onClick={onGenerate} disabled={!canGenerate || isBusy} className="flex-1">
        {isBusy && <Loader2 className="animate-spin" aria-hidden />}
        {isBusy ? 'Generating…' : isRetry ? 'Retry' : 'Generate'}
      </Button>
      {isBusy && (
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      )}
    </div>
  );
}
