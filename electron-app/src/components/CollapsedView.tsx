import { useAppStore } from '../stores/useAppStore';
import { useTimer } from '../hooks/useTimer';
import { TIMER_MODE_LABELS } from '../types';

// Capybara app icon (use larger size for better quality)
const appIconUrl = "/icons/capyfocus-app-64.png";

export function CollapsedView() {
  const { setIsCollapsed, isPlaying, setIsPlaying } = useAppStore();
  const timer = useTimer();

  // Check if actively focusing (timer running in pomodoro/focus mode with time remaining)
  const isBreathing = timer.isRunning && timer.mode === 'pomodoro' && timer.secondsLeft > 0;

  const handleExpand = async () => {
    if (window.electronAPI) {
      const collapsed = await window.electronAPI.toggleCollapse();
      setIsCollapsed(collapsed);
    }
  };

  return (
    <div className="w-full h-full rounded-lg bg-neutral-900/95 backdrop-blur-xl border border-white/10 shadow-xl">
      <div className="drag-region flex items-center justify-between h-full px-4">
        {/* App icon / expand button with breathing animation */}
        <button
          onClick={handleExpand}
          className={`no-drag w-10 h-10 rounded-xl hover:scale-105 flex items-center justify-center transition-all duration-200 overflow-visible capy-breathing-wrap ${isBreathing ? 'is-breathing' : ''}`}
        >
          <img src={appIconUrl} alt="CapyFocus" className="w-10 h-10 object-cover rounded-lg" />
        </button>

        {/* Timer display */}
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div
            className={`w-2 h-2 rounded-full ${
              timer.isRunning
                ? 'bg-green-400 shadow-lg shadow-green-400/50'
                : 'bg-white/30'
            }`}
          />

          {/* Time */}
          <span className="font-mono text-lg font-medium text-white">
            {timer.formattedTime}
          </span>

          {/* Mode pill */}
          <span className="text-xs font-medium text-white/50 bg-white/10 px-2 py-1 rounded-full">
            {TIMER_MODE_LABELS[timer.mode]}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Music toggle */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="no-drag w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <svg
              className={`w-3 h-3 ${isPlaying ? 'text-purple-400' : 'text-white/50'}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              {isPlaying ? (
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              ) : (
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              )}
            </svg>
          </button>

          {/* Play/Pause timer */}
          <button
            onClick={timer.toggle}
            className="no-drag w-8 h-8 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center transition-colors"
          >
            <svg
              className="w-4 h-4 text-white"
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

          {/* Expand button */}
          <button
            onClick={handleExpand}
            className="no-drag w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <svg
              className="w-3 h-3 text-white/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
