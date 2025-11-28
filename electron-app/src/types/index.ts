export type Tab = 'timer' | 'tasks' | 'notes' | 'music' | 'account';

export interface Task {
  id: string;
  title: string;
  isDone: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

export interface TimerState {
  mode: TimerMode;
  secondsLeft: number;
  isRunning: boolean;
  completedPomodoros: number;
}

export interface MusicTrack {
  id: string;
  name: string;
  category: string;
  fileName: string;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
}

export const TIMER_DURATIONS: Record<TimerMode, number> = {
  pomodoro: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

export const TIMER_MODE_LABELS: Record<TimerMode, string> = {
  pomodoro: 'Focus',
  shortBreak: 'Short',
  longBreak: 'Long',
};
