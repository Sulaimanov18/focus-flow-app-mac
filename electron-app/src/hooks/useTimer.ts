import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { TIMER_DURATIONS } from '../types';

export function useTimer() {
  const {
    timer,
    setTimerSeconds,
    setTimerRunning,
    setTimerMode,
    setTargetEndTime,
    incrementPomodoros,
    resetTimer,
  } = useAppStore();

  const intervalRef = useRef<number | null>(null);

  const start = useCallback(() => {
    if (timer.isRunning) return;

    // Store targetEndTime in global state (persists across section switches)
    setTargetEndTime(Date.now() + timer.secondsLeft * 1000);
    setTimerRunning(true);
  }, [timer.isRunning, timer.secondsLeft, setTimerRunning, setTargetEndTime]);

  const pause = useCallback(() => {
    if (!timer.isRunning) return;

    if (timer.targetEndTime) {
      const remaining = Math.max(0, (timer.targetEndTime - Date.now()) / 1000);
      setTimerSeconds(Math.ceil(remaining));
    }

    setTargetEndTime(null);
    setTimerRunning(false);
  }, [timer.isRunning, timer.targetEndTime, setTimerSeconds, setTimerRunning, setTargetEndTime]);

  const toggle = useCallback(() => {
    if (timer.isRunning) {
      pause();
    } else {
      start();
    }
  }, [timer.isRunning, start, pause]);

  const reset = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  const skip = useCallback(() => {
    const { mode, completedPomodoros } = timer;

    if (mode === 'pomodoro') {
      if (completedPomodoros > 0 && (completedPomodoros + 1) % 4 === 0) {
        setTimerMode('longBreak');
      } else {
        setTimerMode('shortBreak');
      }
    } else {
      setTimerMode('pomodoro');
    }
  }, [timer, setTimerMode]);

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

  const progress = useCallback(() => {
    const total = TIMER_DURATIONS[timer.mode];
    return 1 - timer.secondsLeft / total;
  }, [timer.mode, timer.secondsLeft]);

  return {
    ...timer,
    start,
    pause,
    toggle,
    reset,
    skip,
    setMode: setTimerMode,
    formattedTime: formattedTime(),
    progress: progress(),
  };
}
