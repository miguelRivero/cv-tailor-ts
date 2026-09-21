import { cn } from '@/lib/utils';

interface LogoMarkProps {
  className?: string;
}

/** Compact patch: needle stitching a document on a tomato square. */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <div
      className={cn(
        'flex size-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-[#E14B3C]',
        className
      )}
    >
      <svg viewBox="0 0 124 124" className="size-[80%]" aria-hidden="true" focusable="false">
        <g transform="rotate(-7 62 60)">
          <rect x="37" y="23" width="50" height="70" rx="11" fill="#FFF8EC" />
        </g>
        <g fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray="9 18">
          <path
            d="M18 86C34 94 48 80 62 70C76 61 88 52 100 41"
            stroke="#F7B32B"
            strokeDashoffset="0"
          />
          <path
            d="M18 86C34 94 48 80 62 70C76 61 88 52 100 41"
            stroke="#2BD3AA"
            strokeDashoffset="-9"
          />
          <path
            d="M18 86C34 94 48 80 62 70C76 61 88 52 100 41"
            stroke="#6C63D8"
            strokeDashoffset="-18"
          />
        </g>
        <path d="M100 41L116 25" stroke="#2B1A18" strokeWidth="7" strokeLinecap="round" />
      </svg>
    </div>
  );
}
