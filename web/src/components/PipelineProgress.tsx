import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import type { PipelineStepId } from '@core/types/api';
import type { PipelineState, StepInfo } from '@core/pipeline/machine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STEP_LABELS: Record<PipelineStepId, string> = {
  'fetch-offer': 'Reading the job offer',
  'extract-title': 'Extracting the job title',
  'extract-keywords': 'Extracting keywords',
  adapt: 'Adapting your CV',
  'post-process': 'Cleaning up & validating',
};

const STEP_ORDER: PipelineStepId[] = [
  'fetch-offer',
  'extract-title',
  'extract-keywords',
  'adapt',
  'post-process',
];

function StepIcon({ status }: { status: StepInfo['status'] }) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="text-teal size-4" aria-hidden />;
    case 'active':
      return <Loader2 className="text-marigold size-4 animate-spin" aria-hidden />;
    case 'error':
      return <XCircle className="text-coral size-4" aria-hidden />;
    default:
      return <Circle className="text-muted-foreground size-4" aria-hidden />;
  }
}

function durationLabel(step: StepInfo): string | undefined {
  if (step.startedAt && step.endedAt) {
    return `${((step.endedAt - step.startedAt) / 1000).toFixed(1)}s`;
  }
  return undefined;
}

interface PipelineProgressProps {
  pipelineState: PipelineState;
}

export function PipelineProgress({ pipelineState }: PipelineProgressProps) {
  if (pipelineState.status === 'idle') {
    return null;
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Progress</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {STEP_ORDER.map((id) => {
          const step = pipelineState.steps[id];
          const duration = durationLabel(step);
          return (
            <div key={id} className="flex items-start gap-2.5">
              <div className="mt-0.5">
                <StepIcon status={step.status} />
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={
                      step.status === 'active'
                        ? 'text-marigold text-sm font-medium'
                        : step.status === 'done'
                          ? 'text-teal text-sm font-medium'
                          : 'text-sm font-medium'
                    }
                  >
                    {STEP_LABELS[id]}
                  </span>
                  {duration && <span className="text-muted-foreground text-xs">{duration}</span>}
                </div>
                {step.detail && step.status !== 'error' && (
                  <span className="text-muted-foreground text-xs">{step.detail}</span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
