import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

/**
 * Advisory only, mirroring the plan: a model string from a browser is
 * attacker-controlled input to a paid API, so the worker (Phase 3,
 * worker/src/routes/tailor.ts) allowlists models and clamps temperature
 * server-side regardless of what is sent here.
 */
const MODEL_OPTIONS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'];

export interface AdvancedOptionsValue {
  model: string;
  temperature: number;
  checkWatermarks: boolean;
  rewriteTitle: boolean;
  inlineCssOnDownload: boolean;
}

interface AdvancedOptionsProps {
  value: AdvancedOptionsValue;
  onChange: (value: AdvancedOptionsValue) => void;
  disabled?: boolean;
}

export function AdvancedOptions({ value, onChange, disabled }: AdvancedOptionsProps) {
  const set = <K extends keyof AdvancedOptionsValue>(key: K, next: AdvancedOptionsValue[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="advanced">
        <AccordionTrigger>Advanced options</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="model">Model</Label>
            <Select
              value={value.model}
              disabled={disabled}
              onValueChange={(model) => set('model', model)}
            >
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature">Temperature</Label>
              <span className="text-muted-foreground text-xs">{value.temperature.toFixed(1)}</span>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={1}
              step={0.1}
              disabled={disabled}
              value={[value.temperature]}
              onValueChange={([next]) => set('temperature', next)}
            />
          </div>

          <label className="flex items-center justify-between gap-4" htmlFor="check-watermarks">
            <span className="flex flex-col">
              <span className="text-sm font-medium">Warn about residual AI phrasing</span>
              <span className="text-muted-foreground text-xs">
                Watermark phrases are always stripped; this only controls the warning.
              </span>
            </span>
            <Switch
              id="check-watermarks"
              checked={value.checkWatermarks}
              disabled={disabled}
              onCheckedChange={(checked) => set('checkWatermarks', checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-4" htmlFor="rewrite-title">
            <span className="text-sm font-medium">Rewrite the header job title</span>
            <Switch
              id="rewrite-title"
              checked={value.rewriteTitle}
              disabled={disabled}
              onCheckedChange={(checked) => set('rewriteTitle', checked)}
            />
          </label>

          <label className="flex items-center justify-between gap-4" htmlFor="inline-css">
            <span className="flex flex-col">
              <span className="text-sm font-medium">Inline CSS in the downloaded file</span>
              <span className="text-muted-foreground text-xs">
                On: one self-contained HTML file. Off: HTML plus a separate shared.css, matching the
                CLI.
              </span>
            </span>
            <Switch
              id="inline-css"
              checked={value.inlineCssOnDownload}
              disabled={disabled}
              onCheckedChange={(checked) => set('inlineCssOnDownload', checked)}
            />
          </label>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
