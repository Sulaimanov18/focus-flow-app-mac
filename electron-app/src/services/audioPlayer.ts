// Global audio player singleton - persists across component unmounts
import { MUSIC_TRACKS } from '../stores/useAppStore';

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

  play(trackIndex: number, volume: number): void {
    const audio = this.getAudio();

    // Only change source if track changed
    if (trackIndex !== this.currentTrackIndex || !audio.src.includes(MUSIC_TRACKS[trackIndex].fileName)) {
      this.currentTrackIndex = trackIndex;
      audio.src = `/audio/${MUSIC_TRACKS[trackIndex].fileName}.mp3`;
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

  changeTrack(trackIndex: number, volume: number, shouldPlay: boolean): void {
    this.currentTrackIndex = trackIndex;
    const audio = this.getAudio();
    audio.src = `/audio/${MUSIC_TRACKS[trackIndex].fileName}.mp3`;
    audio.volume = volume;

    if (shouldPlay) {
      audio.play().catch(console.error);
    }
  }
}

// Single global instance
export const audioPlayer = new AudioPlayer();
