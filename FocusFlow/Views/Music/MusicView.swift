import SwiftUI
import AVFoundation

struct MusicView: View {
    // Use the shared MusicPlayer from AppState (not @StateObject)
    // This ensures music keeps playing when view is not shown
    @EnvironmentObject var appState: AppState

    private var musicPlayer: MusicPlayer {
        appState.musicPlayer
    }

    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 16) {
                Spacer(minLength: 12)

                // Album art / visualizer placeholder
                visualizerView(size: geometry.size)

                // Track info
                trackInfoView

                // Playback controls
                controlsView

                // Volume slider
                volumeSlider

                Spacer(minLength: 8)

                // Track selector
                trackSelectorGrid(width: geometry.size.width)
                    .padding(.bottom, 8)
            }
            .padding(.horizontal, 12)
        }
    }

    // MARK: - Visualizer View
    private func visualizerView(size: CGSize) -> some View {
        let circleSize = min(size.width * 0.4, 100.0)

        return ZStack {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [.purple.opacity(0.6), .blue.opacity(0.4)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: circleSize, height: circleSize)
                .shadow(color: .purple.opacity(0.3), radius: 15)

            Image(systemName: "waveform")
                .font(.system(size: circleSize * 0.35))
                .foregroundColor(.white.opacity(0.9))
                .scaleEffect(musicPlayer.isPlaying ? 1.1 : 1.0)
                .animation(
                    musicPlayer.isPlaying
                        ? .easeInOut(duration: 0.5).repeatForever(autoreverses: true)
                        : .default,
                    value: musicPlayer.isPlaying
                )
        }
    }

    // MARK: - Track Info
    private var trackInfoView: some View {
        VStack(spacing: 4) {
            Text(musicPlayer.currentTrack.name)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.primary)
                .lineLimit(1)

            Text(musicPlayer.currentTrack.category)
                .font(.system(size: 11))
                .foregroundColor(.secondary)
        }
    }

    // MARK: - Controls
    private var controlsView: some View {
        HStack(spacing: 28) {
            // Previous track
            Button(action: { musicPlayer.previousTrack() }) {
                Image(systemName: "backward.fill")
                    .font(.system(size: 18))
                    .foregroundColor(.secondary)
                    .frame(width: 36, height: 36)
            }
            .buttonStyle(.plain)

            // Play/Pause
            Button(action: { musicPlayer.togglePlayPause() }) {
                Image(systemName: musicPlayer.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                    .font(.system(size: 44))
                    .foregroundColor(.accentColor)
            }
            .buttonStyle(.plain)

            // Next track
            Button(action: { musicPlayer.nextTrack() }) {
                Image(systemName: "forward.fill")
                    .font(.system(size: 18))
                    .foregroundColor(.secondary)
                    .frame(width: 36, height: 36)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Volume Slider
    private var volumeSlider: some View {
        HStack(spacing: 8) {
            Image(systemName: "speaker.fill")
                .font(.system(size: 10))
                .foregroundColor(.secondary)

            Slider(value: Binding(
                get: { musicPlayer.volume },
                set: { musicPlayer.volume = $0 }
            ), in: 0...1)
                .frame(maxWidth: 140)

            Image(systemName: "speaker.wave.3.fill")
                .font(.system(size: 10))
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Track Selector Grid
    private func trackSelectorGrid(width: CGFloat) -> some View {
        let columns = width > 280 ? 3 : 2
        let gridColumns = Array(repeating: GridItem(.flexible(), spacing: 8), count: columns)

        return LazyVGrid(columns: gridColumns, spacing: 8) {
            ForEach(musicPlayer.tracks) { track in
                TrackButton(
                    track: track,
                    isSelected: musicPlayer.currentTrack.id == track.id
                ) {
                    musicPlayer.selectTrack(track)
                }
            }
        }
    }
}

// MARK: - Track Button
struct TrackButton: View {
    let track: MusicTrack
    let isSelected: Bool
    let action: () -> Void

    @State private var isHovering = false

    var body: some View {
        Button(action: action) {
            Text(track.name)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(isSelected ? .white : .primary.opacity(0.85))
                .lineLimit(1)
                .frame(maxWidth: .infinity)
                .frame(minWidth: 80)
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(backgroundColor)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(isSelected ? Color.clear : Color.secondary.opacity(0.2), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
        .onHover { hovering in
            withAnimation(.easeInOut(duration: 0.1)) {
                isHovering = hovering
            }
        }
    }

    private var backgroundColor: Color {
        if isSelected {
            return Color.accentColor
        } else if isHovering {
            return Color.secondary.opacity(0.2)
        } else {
            return Color.secondary.opacity(0.1)
        }
    }
}

// MARK: - Music Track Model
struct MusicTrack: Identifiable, Equatable {
    let id: UUID
    let name: String
    let category: String
    let fileName: String

    init(name: String, category: String, fileName: String) {
        self.id = UUID()
        self.name = name
        self.category = category
        self.fileName = fileName
    }

    static func == (lhs: MusicTrack, rhs: MusicTrack) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Music Player with Actual Audio Playback
// This class is now owned by AppState, so it persists across view changes
class MusicPlayer: ObservableObject {
    @Published var isPlaying: Bool = false
    @Published var volume: Float = 0.7 {
        didSet {
            audioPlayer?.volume = volume
        }
    }
    @Published var currentTrackIndex: Int = 0

    private var audioPlayer: AVAudioPlayer?

    // Tracks with actual audio files
    let tracks: [MusicTrack] = [
        MusicTrack(name: "Holy Water", category: "Ambient", fileName: "holy-water"),
        MusicTrack(name: "Soft Focus", category: "Focus", fileName: "soft-focus"),
        MusicTrack(name: "Deep Focus", category: "Focus", fileName: "deep-focus"),
    ]

    var currentTrack: MusicTrack {
        tracks[currentTrackIndex]
    }

    init() {
        print("🎵 [MUSIC] MusicPlayer initialized")
        print("📋 [MUSIC] Available tracks: \(tracks.map { $0.name }.joined(separator: ", "))")
    }

    func togglePlayPause() {
        print("🔄 [MUSIC] togglePlayPause called, current state: \(isPlaying ? "playing" : "paused")")
        if isPlaying {
            pause()
        } else {
            play()
        }
    }

    func play() {
        print("▶️ [MUSIC] play() called")
        
        // If we have a paused player for the same track, resume it
        if let player = audioPlayer, !player.isPlaying {
            print("▶️ [MUSIC] Resuming paused track: \(currentTrack.name)")
            player.play()
            isPlaying = true
            objectWillChange.send()
            print("📢 [MUSIC] UI update triggered after resume")
            return
        }

        // Otherwise load and play the current track
        print("🎵 [MUSIC] Loading and playing track: \(currentTrack.name)")
        loadAndPlayCurrentTrack()
    }

    func pause() {
        print("⏸️ [MUSIC] Pausing music")
        audioPlayer?.pause()
        isPlaying = false
        objectWillChange.send()
        print("📢 [MUSIC] UI update triggered after pause")
    }

    func stop() {
        print("⏹️ [MUSIC] Stopping music")
        audioPlayer?.stop()
        audioPlayer = nil
        isPlaying = false
        objectWillChange.send()
        print("📢 [MUSIC] UI update triggered after stop")
    }

    func nextTrack() {
        print("⏭️ [MUSIC] Next track requested")
        let wasPlaying = isPlaying
        stop()
        currentTrackIndex = (currentTrackIndex + 1) % tracks.count
        print("📀 [MUSIC] Switched to track \(currentTrackIndex + 1)/\(tracks.count): \(currentTrack.name)")
        if wasPlaying {
            loadAndPlayCurrentTrack()
        }
        objectWillChange.send()
        print("📢 [MUSIC] UI update triggered after next track")
    }

    func previousTrack() {
        print("⏮️ [MUSIC] Previous track requested")
        let wasPlaying = isPlaying
        stop()
        currentTrackIndex = (currentTrackIndex - 1 + tracks.count) % tracks.count
        print("📀 [MUSIC] Switched to track \(currentTrackIndex + 1)/\(tracks.count): \(currentTrack.name)")
        if wasPlaying {
            loadAndPlayCurrentTrack()
        }
        objectWillChange.send()
        print("📢 [MUSIC] UI update triggered after previous track")
    }

    func selectTrack(_ track: MusicTrack) {
        print("🎯 [MUSIC] Track selected: \(track.name)")
        if let index = tracks.firstIndex(where: { $0.id == track.id }) {
            let wasPlaying = isPlaying
            stop()
            currentTrackIndex = index
            print("📀 [MUSIC] Set current track index to \(index)")

            // Always start playing when selecting a track
            loadAndPlayCurrentTrack()

            objectWillChange.send()
            print("📢 [MUSIC] UI update triggered after track selection")
        }
    }

    private func loadAndPlayCurrentTrack() {
        let track = currentTrack
        print("📂 [MUSIC] Loading track: \(track.fileName).mp3")

        // Look for the audio file in the bundle
        guard let url = Bundle.main.url(forResource: track.fileName, withExtension: "mp3") else {
            print("❌ [MUSIC] Could not find audio file: \(track.fileName).mp3")
            isPlaying = false
            return
        }

        print("✅ [MUSIC] Found audio file at: \(url.path)")
        
        do {
            audioPlayer = try AVAudioPlayer(contentsOf: url)
            audioPlayer?.volume = volume
            audioPlayer?.numberOfLoops = -1  // Loop indefinitely for ambient music
            audioPlayer?.prepareToPlay()
            audioPlayer?.play()
            isPlaying = true
            print("✅ [MUSIC] Playback started successfully, volume: \(volume), looping: true")
            objectWillChange.send()
            print("📢 [MUSIC] UI update triggered after playback start")
        } catch {
            print("❌ [MUSIC] Error loading audio: \(error.localizedDescription)")
            isPlaying = false
        }
    }
}

#Preview {
    MusicView()
        .environmentObject(AppState())
        .frame(width: 280, height: 400)
}
