import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export type BackgroundSound = 'none' | 'rain' | 'forest' | 'cafe' | 'whitenoise' | 'lofi';
export type Theme = 'dark' | 'soft-dark';
export type TimerSize = 'normal' | 'large';
export type FocusDuration = 25 | 45 | 60 | 'custom';

export interface Settings {
  // Focus Session
  focusDuration: FocusDuration;
  customFocusDuration: number; // in minutes, used when focusDuration is 'custom'
  warmupEnabled: boolean;
  warmupDuration: number; // in seconds
  breathingEnabled: boolean;
  cooldownEnabled: boolean;
  mindLockEnabled: boolean;

  // Sound & Environment
  backgroundSound: BackgroundSound;
  soundVolume: number; // 0-1
  autoStartSound: boolean;

  // Notifications
  sessionStartSound: boolean;
  sessionEndSound: boolean;
  gentleReminders: boolean;
  reminderInterval: number; // in minutes

  // Tasks
  autoAssignTask: boolean;
  autoCompleteParentTask: boolean;
  showTaskProgressInTimer: boolean;

  // Appearance
  theme: Theme;
  timerSize: TimerSize;
  alwaysOnTop: boolean;
}

interface SettingsState extends Settings {
  // Actions
  setFocusDuration: (duration: FocusDuration) => void;
  setCustomFocusDuration: (minutes: number) => void;
  setWarmupEnabled: (enabled: boolean) => void;
  setWarmupDuration: (seconds: number) => void;
  setBreathingEnabled: (enabled: boolean) => void;
  setCooldownEnabled: (enabled: boolean) => void;
  setMindLockEnabled: (enabled: boolean) => void;

  setBackgroundSound: (sound: BackgroundSound) => void;
  setSoundVolume: (volume: number) => void;
  setAutoStartSound: (enabled: boolean) => void;

  setSessionStartSound: (enabled: boolean) => void;
  setSessionEndSound: (enabled: boolean) => void;
  setGentleReminders: (enabled: boolean) => void;
  setReminderInterval: (minutes: number) => void;

  setAutoAssignTask: (enabled: boolean) => void;
  setAutoCompleteParentTask: (enabled: boolean) => void;
  setShowTaskProgressInTimer: (enabled: boolean) => void;

  setTheme: (theme: Theme) => void;
  setTimerSize: (size: TimerSize) => void;
  setAlwaysOnTop: (enabled: boolean) => void;

  resetToDefaults: () => void;
}

const defaultSettings: Settings = {
  // Focus Session
  focusDuration: 25,
  customFocusDuration: 30,
  warmupEnabled: false,
  warmupDuration: 60,
  breathingEnabled: false,
  cooldownEnabled: false,
  mindLockEnabled: false,

  // Sound & Environment
  backgroundSound: 'none',
  soundVolume: 0.5,
  autoStartSound: false,

  // Notifications
  sessionStartSound: true,
  sessionEndSound: true,
  gentleReminders: false,
  reminderInterval: 5,

  // Tasks
  autoAssignTask: false,
  autoCompleteParentTask: false,
  showTaskProgressInTimer: true,

  // Appearance
  theme: 'dark',
  timerSize: 'normal',
  alwaysOnTop: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      // Focus Session actions
      setFocusDuration: (duration) => set({ focusDuration: duration }),
      setCustomFocusDuration: (minutes) => set({ customFocusDuration: minutes }),
      setWarmupEnabled: (enabled) => set({ warmupEnabled: enabled }),
      setWarmupDuration: (seconds) => set({ warmupDuration: seconds }),
      setBreathingEnabled: (enabled) => set({ breathingEnabled: enabled }),
      setCooldownEnabled: (enabled) => set({ cooldownEnabled: enabled }),
      setMindLockEnabled: (enabled) => set({ mindLockEnabled: enabled }),

      // Sound & Environment actions
      setBackgroundSound: (sound) => set({ backgroundSound: sound }),
      setSoundVolume: (volume) => set({ soundVolume: volume }),
      setAutoStartSound: (enabled) => set({ autoStartSound: enabled }),

      // Notifications actions
      setSessionStartSound: (enabled) => set({ sessionStartSound: enabled }),
      setSessionEndSound: (enabled) => set({ sessionEndSound: enabled }),
      setGentleReminders: (enabled) => set({ gentleReminders: enabled }),
      setReminderInterval: (minutes) => set({ reminderInterval: minutes }),

      // Tasks actions
      setAutoAssignTask: (enabled) => set({ autoAssignTask: enabled }),
      setAutoCompleteParentTask: (enabled) => set({ autoCompleteParentTask: enabled }),
      setShowTaskProgressInTimer: (enabled) => set({ showTaskProgressInTimer: enabled }),

      // Appearance actions
      setTheme: (theme) => set({ theme: theme }),
      setTimerSize: (size) => set({ timerSize: size }),
      setAlwaysOnTop: (enabled) => set({ alwaysOnTop: enabled }),

      resetToDefaults: () => set(defaultSettings),
    }),
    {
      name: 'focusflow-settings',
    }
  )
);

// Helper to get focus duration in seconds
export function getFocusDurationSeconds(settings: Settings): number {
  if (settings.focusDuration === 'custom') {
    return settings.customFocusDuration * 60;
  }
  return settings.focusDuration * 60;
}
