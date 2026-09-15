import { useId } from 'react';

interface IntegerStepperProps {
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
  invalid?: boolean;
  describedBy?: string;
}

export const IntegerStepper = ({ label, decreaseLabel, increaseLabel, value, onChange, max, invalid, describedBy }: IntegerStepperProps) => {
  const id = useId();
  const clamp = (number: number) => Math.min(max ?? Infinity, Math.max(0, number));
  const adjust = (delta: number) => {
    const current = Number(value);
    onChange(String(clamp((Number.isFinite(current) ? Math.trunc(current) : 0) + delta)));
  };
  const buttonClass = 'min-h-12 w-11 shrink-0 touch-manipulation text-xl text-zinc-200 transition hover:bg-white/10 active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-400';

  return <div className="min-w-0 space-y-2">
    <label htmlFor={id} className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</label>
    <div className="flex items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition focus-within:border-accent-400">
      <button type="button" aria-label={decreaseLabel} onClick={() => adjust(-1)} className={buttonClass}>
        <span aria-hidden="true">−</span>
      </button>
      <input id={id} type="text" inputMode="numeric" pattern="[0-9]*" value={value}
        aria-invalid={invalid} aria-describedby={describedBy}
        onChange={(event) => {
          const next = event.target.value;
          if (/^\d*$/.test(next) && Number.isFinite(Number(next))) onChange(next);
        }}
        onBlur={() => {
          if (max !== undefined && value !== '' && Number(value) > max) onChange(String(max));
        }}
        className="min-w-0 w-full bg-transparent py-3 text-center text-base tabular-nums text-white outline-none focus-visible:bg-white/5"
        placeholder="0" />
      <button type="button" aria-label={increaseLabel} onClick={() => adjust(1)} className={buttonClass}>
        <span aria-hidden="true">+</span>
      </button>
    </div>
  </div>;
};
