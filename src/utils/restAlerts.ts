import type { RestAlertSettings } from '@/utils/restAlertSettings';

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === 'undefined' || !window.AudioContext) {
    return null;
  }

  try {
    audioContext ??= new window.AudioContext();
    return audioContext;
  } catch {
    return null;
  }
};

const playChime = (context: AudioContext) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startAt = context.currentTime;

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(660, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(880, startAt + 0.18);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.08, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.24);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.25);
};

export const primeRestAlertSound = () => {
  const context = getAudioContext();
  if (context?.state === 'suspended') {
    void context.resume().catch(() => undefined);
  }
};

export const playRestFinishedSound = () => {
  try {
    const context = getAudioContext();
    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
      void context.resume().then(() => playChime(context)).catch(() => undefined);
      return;
    }

    playChime(context);
  } catch {
    // Audio playback is optional and must not affect the rest timer.
  }
};

export const vibrateRestFinished = () => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([180, 80, 180]);
    }
  } catch {
    // Vibration support varies between browsers and devices.
  }
};

export const showRestFinishedNotification = () => {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return;
  }

  try {
    new Notification('Descanso concluído', {
      body: 'Hora da próxima série.',
      icon: '/icon-192.svg',
      tag: 'daily-workout-rest-finished',
    });
  } catch {
    // Notifications can be unavailable even when permission was granted.
  }
};

export const triggerRestFinishedAlerts = (settings: RestAlertSettings) => {
  if (settings.sound) {
    playRestFinishedSound();
  }
  if (settings.vibration) {
    vibrateRestFinished();
  }
  if (settings.notifications) {
    showRestFinishedNotification();
  }
};
