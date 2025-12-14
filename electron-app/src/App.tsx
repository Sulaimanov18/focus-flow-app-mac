import { useEffect, useState } from 'react';
import { useAppStore } from './stores/useAppStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TimerView } from './components/Timer/TimerView';
import { TasksView } from './components/Tasks/TasksView';
import { NotesView } from './components/Notes/NotesView';
import { MusicView } from './components/Music/MusicView';
import { AuthView } from './components/Auth/AuthView';
import { CalendarView } from './components/Calendar/CalendarView';
import { SettingsView } from './components/Settings/SettingsView';
import { CoachView } from './components/Coach/CoachView';
import { CollapsedView } from './components/CollapsedView';
import { MiniWidgetView } from './components/MiniWidget/MiniWidgetView';
import { audioPlayer } from './services/audioPlayer';
import { supabase } from './services/supabase';
import { backgroundSoundPlayer } from './services/backgroundSoundPlayer';

function App() {
  const { selectedTab, isCollapsed, setIsCollapsed, isLoggedIn, isPlaying, currentTrackIndex, volume, setAuthView, setSelectedTab, timer } = useAppStore();
  const { theme, timerSize, alwaysOnTop, backgroundSound, soundVolume, autoStartSound } = useSettingsStore();
  const [mounted, setMounted] = useState(false);
  const [isMiniWidget, setIsMiniWidget] = useState(false);

  // Apply theme class to body
  useEffect(() => {
    document.body.classList.remove('theme-soft-dark');
    if (theme === 'soft-dark') {
      document.body.classList.add('theme-soft-dark');
    }
  }, [theme]);

  // Apply timer size class to body
  useEffect(() => {
    document.body.classList.remove('timer-large');
    if (timerSize === 'large') {
      document.body.classList.add('timer-large');
    }
  }, [timerSize]);

  // Apply always on top setting via Electron IPC
  useEffect(() => {
    if (window.electronAPI?.setAlwaysOnTop) {
      window.electronAPI.setAlwaysOnTop(alwaysOnTop);
    }
  }, [alwaysOnTop]);

  // Handle background sound + auto-start when timer starts
  useEffect(() => {
    if (isMiniWidget) return;

    // When timer starts running in pomodoro mode and autoStartSound is enabled
    if (timer.isRunning && timer.mode === 'pomodoro' && autoStartSound && backgroundSound !== 'none') {
      backgroundSoundPlayer.play(backgroundSound, soundVolume);
    }

    // When timer stops (either paused or completed) in pomodoro mode
    if (!timer.isRunning && backgroundSoundPlayer.isPlaying()) {
      backgroundSoundPlayer.pause();
    }
  }, [timer.isRunning, timer.mode, autoStartSound, backgroundSound, soundVolume, isMiniWidget]);

  // Sync background sound volume when changed
  useEffect(() => {
    if (isMiniWidget) return;
    backgroundSoundPlayer.setVolume(soundVolume);
  }, [soundVolume, isMiniWidget]);

  // Update background sound track when changed (but only play if currently playing)
  useEffect(() => {
    if (isMiniWidget) return;
    if (backgroundSoundPlayer.isPlaying()) {
      backgroundSoundPlayer.setSound(backgroundSound, soundVolume);
      if (backgroundSound !== 'none') {
        backgroundSoundPlayer.resume();
      }
    }
  }, [backgroundSound, soundVolume, isMiniWidget]);

  useEffect(() => {
    setMounted(true);

    // Check if we're in mini widget mode or reset-password mode (hash route)
    const checkHashRoute = () => {
      const hash = window.location.hash;
      setIsMiniWidget(hash === '#/mini' || hash === '/mini');

      // Handle reset-password route
      if (hash.includes('/reset-password') || hash.includes('type=recovery')) {
        setSelectedTab('account');
        setAuthView('reset-password');
      }
    };

    checkHashRoute();
    window.addEventListener('hashchange', checkHashRoute);

    // Listen for Supabase PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSelectedTab('account');
        setAuthView('reset-password');
      }
    });

    // Sync collapsed state with Electron (only for main window)
    const syncCollapsedState = async () => {
      if (window.electronAPI && !isMiniWidget) {
        const collapsed = await window.electronAPI.getCollapsedState();
        setIsCollapsed(collapsed);
      }
    };
    syncCollapsedState();

    return () => {
      window.removeEventListener('hashchange', checkHashRoute);
      subscription.unsubscribe();
    };
  }, [setIsCollapsed, isMiniWidget, setAuthView, setSelectedTab]);

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
    const content = (() => {
      switch (selectedTab) {
        case 'timer':
          return <TimerView />;
        case 'tasks':
          return <TasksView />;
        case 'notes':
          return <NotesView />;
        case 'coach':
          return <CoachView />;
        case 'music':
          return <MusicView />;
        case 'calendar':
          return <CalendarView />;
        case 'account':
          return isLoggedIn ? <div className="p-4 text-white/60">Account Settings</div> : <AuthView />;
        case 'settings':
          return <SettingsView />;
        default:
          return <TimerView />;
      }
    })();

    // Wrap content in animated container with unique key for re-triggering animation
    return (
      <div key={selectedTab} className="h-full w-full page-transition">
        {content}
      </div>
    );
  };

  const tabTitles: Record<string, string> = {
    timer: 'Timer',
    tasks: 'Tasks',
    notes: 'Notes',
    coach: 'Coach',
    music: 'Music',
    calendar: 'Calendar',
    account: 'Account',
    settings: 'Settings',
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
    <div className="w-full h-full rounded-2xl bg-neutral-900/90 backdrop-blur-xl overflow-hidden border border-white/10 shadow-2xl flex app-container">
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
