import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @ObservedObject var windowManager = WindowManager.shared

    var body: some View {
        ZStack {
            // Always keep expanded view mounted (but hidden when collapsed)
            // This prevents MusicView and other views from being unmounted
            expandedView
                .opacity(windowManager.isCollapsed ? 0 : 1)
                .allowsHitTesting(!windowManager.isCollapsed)

            // Collapsed view overlays when collapsed
            if windowManager.isCollapsed {
                collapsedView
            }
        }
        .background(
            VisualEffectView(material: .hudWindow, blendingMode: .behindWindow)
        )
        .clipShape(RoundedRectangle(cornerRadius: windowManager.isCollapsed ? 8 : 12))
        .overlay(
            RoundedRectangle(cornerRadius: windowManager.isCollapsed ? 8 : 12)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.3), radius: windowManager.isCollapsed ? 10 : 20, x: 0, y: 5)
    }

    // ========================================================================
    // MARK: - Collapsed View (Timer Strip)
    // ========================================================================
    // WIDER collapsed state - shows more info comfortably
    // Width controlled by WindowManager (collapsedWidth: 280)
    // Height: 56px (collapsedHeight in WindowManager)
    // ========================================================================
    private var collapsedView: some View {
        HStack(spacing: 14) {
            // App icon / Logo
            Button(action: {
                windowManager.toggleCollapse()
            }) {
                Image(systemName: "circle.hexagongrid.fill")
                    .font(.system(size: 18))
                    .foregroundColor(.accentColor)
                    .frame(width: 32, height: 32)
                    .background(Color.accentColor.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)

            // Timer display
            HStack(spacing: 10) {
                // Status indicator (pulsing when running)
                Circle()
                    .fill(appState.timerState.isRunning ? Color.green : Color.secondary.opacity(0.4))
                    .frame(width: 8, height: 8)
                    .shadow(color: appState.timerState.isRunning ? .green.opacity(0.5) : .clear, radius: 3)

                // Time remaining
                Text(appState.timerState.formattedTime)
                    .font(.system(size: 18, weight: .medium, design: .monospaced))
                    .foregroundColor(.primary)

                // Mode indicator pill
                Text(appState.timerState.currentMode.shortName)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.secondary.opacity(0.12))
                    .clipShape(Capsule())
            }

            Spacer()

            // Quick controls
            HStack(spacing: 10) {
                // Music control button (KEPT - clickable improvement)
                Button(action: {
                    appState.musicPlayer.togglePlayPause()
                }) {
                    Image(systemName: appState.musicPlayer.isPlaying ? "speaker.wave.2.fill" : "speaker.slash.fill")
                        .font(.system(size: 12))
                        .foregroundColor(appState.musicPlayer.isPlaying ? .purple : .secondary)
                        .frame(width: 28, height: 28)
                        .background(Color.secondary.opacity(0.12))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)

                // Play/Pause button for timer
                Button(action: {
                    appState.timerState.toggle()
                }) {
                    Image(systemName: appState.timerState.isRunning ? "pause.fill" : "play.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(width: 32, height: 32)
                        .background(Color.accentColor)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)

                // Expand button
                Button(action: {
                    windowManager.toggleCollapse()
                }) {
                    Image(systemName: "arrow.up.left.and.arrow.down.right")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.secondary)
                        .frame(width: 28, height: 28)
                        .background(Color.secondary.opacity(0.12))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .frame(minWidth: 220, maxWidth: 400)
        .frame(height: 56)
    }

    // MARK: - Expanded View
    private var expandedView: some View {
        HStack(spacing: 0) {
            // Sidebar
            SidebarView()
                .frame(width: 64)

            // Main content
            mainContent
                .frame(minWidth: 260)
        }
        .frame(minWidth: 340, minHeight: 300)
    }

    // MARK: - Main Content
    @ViewBuilder
    private var mainContent: some View {
        VStack(spacing: 0) {
            // Header
            headerView
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, 8)

            Divider()
                .padding(.horizontal, 16)

            // Tab content
            tabContent
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    // MARK: - Header
    private var headerView: some View {
        HStack(spacing: 12) {
            Text(appState.selectedTab.rawValue)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(.primary)

            Spacer()

            // Collapse button
            Button(action: {
                windowManager.toggleCollapse()
            }) {
                Image(systemName: "minus")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.secondary)
                    .frame(width: 20, height: 20)
                    .background(Color.secondary.opacity(0.15))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
            .help("Collapse to mini player")
        }
    }

    // MARK: - Tab Content
    @ViewBuilder
    private var tabContent: some View {
        switch appState.selectedTab {
        case .music:
            MusicView()
        case .timer:
            TimerView()
        case .tasks:
            TasksView()
        case .notes:
            NotesView()
        case .account:
            if appState.isLoggedIn {
                AccountSettingsView()
            } else {
                AuthView()
            }
        }
    }
}

// MARK: - Visual Effect View (for blur background)
struct VisualEffectView: NSViewRepresentable {
    let material: NSVisualEffectView.Material
    let blendingMode: NSVisualEffectView.BlendingMode

    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.material = material
        view.blendingMode = blendingMode
        view.state = .active
        return view
    }

    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {
        nsView.material = material
        nsView.blendingMode = blendingMode
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}
