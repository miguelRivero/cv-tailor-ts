import { useRef } from 'react';
import { Upload } from 'lucide-react';
import type { WebBaseCvChoice } from '@core/savedBaseCv';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type { WebBaseCvChoice };

interface BaseCvSelectorProps {
  choice: WebBaseCvChoice;
  savedFileName?: string;
  customFileName?: string;
  onSelectPreset: (id: 'saved' | 'blank') => void;
  onUpload: (file: File) => void;
  onReplaceSaved: () => void;
  onForgetSaved: () => void;
  disabled?: boolean;
}

export function BaseCvSelector({
  choice,
  savedFileName,
  customFileName,
  onSelectPreset,
  onUpload,
  onReplaceSaved,
  onForgetSaved,
  disabled,
}: BaseCvSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="base-cv">Base CV</Label>
      <div className="flex gap-2">
        <Select
          value={choice === 'custom' ? '' : choice}
          disabled={disabled || !savedFileName}
          onValueChange={(value) => onSelectPreset(value as 'saved' | 'blank')}
        >
          <SelectTrigger
            id="base-cv"
            className="w-full min-w-0 flex-1 [&>[data-slot=select-value]]:truncate"
          >
            <SelectValue placeholder={customFileName ?? 'Choose a base CV'} />
          </SelectTrigger>
          <SelectContent>
            {savedFileName && (
              <SelectItem value="saved">Saved on this browser ({savedFileName})</SelectItem>
            )}
            <SelectItem value="blank">Blank template</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload />
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.pdf,text/html,application/pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
            event.target.value = '';
          }}
        />
      </div>
      {choice === 'blank' && (
        <p className="text-muted-foreground text-xs">
          Empty layout skeleton. Frontend framing is off. Upload HTML or a PDF to use your own CV.
        </p>
      )}
      {choice === 'saved' && savedFileName && (
        <p className="text-muted-foreground text-xs">
          Saved on this browser as {savedFileName}. Another browser needs its own upload.
        </p>
      )}
      {choice === 'custom' && customFileName && (
        <p className="text-muted-foreground text-xs">
          Using {customFileName} for this session. Frontend framing is off.
        </p>
      )}
      {savedFileName && (
        <div className="flex gap-2">
          {choice === 'custom' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={onReplaceSaved}
            >
              Replace saved CV
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={onForgetSaved}
          >
            Forget saved CV
          </Button>
        </div>
      )}
    </div>
  );
}
