import Foundation
import Combine
import UserNotifications

// ============================================================================
// MARK: - Timer Mode
// ============================================================================

enum TimerMode: String, CaseIterable, Codable {
    case pomodoro = "Pomodoro"
    case shortBreak = "Short Break"
    case longBreak = "Long Break"

    var duration: TimeInterval {
        switch self {
        case .pomodoro: return 25 * 60    // 25 minutes
        case .shortBreak: return 5 * 60   // 5 minutes
        case .longBreak: return 15 * 60   // 15 minutes
        }
    }

    var shortName: String {
        switch self {
        case .pomodoro: return "Focus"
        case .shortBreak: return "Short"
        case .longBreak: return "Long"
        }
    }

    var notificationTitle: String {
        switch self {
        case .pomodoro: return "Focus session complete!"
        case .shortBreak: return "Short break over"
        case .longBreak: return "Long break over"
        }
    }

    var notificationBody: String {
        switch self {
        case .pomodoro: return "Great work! Time for a break."
        case .shortBreak: return "Ready to focus again?"
        case .longBreak: return "Refreshed? Let's get back to work!"
        }
    }
}

// ============================================================================
// MARK: - Timer State (Time-Based with targetEndTime)
// ============================================================================
// Uses targetEndTime approach for accurate timing:
// - When started: targetEndTime = Date() + secondsLeft
// - On each tick: secondsLeft = max(0, targetEndTime - now)
// - This ensures accurate time regardless of UI state
// ============================================================================

class TimerState: ObservableObject {
    @Published var currentMode: TimerMode = .pomodoro
    @Published var secondsLeft: TimeInterval = 25 * 60
    @Published var isRunning: Bool = false
    @Published var completedPomodoros: Int = 0

    // Time-based approach: store the target end time
    private var targetEndTime: Date?

    // Timer for UI updates
    private var displayTimer: Timer?

    var formattedTime: String {
        let totalSeconds = max(0, Int(round(secondsLeft)))
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    var progress: Double {
        let total = currentMode.duration
        guard total > 0 else { return 0 }
        return 1.0 - (secondsLeft / total)
    }

    init() {
        secondsLeft = currentMode.duration
    }

    deinit {
        displayTimer?.invalidate()
    }

    // MARK: - Timer Controls

    func setMode(_ mode: TimerMode) {
        print("🔄 [TIMER] setMode called: \(mode.rawValue)")
        
        // Stop current timer
        stopTimer()

        // Update mode and reset duration
        currentMode = mode
        secondsLeft = mode.duration
        isRunning = false
        targetEndTime = nil

        print("✅ [TIMER] Mode set to \(mode.rawValue), duration: \(Int(secondsLeft))s, isRunning: \(isRunning)")
        
        // Force UI update
        objectWillChange.send()
        print("📢 [TIMER] UI update triggered after mode change")
    }

    func toggle() {
        if isRunning {
            pause()
        } else {
            start()
        }
    }

    func start() {
        guard !isRunning else {
            print("⚠️ [TIMER] start() called but already running")
            return
        }

        print("▶️ [TIMER] Starting timer with \(Int(secondsLeft))s remaining")
        
        // Calculate target end time based on remaining seconds
        targetEndTime = Date().addingTimeInterval(secondsLeft)
        isRunning = true

        print("⏰ [TIMER] Target end time: \(targetEndTime!)")
        
        // Force immediate UI update before starting timer
        objectWillChange.send()
        print("📢 [TIMER] UI update triggered after start")

        // Start the display timer (this also calls tick() immediately)
        startDisplayTimer()
    }

    func pause() {
        print("⏸️ [TIMER] Pausing timer")
        
        // Update secondsLeft to current remaining time before pausing
        if let endTime = targetEndTime {
            secondsLeft = max(0, endTime.timeIntervalSince(Date()))
            print("💾 [TIMER] Saved remaining time: \(Int(secondsLeft))s")
        }

        stopTimer()
        isRunning = false
        targetEndTime = nil

        print("✅ [TIMER] Paused, isRunning: \(isRunning)")
        
        // Force UI update
        objectWillChange.send()
        print("📢 [TIMER] UI update triggered after pause")
    }

    func reset() {
        print("🔄 [TIMER] Resetting timer")
        
        stopTimer()
        isRunning = false
        secondsLeft = currentMode.duration
        targetEndTime = nil

        print("✅ [TIMER] Reset complete, duration: \(Int(secondsLeft))s, isRunning: \(isRunning)")
        
        // Force UI update
        objectWillChange.send()
        print("📢 [TIMER] UI update triggered after reset")
    }

    // MARK: - Display Timer (fires every second for UI updates)

    private func startDisplayTimer() {
        // Invalidate any existing timer
        displayTimer?.invalidate()

        print("⏱️ [TIMER] Starting display timer (1s interval)")
        
        // Create a new timer that fires every 1 second
        displayTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.tick()
        }

        // Add to common run loop so it runs during UI interactions
        if let timer = displayTimer {
            RunLoop.main.add(timer, forMode: .common)
            print("✅ [TIMER] Display timer added to run loop")
        }

        // Fire immediately to update UI right away
        print("🎯 [TIMER] Firing initial tick")
        tick()
    }

    private func stopTimer() {
        displayTimer?.invalidate()
        displayTimer = nil
    }

    private func tick() {
        guard isRunning, let endTime = targetEndTime else { return }

        // Calculate remaining time from target end time (not by decrementing)
        let remaining = endTime.timeIntervalSince(Date())
        let newSecondsLeft = max(0, remaining)

        // Check if timer completed first
        if newSecondsLeft <= 0 {
            print("⏰ [TIMER] Timer completed!")
            complete()
            return
        }

        // Update secondsLeft - always update to ensure smooth ticking
        // Compare whole seconds to trigger UI update every second
        let oldWholeSeconds = Int(secondsLeft)
        let newWholeSeconds = Int(newSecondsLeft)

        secondsLeft = newSecondsLeft

        // Force UI update when the displayed second changes
        if oldWholeSeconds != newWholeSeconds {
            print("⏱️ [TIMER] Tick: \(formattedTime) (\(Int(secondsLeft))s remaining)")
            objectWillChange.send()
        }
    }

    private func complete() {
        print("🎉 [TIMER] Timer complete for mode: \(currentMode.rawValue)")
        
        stopTimer()
        isRunning = false
        secondsLeft = 0
        targetEndTime = nil

        if currentMode == .pomodoro {
            completedPomodoros += 1
            print("✅ [TIMER] Pomodoro completed! Total: \(completedPomodoros)")
        }

        // Force UI update
        objectWillChange.send()
        print("📢 [TIMER] UI update triggered after completion")

        sendNotification()
    }

    private func sendNotification() {
        let content = UNMutableNotificationContent()
        content.title = currentMode.notificationTitle
        content.body = currentMode.notificationBody
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )

        UNUserNotificationCenter.current().add(request)
    }
}
