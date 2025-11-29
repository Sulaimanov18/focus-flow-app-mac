import { useEffect, useRef } from 'react';
import { useTimer } from '../../hooks/useTimer';
import { useAppStore, getTodaySummary, calculateStreak } from '../../stores/useAppStore';
import { TimerMode, TIMER_MODE_LABELS } from '../../types';
import { FocusStats } from './FocusStats';

export function TimerView() {
  const timer = useTimer();
  const {
    setTimerMode,
    setSelectedTab,
    tasks,
    currentTaskId,
    showPomodoroPopup,
    setShowPomodoroPopup,
    incrementTaskPomodoros,
    completeTask,
    recordPomodoro,
    statsByDate,
  } = useAppStore();

  const prevSecondsRef = useRef(timer.secondsLeft);

  // Get current task details
  const currentTask = currentTaskId
    ? tasks.find((t) => t.id === currentTaskId)
    : null;

  // Navigate to Tasks when clicking the focus pill
  const handleFocusPillClick = () => {
    if (currentTask) {
      setSelectedTab('tasks');
    }
  };

  // Detect when pomodoro completes (seconds goes to 0 from > 0)
  useEffect(() => {
    if (
      timer.mode === 'pomodoro' &&
      prevSecondsRef.current > 0 &&
      timer.secondsLeft === 0 &&
      !timer.isRunning &&
      currentTask
    ) {
      setShowPomodoroPopup(true);
    }
    prevSecondsRef.current = timer.secondsLeft;
  }, [timer.secondsLeft, timer.isRunning, timer.mode, currentTask, setShowPomodoroPopup]);

  const handleAddPomodoro = () => {
    if (currentTaskId) {
      incrementTaskPomodoros(currentTaskId);
    }
    recordPomodoro(); // Record for stats
    setShowPomodoroPopup(false);
  };

  const handleMarkCompleted = () => {
    if (currentTaskId) {
      incrementTaskPomodoros(currentTaskId);
      completeTask(currentTaskId);
    }
    recordPomodoro(); // Record for stats
    setShowPomodoroPopup(false);
  };

  const handleSkip = () => {
    setShowPomodoroPopup(false);
  };

  const progressColor = {
    pomodoro: '#6366f1',
    shortBreak: '#22c55e',
    longBreak: '#3b82f6',
  }[timer.mode];

  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference * (1 - timer.progress);

  return (
    <div className="h-full w-full flex flex-col relative overflow-hidden">
      {/* Scrollable, vertically centered content container */}
      <div className="flex-1 flex flex-col items-center overflow-y-auto px-6 py-6">
        <div className="flex flex-col items-center w-full max-w-xl my-auto">
          {/* Current task indicator - readable label above timer */}
          <div className="mb-4 w-full max-w-xs">
            {currentTask ? (
              <button
                onClick={handleFocusPillClick}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.06] transition-colors cursor-pointer group"
              >
                <svg className="w-3.5 h-3.5 text-accent flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" fillOpacity="0.3" />
                  <circle cx="12" cy="12" r="6" fillOpacity="0.5" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                <span className="text-xs text-white/50">Focusing on:</span>
                <span className="text-xs text-white/90 font-medium truncate max-w-[160px]">
                  {currentTask.title}
                </span>
                <svg className="w-3 h-3 text-white/30 flex-shrink-0 group-hover:text-white/50 transition-colors ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                <svg className="w-3.5 h-3.5 text-white/25 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" fillOpacity="0.2" />
                  <circle cx="12" cy="12" r="6" fillOpacity="0.15" />
                </svg>
                <span className="text-xs text-white/30">No task selected</span>
              </div>
            )}
          </div>

          {/* Timer Circle */}
          <div className="relative">
            <svg width="180" height="180" className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="90"
                cy="90"
                r="70"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="90"
                cy="90"
                r="70"
                stroke={progressColor}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            </svg>

            {/* Time display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-light font-mono text-white">
                {timer.formattedTime}
              </span>
              <span className="text-xs text-white/50 mt-1">
                {TIMER_MODE_LABELS[timer.mode]}
              </span>
            </div>
          </div>

          {/* Completed pomodoros indicator */}
          {timer.completedPomodoros > 0 && (
            <div className="flex items-center gap-1.5 mt-4">
              {Array.from({ length: Math.min(timer.completedPomodoros, 4) }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-accent"
                />
              ))}
              {timer.completedPomodoros > 4 && (
                <span className="text-xs text-white/50 ml-1">
                  +{timer.completedPomodoros - 4}
                </span>
              )}
            </div>
          )}

          {/* Mode selector */}
          <div className="flex gap-2 mt-6">
            {(['pomodoro', 'shortBreak', 'longBreak'] as TimerMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setTimerMode(mode)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  timer.mode === mode
                    ? 'bg-accent text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {TIMER_MODE_LABELS[mode]}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6 mt-6">
            {/* Reset */}
            <button
              onClick={timer.reset}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <svg
                className="w-5 h-5 text-white/60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={timer.toggle}
              className={`w-14 h-14 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center transition-all shadow-lg shadow-accent/30 ${
                timer.isRunning ? 'timer-running' : ''
              }`}
            >
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                {timer.isRunning ? (
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                ) : (
                  <path d="M8 5v14l11-7z" />
                )}
              </svg>
            </button>

            {/* Skip */}
            <button
              onClick={timer.skip}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <svg
                className="w-5 h-5 text-white/60"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>

          {/* Mini Daily Summary */}
          <MiniDailySummary statsByDate={statsByDate} />

          {/* Focus Stats */}
          <div className="mt-8">
            <FocusStats />
          </div>
        </div>
      </div>

      {/* Pomodoro completion popup */}
      {showPomodoroPopup && currentTask && (() => {
        const todaySummary = getTodaySummary(statsByDate);
        return (
          <PomodoroCompletionPopup
            taskTitle={currentTask.title}
            todayPomodoros={todaySummary.pomodoros}
            todayMinutes={todaySummary.minutes}
            todayCompletedTasks={todaySummary.completedTasks}
            onAddPomodoro={handleAddPomodoro}
            onMarkCompleted={handleMarkCompleted}
            onSkip={handleSkip}
          />
        );
      })()}
    </div>
  );
}

interface PomodoroCompletionPopupProps {
  taskTitle: string;
  todayPomodoros: number;
  todayMinutes: number;
  todayCompletedTasks: number;
  onAddPomodoro: () => void;
  onMarkCompleted: () => void;
  onSkip: () => void;
}

interface MiniDailySummaryProps {
  statsByDate: Record<string, { pomodoros: number; completedTasks: number; notes: number }>;
}

function MiniDailySummary({ statsByDate }: MiniDailySummaryProps) {
  const todaySummary = getTodaySummary(statsByDate);
  const streak = calculateStreak(statsByDate);

  return (
    <div className="mt-5 flex items-center justify-center gap-3 text-[11px] text-white/40">
      <span>{todaySummary.pomodoros} pomodoro{todaySummary.pomodoros !== 1 ? 's' : ''}</span>
      <span className="text-white/20">·</span>
      <span>{todaySummary.minutes} min</span>
      <span className="text-white/20">·</span>
      <span>{todaySummary.completedTasks} task{todaySummary.completedTasks !== 1 ? 's' : ''}</span>
      {streak > 0 && (
        <>
          <span className="text-white/20">·</span>
          <span className="text-accent/70">{streak} day streak</span>
        </>
      )}
    </div>
  );
}

function PomodoroCompletionPopup({
  taskTitle,
  todayPomodoros,
  todayMinutes,
  todayCompletedTasks,
  onAddPomodoro,
  onMarkCompleted,
  onSkip,
}: PomodoroCompletionPopupProps) {
  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40" />

      {/* Popup */}
      <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-neutral-800/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl p-4">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-2xl mb-2">🔥</div>
          <h3 className="text-sm font-semibold text-white">Good job!</h3>
          <p className="text-xs text-white/50 mt-1">
            Did you make progress on:
          </p>
          <p className="text-xs text-white/80 mt-1 font-medium truncate px-2">
            "{taskTitle}"
          </p>
        </div>

        {/* Today's Stats */}
        <div className="mb-4 py-2 px-3 rounded-lg bg-white/5 border border-white/5">
          <p className="text-[10px] text-white/40 text-center">
            Today: {todayPomodoros} pomodoro{todayPomodoros !== 1 ? 's' : ''} · {todayMinutes} min · {todayCompletedTasks} task{todayCompletedTasks !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onAddPomodoro}
            className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors"
          >
            +1 Pomodoro
          </button>
          <button
            onClick={onMarkCompleted}
            className="w-full py-2.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-medium transition-colors"
          >
            Mark Completed
          </button>
          <button
            onClick={onSkip}
            className="w-full py-2 rounded-lg text-white/40 hover:text-white/60 text-xs transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </>
  );
}
