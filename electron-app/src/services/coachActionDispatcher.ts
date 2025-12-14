// AI Coach Action Dispatcher
// Executes actions proposed by the AI Coach

import { useAppStore } from '../stores/useAppStore';
import { useSettingsStore, BackgroundSound } from '../stores/useSettingsStore';
import { CoachAction, CoachActionType, TimerMode, TIMER_DURATIONS } from '../types';

// Result of executing an action
export interface ActionResult {
  success: boolean;
  actionType: CoachActionType;
  message?: string;
}

// Dev mode logging
const isDev = import.meta.env.DEV;

function logAction(action: CoachAction, result: ActionResult) {
  if (isDev) {
    console.log(
      `[CoachAction] ${action.type}`,
      action.payload,
      result.success ? '✓' : '✗',
      result.message || ''
    );
  }
}

// Execute a single action
export function executeAction(action: CoachAction): ActionResult {
  const appStore = useAppStore.getState();
  const settingsStore = useSettingsStore.getState();

  let result: ActionResult;

  switch (action.type) {
    // Timer/session actions
    case 'START_SESSION': {
      const payload = action.payload as { mode?: TimerMode; durationMinutes?: number };
      const mode = payload.mode || 'pomodoro';
      const durationMinutes = payload.durationMinutes || 25;

      // Don't start if already running
      if (appStore.timer.isRunning) {
        result = {
          success: false,
          actionType: action.type,
          message: 'Timer already running',
        };
        break;
      }

      appStore.setTimerMode(mode);
      appStore.setTimerSeconds(durationMinutes * 60);
      appStore.setTimerRunning(true);
      appStore.setTargetEndTime(Date.now() + durationMinutes * 60 * 1000);

      result = {
        success: true,
        actionType: action.type,
        message: `Started ${mode} for ${durationMinutes} minutes`,
      };
      break;
    }

    case 'PAUSE_SESSION': {
      if (!appStore.timer.isRunning) {
        result = {
          success: false,
          actionType: action.type,
          message: 'Timer not running',
        };
        break;
      }

      appStore.setTimerRunning(false);
      appStore.setTargetEndTime(null);

      result = {
        success: true,
        actionType: action.type,
        message: 'Session paused',
      };
      break;
    }

    case 'RESUME_SESSION': {
      if (appStore.timer.isRunning) {
        result = {
          success: false,
          actionType: action.type,
          message: 'Timer already running',
        };
        break;
      }

      appStore.setTimerRunning(true);
      appStore.setTargetEndTime(Date.now() + appStore.timer.secondsLeft * 1000);

      result = {
        success: true,
        actionType: action.type,
        message: 'Session resumed',
      };
      break;
    }

    case 'STOP_SESSION': {
      appStore.resetTimer();

      result = {
        success: true,
        actionType: action.type,
        message: 'Session stopped',
      };
      break;
    }

    case 'SET_SESSION_DURATION': {
      const payload = action.payload as { mode?: TimerMode; durationMinutes: number };
      const mode = payload.mode || appStore.timer.mode;
      const durationMinutes = payload.durationMinutes;

      if (!appStore.timer.isRunning) {
        appStore.setTimerMode(mode);
        appStore.setTimerSeconds(durationMinutes * 60);
      }

      result = {
        success: true,
        actionType: action.type,
        message: `Duration set to ${durationMinutes} minutes`,
      };
      break;
    }

    // Environment actions
    case 'SET_BACKGROUND_SOUND': {
      const payload = action.payload as { sound: string };
      const validSounds: BackgroundSound[] = ['none', 'rain', 'forest', 'cafe', 'whitenoise', 'lofi'];
      const sound = validSounds.includes(payload.sound as BackgroundSound)
        ? (payload.sound as BackgroundSound)
        : 'none';

      settingsStore.setBackgroundSound(sound);

      result = {
        success: true,
        actionType: action.type,
        message: `Background sound set to ${sound}`,
      };
      break;
    }

    case 'SET_VOLUME': {
      const payload = action.payload as { volume: number };
      const volume = Math.max(0, Math.min(1, payload.volume));

      settingsStore.setSoundVolume(volume);

      result = {
        success: true,
        actionType: action.type,
        message: `Volume set to ${Math.round(volume * 100)}%`,
      };
      break;
    }

    case 'TOGGLE_MIND_LOCK': {
      const payload = action.payload as { enabled: boolean };
      settingsStore.setMindLockEnabled(payload.enabled);

      result = {
        success: true,
        actionType: action.type,
        message: `Mind lock ${payload.enabled ? 'enabled' : 'disabled'}`,
      };
      break;
    }

    case 'TOGGLE_BREATHING': {
      const payload = action.payload as { enabled: boolean };
      settingsStore.setBreathingEnabled(payload.enabled);

      result = {
        success: true,
        actionType: action.type,
        message: `Breathing ${payload.enabled ? 'enabled' : 'disabled'}`,
      };
      break;
    }

    // Study/task actions
    case 'SET_FOCUS_INTENT': {
      const payload = action.payload as { text: string };
      // Create a new task with the intent as title
      if (payload.text?.trim()) {
        appStore.addTask(payload.text.trim());
        // Get the newly added task (last in array) and set it as current
        const tasks = useAppStore.getState().tasks;
        const newTask = tasks[tasks.length - 1];
        if (newTask) {
          appStore.setCurrentTaskId(newTask.id);
        }
      }

      result = {
        success: true,
        actionType: action.type,
        message: `Focus intent set: ${payload.text}`,
      };
      break;
    }

    case 'SUGGEST_SUBTASKS': {
      const payload = action.payload as { items: string[] };
      const currentTaskId = appStore.currentTaskId;

      if (!currentTaskId) {
        result = {
          success: false,
          actionType: action.type,
          message: 'No current task selected',
        };
        break;
      }

      // Add each suggested subtask
      for (const item of payload.items || []) {
        if (item?.trim()) {
          appStore.addSubtask(currentTaskId, item.trim());
        }
      }

      result = {
        success: true,
        actionType: action.type,
        message: `Added ${payload.items?.length || 0} subtasks`,
      };
      break;
    }

    case 'LINK_TASK_TO_TIMER': {
      const payload = action.payload as { taskId: string };
      const task = appStore.tasks.find((t) => t.id === payload.taskId);

      if (!task) {
        result = {
          success: false,
          actionType: action.type,
          message: 'Task not found',
        };
        break;
      }

      appStore.setCurrentTaskId(payload.taskId);

      result = {
        success: true,
        actionType: action.type,
        message: `Linked to task: ${task.title}`,
      };
      break;
    }

    // Reflection actions
    case 'OPEN_REFLECTION': {
      // Navigate to notes tab
      appStore.setSelectedTab('notes');

      result = {
        success: true,
        actionType: action.type,
        message: 'Opened reflection (notes)',
      };
      break;
    }

    case 'LOG_MOOD': {
      // Future: implement mood logging
      // For now, just acknowledge
      result = {
        success: true,
        actionType: action.type,
        message: 'Mood logged (not yet implemented)',
      };
      break;
    }

    case 'SAVE_NOTE': {
      const payload = action.payload as { text: string };
      if (payload.text?.trim()) {
        const currentNotes = appStore.notes;
        const separator = currentNotes ? '\n\n---\n\n' : '';
        const timestamp = new Date().toLocaleString();
        appStore.setNotes(`${currentNotes}${separator}[${timestamp}]\n${payload.text.trim()}`);
        appStore.recordNoteActivity();
      }

      result = {
        success: true,
        actionType: action.type,
        message: 'Note saved',
      };
      break;
    }

    default: {
      result = {
        success: false,
        actionType: action.type,
        message: `Unknown action type: ${action.type}`,
      };
    }
  }

  logAction(action, result);
  return result;
}

// Execute multiple actions in sequence
export function executeActions(actions: CoachAction[]): ActionResult[] {
  // Limit to max 3 actions (enforced by backend, but double-check here)
  const limitedActions = actions.slice(0, 3);
  return limitedActions.map(executeAction);
}

// Get a human-readable description of an action for UI display
export function getActionDescription(action: CoachAction): string {
  const payload = action.payload as Record<string, unknown>;

  switch (action.type) {
    case 'START_SESSION': {
      const mode = payload.mode || 'pomodoro';
      const duration = payload.durationMinutes || 25;
      return `Start ${mode === 'pomodoro' ? 'focus' : mode} session (${duration} min)`;
    }
    case 'PAUSE_SESSION':
      return 'Pause session';
    case 'RESUME_SESSION':
      return 'Resume session';
    case 'STOP_SESSION':
      return 'Stop session';
    case 'SET_SESSION_DURATION': {
      const duration = payload.durationMinutes;
      return `Set duration to ${duration} min`;
    }
    case 'SET_BACKGROUND_SOUND': {
      const sound = payload.sound;
      return sound === 'none' ? 'Turn off background sound' : `Play ${sound} sounds`;
    }
    case 'SET_VOLUME': {
      const vol = Math.round((payload.volume as number) * 100);
      return `Set volume to ${vol}%`;
    }
    case 'TOGGLE_MIND_LOCK':
      return payload.enabled ? 'Enable mind lock' : 'Disable mind lock';
    case 'TOGGLE_BREATHING':
      return payload.enabled ? 'Enable breathing exercise' : 'Disable breathing';
    case 'SET_FOCUS_INTENT':
      return `Set focus: "${payload.text}"`;
    case 'SUGGEST_SUBTASKS': {
      const items = payload.items as string[];
      return `Add ${items?.length || 0} subtasks`;
    }
    case 'LINK_TASK_TO_TIMER':
      return 'Link task to timer';
    case 'OPEN_REFLECTION':
      return 'Open reflection notes';
    case 'LOG_MOOD':
      return 'Log mood';
    case 'SAVE_NOTE':
      return 'Save note';
    default:
      return action.type;
  }
}
