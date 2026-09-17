import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { FrameworkMode } from '@core/config/types';
import { DEFAULT_CORE_CONFIG } from '@core/config/defaults';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { OfferInputCard } from '@/components/OfferInputCard';
import { OptionsCard } from '@/components/OptionsCard';
import type { BaseCvChoice } from '@/components/BaseCvSelector';
import type { AdvancedOptionsValue } from '@/components/AdvancedOptions';
import { GenerateBar } from '@/components/GenerateBar';
import { PipelineProgress } from '@/components/PipelineProgress';
import { ResultTabs } from '@/components/ResultTabs';
import { usePipeline, type GenerateOptions } from '@/lib/pipeline/usePipeline';
import { BASE_CV_OPTIONS } from '@/assets/baseCvs';

const DEFAULT_ADVANCED: AdvancedOptionsValue = {
  model: DEFAULT_CORE_CONFIG.model,
  temperature: DEFAULT_CORE_CONFIG.temperature,
  checkWatermarks: true,
  rewriteTitle: true,
  inlineCssOnDownload: true,
};

function App() {
  const [offerUrl, setOfferUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [manualRevealed, setManualRevealed] = useState(false);

  const [framework, setFramework] = useState<FrameworkMode>('agnostic');
  const [baseCvChoice, setBaseCvChoice] = useState<BaseCvChoice>('default');
  const [customBaseHtml, setCustomBaseHtml] = useState<string>();
  const [customFileName, setCustomFileName] = useState<string>();
  const [advanced, setAdvanced] = useState<AdvancedOptionsValue>(DEFAULT_ADVANCED);

  const { state: pipelineState, fetchOffer, runGenerate, cancel } = usePipeline();

  const previousStatus = useRef(pipelineState.status);
  useEffect(() => {
    if (previousStatus.current !== pipelineState.status) {
      if (pipelineState.status === 'succeeded') {
        toast.success('Your tailored CV is ready.');
      } else if (pipelineState.status === 'failed' && pipelineState.error) {
        toast.error(pipelineState.error.message);
      }
      previousStatus.current = pipelineState.status;
    }
  }, [pipelineState.status, pipelineState.error]);

  const isBusy = pipelineState.status === 'fetching-offer' || pipelineState.status === 'running';

  const useManualSource =
    (manualRevealed || Boolean(pipelineState.offerFetchError)) && manualText.trim().length > 0;
  const canGenerate = !isBusy && (useManualSource || offerUrl.trim().length > 0);
  const isRetry = pipelineState.status === 'failed' || Boolean(pipelineState.offerFetchError);

  const activeBaseHtml =
    baseCvChoice === 'custom' && customBaseHtml
      ? customBaseHtml
      : (BASE_CV_OPTIONS.find((option) => option.id === baseCvChoice)?.html ??
        BASE_CV_OPTIONS[0].html);

  const generateOptions: GenerateOptions = {
    framework,
    baseHtml: activeBaseHtml,
    candidateName: DEFAULT_CORE_CONFIG.candidateName,
    model: advanced.model,
    temperature: advanced.temperature,
    checkWatermarks: advanced.checkWatermarks,
    rewriteTitle: advanced.rewriteTitle,
  };

  const handleGenerate = () => {
    if (useManualSource) {
      void runGenerate(manualText.trim(), generateOptions);
    } else {
      void fetchOffer(offerUrl.trim(), generateOptions);
    }
  };

  const handleUploadBaseCv = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCustomBaseHtml(String(reader.result));
      setCustomFileName(file.name);
      setBaseCvChoice('custom');
    };
    reader.readAsText(file);
  };

  return (
    <TooltipProvider>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6 lg:p-10">
        <header>
          <h1 className="text-2xl font-semibold">CV Tailor</h1>
          <p className="text-muted-foreground text-sm">
            Paste a job offer URL, tailor your CV against it, then preview and download the result.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
          <div className="flex flex-col gap-6 lg:sticky lg:top-10">
            <OfferInputCard
              url={offerUrl}
              onUrlChange={setOfferUrl}
              manualText={manualText}
              onManualTextChange={setManualText}
              manualRevealed={manualRevealed}
              onRevealManual={() => setManualRevealed(true)}
              onHideManual={() => setManualRevealed(false)}
              pipelineState={pipelineState}
            />
            <OptionsCard
              framework={framework}
              onFrameworkChange={setFramework}
              baseCvChoice={baseCvChoice}
              baseCvFileName={customFileName}
              onSelectBaseCvPreset={(id) => setBaseCvChoice(id)}
              onUploadBaseCv={handleUploadBaseCv}
              advanced={advanced}
              onAdvancedChange={setAdvanced}
              disabled={isBusy}
            />
            <GenerateBar
              pipelineState={pipelineState}
              canGenerate={canGenerate}
              isRetry={isRetry}
              onGenerate={handleGenerate}
              onCancel={cancel}
            />
          </div>

          <div className="flex flex-col gap-6">
            {pipelineState.status === 'failed' && pipelineState.error && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertTitle>Generation failed</AlertTitle>
                <AlertDescription>{pipelineState.error.message}</AlertDescription>
                {pipelineState.error.retryable && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 w-fit"
                    onClick={handleGenerate}
                  >
                    <RefreshCw />
                    Retry
                  </Button>
                )}
              </Alert>
            )}

            {pipelineState.warnings.length > 0 && (
              <Alert>
                <AlertTriangle />
                <AlertTitle>Review before downloading</AlertTitle>
                <AlertDescription>
                  <ul className="list-inside list-disc">
                    {pipelineState.warnings.map((warning, index) => (
                      // The same structural defect can legitimately be
                      // reported twice - once right after watermark
                      // removal, once after the final structure check
                      // (see stageRemoveWatermarks/validateFinalStructure
                      // in src/core/pipeline/postProcess.ts) - so the
                      // warning text itself is not a safe key.
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <PipelineProgress pipelineState={pipelineState} />
            <ResultTabs
              pipelineState={pipelineState}
              candidateName={DEFAULT_CORE_CONFIG.candidateName}
              inlineCssOnDownload={advanced.inlineCssOnDownload}
            />
          </div>
        </div>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
