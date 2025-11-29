import { useEffect } from 'react';
import { useAppStore, MUSIC_TRACKS } from '../../stores/useAppStore';
import { audioPlayer } from '../../services/audioPlayer';

// Format seconds as MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Timer mode display names
const MODE_LABELS: Record<string, string> = {
  pomodoro: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

export function MiniWidgetView() {
  const {
    timer,
    setTimerRunning,
    setTimerSeconds,
    setTargetEndTime,
    tasks,
    currentTaskId,
    isPlaying,
    setIsPlaying,
    currentTrackIndex,
    volume,
  } = useAppStore();

  const currentTask = tasks.find((t) => t.id === currentTaskId);
  const currentTrack = MUSIC_TRACKS[currentTrackIndex];

  // Sync audio player with state
  useEffect(() => {
    if (isPlaying) {
      audioPlayer.play(currentTrackIndex, volume);
    } else {
      audioPlayer.pause();
    }
  }, [isPlaying, currentTrackIndex, volume]);

  useEffect(() => {
    audioPlayer.setVolume(volume);
  }, [volume]);

  // Timer tick effect
  useEffect(() => {
    if (!timer.isRunning) return;

    const interval = setInterval(() => {
      if (timer.targetEndTime) {
        const remaining = Math.max(0, Math.round((timer.targetEndTime - Date.now()) / 1000));
        setTimerSeconds(remaining);

        if (remaining === 0) {
          setTimerRunning(false);
          setTargetEndTime(null);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timer.isRunning, timer.targetEndTime, setTimerSeconds, setTimerRunning, setTargetEndTime]);

  const handleTimerToggle = () => {
    if (timer.isRunning) {
      // Pause
      setTimerRunning(false);
      setTargetEndTime(null);
    } else {
      // Start
      const targetTime = Date.now() + timer.secondsLeft * 1000;
      setTargetEndTime(targetTime);
      setTimerRunning(true);
    }
  };

  const handleMusicToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeMiniWidget();
    }
  };

  return (
    <div className="w-full h-full p-2">
      <div className="drag-region w-full h-full bg-zinc-900/90 backdrop-blur-xl rounded-2xl border border-zinc-700/50 shadow-2xl flex flex-col overflow-hidden">
        {/* Header - drag area with close button */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
          <span className="text-xs font-medium text-zinc-400">FocusFlow</span>
          <button
            onClick={handleClose}
            className="no-drag w-5 h-5 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
          >
            <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-3 gap-3">
          {/* Timer Section */}
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              onClick={handleTimerToggle}
              className="no-drag w-12 h-12 rounded-full bg-accent hover:bg-accent/90 flex items-center justify-center transition-colors shrink-0"
            >
              {timer.isRunning ? (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Timer Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white tabular-nums">
                  {formatTime(timer.secondsLeft)}
                </span>
                <span className="text-xs font-medium text-zinc-400">
                  {MODE_LABELS[timer.mode]}
                </span>
              </div>
              <div className="text-xs text-zinc-500 truncate">
                {currentTask ? (
                  <span className="text-zinc-400">{currentTask.title}</span>
                ) : (
                  <span className="text-zinc-500">No task selected</span>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-zinc-800/50" />

          {/* Music Section */}
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              onClick={handleMusicToggle}
              className={`no-drag w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                isPlaying
                  ? 'bg-accent/20 text-accent hover:bg-accent/30'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {isPlaying ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="text-sm font-medium text-white truncate">
                  {currentTrack?.name ?? 'Unknown Track'}
                </span>
              </div>
              <span className="text-xs text-zinc-500">
                {currentTrack?.category ?? 'Music'}
              </span>
            </div>

            {/* Visual indicator when playing */}
            {isPlaying && (
              <div className="flex items-center gap-0.5">
                <div className="w-0.5 h-3 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                <div className="w-0.5 h-4 bg-accent rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-0.5 h-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-3 py-1.5 border-t border-zinc-800/50 bg-zinc-900/50">
          <span className="text-[10px] text-zinc-600">
            ⌘+Shift+F to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
