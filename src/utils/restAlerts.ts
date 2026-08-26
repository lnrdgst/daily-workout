import type { RestAlertSettings, RestAlertVolume } from '@/utils/restAlertSettings';

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

const volumeGains: Record<RestAlertVolume, number> = {
  low: 0.07,
  medium: 0.14,
  high: 0.24,
};

const playBeep = (context: AudioContext, destination: AudioNode, startAt: number, frequency: number, peakGain: number) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.015);
  gain.gain.setValueAtTime(peakGain, startAt + 0.17);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.22);
  oscillator.connect(gain).connect(destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.23);
};

const playChime = (context: AudioContext, volume: RestAlertVolume) => {
  const startAt = context.currentTime;
  const masterGain = context.createGain();

  // The master gain keeps the three clear, high-pitched beeps below clipping.
  masterGain.gain.setValueAtTime(0.8, startAt);
  masterGain.connect(context.destination);
  playBeep(context, masterGain, startAt, 880, volumeGains[volume]);
  playBeep(context, masterGain, startAt + 0.3, 1040, volumeGains[volume]);
  playBeep(context, masterGain, startAt + 0.6, 1320, volumeGains[volume]);
};

export const primeRestAlertSound = () => {
  const context = getAudioContext();
  if (context?.state === 'suspended') {
    void context.resume().catch(() => undefined);
  }
};

export const playRestFinishedSound = (volume: RestAlertVolume) => {
  try {
    const context = getAudioContext();
    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
      void context.resume().then(() => playChime(context, volume)).catch(() => undefined);
      return;
    }

    playChime(context, volume);
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
    playRestFinishedSound(settings.volume);
  }
  if (settings.vibration) {
    vibrateRestFinished();
  }
  if (settings.notifications) {
    showRestFinishedNotification();
  }
};
