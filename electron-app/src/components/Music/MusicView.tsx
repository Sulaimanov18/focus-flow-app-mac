import { useState } from 'react';
import { useAppStore, MUSIC_TRACKS } from '../../stores/useAppStore';
import { audioPlayer } from '../../services/audioPlayer';
import lofiFocusBg from '../../assets/backgrounds/lofi-focus-bg.jpg';
import softFocusBg from '../../assets/backgrounds/soft-focus-bg.jpg';

// Map track names to their background images
const trackBackgrounds: Record<string, string> = {
  'Lofi Focus': lofiFocusBg,
  'Soft Focus': softFocusBg,
};

export function MusicView() {
  const {
    currentTrackIndex,
    isPlaying,
    volume,
    setCurrentTrackIndex,
    setIsPlaying,
    setVolume,
  } = useAppStore();

  const [isExpanded, setIsExpanded] = useState(true);

  const currentTrack = MUSIC_TRACKS[currentTrackIndex];
  const backgroundImage = trackBackgrounds[currentTrack.name];

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    const newIndex = (currentTrackIndex + 1) % MUSIC_TRACKS.length;
    setCurrentTrackIndex(newIndex);
    if (isPlaying) {
      audioPlayer.changeTrack(newIndex, volume, true);
    }
  };

  const prevTrack = () => {
    const newIndex = (currentTrackIndex - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
    setCurrentTrackIndex(newIndex);
    if (isPlaying) {
      audioPlayer.changeTrack(newIndex, volume, true);
    }
  };

  const selectTrack = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
    audioPlayer.changeTrack(index, volume, true);
  };

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Background image layer */}
      {backgroundImage ? (
        <div
          className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${
            isExpanded ? 'scale-105' : 'scale-100'
          }`}
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      ) : (
        /* Default gradient background for tracks without images */
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
      )}

      {/* Dark overlay - lighter when collapsed to show more of the artwork */}
      <div className={`absolute inset-0 transition-all duration-500 ${
        isExpanded ? 'bg-black/70 backdrop-blur-sm' : 'bg-black/40'
      }`} />

      {/* Vignette overlay for depth */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${
        isExpanded ? 'opacity-100' : 'opacity-50'
      } bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.4)_70%,_rgba(0,0,0,0.7)_100%)]`} />

      {/* Expanded mode: Player card */}
      {isExpanded && (
        <div className="relative z-10 h-full w-full flex items-center justify-center px-4 py-6 overflow-y-auto">
          <div className="relative w-full max-w-sm rounded-2xl bg-white/[0.08] border border-white/[0.1] shadow-2xl shadow-black/50 backdrop-blur-xl px-6 py-6 flex flex-col items-center transition-all duration-300 ease-out">
            {/* Collapse button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-3 right-3 h-7 w-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/40 hover:text-white/70 transition-all"
              aria-label="Collapse player"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Visualizer / Album art */}
            <div className="flex justify-center mb-5 mt-2">
              <div
                className={`w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/70 to-blue-500/50 flex items-center justify-center shadow-lg shadow-purple-500/30 ${
                  isPlaying ? 'animate-pulse' : ''
                }`}
              >
                <svg
                  className={`w-9 h-9 text-white ${
                    isPlaying ? 'scale-110' : 'scale-100'
                  } transition-transform duration-500`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              </div>
            </div>

            {/* Track info */}
            <div className="text-center mb-5">
              <h3 className="text-base font-semibold text-white">{currentTrack.name}</h3>
              <p className="text-xs text-white/50 mt-0.5">{currentTrack.category}</p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6 mb-5">
              <button
                onClick={prevTrack}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              <button
                onClick={togglePlayPause}
                className="w-14 h-14 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center transition-all shadow-lg shadow-accent/40"
              >
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  {isPlaying ? (
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  ) : (
                    <path d="M8 5v14l11-7z" />
                  )}
                </svg>
              </button>

              <button
                onClick={nextTrack}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>

            {/* Volume slider */}
            <div className="flex items-center gap-3 w-full mb-6 px-2">
              <svg
                className="w-4 h-4 text-white/40 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M3 9v6h4l5 5V4L7 9H3z" />
              </svg>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
              />
              <svg
                className="w-4 h-4 text-white/40 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-white/10 mb-4" />

            {/* Track selector grid */}
            <div className="grid grid-cols-3 gap-2 w-full">
              {MUSIC_TRACKS.map((track, index) => (
                <button
                  key={track.id}
                  onClick={() => selectTrack(index)}
                  className={`py-2 px-2 rounded-lg text-[11px] font-medium transition-all ${
                    currentTrackIndex === index
                      ? 'bg-accent text-white shadow-md shadow-accent/30'
                      : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.12] hover:text-white/80'
                  }`}
                >
                  {track.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Collapsed mode: Floating expand button */}
      {!isExpanded && (
        <div className="relative z-10 h-full w-full">
          {/* Small track info at bottom */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
            <div className="text-center">
              <p className="text-sm font-medium text-white/90">{currentTrack.name}</p>
              <p className="text-xs text-white/50">{currentTrack.category}</p>
            </div>

            {/* Mini play/pause button */}
            <button
              onClick={togglePlayPause}
              className="w-12 h-12 rounded-full bg-accent/90 hover:bg-accent flex items-center justify-center transition-all shadow-lg shadow-accent/30"
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                {isPlaying ? (
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                ) : (
                  <path d="M8 5v14l11-7z" />
                )}
              </svg>
            </button>
          </div>

          {/* Expand button on the right */}
          <button
            onClick={() => setIsExpanded(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 flex items-center justify-center text-white/70 hover:text-white shadow-lg backdrop-blur-md transition-all"
            aria-label="Expand player"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
