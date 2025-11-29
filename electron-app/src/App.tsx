import { useEffect, useState } from 'react';
import { useAppStore } from './stores/useAppStore';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TimerView } from './components/Timer/TimerView';
import { TasksView } from './components/Tasks/TasksView';
import { NotesView } from './components/Notes/NotesView';
import { MusicView } from './components/Music/MusicView';
import { AuthView } from './components/Auth/AuthView';
import { CalendarView } from './components/Calendar/CalendarView';
import { CollapsedView } from './components/CollapsedView';
import { MiniWidgetView } from './components/MiniWidget/MiniWidgetView';
import { audioPlayer } from './services/audioPlayer';

function App() {
  const { selectedTab, isCollapsed, setIsCollapsed, isLoggedIn, isPlaying, currentTrackIndex, volume } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [isMiniWidget, setIsMiniWidget] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if we're in mini widget mode (hash route)
    const checkMiniMode = () => {
      const hash = window.location.hash;
      setIsMiniWidget(hash === '#/mini' || hash === '/mini');
    };

    checkMiniMode();
    window.addEventListener('hashchange', checkMiniMode);

    // Sync collapsed state with Electron (only for main window)
    const syncCollapsedState = async () => {
      if (window.electronAPI && !isMiniWidget) {
        const collapsed = await window.electronAPI.getCollapsedState();
        setIsCollapsed(collapsed);
      }
    };
    syncCollapsedState();

    return () => {
      window.removeEventListener('hashchange', checkMiniMode);
    };
  }, [setIsCollapsed, isMiniWidget]);

  // Sync audio player with state - runs at App level so it works when collapsed
  useEffect(() => {
    // Only sync audio in main window, not mini widget (mini widget has its own sync)
    if (isMiniWidget) return;

    if (isPlaying) {
      audioPlayer.play(currentTrackIndex, volume);
    } else {
      audioPlayer.pause();
    }
  }, [isPlaying, currentTrackIndex, isMiniWidget]);

  useEffect(() => {
    if (isMiniWidget) return;
    audioPlayer.setVolume(volume);
  }, [volume, isMiniWidget]);

  if (!mounted) return null;

  // Mini widget view - completely separate UI
  if (isMiniWidget) {
    return <MiniWidgetView />;
  }

  const renderContent = () => {
    switch (selectedTab) {
      case 'timer':
        return <TimerView />;
      case 'tasks':
        return <TasksView />;
      case 'notes':
        return <NotesView />;
      case 'music':
        return <MusicView />;
      case 'calendar':
        return <CalendarView />;
      case 'account':
        return isLoggedIn ? <div className="p-4 text-white/60">Account Settings</div> : <AuthView />;
      default:
        return <TimerView />;
    }
  };

  const tabTitles: Record<string, string> = {
    timer: 'Timer',
    tasks: 'Tasks',
    notes: 'Notes',
    music: 'Music',
    calendar: 'Calendar',
    account: 'Account',
  };

  // Collapsed mini player view
  if (isCollapsed) {
    return (
      <div className="w-full h-full">
        <CollapsedView />
      </div>
    );
  }

  // Expanded full view
  return (
    <div className="w-full h-full rounded-2xl bg-neutral-900/90 backdrop-blur-xl overflow-hidden border border-white/10 shadow-2xl flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with traffic lights area and title */}
        <div className="drag-region flex items-center justify-between px-4 py-3 border-b border-white/5">
          {/* Traffic lights placeholder (macOS will show them here) */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 mr-3">
              <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500"></div>
            </div>
            <h1 className="text-sm font-semibold text-white/90">
              {tabTitles[selectedTab]}
            </h1>
          </div>

          {/* Collapse button */}
          <button
            onClick={async () => {
              if (window.electronAPI) {
                const collapsed = await window.electronAPI.toggleCollapse();
                setIsCollapsed(collapsed);
              }
            }}
            className="no-drag w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <svg
              className="w-3 h-3 text-white/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default App;
