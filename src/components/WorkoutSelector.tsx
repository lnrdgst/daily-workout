import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { workouts } from '@/data/workouts';
import { cardioModalities } from '@/data/cardio';

export const WorkoutSelector = ({ onClose, returnFocusRef }: { onClose: () => void; returnFocusRef: RefObject<HTMLButtonElement> }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cardioCount = Object.keys(cardioModalities).length;
  const [openCategory, setOpenCategory] = useState<'cardio' | 'strength' | null>('strength');
  const toggleCategory = (category: 'cardio' | 'strength') =>
    setOpenCategory((current) => current === category ? null : category);

  useEffect(() => {
    const previousFocus = returnFocusRef.current ?? document.activeElement;
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [returnFocusRef]);

  return (
    <dialog ref={dialogRef} aria-labelledby="workout-selector-title" onCancel={onClose}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, a[href]'))
          .filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      className="fixed inset-0 m-auto mb-0 max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border border-white/10 bg-zinc-950 p-4 text-zinc-100 backdrop:bg-black/70 sm:mb-auto sm:rounded-3xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="workout-selector-title" className="text-xl font-bold">Fazer outro treino</h2>
        <button type="button" onClick={onClose} aria-label="Fechar seletor de treinos"
          className="touch-button shrink-0 bg-white/5 p-3"><X size={20} aria-hidden="true" /></button>
      </div>
      <div className="space-y-4">
        <section className="space-y-3">
          <h2>
            <button type="button" id="strength-category-heading" aria-expanded={openCategory === 'strength'}
              aria-controls="strength-category-content" onClick={() => toggleCategory('strength')}
              className="panel flex min-h-12 w-full items-center justify-between gap-3 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400">
              <span className="min-w-0">
                <span className="block text-xs uppercase tracking-[0.24em] text-accent-300">Musculação</span>
                <span className="mt-1 block text-sm text-zinc-400">{workouts.length === 1 ? 'Treino' : 'Treinos'} {workouts.map((workout) => workout.id).join(' · ')}</span>
              </span>
              {openCategory === 'strength' ? <ChevronDown className="shrink-0 text-zinc-300" size={20} aria-hidden="true" /> : <ChevronRight className="shrink-0 text-zinc-300" size={20} aria-hidden="true" />}
            </button>
          </h2>
          <div id="strength-category-content" role="region" aria-labelledby="strength-category-heading" hidden={openCategory !== 'strength'}>
            <div className="grid gap-2">
              {workouts.map((workout) => (
                <Link key={workout.id} to={`/workout/${workout.id}`} state={{ origin: 'workout-picker' }} onClick={onClose}
                  className="touch-button flex-col items-start bg-white/5 text-zinc-100">
                  <span>{workout.name}</span>
                  <span className="text-sm font-normal text-zinc-400">{workout.exercises.length} {workout.exercises.length === 1 ? 'exercício' : 'exercícios'}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="space-y-3">
          <h2>
            <button type="button" id="cardio-category-heading" aria-expanded={openCategory === 'cardio'}
              aria-controls="cardio-category-content" onClick={() => toggleCategory('cardio')}
              className="panel flex min-h-12 w-full items-center justify-between gap-3 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400">
              <span className="min-w-0">
                <span className="block text-xs uppercase tracking-[0.24em] text-accent-300">Aeróbico</span>
                <span className="mt-1 block text-sm text-zinc-400">{cardioCount} {cardioCount === 1 ? 'atividade' : 'atividades'}</span>
              </span>
              {openCategory === 'cardio' ? <ChevronDown className="shrink-0 text-zinc-300" size={20} aria-hidden="true" /> : <ChevronRight className="shrink-0 text-zinc-300" size={20} aria-hidden="true" />}
            </button>
          </h2>
          <div id="cardio-category-content" role="region" aria-labelledby="cardio-category-heading" hidden={openCategory !== 'cardio'}>
            <div className="panel grid gap-2 p-4">
            {Object.entries(cardioModalities).map(([modality, name]) => (
              <Link key={modality} to={`/cardio/${modality}`} state={{ origin: 'workout-picker' }} onClick={onClose} className="touch-button justify-start bg-white/5 text-zinc-100">
                {name}
              </Link>
            ))}
            </div>
          </div>
        </section>

      </div>
    </dialog>
  );
};
