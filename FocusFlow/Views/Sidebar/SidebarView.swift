import SwiftUI

struct SidebarView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        VStack(spacing: 8) {
            // Logo at top
            logoButton
                .padding(.top, 16)
                .padding(.bottom, 8)

            // Tab buttons
            VStack(spacing: 4) {
                ForEach(SidebarTab.allCases, id: \.self) { tab in
                    SidebarButton(
                        tab: tab,
                        isSelected: appState.selectedTab == tab
                    ) {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            appState.selectedTab = tab
                        }
                    }
                }
            }

            Spacer()

            // Timer status indicator (when timer is running)
            if appState.timerState.isRunning && appState.selectedTab != .timer {
                timerIndicator
                    .padding(.bottom, 8)
            }
        }
        .frame(maxHeight: .infinity)
        .background(Color.black.opacity(0.08))
    }

    // MARK: - Logo Button
    private var logoButton: some View {
        Button(action: {
            // Could be used for settings or about
        }) {
            Image(systemName: "circle.hexagongrid.fill")
                .font(.system(size: 22))
                .foregroundColor(.accentColor)
                .frame(width: 44, height: 44)
                .background(Color.accentColor.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Timer Indicator
    private var timerIndicator: some View {
        VStack(spacing: 4) {
            // Pulsing dot
            Circle()
                .fill(Color.green)
                .frame(width: 8, height: 8)
                .shadow(color: .green.opacity(0.5), radius: 4)

            // Time
            Text(appState.timerState.formattedTime)
                .font(.system(size: 9, weight: .medium, design: .monospaced))
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 4)
        .background(Color.green.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

// MARK: - Sidebar Button
struct SidebarButton: View {
    let tab: SidebarTab
    let isSelected: Bool
    let action: () -> Void

    @State private var isHovering = false

    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: tab.icon)
                    .font(.system(size: 18, weight: isSelected ? .semibold : .regular))
                    .foregroundColor(isSelected ? .accentColor : .secondary)

                Text(tab.rawValue)
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(isSelected ? .accentColor : .secondary)
            }
            .frame(width: 52, height: 52)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(backgroundColor)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isSelected ? Color.accentColor.opacity(0.3) : Color.clear, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .onHover { hovering in
            withAnimation(.easeInOut(duration: 0.15)) {
                isHovering = hovering
            }
        }
    }

    private var backgroundColor: Color {
        if isSelected {
            return Color.accentColor.opacity(0.15)
        } else if isHovering {
            return Color.secondary.opacity(0.1)
        } else {
            return Color.clear
        }
    }
}

#Preview {
    SidebarView()
        .environmentObject(AppState())
        .frame(width: 64, height: 400)
}
