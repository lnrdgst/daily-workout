import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const useWorkoutPreviewNavigation = (hasActiveSession: boolean) => {
  const location = useLocation();
  const navigate = useNavigate();
  const origin = location.state?.origin;

  useEffect(() => {
    if (hasActiveSession && (origin === 'workout-picker' || origin === 'home-next-workout')) {
      navigate(location.pathname + location.search + location.hash, {
        replace: true,
        state: { ...location.state, origin: undefined },
      });
    }
  }, [hasActiveSession, origin, location, navigate]);

  return () => navigate('/', {
    state: !hasActiveSession && origin === 'workout-picker' ? { reopenWorkoutPicker: true } : null,
  });
};
