import { useAppStore, MUSIC_TRACKS } from '../../stores/useAppStore';
import { audioPlayer } from '../../services/audioPlayer';

export function MusicView() {
  const {
    currentTrackIndex,
    isPlaying,
    volume,
    setCurrentTrackIndex,
    setIsPlaying,
    setVolume,
  } = useAppStore();

  const currentTrack = MUSIC_TRACKS[currentTrackIndex];

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
    <div className="flex flex-col h-full py-4 px-3">
      {/* Visualizer / Album art */}
      <div className="flex justify-center mb-4">
        <div
          className={`w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/60 to-blue-500/40 flex items-center justify-center shadow-lg shadow-purple-500/20 ${
            isPlaying ? 'animate-pulse' : ''
          }`}
        >
          <svg
            className={`w-10 h-10 text-white/90 ${
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
      <div className="text-center mb-4">
        <h3 className="text-sm font-semibold text-white">{currentTrack.name}</h3>
        <p className="text-xs text-white/50">{currentTrack.category}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 mb-4">
        <button
          onClick={prevTrack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        <button
          onClick={togglePlayPause}
          className="w-12 h-12 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center transition-colors shadow-lg shadow-accent/30"
        >
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            {isPlaying ? (
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            ) : (
              <path d="M8 5v14l11-7z" />
            )}
          </svg>
        </button>

        <button
          onClick={nextTrack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
          </svg>
        </button>
      </div>

      {/* Volume slider */}
      <div className="flex items-center gap-2 px-4 mb-4">
        <svg
          className="w-3 h-3 text-white/40"
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
          className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
        />
        <svg
          className="w-4 h-4 text-white/40"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      </div>

      {/* Track selector grid */}
      <div className="grid grid-cols-3 gap-2 px-2">
        {MUSIC_TRACKS.map((track, index) => (
          <button
            key={track.id}
            onClick={() => selectTrack(index)}
            className={`py-2.5 px-3 rounded-xl text-xs font-medium transition-all ${
              currentTrackIndex === index
                ? 'bg-accent text-white shadow-lg shadow-accent/20'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {track.name}
          </button>
        ))}
      </div>
    </div>
  );
}
