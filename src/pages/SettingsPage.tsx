import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useRestAlertSettings } from '@/hooks/useRestAlertSettings';
import { useRestTimerSettings } from '@/hooks/useRestTimerSettings';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useWorkoutStore } from '@/hooks/useWorkoutStore';
import { useWorkoutSessionSettings } from '@/hooks/useWorkoutSessionSettings';
import { getLastWorkout } from '@/utils/storage';
import type { RestAlertSettings, RestAlertVolume } from '@/utils/restAlertSettings';
import type { RestDurationSeconds } from '@/utils/restTimerSettings';
import type { WorkoutSessionSettings } from '@/utils/workoutSessionSettings';
import { formatWorkoutTimeRange } from '@/utils/workoutTiming';

interface AlertToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const AlertToggle = ({ label, description, enabled, disabled = false, onClick }: AlertToggleProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label={`${label}: ${enabled ? 'ligado' : 'desligado'}`}
    disabled={disabled}
    onClick={onClick}
    className={`flex min-h-12 w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
      enabled ? 'bg-accent-500/10 text-zinc-100' : 'bg-white/5 text-zinc-300'
    }`}
  >
    <span>
      <span className="block text-sm font-medium">{label}</span>
      {description && <span className="mt-1 block text-xs font-normal text-zinc-400">{description}</span>}
    </span>
    <span className="flex items-center gap-2 text-xs text-zinc-400">
      {enabled ? 'Ligado' : 'Desligado'}
      <span className={`relative h-5 w-9 rounded-full transition ${enabled ? 'bg-accent-500' : 'bg-white/15'}`} aria-hidden="true">
        <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
      </span>
    </span>
  </button>
);

const alertVolumeOptions: Array<{ value: RestAlertVolume; label: string }> = [
  { value: 'low', label: 'Baixo' },
  { value: 'medium', label: 'Médio' },
  { value: 'high', label: 'Alto' },
];

const restDurationOptions: RestDurationSeconds[] = [60, 90, 120];

export const SettingsPage = () => {
  const { state, clearHistory, discardDraft } = useWorkoutStore();
  const [alertSettings, setAlertSettings] = useRestAlertSettings();
  const [restTimerSettings, setRestTimerSettings] = useRestTimerSettings();
  const [workoutSessionSettings, setWorkoutSessionSettings] = useWorkoutSessionSettings();
  const [userPreferences, saveUserPreferences] = useUserPreferences();
  const [displayName, setDisplayName] = useState(() => userPreferences.displayName);
  const [isDisplayNameSaved, setIsDisplayNameSaved] = useState(false);
  const [dialog, setDialog] = useState<'discard-draft' | 'clear-history' | null>(null);
  const [clearHistoryCode, setClearHistoryCode] = useState('');
  const [clearHistoryInput, setClearHistoryInput] = useState('');
  const [notificationFeedback, setNotificationFeedback] = useState<string | null>(null);
  const displayNameSaveTimeoutRef = useRef<number | null>(null);
  const displayNameFeedbackTimeoutRef = useRef<number | null>(null);
  const isDisplayNameSavePendingRef = useRef(false);
  const lastWorkout = getLastWorkout(state.history, state.lastCompletedWorkoutId);
  const timing = lastWorkout ? formatWorkoutTimeRange(lastWorkout.startedAt, lastWorkout.finishedAt) : null;
  const notificationSupported = typeof Notification !== 'undefined';
  const notificationBlocked = !notificationSupported || Notification.permission === 'denied';
  const notificationStatusMessage = !notificationSupported
    ? 'Notificações não são suportadas neste dispositivo.'
    : Notification.permission === 'denied'
      ? 'Permissão de notificações não concedida.'
      : notificationFeedback;

  const toggleAlertSetting = (setting: Exclude<keyof RestAlertSettings, 'notifications'>) => {
    setAlertSettings((current) => ({ ...current, [setting]: !current[setting] }));
  };

  const toggleNotifications = async () => {
    setNotificationFeedback(null);

    if (alertSettings.notifications) {
      setAlertSettings((current) => ({ ...current, notifications: false }));
      return;
    }

    if (!notificationSupported) {
      setNotificationFeedback('Notificações não são suportadas neste dispositivo.');
      return;
    }

    if (Notification.permission === 'denied') {
      setNotificationFeedback('Permissão de notificações não concedida.');
      return;
    }

    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission === 'granted') {
      setAlertSettings((current) => ({ ...current, notifications: true }));
      return;
    }

    setNotificationFeedback('Permissão de notificações não concedida.');
  };

  const setAlertVolume = (volume: RestAlertVolume) => {
    setAlertSettings((current) => ({ ...current, volume }));
  };

  const setDefaultRestSeconds = (defaultRestSeconds: RestDurationSeconds) => {
    setRestTimerSettings({ defaultRestSeconds });
  };

  const toggleWorkoutSessionSetting = (setting: keyof WorkoutSessionSettings) => {
    setWorkoutSessionSettings((current) => ({ ...current, [setting]: !current[setting] }));
  };

  const clearDisplayNameFeedback = () => {
    if (displayNameFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(displayNameFeedbackTimeoutRef.current);
      displayNameFeedbackTimeoutRef.current = null;
    }
    setIsDisplayNameSaved(false);
  };

  const saveDisplayName = (nextDisplayName: string) => {
    if (displayNameSaveTimeoutRef.current !== null) {
      window.clearTimeout(displayNameSaveTimeoutRef.current);
      displayNameSaveTimeoutRef.current = null;
    }

    isDisplayNameSavePendingRef.current = false;
    const trimmedDisplayName = nextDisplayName.trim();
    saveUserPreferences({ displayName: trimmedDisplayName });
    setDisplayName(trimmedDisplayName);
    clearDisplayNameFeedback();
    setIsDisplayNameSaved(true);
    displayNameFeedbackTimeoutRef.current = window.setTimeout(() => {
      setIsDisplayNameSaved(false);
      displayNameFeedbackTimeoutRef.current = null;
    }, 2000);
  };

  const handleDisplayNameChange = (nextDisplayName: string) => {
    setDisplayName(nextDisplayName);
    clearDisplayNameFeedback();

    if (displayNameSaveTimeoutRef.current !== null) {
      window.clearTimeout(displayNameSaveTimeoutRef.current);
    }

    isDisplayNameSavePendingRef.current = true;
    displayNameSaveTimeoutRef.current = window.setTimeout(() => saveDisplayName(nextDisplayName), 500);
  };

  const handleDisplayNameBlur = () => {
    if (isDisplayNameSavePendingRef.current) {
      saveDisplayName(displayName);
    }
  };

  useEffect(() => {
    return () => {
      if (displayNameSaveTimeoutRef.current !== null) {
        window.clearTimeout(displayNameSaveTimeoutRef.current);
      }
      if (displayNameFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(displayNameFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const openClearHistoryDialog = () => {
    setClearHistoryCode(String(Math.floor(Math.random() * 9000) + 1000));
    setClearHistoryInput('');
    setDialog('clear-history');
  };

  const closeClearHistoryDialog = () => {
    setClearHistoryCode('');
    setClearHistoryInput('');
    setDialog(null);
  };

  const isClearHistoryCodeValid = clearHistoryCode !== '' && clearHistoryInput === clearHistoryCode;

  return (
    <div className="space-y-4">
      <section className="panel p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Ajustes</p>
        <h2 className="mt-1 text-2xl font-bold">Controle local</h2>
        <p className="mt-2 text-sm text-zinc-400">Tudo fica salvo no seu aparelho.</p>
      </section>

      <section className="panel p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Perfil</p>
        <label className="mt-3 block text-sm font-medium text-zinc-200" htmlFor="display-name">
          Nome
        </label>
        <input
          id="display-name"
          type="text"
          maxLength={60}
          value={displayName}
          onChange={(event) => handleDisplayNameChange(event.target.value)}
          onBlur={handleDisplayNameBlur}
          className="mt-2 min-h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-zinc-100 outline-none transition focus:border-accent-400/70 focus:ring-2 focus:ring-accent-400/30"
        />
        <p className={`mt-2 text-sm ${isDisplayNameSaved ? 'text-success' : 'text-zinc-400'}`}>
          {isDisplayNameSaved ? '✓ Nome salvo' : 'Usado apenas para personalizar sua experiência no aplicativo.'}
        </p>
      </section>

      <section className="panel space-y-2 p-5">
        <div className="mb-3">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Alertas do cronômetro</p>
          <p className="mt-2 text-sm text-zinc-400">Os alertas dependem dos recursos e permissões disponíveis no dispositivo.</p>
        </div>
        <AlertToggle label="Som" enabled={alertSettings.sound} onClick={() => toggleAlertSetting('sound')} />
        <div className={`rounded-2xl bg-white/5 p-3 ${alertSettings.sound ? '' : 'opacity-50'}`}>
          <p className="text-sm font-medium text-zinc-200">Volume do alerta</p>
          <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Volume do alerta sonoro">
            {alertVolumeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={!alertSettings.sound}
                onClick={() => setAlertVolume(option.value)}
                className={`min-h-10 rounded-xl px-2 text-xs font-medium transition disabled:cursor-not-allowed ${
                  alertSettings.volume === option.value ? 'bg-accent-500 text-white' : 'bg-white/5 text-zinc-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <AlertToggle label="Vibração" enabled={alertSettings.vibration} onClick={() => toggleAlertSetting('vibration')} />
        <AlertToggle
          label="Notificação do sistema"
          enabled={alertSettings.notifications}
          disabled={notificationBlocked}
          onClick={() => void toggleNotifications()}
        />
        {notificationStatusMessage && <p className="px-1 pt-1 text-xs text-zinc-400">{notificationStatusMessage}</p>}
      </section>

      <section className="panel space-y-2 p-5">
        <div className="mb-3">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Durante o treino</p>
        </div>
        <AlertToggle
          label="Manter tela ligada"
          description="Evita que a tela desligue automaticamente durante o treino."
          enabled={workoutSessionSettings.keepScreenAwake}
          onClick={() => toggleWorkoutSessionSetting('keepScreenAwake')}
        />
        <AlertToggle
          label="Iniciar descanso automaticamente"
          description="Inicia o cronometro ao marcar uma serie como feita."
          enabled={workoutSessionSettings.autoStartRestTimer}
          onClick={() => toggleWorkoutSessionSetting('autoStartRestTimer')}
        />
      </section>

      {workoutSessionSettings.autoStartRestTimer && (
        <section className="panel space-y-3 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Descanso</p>
            <p className="mt-2 text-sm text-zinc-400">Defina o tempo padrão do crônometro usado ao concluir uma série durante o treino.</p>
          </div>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Tempo padrão de descanso">
            {restDurationOptions.map((seconds) => (
              <button
                key={seconds}
                type="button"
                onClick={() => setDefaultRestSeconds(seconds)}
                className={`min-h-11 rounded-xl px-2 text-sm font-medium transition ${
                  restTimerSettings.defaultRestSeconds === seconds ? 'bg-accent-500 text-white' : 'bg-white/5 text-zinc-300'
                }`}
              >
                {seconds}s
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="panel space-y-4 p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Histórico local</p>
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-sm text-zinc-400">Último treino concluído</p>
          <p className="mt-1 text-lg font-semibold">{state.lastCompletedWorkoutId ? `Treino ${state.lastCompletedWorkoutId}` : 'Nenhum'}</p>
          {timing && <p className="mt-1 text-xs text-zinc-500">{timing}</p>}
        </div>
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-sm text-zinc-400">Treinos contabilizados</p>
          <p className="mt-1 text-lg font-semibold">{state.history.length}</p>
        </div>
        <div className="border-t border-white/10 pt-4">
          <button type="button" onClick={openClearHistoryDialog} className="touch-button w-full bg-danger text-white">
            Apagar histórico local
          </button>
        </div>
      </section>

      {state.activeDraft && (
        <section className="grid grid-cols-1 gap-3">
          <button type="button" onClick={() => setDialog('discard-draft')} className="touch-button bg-white/10 text-zinc-100">
            Limpar treino em andamento
          </button>
        </section>
      )}

      <ConfirmDialog
        open={dialog === 'discard-draft'}
        title="Limpar treino em andamento?"
        description="Os dados ainda não finalizados deste treino serão perdidos."
        cancelLabel="Cancelar"
        confirmLabel="Limpar treino"
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          discardDraft();
          setDialog(null);
        }}
      />

      <ConfirmDialog
        open={dialog === 'clear-history'}
        title="Apagar histórico local?"
        description="Todo o histórico de treinos salvo neste dispositivo será removido. Essa ação não pode ser desfeita."
        cancelLabel="Cancelar"
        confirmLabel="Apagar histórico"
        destructive
        confirmDisabled={!isClearHistoryCodeValid}
        onCancel={closeClearHistoryDialog}
        onConfirm={() => {
          if (!isClearHistoryCodeValid) {
            return;
          }

          clearHistory();
          closeClearHistoryDialog();
        }}
      >
        <div className="mt-5">
          <p className="text-sm text-zinc-300">Para confirmar, digite o código:</p>
          <p className="mt-2 text-center text-2xl font-bold tracking-[0.35em] text-accent-300">{clearHistoryCode}</p>
          <label className="sr-only" htmlFor="clear-history-code">
            Código de confirmação
          </label>
          <input
            id="clear-history-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={4}
            value={clearHistoryInput}
            onChange={(event) => setClearHistoryInput(event.target.value.replace(/\D/g, '').slice(0, 4))}
            className="mt-4 min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-center text-lg font-semibold tracking-[0.2em] text-zinc-100 outline-none transition focus:border-danger/70 focus:ring-2 focus:ring-danger/30"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
};
