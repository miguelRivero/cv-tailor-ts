import type { FrameworkMode } from '@core/config/types';
import type { WebBaseCvChoice } from '@core/savedBaseCv';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { FrameworkSelector } from '@/components/FrameworkSelector';
import { BaseCvSelector } from '@/components/BaseCvSelector';
import { AdvancedOptions, type AdvancedOptionsValue } from '@/components/AdvancedOptions';

interface OptionsCardProps {
  framework: FrameworkMode;
  onFrameworkChange: (framework: FrameworkMode) => void;
  showFramework: boolean;
  onShowFrameworkChange: (show: boolean) => void;
  baseCvChoice: WebBaseCvChoice;
  savedFileName?: string;
  baseCvFileName?: string;
  onSelectBaseCvPreset: (id: 'saved' | 'blank') => void;
  onUploadBaseCv: (file: File) => void;
  onReplaceSavedCv: () => void;
  onForgetSavedCv: () => void;
  advanced: AdvancedOptionsValue;
  onAdvancedChange: (value: AdvancedOptionsValue) => void;
  disabled?: boolean;
}

export function OptionsCard({
  framework,
  onFrameworkChange,
  showFramework,
  onShowFrameworkChange,
  baseCvChoice,
  savedFileName,
  baseCvFileName,
  onSelectBaseCvPreset,
  onUploadBaseCv,
  onReplaceSavedCv,
  onForgetSavedCv,
  advanced,
  onAdvancedChange,
  disabled,
}: OptionsCardProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Options</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <BaseCvSelector
          choice={baseCvChoice}
          savedFileName={savedFileName}
          customFileName={baseCvFileName}
          onSelectPreset={onSelectBaseCvPreset}
          onUpload={onUploadBaseCv}
          onReplaceSaved={onReplaceSavedCv}
          onForgetSaved={onForgetSavedCv}
          disabled={disabled}
        />
        {baseCvChoice === 'saved' && (
          <label className="flex items-center justify-between gap-4" htmlFor="frontend-framing">
            <span className="flex flex-col">
              <span className="text-sm font-medium">Frontend framing</span>
              <span className="text-muted-foreground text-xs">
                Off until you turn it on for this saved CV. Then Generate sends React, Vue, or
                Agnostic.
              </span>
            </span>
            <Switch
              id="frontend-framing"
              checked={showFramework}
              disabled={disabled}
              onCheckedChange={(checked) => onShowFrameworkChange(checked)}
            />
          </label>
        )}
        {baseCvChoice === 'saved' && showFramework && (
          <FrameworkSelector value={framework} onChange={onFrameworkChange} disabled={disabled} />
        )}
        <Separator />
        <AdvancedOptions value={advanced} onChange={onAdvancedChange} disabled={disabled} />
      </CardContent>
    </Card>
  );
}
