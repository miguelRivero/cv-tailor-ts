import type { FrameworkMode } from '@core/config/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FrameworkSelector } from '@/components/FrameworkSelector';
import { BaseCvSelector, type BaseCvChoice } from '@/components/BaseCvSelector';
import { AdvancedOptions, type AdvancedOptionsValue } from '@/components/AdvancedOptions';

interface OptionsCardProps {
  framework: FrameworkMode;
  onFrameworkChange: (framework: FrameworkMode) => void;
  baseCvChoice: BaseCvChoice;
  baseCvFileName?: string;
  onSelectBaseCvPreset: (id: 'default' | 'blank') => void;
  onUploadBaseCv: (file: File) => void;
  advanced: AdvancedOptionsValue;
  onAdvancedChange: (value: AdvancedOptionsValue) => void;
  disabled?: boolean;
}

export function OptionsCard({
  framework,
  onFrameworkChange,
  baseCvChoice,
  baseCvFileName,
  onSelectBaseCvPreset,
  onUploadBaseCv,
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
        <FrameworkSelector value={framework} onChange={onFrameworkChange} disabled={disabled} />
        <BaseCvSelector
          choice={baseCvChoice}
          customFileName={baseCvFileName}
          onSelectPreset={onSelectBaseCvPreset}
          onUpload={onUploadBaseCv}
          disabled={disabled}
        />
        <Separator />
        <AdvancedOptions value={advanced} onChange={onAdvancedChange} disabled={disabled} />
      </CardContent>
    </Card>
  );
}
