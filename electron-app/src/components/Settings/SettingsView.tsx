import { useState } from 'react';
import { useSettingsStore, FocusDuration, BackgroundSound, Theme, TimerSize } from '../../stores/useSettingsStore';
import { useAppStore } from '../../stores/useAppStore';
import { supabaseService } from '../../services/supabase';

// Reusable UI Components
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-10 h-6 rounded-full transition-colors ${
        enabled ? 'bg-accent' : 'bg-white/20'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
          enabled ? 'left-5' : 'left-1'
        }`}
      />
    </button>
  );
}

function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex bg-white/10 rounded-lg p-1 gap-1">
      {options.map((option) => (
        <button
          key={String(option.value)}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            value === option.value
              ? 'bg-accent text-white'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-accent"
    />
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 mr-4">
        <span className="text-sm text-white/90">{label}</span>
        {description && (
          <p className="text-xs text-white/40 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 mt-6 first:mt-0">
      {title}
    </h3>
  );
}

export function SettingsView() {
  const settings = useSettingsStore();
  const { currentUser, setIsLoggedIn, setCurrentUser } = useAppStore();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleLogout = async () => {
    try {
      await supabaseService.signOut();
      setIsLoggedIn(false);
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleResetLocalData = () => {
    if (showResetConfirm) {
      localStorage.clear();
      window.location.reload();
    } else {
      setShowResetConfirm(true);
      setTimeout(() => setShowResetConfirm(false), 3000);
    }
  };

  const focusDurationOptions: { label: string; value: FocusDuration }[] = [
    { label: '25m', value: 25 },
    { label: '45m', value: 45 },
    { label: '60m', value: 60 },
    { label: 'Custom', value: 'custom' },
  ];

  const backgroundSoundOptions: { label: string; value: BackgroundSound }[] = [
    { label: 'None', value: 'none' },
    { label: 'Rain', value: 'rain' },
    { label: 'Forest', value: 'forest' },
    { label: 'Cafe', value: 'cafe' },
  ];

  const themeOptions: { label: string; value: Theme }[] = [
    { label: 'Dark', value: 'dark' },
    { label: 'Soft Dark', value: 'soft-dark' },
  ];

  const timerSizeOptions: { label: string; value: TimerSize }[] = [
    { label: 'Normal', value: 'normal' },
    { label: 'Large', value: 'large' },
  ];

  return (
    <div className="h-full overflow-y-auto px-6 py-4">
      <div className="max-w-md mx-auto">
        {/* Focus Session */}
        <SectionHeader title="Focus Session" />
        <div className="bg-white/5 rounded-xl px-4 divide-y divide-white/5">
          <SettingRow label="Focus Duration">
            <SegmentedControl
              options={focusDurationOptions}
              value={settings.focusDuration}
              onChange={settings.setFocusDuration}
            />
          </SettingRow>

          {settings.focusDuration === 'custom' && (
            <SettingRow label="Custom Duration" description="Minutes">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={settings.customFocusDuration}
                  onChange={(e) => settings.setCustomFocusDuration(Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-white/10 rounded text-white text-sm text-center"
                />
              </div>
            </SettingRow>
          )}

          <SettingRow label="Warmup Phase" description="Gentle start before focus">
            <Toggle enabled={settings.warmupEnabled} onChange={settings.setWarmupEnabled} />
          </SettingRow>

          {settings.warmupEnabled && (
            <SettingRow label="Warmup Duration" description="Seconds">
              <input
                type="number"
                min={30}
                max={300}
                value={settings.warmupDuration}
                onChange={(e) => settings.setWarmupDuration(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-white/10 rounded text-white text-sm text-center"
              />
            </SettingRow>
          )}

          <SettingRow label="Breathing Exercise" description="Guided breathing at start">
            <Toggle enabled={settings.breathingEnabled} onChange={settings.setBreathingEnabled} />
          </SettingRow>

          <SettingRow label="Cooldown Phase" description="Wind down after focus">
            <Toggle enabled={settings.cooldownEnabled} onChange={settings.setCooldownEnabled} />
          </SettingRow>

          <SettingRow label="Mind Lock" description="Prevent pausing during focus">
            <Toggle enabled={settings.mindLockEnabled} onChange={settings.setMindLockEnabled} />
          </SettingRow>
        </div>

        {/* Sound & Environment */}
        <SectionHeader title="Sound & Environment" />
        <div className="bg-white/5 rounded-xl px-4 divide-y divide-white/5">
          <SettingRow label="Background Sound">
            <SegmentedControl
              options={backgroundSoundOptions}
              value={settings.backgroundSound}
              onChange={settings.setBackgroundSound}
            />
          </SettingRow>

          <SettingRow label="Volume">
            <div className="w-32">
              <Slider
                value={Math.round(settings.soundVolume * 100)}
                onChange={(v) => settings.setSoundVolume(v / 100)}
              />
            </div>
          </SettingRow>

          <SettingRow label="Auto-start Sound" description="Play when timer starts">
            <Toggle enabled={settings.autoStartSound} onChange={settings.setAutoStartSound} />
          </SettingRow>
        </div>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <div className="bg-white/5 rounded-xl px-4 divide-y divide-white/5">
          <SettingRow label="Session Start Sound">
            <Toggle enabled={settings.sessionStartSound} onChange={settings.setSessionStartSound} />
          </SettingRow>

          <SettingRow label="Session End Sound">
            <Toggle enabled={settings.sessionEndSound} onChange={settings.setSessionEndSound} />
          </SettingRow>

          <SettingRow label="Gentle Reminders" description="Periodic focus reminders">
            <Toggle enabled={settings.gentleReminders} onChange={settings.setGentleReminders} />
          </SettingRow>

          {settings.gentleReminders && (
            <SettingRow label="Reminder Interval" description="Minutes">
              <input
                type="number"
                min={1}
                max={30}
                value={settings.reminderInterval}
                onChange={(e) => settings.setReminderInterval(Number(e.target.value))}
                className="w-16 px-2 py-1 bg-white/10 rounded text-white text-sm text-center"
              />
            </SettingRow>
          )}
        </div>

        {/* Tasks */}
        <SectionHeader title="Tasks" />
        <div className="bg-white/5 rounded-xl px-4 divide-y divide-white/5">
          <SettingRow label="Auto-assign Task" description="Pick first uncompleted task">
            <Toggle enabled={settings.autoAssignTask} onChange={settings.setAutoAssignTask} />
          </SettingRow>

          <SettingRow label="Auto-complete Parent" description="When all subtasks done">
            <Toggle enabled={settings.autoCompleteParentTask} onChange={settings.setAutoCompleteParentTask} />
          </SettingRow>

          <SettingRow label="Show Progress in Timer" description="Display task info">
            <Toggle enabled={settings.showTaskProgressInTimer} onChange={settings.setShowTaskProgressInTimer} />
          </SettingRow>
        </div>

        {/* Appearance */}
        <SectionHeader title="Appearance" />
        <div className="bg-white/5 rounded-xl px-4 divide-y divide-white/5">
          <SettingRow label="Theme">
            <SegmentedControl
              options={themeOptions}
              value={settings.theme}
              onChange={settings.setTheme}
            />
          </SettingRow>

          <SettingRow label="Timer Size">
            <SegmentedControl
              options={timerSizeOptions}
              value={settings.timerSize}
              onChange={settings.setTimerSize}
            />
          </SettingRow>

          <SettingRow label="Always on Top" description="Keep window visible">
            <Toggle enabled={settings.alwaysOnTop} onChange={settings.setAlwaysOnTop} />
          </SettingRow>
        </div>

        {/* Account */}
        <SectionHeader title="Account" />
        <div className="bg-white/5 rounded-xl px-4 divide-y divide-white/5">
          <SettingRow label="Email">
            <span className="text-sm text-white/60">
              {currentUser?.email || 'Not logged in'}
            </span>
          </SettingRow>

          <div className="py-3">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-sm transition-colors"
            >
              Change Password
            </button>
          </div>

          <div className="py-3">
            <button
              onClick={handleLogout}
              className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-sm transition-colors"
            >
              Log Out
            </button>
          </div>

          <div className="py-3">
            <button
              onClick={handleResetLocalData}
              className={`w-full py-2 rounded-lg text-sm transition-colors ${
                showResetConfirm
                  ? 'bg-red-500/30 text-red-400 hover:bg-red-500/40'
                  : 'bg-white/10 hover:bg-white/15 text-white/80'
              }`}
            >
              {showResetConfirm ? 'Click again to confirm reset' : 'Reset Local Data'}
            </button>
          </div>
        </div>

        {/* Reset to defaults */}
        <div className="mt-6 mb-8">
          <button
            onClick={settings.resetToDefaults}
            className="w-full py-2 rounded-lg border border-white/10 hover:bg-white/5 text-white/50 text-sm transition-colors"
          >
            Reset Settings to Defaults
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await supabaseService.updatePassword(newPassword);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-neutral-800/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl p-4">
        <h3 className="text-sm font-semibold text-white mb-4">Change Password</h3>

        {success ? (
          <div className="text-center py-4">
            <span className="text-green-400 text-sm">Password updated successfully!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 rounded-lg text-white text-sm placeholder:text-white/40"
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 rounded-lg text-white text-sm placeholder:text-white/40"
            />

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
