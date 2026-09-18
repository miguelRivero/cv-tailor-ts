import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { BASE_CV_OPTIONS } from '@/assets/baseCvs';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type BaseCvChoice = 'default' | 'blank' | 'custom';

interface BaseCvSelectorProps {
  choice: BaseCvChoice;
  customFileName?: string;
  onSelectPreset: (id: 'default' | 'blank') => void;
  onUpload: (file: File) => void;
  disabled?: boolean;
}

export function BaseCvSelector({
  choice,
  customFileName,
  onSelectPreset,
  onUpload,
  disabled,
}: BaseCvSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="base-cv">Base CV</Label>
      <div className="flex gap-2">
        <Select
          value={choice === 'custom' ? '' : choice}
          disabled={disabled}
          onValueChange={(value) => onSelectPreset(value as 'default' | 'blank')}
        >
          <SelectTrigger id="base-cv" className="flex-1">
            <SelectValue placeholder={customFileName ?? 'Choose a base CV'} />
          </SelectTrigger>
          <SelectContent>
            {BASE_CV_OPTIONS.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
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
          accept=".html,text/html"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
            event.target.value = '';
          }}
        />
      </div>
      {choice === 'custom' && customFileName && (
        <p className="text-muted-foreground text-xs">Using uploaded file: {customFileName}</p>
      )}
    </div>
  );
}
