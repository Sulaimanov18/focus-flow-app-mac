import SwiftUI

struct MenuBarView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        VStack(spacing: 12) {
            // Timer status
            VStack(spacing: 4) {
                Text(appState.timerState.currentMode.rawValue)
                    .font(.caption)
                    .foregroundColor(.secondary)

                Text(appState.timerState.formattedTime)
                    .font(.system(size: 32, weight: .light, design: .monospaced))
                    .foregroundColor(.primary)
            }

            // Timer controls
            HStack(spacing: 16) {
                Button(action: {
                    if appState.timerState.isRunning {
                        appState.timerState.pause()
                    } else {
                        appState.timerState.start()
                    }
                }) {
                    Image(systemName: appState.timerState.isRunning ? "pause.fill" : "play.fill")
                        .font(.system(size: 20))
                }
                .buttonStyle(.plain)

                Button(action: {
                    appState.timerState.reset()
                }) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 16))
                }
                .buttonStyle(.plain)
            }

            Divider()

            // Quick mode switcher
            HStack(spacing: 8) {
                ForEach(TimerMode.allCases, id: \.self) { mode in
                    Button(action: {
                        appState.timerState.setMode(mode)
                    }) {
                        Text(mode.shortName)
                            .font(.caption2)
                            .foregroundColor(appState.timerState.currentMode == mode ? .white : .secondary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(
                                appState.timerState.currentMode == mode
                                    ? Color.accentColor
                                    : Color.secondary.opacity(0.2)
                            )
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }

            Divider()

            // Show main window button
            Button("Show Panel") {
                NSApplication.shared.activate(ignoringOtherApps: true)
                if let window = NSApplication.shared.windows.first(where: { $0.title == "" || $0.title == "FocusFlow" }) {
                    window.makeKeyAndOrderFront(nil)
                }
            }

            Button("Quit") {
                NSApplication.shared.terminate(nil)
            }
        }
        .padding()
        .frame(width: 200)
    }
}

#Preview {
    MenuBarView()
        .environmentObject(AppState())
}
