import type { FrameworkMode } from '@core/config/types';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const FRAMEWORKS: { value: FrameworkMode; label: string; hint: string }[] = [
  { value: 'react', label: 'React', hint: 'Frame experience in React/frontend terms.' },
  { value: 'vue', label: 'Vue', hint: 'Translate React experience into Vue equivalents.' },
  { value: 'agnostic', label: 'Agnostic', hint: 'Stay framework-neutral throughout.' },
];

interface FrameworkSelectorProps {
  value: FrameworkMode;
  onChange: (value: FrameworkMode) => void;
  disabled?: boolean;
}

export function FrameworkSelector({ value, onChange, disabled }: FrameworkSelectorProps) {
  const active = FRAMEWORKS.find((f) => f.value === value);

  return (
    <div className="flex flex-col gap-1.5">
      <Label>Frontend Framework Framing</Label>
      <ToggleGroup
        type="single"
        variant="outline"
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          if (next) onChange(next as FrameworkMode);
        }}
      >
        {FRAMEWORKS.map((framework) => (
          <ToggleGroupItem key={framework.value} value={framework.value}>
            {framework.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {active && <p className="text-muted-foreground text-xs">{active.hint}</p>}
    </div>
  );
}
