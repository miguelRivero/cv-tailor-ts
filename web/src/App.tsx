import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { FrameworkMode } from '@core/config/types';
import { DEFAULT_CORE_CONFIG } from '@core/config/defaults';
import { resolveRunCandidateName } from '@core/html/cvStructure';
import {
  applyBaseCvUpload,
  initialBaseCvChoice,
  replaceSavedBaseCv,
  resolveActiveBaseCv,
  type SavedBaseCv,
  type WebBaseCvChoice,
} from '@core/savedBaseCv';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { OfferInputCard } from '@/components/OfferInputCard';
import { OptionsCard } from '@/components/OptionsCard';
import type { AdvancedOptionsValue } from '@/components/AdvancedOptions';
import { AppHeader } from '@/components/AppHeader';
import { GenerateBar } from '@/components/GenerateBar';
import { IdleHero } from '@/components/IdleHero';
import { PipelineProgress } from '@/components/PipelineProgress';
import { ResultTabs } from '@/components/ResultTabs';
import { usePipeline, type GenerateOptions } from '@/lib/pipeline/usePipeline';
import { BLANK_CV_HTML } from '@/assets/baseCvs';
import { workerUrlMissing } from '@/lib/env';
import { forgetSavedBaseCv, loadSavedBaseCv, persistSavedBaseCv } from '@/lib/savedBaseCv';
import { readBaseCvFile } from '@/lib/readBaseCvFile';

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

  const [savedBaseCv, setSavedBaseCv] = useState<SavedBaseCv | null>(() => loadSavedBaseCv());
  const [framework, setFramework] = useState<FrameworkMode>(
    () => loadSavedBaseCv()?.framework ?? 'agnostic'
  );
  const [baseCvChoice, setBaseCvChoice] = useState<WebBaseCvChoice>(() =>
    initialBaseCvChoice(loadSavedBaseCv())
  );
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

  const activeBase = resolveActiveBaseCv({
    choice: baseCvChoice,
    saved: savedBaseCv,
    blankHtml: BLANK_CV_HTML,
    customHtml: customBaseHtml,
  });

  const candidateName = resolveRunCandidateName({
    useConfiguredName: activeBase.useConfiguredName,
    configuredName: DEFAULT_CORE_CONFIG.candidateName,
    baseHtml: activeBase.html,
  });

  const generateOptions: GenerateOptions = {
    framework: activeBase.framework,
    baseHtml: activeBase.html,
    candidateName,
    model: advanced.model,
    temperature: advanced.temperature,
    checkWatermarks: advanced.checkWatermarks,
    rewriteTitle: advanced.rewriteTitle,
  };

  const handleGenerate = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (useManualSource) {
      void runGenerate(manualText.trim(), generateOptions);
    } else {
      void fetchOffer(offerUrl.trim(), generateOptions);
    }
  };

  const rememberSavedCv = (cv: SavedBaseCv): boolean => {
    try {
      persistSavedBaseCv(cv);
      setSavedBaseCv(cv);
      return true;
    } catch {
      toast.error('Could not save this CV in the browser.');
      return false;
    }
  };

  const handleUploadBaseCv = (file: File) => {
    void readBaseCvFile(file)
      .then((html) => {
        const result = applyBaseCvUpload(savedBaseCv, { html, fileName: file.name });
        if (result.choice === 'saved' && result.saved) {
          const stored = rememberSavedCv(result.saved);
          setFramework(result.saved.framework);
          if (stored) {
            setCustomBaseHtml(undefined);
            setCustomFileName(undefined);
            setBaseCvChoice('saved');
          } else {
            setCustomBaseHtml(result.saved.html);
            setCustomFileName(result.saved.fileName);
            setBaseCvChoice('custom');
          }
          return;
        }
        setCustomBaseHtml(result.customHtml);
        setCustomFileName(result.customFileName);
        setBaseCvChoice(result.choice);
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : 'Could not read that CV.');
      });
  };

  const handleReplaceSavedCv = () => {
    if (!customBaseHtml || !customFileName) return;
    const next = replaceSavedBaseCv(savedBaseCv, {
      html: customBaseHtml,
      fileName: customFileName,
    });
    rememberSavedCv(next);
    setFramework(next.framework);
    setCustomBaseHtml(undefined);
    setCustomFileName(undefined);
    setBaseCvChoice('saved');
  };

  const handleForgetSavedCv = () => {
    forgetSavedBaseCv();
    setSavedBaseCv(null);
    setCustomBaseHtml(undefined);
    setCustomFileName(undefined);
    setBaseCvChoice('blank');
  };

  const handleShowFrameworkChange = (show: boolean) => {
    if (!savedBaseCv) return;
    rememberSavedCv({ ...savedBaseCv, showFramework: show });
  };

  const handleFrameworkChange = (mode: FrameworkMode) => {
    setFramework(mode);
    if (savedBaseCv && baseCvChoice === 'saved') {
      rememberSavedCv({ ...savedBaseCv, framework: mode });
    }
  };

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-6xl p-6 lg:p-10">
        <div className="grid gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
          <div className="flex flex-col gap-6 lg:col-start-1 lg:row-start-1">
            <AppHeader />
            {workerUrlMissing && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertTitle>Worker URL is not configured</AlertTitle>
                <AlertDescription>
                  This production build was compiled without VITE_WORKER_URL. Set it as a GitHub
                  Actions repository variable (not a secret) and rebuild — it is public by
                  definition.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {pipelineState.status === 'idle' && (
            <IdleHero className="lg:col-start-2 lg:row-start-2 lg:self-start" />
          )}

          <div className="flex flex-col gap-6 lg:col-start-1 lg:row-start-2 lg:sticky lg:top-10">
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
              onFrameworkChange={handleFrameworkChange}
              showFramework={Boolean(savedBaseCv?.showFramework)}
              onShowFrameworkChange={handleShowFrameworkChange}
              baseCvChoice={baseCvChoice}
              savedFileName={savedBaseCv?.fileName}
              baseCvFileName={customFileName}
              onSelectBaseCvPreset={(id) => setBaseCvChoice(id)}
              onUploadBaseCv={handleUploadBaseCv}
              onReplaceSavedCv={handleReplaceSavedCv}
              onForgetSavedCv={handleForgetSavedCv}
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
          </div>

          {pipelineState.status !== 'idle' && (
            <div className="flex flex-col gap-6 lg:col-start-2 lg:row-start-2">
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
                candidateName={candidateName}
                inlineCssOnDownload={advanced.inlineCssOnDownload}
              />
            </div>
          )}
        </div>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
