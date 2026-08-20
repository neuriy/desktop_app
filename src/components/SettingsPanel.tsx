import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Power, Rocket } from 'lucide-react';

interface TraySettings {
  launchAtLogin: boolean;
  notificationsEnabled: boolean;
  statusLabel: string;
}

interface SettingsPanelProps {
  onBack: () => void;
}

export function SettingsPanel({ onBack }: SettingsPanelProps) {
  const [platform, setPlatform] = useState('unknown');
  const [settings, setSettings] = useState<TraySettings>({
    launchAtLogin: false,
    notificationsEnabled: true,
    statusLabel: 'Status: Online',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!window.electron?.getTraySettings) return;
      const [s, p] = await Promise.all([
        window.electron.getTraySettings(),
        window.electron.getTrayPlatform?.() ?? Promise.resolve('web'),
      ]);
      setSettings(s);
      setPlatform(p);
    })();
  }, []);

  const update = async (partial: Partial<TraySettings>) => {
    setSaving(true);
    try {
      if (window.electron?.setTraySettings) {
        const next = await window.electron.setTraySettings(partial);
        setSettings(next);
      } else {
        setSettings((prev) => ({ ...prev, ...partial }));
      }
    } finally {
      setSaving(false);
    }
  };

  const platformLabel =
    platform === 'darwin'
      ? 'macOS Menu Bar'
      : platform === 'win32'
        ? 'Windows System Tray'
        : platform === 'linux'
          ? 'Linux Status Area'
          : 'Browser preview';

  return (
    <div className="w-[360px] h-[500px] rounded-[24px] bg-gradient-to-br from-zinc-800/95 to-zinc-950/95 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="text-white/70 hover:text-white transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-sm font-semibold text-white">Settings</h2>
          <p className="text-[11px] text-white/40">{platformLabel}</p>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <ToggleRow
          icon={<Rocket size={16} />}
          title="Launch at login"
          description="Start Neuriy automatically when you sign in to your computer."
          checked={settings.launchAtLogin}
          disabled={saving || !window.electron?.setTraySettings}
          onChange={(v) => void update({ launchAtLogin: v })}
        />
        <ToggleRow
          icon={<Bell size={16} />}
          title="Notifications"
          description="Allow tray / OS toast notifications."
          checked={settings.notificationsEnabled}
          disabled={saving || !window.electron?.setTraySettings}
          onChange={(v) => void update({ notificationsEnabled: v })}
        />

        <button
          type="button"
          disabled={!window.electron?.showTrayNotification}
          onClick={() =>
            void window.electron?.showTrayNotification?.({
              title: 'Neuriy',
              body: 'Tray notifications are working.',
            })
          }
          className="w-full mt-2 text-left px-3 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white/80 hover:bg-white/10 transition-colors disabled:opacity-40"
        >
          Send test notification
        </button>

        <div className="pt-4 text-[11px] text-white/35 leading-relaxed">
          Tray menu stays available when this panel is closed. Use Quit from the
          system tray / menu bar to exit completely.
        </div>
      </div>

      <div className="p-4 border-t border-white/10">
        <button
          type="button"
          onClick={() => window.electron?.quitApp?.()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-red-500/15 border border-red-400/30 text-red-200 text-sm font-medium hover:bg-red-500/25 transition-colors"
        >
          <Power size={14} />
          Quit Neuriy
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-3 rounded-2xl bg-white/5 border border-white/10">
      <div className="mt-0.5 text-violet-300">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white font-medium">{title}</div>
        <p className="text-[11px] text-white/40 mt-0.5 leading-snug">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
          checked ? 'bg-violet-500' : 'bg-white/15'
        } disabled:opacity-40`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </button>
    </div>
  );
}
