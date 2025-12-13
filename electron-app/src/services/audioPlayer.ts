// Global audio player singleton - persists across component unmounts
import { MUSIC_TRACKS } from '../stores/useAppStore';

// Helper to get audio path - works in both dev and packaged builds
async function getAudioPath(fileName: string): Promise<string> {
  // Check if we're in Electron with the API available
  if (window.electronAPI?.getAudioPath) {
    try {
      const audioPath = await window.electronAPI.getAudioPath(fileName);
      console.log(`[AudioPlayer] Got path for ${fileName}:`, audioPath);
      return audioPath;
    } catch (error) {
      console.error(`[AudioPlayer] Error getting audio path for ${fileName}:`, error);
    }
  }
  // Fallback for dev mode or if API not available
  return `/audio/${fileName}.mp3`;
}

class AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private currentTrackIndex: number = 0;

  private getAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.loop = true;
    }
    return this.audio;
  }

  async play(trackIndex: number, volume: number): Promise<void> {
    const audio = this.getAudio();

    // Only change source if track changed
    if (trackIndex !== this.currentTrackIndex || !audio.src.includes(MUSIC_TRACKS[trackIndex].fileName)) {
      this.currentTrackIndex = trackIndex;
      const audioPath = await getAudioPath(MUSIC_TRACKS[trackIndex].fileName);
      audio.src = audioPath;
    }

    audio.volume = volume;
    audio.play().catch(console.error);
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = volume;
    }
  }

  async changeTrack(trackIndex: number, volume: number, shouldPlay: boolean): Promise<void> {
    this.currentTrackIndex = trackIndex;
    const audio = this.getAudio();
    const audioPath = await getAudioPath(MUSIC_TRACKS[trackIndex].fileName);
    audio.src = audioPath;
    audio.volume = volume;

    if (shouldPlay) {
      audio.play().catch(console.error);
    }
  }
}

// Single global instance
export const audioPlayer = new AudioPlayer();
