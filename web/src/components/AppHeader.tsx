import { LogoMark } from '@/components/LogoMark';

export function AppHeader() {
  return (
    <header className="flex flex-col items-center gap-4 text-center md:flex-row md:items-center md:gap-5 md:text-left">
      <LogoMark className="size-[4.5rem] shrink-0 md:size-16" />
      <div className="min-w-0 md:flex-1">
        <h1 className="font-heading text-[2.5rem] leading-[0.95] font-bold tracking-tight text-[#FFF8EC] md:text-4xl">
          <span className="text-coral">CV</span> Tailor
        </h1>
        <p className="mt-2 text-xs font-medium tracking-[0.18em] text-[#D4E8E2] uppercase">
          Tailor your CV to every job offer
        </p>
      </div>
    </header>
  );
}
