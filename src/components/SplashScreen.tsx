interface SplashScreenProps {
  isExiting: boolean;
}

export const SplashScreen = ({ isExiting }: SplashScreenProps) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex min-h-[100dvh] items-center justify-center bg-surface-950 px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] transition-opacity duration-200 ${isExiting ? 'opacity-0' : 'opacity-100'}`}
      aria-label="Abrindo Daily Workout"
    >
      <div className={`text-center ${isExiting ? 'splash-screen-exit' : 'splash-screen-enter'}`}>
        <img src="/favicon.svg" alt="" className="mx-auto h-24 w-24" />
        <p className="mt-6 text-sm font-bold tracking-[0.32em] text-accent-300">DAILY WORKOUT</p>
        <p className="mt-3 text-sm text-zinc-400">Seu treino diário de bolso.</p>
      </div>
    </div>
  );
};
