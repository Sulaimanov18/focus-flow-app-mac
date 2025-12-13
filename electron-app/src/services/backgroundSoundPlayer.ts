// Background ambient sound player singleton
import type { BackgroundSound } from '../stores/useSettingsStore';

// Map background sound types to file paths
// Note: These files should be placed in the public/sounds/ directory
// If files are missing, playback will fail silently
const SOUND_FILES: Record<Exclude<BackgroundSound, 'none'>, string> = {
  rain: '/sounds/rain.mp3',
  forest: '/sounds/forest.mp3',
  cafe: '/sounds/cafe.mp3',
  whitenoise: '/sounds/whitenoise.mp3',
  lofi: '/sounds/lofi.mp3',
};

class BackgroundSoundPlayer {
  private audio: HTMLAudioElement | null = null;
  private currentSound: BackgroundSound = 'none';
  private isCurrentlyPlaying: boolean = false;

  private getAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.loop = true;
      // Track actual playing state via events
      this.audio.addEventListener('play', () => {
        this.isCurrentlyPlaying = true;
      });
      this.audio.addEventListener('pause', () => {
        this.isCurrentlyPlaying = false;
      });
      this.audio.addEventListener('ended', () => {
        this.isCurrentlyPlaying = false;
      });
      this.audio.addEventListener('error', () => {
        this.isCurrentlyPlaying = false;
        console.warn('Background sound file not found or failed to load');
      });
    }
    return this.audio;
  }

  setSound(sound: BackgroundSound, volume: number): void {
    if (sound === 'none') {
      this.stop();
      this.currentSound = 'none';
      return;
    }

    const audio = this.getAudio();

    // Only change source if sound changed
    if (sound !== this.currentSound) {
      this.currentSound = sound;
      audio.src = SOUND_FILES[sound];
    }

    audio.volume = volume;
  }

  play(sound: BackgroundSound, volume: number): void {
    if (sound === 'none') {
      this.stop();
      return;
    }

    this.setSound(sound, volume);
    const audio = this.getAudio();
    audio.play().catch(() => {
      // Silently fail if audio file is missing
      console.warn(`Background sound "${sound}" could not be played`);
    });
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isCurrentlyPlaying = false;
    }
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  resume(): void {
    if (this.audio && this.currentSound !== 'none') {
      this.audio.play().catch(() => {
        console.warn(`Background sound "${this.currentSound}" could not be resumed`);
      });
    }
  }

  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = volume;
    }
  }

  isPlaying(): boolean {
    return this.isCurrentlyPlaying;
  }

  getCurrentSound(): BackgroundSound {
    return this.currentSound;
  }
}

// Single global instance
export const backgroundSoundPlayer = new BackgroundSoundPlayer();
