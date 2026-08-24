import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ActiveWorkoutBar } from '@/components/ActiveWorkoutBar';
import { SplashScreen } from '@/components/SplashScreen';
import { useWorkoutStore, WorkoutStoreProvider } from '@/hooks/useWorkoutStore';

const SPLASH_STORAGE_KEY = 'daily-workout-splash-seen';

const navItems = [
  { to: '/', label: 'Treinos' },
  { to: '/history', label: 'Histórico' },
  { to: '/settings', label: 'Ajustes' },
];

export const AppLayout = () => {
  return (
    <WorkoutStoreProvider>
      <AppShell />
    </WorkoutStoreProvider>
  );
};

const AppShell = () => {
  const location = useLocation();
  const { state } = useWorkoutStore();
  const showActiveWorkoutBar = Boolean(state.activeDraft) && !location.pathname.startsWith('/workout/');
  const [showSplash, setShowSplash] = useState(() => {
    if (state.activeDraft || typeof window === 'undefined') {
      return false;
    }

    return window.sessionStorage.getItem(SPLASH_STORAGE_KEY) === null;
  });
  const [isSplashExiting, setIsSplashExiting] = useState(false);

  useEffect(() => {
    if (!showSplash) {
      return;
    }

    window.sessionStorage.setItem(SPLASH_STORAGE_KEY, 'true');
    const exitTimeout = window.setTimeout(() => setIsSplashExiting(true), 1100);
    const hideTimeout = window.setTimeout(() => setShowSplash(false), 1100);

    return () => {
      window.clearTimeout(exitTimeout);
      window.clearTimeout(hideTimeout);
    };
  }, [showSplash]);

  return (
    <>
      <div className={`mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pt-6 text-zinc-50 ${showActiveWorkoutBar ? 'pb-52' : 'pb-28'}`}>
        <header className="mb-6 flex items-center justify-between">
          <Link to="/" className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-accent-300/80">Daily Workout</p>
            <h1 className="text-2xl font-bold">Treino de bolso</h1>
          </Link>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>

        {showActiveWorkoutBar && <ActiveWorkoutBar draft={state.activeDraft!} />}

        <nav className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-20 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 gap-2 rounded-3xl border border-white/10 bg-surface-900/95 p-2 shadow-glow backdrop-blur">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `touch-button flex-1 rounded-2xl ${isActive ? 'bg-accent-500 text-white' : 'bg-white/5 text-zinc-300'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      {showSplash && <SplashScreen isExiting={isSplashExiting} />}
    </>
  );
};
