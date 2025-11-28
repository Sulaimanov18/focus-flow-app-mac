import { useTimer } from '../../hooks/useTimer';
import { useAppStore } from '../../stores/useAppStore';
import { TimerMode, TIMER_MODE_LABELS } from '../../types';

export function TimerView() {
  const timer = useTimer();
  const { setTimerMode } = useAppStore();

  const progressColor = {
    pomodoro: '#6366f1',
    shortBreak: '#22c55e',
    longBreak: '#3b82f6',
  }[timer.mode];

  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference * (1 - timer.progress);

  return (
    <div className="flex flex-col items-center justify-between h-full py-6 px-4">
      {/* Timer Circle */}
      <div className="flex-1 flex flex-col items-center justify-center">
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
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 mb-4">
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
      <div className="flex items-center gap-6">
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
    </div>
  );
}
