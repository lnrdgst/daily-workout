import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ChevronsDown,
  Dumbbell,
  Repeat2,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';
import type { ExerciseIcon as ExerciseIconName } from '@/types/workout';

interface ExerciseIconProps {
  icon?: ExerciseIconName;
}

const icons: Record<ExerciseIconName, LucideIcon> = {
  squat: ArrowDown,
  bench: Dumbbell,
  pulldown: ChevronsDown,
  'leg-curl': Repeat2,
  'lateral-raise': ArrowUp,
  curl: RotateCcw,
  triceps: ChevronsDown,
  'leg-press': ArrowDown,
  deadlift: ArrowUp,
  row: ArrowLeftRight,
  'shoulder-press': ArrowUp,
  'chest-press': Dumbbell,
};

export const ExerciseIcon = ({ icon }: ExerciseIconProps) => {
  const Icon = icon ? icons[icon] : Dumbbell;

  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-accent-300"
      aria-hidden="true"
    >
      <Icon size={20} strokeWidth={2} />
    </span>
  );
};
