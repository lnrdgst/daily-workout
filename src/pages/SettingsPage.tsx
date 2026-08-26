import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useRestAlertSettings } from '@/hooks/useRestAlertSettings';
import { useWorkoutStore } from '@/hooks/useWorkoutStore';
import { getLastWorkout } from '@/utils/storage';
import type { RestAlertSettings, RestAlertVolume } from '@/utils/restAlertSettings';
import { formatWorkoutTimeRange } from '@/utils/workoutTiming';

interface AlertToggleProps {
  label: string;
  enabled: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const AlertToggle = ({ label, enabled, disabled = false, onClick }: AlertToggleProps) => (
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
    <span className="text-sm font-medium">{label}</span>
    <span className="flex items-center gap-2 text-xs text-zinc-400">
      {enabled ? 'Ligado' : 'Desligado'}
      <span className={`relative h-5 w-9 rounded-full transition ${enabled ? 'bg-accent-500' : 'bg-white/15'}`} aria-hidden="true">
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${enabled ? 'left-4.5' : 'left-0.5'}`} />
      </span>
    </span>
  </button>
);

const alertVolumeOptions: Array<{ value: RestAlertVolume; label: string }> = [
  { value: 'low', label: 'Baixo' },
  { value: 'medium', label: 'Médio' },
  { value: 'high', label: 'Alto' },
];

export const SettingsPage = () => {
  const { state, clearHistory, discardDraft } = useWorkoutStore();
  const [alertSettings, setAlertSettings] = useRestAlertSettings();
  const [dialog, setDialog] = useState<'discard-draft' | 'clear-history' | null>(null);
  const [notificationFeedback, setNotificationFeedback] = useState<string | null>(null);
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

  return (
    <div className="space-y-4">
      <section className="panel p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Ajustes</p>
        <h2 className="mt-1 text-2xl font-bold">Controle local</h2>
        <p className="mt-2 text-sm text-zinc-400">Tudo fica salvo no seu aparelho usando `localStorage`.</p>
      </section>

      <section className="panel space-y-4 p-5">
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-sm text-zinc-400">Último treino concluído</p>
          <p className="mt-1 text-lg font-semibold">{state.lastCompletedWorkoutId ? `Treino ${state.lastCompletedWorkoutId}` : 'Nenhum'}</p>
          {timing && <p className="mt-1 text-xs text-zinc-500">{timing}</p>}
        </div>
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-sm text-zinc-400">Treinos concluídos - Total</p>
          <p className="mt-1 text-lg font-semibold">{state.history.length}</p>
        </div>
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

      <section className="grid grid-cols-1 gap-3">
        {state.activeDraft && (
          <button type="button" onClick={() => setDialog('discard-draft')} className="touch-button bg-white/10 text-zinc-100">
            Limpar treino em andamento
          </button>
        )}
        <button type="button" onClick={() => setDialog('clear-history')} className="touch-button bg-danger text-white">
          Apagar histórico local
        </button>
      </section>

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
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          clearHistory();
          setDialog(null);
        }}
      />
    </div>
  );
};
