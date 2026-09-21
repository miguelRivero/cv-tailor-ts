import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const SPEED = 0.8;
const TRAVEL_KEYFRAME_MS = 3600 * SPEED;
const TRAVEL_ACTIVE = 0.34;
const DOT_DELAYS_MS = [0, 500, 1000].map((delay) => delay * SPEED);
const TRAVEL_END_MS = DOT_DELAYS_MS[2] + TRAVEL_KEYFRAME_MS * TRAVEL_ACTIVE;
const FILL_MS = 2880 * SPEED;
const HOLD_MS = 720 * SPEED;
const CYCLE_MS = TRAVEL_END_MS + FILL_MS + HOLD_MS;
const TRAVEL_X = 134;

const LINES = [
  { start: 0, end: 0.2, idle: 0.58, done: 0.9, color: '#f7b32b' },
  { start: 0.2, end: 0.4, idle: 0.48, done: 0.8, color: '#2bd3aa' },
  { start: 0.4, end: 0.6, idle: 0.4, done: 0.72, color: '#e14b3c' },
  { start: 0.6, end: 0.8, idle: 0.52, done: 0.78, color: '#87c571' },
  { start: 0.8, end: 1, idle: 0.44, done: 0.68, color: '#ea7535' },
] as const;

const DOT_COLORS = ['bg-marigold', 'bg-teal', 'bg-coral'] as const;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function lineFill(progress: number, start: number, end: number) {
  return clamp01((progress - start) / (end - start));
}

function travelDot(elapsedMs: number, delayMs: number) {
  const local = elapsedMs - delayMs;
  const duration = TRAVEL_KEYFRAME_MS * TRAVEL_ACTIVE;
  if (elapsedMs >= TRAVEL_END_MS || local < 0 || local > duration) {
    return { opacity: 0, transform: 'translateX(0px)' };
  }

  const p = local / TRAVEL_KEYFRAME_MS;
  if (p < 0.04) {
    return { opacity: p / 0.04, transform: 'translateX(0px)' };
  }
  if (p < 0.3) {
    const x = ((p - 0.04) / 0.26) * TRAVEL_X;
    return { opacity: 1, transform: `translateX(${x}px)` };
  }
  const fade = 1 - (p - 0.3) / 0.04;
  return { opacity: clamp01(fade), transform: `translateX(${TRAVEL_X}px)` };
}

function useTailoringCycle() {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) {
      setElapsedMs(CYCLE_MS);
      return;
    }

    const started = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const next = Math.round(((now - started) % CYCLE_MS) / 16) * 16;
      setElapsedMs((current) => (current === next ? current : next));
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const fillProgress =
    elapsedMs <= TRAVEL_END_MS
      ? 0
      : elapsedMs >= TRAVEL_END_MS + FILL_MS
        ? 1
        : (elapsedMs - TRAVEL_END_MS) / FILL_MS;

  const fills = LINES.map((line) => lineFill(fillProgress, line.start, line.end));
  const score = Math.round((fills.reduce((sum, fill) => sum + fill, 0) / LINES.length) * 100);
  const lifted = fillProgress >= 1;
  const dots = DOT_DELAYS_MS.map((delay) => travelDot(elapsedMs, delay));

  return { fills, score, lifted, dots };
}

interface IdleHeroProps {
  className?: string;
}

/**
 * Idle preview of the tailoring loop. Unmounts as soon as a run starts
 * so Progress / Result can occupy the desktop right column.
 */
export function IdleHero({ className }: IdleHeroProps) {
  const { fills, score, lifted, dots } = useTailoringCycle();

  return (
    <div
      id="idle-hero"
      className={cn('flex flex-col items-center gap-4 overflow-hidden', className)}
    >
      <div
        aria-hidden="true"
        className="flex items-start justify-center gap-6 [zoom:0.48] min-[400px]:[zoom:0.55] sm:[zoom:0.68] md:[zoom:0.78] xl:[zoom:0.9] 2xl:[zoom:1]"
      >
        <div className="flex w-[214px] shrink-0 flex-col gap-3.5 rounded-2xl border border-[#9bb8af] bg-card p-[18px]">
          <span className="text-[10px] font-semibold tracking-[0.24em] text-[#3d524c] uppercase">
            Job offer
          </span>
          <div className="flex flex-col gap-2">
            <span className="block h-1.5 w-full rounded bg-[#b7d0c8]" />
            <span className="block h-1.5 w-[78%] rounded bg-[#b7d0c8]" />
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5 rounded-[10px] bg-[#FDF3DC] px-2.5 py-2">
              <span className="bg-marigold size-2.5 shrink-0 rounded-full" />
              <span className="block h-1.5 w-[84px] rounded-sm bg-[#E3C98F]" />
            </div>
            <div className="flex items-center gap-2.5 rounded-[10px] bg-[#DFF3EE] px-2.5 py-2">
              <span className="bg-teal size-2.5 shrink-0 rounded-full" />
              <span className="block h-1.5 w-[68px] rounded-sm bg-[#96CDC1]" />
            </div>
            <div className="flex items-center gap-2.5 rounded-[10px] bg-[#F8D9D4] px-2.5 py-2">
              <span className="bg-coral size-2.5 shrink-0 rounded-full" />
              <span className="block h-1.5 w-[76px] rounded-sm bg-[#E8A8A0]" />
            </div>
          </div>
        </div>

        <div className="relative h-11 w-36 shrink-0">
          <span className="absolute inset-x-0 top-[21px] border-t-2 border-dashed border-[#9bb8af]" />
          {dots.map((dot, index) => (
            <span key={index} className={cn('cvt-dot', DOT_COLORS[index])} style={dot} />
          ))}
        </div>

        <div className="flex w-[252px] shrink-0 flex-col gap-4 rounded-2xl border border-[#9bb8af] bg-card p-[18px]">
          <div className="flex items-center gap-3">
            <span className="bg-coral size-[34px] shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="block h-2 w-[74%] rounded bg-[#9bb8af]" />
              <span className="block h-1.5 w-[48%] rounded-sm bg-[#b7d0c8]" />
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {LINES.map((line, index) => {
              const fill = fills[index];
              const width = line.idle + fill * (line.done - line.idle);
              return (
                <span
                  key={index}
                  className="block h-2 rounded"
                  style={{
                    width: `${width * 100}%`,
                    backgroundColor: fill > 0 ? line.color : '#b7d0c8',
                  }}
                />
              );
            })}
          </div>
          <div
            className="flex items-center justify-between gap-2.5 rounded-[11px] bg-[#DFF3EE] px-3 py-2.5"
            style={{
              opacity: lifted ? 1 : 0.55,
              transform: lifted ? 'translateY(-3px)' : 'translateY(0)',
            }}
          >
            <span className="text-[10px] font-semibold tracking-[0.2em] text-[#0E6B59] uppercase">
              Match
            </span>
            <span className="font-heading text-xl leading-none font-bold tracking-tight text-[#0E6B59]">
              {score}%
            </span>
          </div>
        </div>
      </div>
      <p className="text-xs font-medium tracking-[0.22em] text-[#D4E8E2] uppercase">
        Requirements stitched into the CV
      </p>
    </div>
  );
}
