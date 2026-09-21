import { AlertCircle, Loader2 } from 'lucide-react';
import type { PipelineState } from '@core/pipeline/machine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

interface OfferInputCardProps {
  url: string;
  onUrlChange: (url: string) => void;
  manualText: string;
  onManualTextChange: (text: string) => void;
  manualRevealed: boolean;
  onRevealManual: () => void;
  onHideManual: () => void;
  pipelineState: PipelineState;
}

/**
 * URL-first offer input, per the plan: the URL field is the only control
 * on first paint, and the textarea only ever appears either because a
 * fetch actually failed (pipelineState.offerFetchError) or because the
 * user deliberately asked for it via the secondary link - never as an
 * equal alternative tab sitting next to the URL field.
 */
export function OfferInputCard({
  url,
  onUrlChange,
  manualText,
  onManualTextChange,
  manualRevealed,
  onRevealManual,
  onHideManual,
  pipelineState,
}: OfferInputCardProps) {
  const isFetching =
    pipelineState.status === 'fetching-offer' &&
    pipelineState.steps['fetch-offer'].status === 'active';
  const fetchSucceeded =
    pipelineState.status === 'fetching-offer' && Boolean(pipelineState.offerText);
  const fetchError = pipelineState.offerFetchError;
  const showTextarea = manualRevealed || Boolean(fetchError);
  const disabled = pipelineState.status === 'fetching-offer' || pipelineState.status === 'running';

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Job offer</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="offer-url">Job offer URL</Label>
          <Input
            id="offer-url"
            type="url"
            inputMode="url"
            placeholder="https://company.com/careers/senior-frontend-developer"
            value={url}
            disabled={disabled}
            onChange={(event) => onUrlChange(event.target.value)}
          />
          {isFetching && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Loader2 className="text-marigold size-3.5 animate-spin" aria-hidden />
              Reading the job page…
            </p>
          )}
          {fetchSucceeded && (
            <p className="text-muted-foreground text-sm">
              Read {pipelineState.offerText?.length.toLocaleString()} characters from{' '}
              <span className="text-foreground font-medium">{hostnameOf(url)}</span>. Starting the
              tailoring run…
            </p>
          )}
        </div>

        {fetchError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>
              {fetchError.message} Paste the description below instead.
            </AlertDescription>
          </Alert>
        )}

        {!showTextarea && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground w-fit text-left text-sm underline underline-offset-4"
            onClick={onRevealManual}
          >
            Paste the description instead
          </button>
        )}

        {showTextarea && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="offer-text">Job offer text</Label>
              {!fetchError && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
                  onClick={onHideManual}
                >
                  Use a URL instead
                </button>
              )}
            </div>
            <Textarea
              id="offer-text"
              rows={8}
              autoFocus
              placeholder="Paste the full job description here…"
              value={manualText}
              disabled={disabled}
              onChange={(event) => onManualTextChange(event.target.value)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
