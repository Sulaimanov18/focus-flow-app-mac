import SwiftUI

struct TimerView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 0) {
                Spacer(minLength: 16)

                // Timer display
                timerDisplay(size: geometry.size)

                Spacer(minLength: 12)

                // Mode selector
                modeSelector
                    .padding(.horizontal, 16)

                Spacer(minLength: 16)

                // Controls
                controlButtons
                    .padding(.horizontal, 24)

                Spacer(minLength: 20)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .padding(.horizontal, 8)
    }

    // MARK: - Timer Display
    private func timerDisplay(size: CGSize) -> some View {
        let circleSize = min(size.width * 0.55, size.height * 0.45, 160)

        return VStack(spacing: 12) {
            // Circular progress
            ZStack {
                // Background circle
                Circle()
                    .stroke(Color.secondary.opacity(0.15), lineWidth: 8)
                    .frame(width: circleSize, height: circleSize)

                // Progress circle
                Circle()
                    .trim(from: 0, to: appState.timerState.progress)
                    .stroke(
                        progressColor,
                        style: StrokeStyle(lineWidth: 8, lineCap: .round)
                    )
                    .frame(width: circleSize, height: circleSize)
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 0.5), value: appState.timerState.progress)

                // Time text
                VStack(spacing: 4) {
                    Text(appState.timerState.formattedTime)
                        .font(.system(size: circleSize * 0.26, weight: .light, design: .monospaced))
                        .foregroundColor(.primary)

                    Text(appState.timerState.currentMode.rawValue)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.secondary)
                }
            }

            // Completed pomodoros
            pomodoroIndicators
        }
    }

    private var progressColor: Color {
        switch appState.timerState.currentMode {
        case .pomodoro:
            return Color.accentColor
        case .shortBreak:
            return Color.green
        case .longBreak:
            return Color.blue
        }
    }

    // Convenience accessor for secondsLeft (renamed from remainingTime)
    private var secondsLeft: TimeInterval {
        appState.timerState.secondsLeft
    }

    // MARK: - Pomodoro Indicators
    private var pomodoroIndicators: some View {
        Group {
            if appState.timerState.completedPomodoros > 0 {
                HStack(spacing: 6) {
                    ForEach(0..<min(appState.timerState.completedPomodoros, 4), id: \.self) { _ in
                        Circle()
                            .fill(Color.accentColor)
                            .frame(width: 8, height: 8)
                    }
                    if appState.timerState.completedPomodoros > 4 {
                        Text("+\(appState.timerState.completedPomodoros - 4)")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.top, 4)
            }
        }
    }

    // MARK: - Mode Selector
    private var modeSelector: some View {
        HStack(spacing: 8) {
            ForEach(TimerMode.allCases, id: \.self) { mode in
                ModeButton(
                    mode: mode,
                    isSelected: appState.timerState.currentMode == mode
                ) {
                    appState.timerState.setMode(mode)
                }
            }
        }
    }

    // MARK: - Control Buttons
    private var controlButtons: some View {
        HStack(spacing: 24) {
            // Reset button
            ControlButton(
                icon: "arrow.clockwise",
                size: .medium,
                style: .secondary
            ) {
                appState.timerState.reset()
            }

            // Play/Pause button
            ControlButton(
                icon: appState.timerState.isRunning ? "pause.fill" : "play.fill",
                size: .large,
                style: .primary
            ) {
                if appState.timerState.isRunning {
                    appState.timerState.pause()
                } else {
                    appState.timerState.start()
                }
            }

            // Skip button
            ControlButton(
                icon: "forward.fill",
                size: .medium,
                style: .secondary
            ) {
                skipToNext()
            }
        }
    }

    // MARK: - Actions
    private func skipToNext() {
        switch appState.timerState.currentMode {
        case .pomodoro:
            if appState.timerState.completedPomodoros > 0 && appState.timerState.completedPomodoros % 4 == 0 {
                appState.timerState.setMode(.longBreak)
            } else {
                appState.timerState.setMode(.shortBreak)
            }
        case .shortBreak, .longBreak:
            appState.timerState.setMode(.pomodoro)
        }
    }
}

// MARK: - Mode Button
struct ModeButton: View {
    let mode: TimerMode
    let isSelected: Bool
    let action: () -> Void

    @State private var isHovering = false

    var body: some View {
        Button(action: action) {
            Text(mode.shortName)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(isSelected ? .white : .secondary)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(isSelected ? Color.accentColor : (isHovering ? Color.secondary.opacity(0.15) : Color.secondary.opacity(0.1)))
                )
        }
        .buttonStyle(.plain)
        .onHover { hovering in
            withAnimation(.easeInOut(duration: 0.1)) {
                isHovering = hovering
            }
        }
    }
}

// MARK: - Control Button
struct ControlButton: View {
    enum Size {
        case small, medium, large

        var dimension: CGFloat {
            switch self {
            case .small: return 36
            case .medium: return 44
            case .large: return 56
            }
        }

        var iconSize: CGFloat {
            switch self {
            case .small: return 14
            case .medium: return 16
            case .large: return 22
            }
        }
    }

    enum Style {
        case primary, secondary
    }

    let icon: String
    let size: Size
    let style: Style
    let action: () -> Void

    @State private var isHovering = false
    @State private var isPressed = false

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: size.iconSize, weight: .semibold))
                .foregroundColor(style == .primary ? .white : .secondary)
                .frame(width: size.dimension, height: size.dimension)
                .background(
                    Circle()
                        .fill(backgroundColor)
                )
                .overlay(
                    Circle()
                        .stroke(style == .primary ? Color.clear : Color.secondary.opacity(0.2), lineWidth: 1)
                )
                .scaleEffect(isPressed ? 0.95 : 1.0)
        }
        .buttonStyle(.plain)
        .onHover { hovering in
            withAnimation(.easeInOut(duration: 0.1)) {
                isHovering = hovering
            }
        }
    }

    private var backgroundColor: Color {
        if style == .primary {
            return isHovering ? Color.accentColor.opacity(0.9) : Color.accentColor
        } else {
            return isHovering ? Color.secondary.opacity(0.2) : Color.secondary.opacity(0.1)
        }
    }
}

#Preview {
    TimerView()
        .environmentObject(AppState())
        .frame(width: 280, height: 400)
}
