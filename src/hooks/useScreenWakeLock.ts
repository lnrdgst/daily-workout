import { useEffect, useRef } from 'react';

type WakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinel>;
  };
};

export const useScreenWakeLock = (enabled: boolean) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isRequestPendingRef = useRef(false);

  useEffect(() => {
    const wakeLock = (navigator as WakeLockNavigator).wakeLock;
    let isActive = true;

    const releaseWakeLock = () => {
      const sentinel = wakeLockRef.current;
      wakeLockRef.current = null;

      if (sentinel && !sentinel.released) {
        void sentinel.release().catch(() => undefined);
      }
    };

    const requestWakeLock = async () => {
      if (!enabled || !wakeLock || document.visibilityState !== 'visible' || wakeLockRef.current || isRequestPendingRef.current) {
        return;
      }

      isRequestPendingRef.current = true;
      try {
        const sentinel = await wakeLock.request('screen');
        sentinel.addEventListener('release', () => {
          if (wakeLockRef.current === sentinel) {
            wakeLockRef.current = null;
          }
        });

        if (!isActive || !enabled || document.visibilityState !== 'visible') {
          void sentinel.release().catch(() => undefined);
          return;
        }

        wakeLockRef.current = sentinel;
      } catch {
        // Wake Lock is optional and may be denied by the browser or device.
      } finally {
        isRequestPendingRef.current = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void requestWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isActive = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [enabled]);
};
