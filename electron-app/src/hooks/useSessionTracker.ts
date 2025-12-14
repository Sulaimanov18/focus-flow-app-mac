/**
 * Session Tracker Hook
 *
 * Tracks focus sessions and triggers AI insight generation on completion.
 * Non-blocking: AI calls run in background, failures don't affect UI.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { aiCoachService } from '../services/aiCoach';
import { useCoachStore } from '../stores/useCoachStore';
import { UserFocusContext } from '../types';

const isDev = import.meta.env.DEV;

interface ActiveSession {
  id?: string;
  startTime: string;
  mode: 'pomodoro' | 'shortBreak' | 'longBreak';
  taskId?: string;
  taskTitle?: string;
  pausesCount: number;
}

/**
 * Hook to track timer sessions and generate insights on completion.
 * Should be used at the app root level.
 */
export function useSessionTracker() {
  const { timer, currentTaskId, tasks, currentUser, statsByDate } = useAppStore();
  const { generateInsight } = useCoachStore();

  // Track the active session
  const activeSession = useRef<ActiveSession | null>(null);
  const wasRunning = useRef(false);

  // Get the current task info
  const getCurrentTask = useCallback(() => {
    if (!currentTaskId) return undefined;
    return tasks.find((t) => t.id === currentTaskId);
  }, [currentTaskId, tasks]);

  // Build focus context for insight generation
  const buildContext = useCallback(async (): Promise<UserFocusContext> => {
    if (!currentUser) {
      // Return minimal context if not logged in
      return {
        recentSessions: [],
        taskStats: { totalTasks: 0, completedTasks: 0, averagePomodorosPerTask: 0 },
        streak: { currentDays: 0, longestDays: 0 },
        today: { pomodoros: 0, focusMinutes: 0, tasksCompleted: 0 },
        timer: {
          isRunning: timer.isRunning,
          mode: timer.mode,
          secondsLeft: timer.secondsLeft,
        },
        localTime: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    // Use the aiCoachService to build full context
    const todayStats = statsByDate[new Date().toISOString().split('T')[0]] || {
      pomodoros: 0,
      completedTasks: 0,
    };

    const taskData = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      isCompleted: t.isCompleted,
      spentPomodoros: t.spentPomodoros,
    }));

    const currentTask = getCurrentTask();

    const context = await aiCoachService.buildFocusContext(
      currentUser.id,
      taskData,
      {
        pomodoros: todayStats.pomodoros,
        focusMinutes: todayStats.pomodoros * 25,
        tasksCompleted: todayStats.completedTasks,
      },
      currentTask?.title
    );

    // Add timer state to context
    return {
      ...context,
      timer: {
        isRunning: timer.isRunning,
        mode: timer.mode,
        secondsLeft: timer.secondsLeft,
      },
    };
  }, [currentUser, timer, tasks, statsByDate, getCurrentTask]);

  // Log session start to Supabase
  const logSessionStart = useCallback(async () => {
    if (!currentUser) return;

    const currentTask = getCurrentTask();
    const session: ActiveSession = {
      startTime: new Date().toISOString(),
      mode: timer.mode,
      taskId: currentTask?.id,
      taskTitle: currentTask?.title,
      pausesCount: 0,
    };

    activeSession.current = session;

    // Log to Supabase (non-blocking)
    try {
      const logged = await aiCoachService.logTimerSession({
        user_id: currentUser.id,
        start_time: session.startTime,
        mode: timer.mode,
        pauses_count: 0,
        task_id: currentTask?.id,
        task_title: currentTask?.title,
        completed: false,
      });

      if (logged) {
        activeSession.current.id = logged.id;
        if (isDev) {
          console.log('[SessionTracker] Session started:', logged.id);
        }
      }
    } catch (error) {
      if (isDev) {
        console.error('[SessionTracker] Failed to log session start:', error);
      }
    }
  }, [currentUser, timer.mode, getCurrentTask]);

  // Log session pause
  const logSessionPause = useCallback(async () => {
    if (!activeSession.current?.id || !currentUser) return;

    activeSession.current.pausesCount += 1;

    try {
      await aiCoachService.updateTimerSession(activeSession.current.id, {
        pauses_count: activeSession.current.pausesCount,
      });
      if (isDev) {
        console.log('[SessionTracker] Session paused, count:', activeSession.current.pausesCount);
      }
    } catch (error) {
      if (isDev) {
        console.error('[SessionTracker] Failed to log session pause:', error);
      }
    }
  }, [currentUser]);

  // Log session completion and trigger insight generation
  const logSessionComplete = useCallback(
    async (completed: boolean) => {
      if (!activeSession.current || !currentUser) return;

      const session = activeSession.current;
      const endTime = new Date().toISOString();
      const startDate = new Date(session.startTime);
      const endDate = new Date(endTime);
      const durationSeconds = Math.round((endDate.getTime() - startDate.getTime()) / 1000);

      // Update session in Supabase
      if (session.id) {
        try {
          await aiCoachService.updateTimerSession(session.id, {
            end_time: endTime,
            duration_seconds: durationSeconds,
            pauses_count: session.pausesCount,
            completed,
          });
          if (isDev) {
            console.log('[SessionTracker] Session completed:', {
              id: session.id,
              completed,
              durationSeconds,
            });
          }
        } catch (error) {
          if (isDev) {
            console.error('[SessionTracker] Failed to update session:', error);
          }
        }
      }

      // Only generate insight for completed pomodoro sessions
      if (completed && session.mode === 'pomodoro') {
        // Trigger insight generation in background (non-blocking)
        generateInsightAsync(session.id);
      }

      // Clear active session
      activeSession.current = null;
    },
    [currentUser]
  );

  // Generate insight asynchronously with retry
  const generateInsightAsync = useCallback(
    async (sessionId?: string, retryCount = 0) => {
      if (!currentUser) return;

      const MAX_RETRIES = 1;

      try {
        const context = await buildContext();

        if (isDev) {
          console.log('[SessionTracker] Generating session insight...', { sessionId });
        }

        const insight = await generateInsight('session', context, sessionId);

        if (isDev && insight) {
          console.log('[SessionTracker] Insight generated:', insight.summary);
        }
      } catch (error) {
        if (isDev) {
          console.error('[SessionTracker] Failed to generate insight:', error);
        }

        // Retry once
        if (retryCount < MAX_RETRIES) {
          if (isDev) {
            console.log('[SessionTracker] Retrying insight generation...');
          }
          // Wait 2 seconds before retry
          setTimeout(() => {
            generateInsightAsync(sessionId, retryCount + 1);
          }, 2000);
        }
      }
    },
    [currentUser, buildContext, generateInsight]
  );

  // Track timer state changes
  useEffect(() => {
    const isNowRunning = timer.isRunning;
    const wasPreviouslyRunning = wasRunning.current;

    // Timer started
    if (isNowRunning && !wasPreviouslyRunning) {
      logSessionStart();
    }

    // Timer paused (but not stopped/completed)
    if (!isNowRunning && wasPreviouslyRunning && timer.secondsLeft > 0) {
      logSessionPause();
    }

    wasRunning.current = isNowRunning;
  }, [timer.isRunning, timer.secondsLeft, logSessionStart, logSessionPause]);

  // Track timer completion (secondsLeft reaches 0)
  useEffect(() => {
    if (timer.secondsLeft === 0 && activeSession.current) {
      // Timer completed naturally
      logSessionComplete(true);
    }
  }, [timer.secondsLeft, logSessionComplete]);

  // Track manual reset/skip (session abandoned)
  const previousMode = useRef(timer.mode);
  useEffect(() => {
    // If mode changed while session was active, it was skipped/abandoned
    if (timer.mode !== previousMode.current && activeSession.current) {
      const wasCompleted = timer.secondsLeft === 0;
      if (!wasCompleted) {
        logSessionComplete(false);
      }
    }
    previousMode.current = timer.mode;
  }, [timer.mode, timer.secondsLeft, logSessionComplete]);

  return null; // This hook doesn't render anything
}
