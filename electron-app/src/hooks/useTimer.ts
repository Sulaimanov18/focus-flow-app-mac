import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { TIMER_DURATIONS } from '../types';
import { useSettingsStore, getFocusDurationSeconds } from '../stores/useSettingsStore';

export function useTimer() {
  const settings = useSettingsStore();
  const {
    timer,
    setTimerSeconds,
    setTimerRunning,
    setTimerMode,
    setTargetEndTime,
    incrementPomodoros,
    resetTimer,
    tasks,
    currentTaskId,
    setCurrentTaskId,
  } = useAppStore();

  const intervalRef = useRef<number | null>(null);

  const start = useCallback(() => {
    if (timer.isRunning) return;

    // Auto-assign task: if starting a pomodoro with no task selected and autoAssignTask is enabled,
    // select the first incomplete task
    if (timer.mode === 'pomodoro' && settings.autoAssignTask && !currentTaskId) {
      const firstIncompleteTask = tasks.find((t) => !t.isCompleted);
      if (firstIncompleteTask) {
        setCurrentTaskId(firstIncompleteTask.id);
      }
    }

    // Store targetEndTime in global state (persists across section switches)
    setTargetEndTime(Date.now() + timer.secondsLeft * 1000);
    setTimerRunning(true);
  }, [timer.isRunning, timer.secondsLeft, timer.mode, settings.autoAssignTask, currentTaskId, tasks, setCurrentTaskId, setTimerRunning, setTargetEndTime]);

  const pause = useCallback(() => {
    if (!timer.isRunning) return;

    // Mind Lock: prevent pausing during pomodoro mode when enabled
    if (settings.mindLockEnabled && timer.mode === 'pomodoro') {
      return;
    }

    if (timer.targetEndTime) {
      const remaining = Math.max(0, (timer.targetEndTime - Date.now()) / 1000);
      setTimerSeconds(Math.ceil(remaining));
    }

    setTargetEndTime(null);
    setTimerRunning(false);
  }, [timer.isRunning, timer.targetEndTime, timer.mode, settings.mindLockEnabled, setTimerSeconds, setTimerRunning, setTargetEndTime]);

  const toggle = useCallback(() => {
    if (timer.isRunning) {
      pause();
    } else {
      start();
    }
  }, [timer.isRunning, start, pause]);

  // Settings-aware reset: uses settings duration for pomodoro
  const reset = useCallback(() => {
    setTimerRunning(false);
    setTargetEndTime(null);
    if (timer.mode === 'pomodoro') {
      setTimerSeconds(getFocusDurationSeconds(settings));
    } else {
      setTimerSeconds(TIMER_DURATIONS[timer.mode]);
    }
  }, [timer.mode, settings, setTimerSeconds, setTimerRunning, setTargetEndTime]);

  // Settings-aware mode change
  const changeMode = useCallback((mode: 'pomodoro' | 'shortBreak' | 'longBreak') => {
    setTimerRunning(false);
    setTargetEndTime(null);
    setTimerMode(mode);
    if (mode === 'pomodoro') {
      setTimerSeconds(getFocusDurationSeconds(settings));
    } else {
      setTimerSeconds(TIMER_DURATIONS[mode]);
    }
  }, [settings, setTimerMode, setTimerSeconds, setTimerRunning, setTargetEndTime]);

  const skip = useCallback(() => {
    const { mode, completedPomodoros } = timer;

    if (mode === 'pomodoro') {
      if (completedPomodoros > 0 && (completedPomodoros + 1) % 4 === 0) {
        changeMode('longBreak');
      } else {
        changeMode('shortBreak');
      }
    } else {
      changeMode('pomodoro');
    }
  }, [timer, changeMode]);

  // Timer tick effect - uses global targetEndTime from store
  useEffect(() => {
    if (!timer.isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      if (!timer.targetEndTime) return;

      const remaining = Math.max(0, (timer.targetEndTime - Date.now()) / 1000);
      const newSecondsLeft = Math.ceil(remaining);

      if (newSecondsLeft <= 0) {
        // Timer complete
        setTimerRunning(false);
        setTimerSeconds(0);
        setTargetEndTime(null);

        if (timer.mode === 'pomodoro') {
          incrementPomodoros();
        }

        // Send notification
        if (Notification.permission === 'granted') {
          const titles = {
            pomodoro: 'Focus session complete!',
            shortBreak: 'Short break over',
            longBreak: 'Long break over',
          };
          const bodies = {
            pomodoro: 'Great work! Time for a break.',
            shortBreak: 'Ready to focus again?',
            longBreak: 'Refreshed? Let\'s get back to work!',
          };
          new Notification(titles[timer.mode], { body: bodies[timer.mode] });
        }
      } else {
        setTimerSeconds(newSecondsLeft);
      }
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timer.isRunning, timer.mode, timer.targetEndTime, setTimerSeconds, setTimerRunning, setTargetEndTime, incrementPomodoros]);

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const formattedTime = useCallback(() => {
    const totalSeconds = Math.max(0, Math.floor(timer.secondsLeft));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timer.secondsLeft]);

  // Get total duration based on mode and settings
  const getTotalDuration = useCallback(() => {
    if (timer.mode === 'pomodoro') {
      return getFocusDurationSeconds(settings);
    }
    return TIMER_DURATIONS[timer.mode];
  }, [timer.mode, settings]);

  const progress = useCallback(() => {
    const total = getTotalDuration();
    return 1 - timer.secondsLeft / total;
  }, [timer.secondsLeft, getTotalDuration]);

  return {
    ...timer,
    start,
    pause,
    toggle,
    reset,
    skip,
    setMode: changeMode,
    formattedTime: formattedTime(),
    progress: progress(),
    mindLockEnabled: settings.mindLockEnabled,
  };
}
