import { useEffect, useState } from 'react';
import { useAppStore } from './stores/useAppStore';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TimerView } from './components/Timer/TimerView';
import { TasksView } from './components/Tasks/TasksView';
import { NotesView } from './components/Notes/NotesView';
import { MusicView } from './components/Music/MusicView';
import { AuthView } from './components/Auth/AuthView';
import { CollapsedView } from './components/CollapsedView';

function App() {
  const { selectedTab, isCollapsed, setIsCollapsed, isLoggedIn } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Sync collapsed state with Electron
    const syncCollapsedState = async () => {
      if (window.electronAPI) {
        const collapsed = await window.electronAPI.getCollapsedState();
        setIsCollapsed(collapsed);
      }
    };
    syncCollapsedState();
  }, [setIsCollapsed]);

  if (!mounted) return null;

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
      case 'account':
        return isLoggedIn ? <div>Account Settings</div> : <AuthView />;
      default:
        return <TimerView />;
    }
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
    <div className="w-full h-full rounded-2xl bg-neutral-900/95 backdrop-blur-xl overflow-hidden border border-white/10 shadow-2xl">
      <div className="flex h-full">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header with drag region */}
          <Header />

          {/* Divider */}
          <div className="mx-4 h-px bg-white/10" />

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

function Header() {
  const { selectedTab, setIsCollapsed } = useAppStore();

  const tabTitles: Record<string, string> = {
    timer: 'Timer',
    tasks: 'Tasks',
    notes: 'Notes',
    music: 'Music',
    account: 'Account',
  };

  const handleCollapse = async () => {
    if (window.electronAPI) {
      const collapsed = await window.electronAPI.toggleCollapse();
      setIsCollapsed(collapsed);
    }
  };

  return (
    <div className="drag-region flex items-center justify-between px-4 py-3">
      <h1 className="text-sm font-semibold text-white/90">
        {tabTitles[selectedTab]}
      </h1>

      <button
        onClick={handleCollapse}
        className="no-drag w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
      >
        <svg
          className="w-2.5 h-2.5 text-white/60"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
      </button>
    </div>
  );
}

export default App;
