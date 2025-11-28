import SwiftUI
import AppKit
import UserNotifications
import Combine

@main
struct FocusFlowApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
        }
        .windowStyle(.hiddenTitleBar)
        .windowResizability(.contentMinSize)
        .defaultSize(width: 340, height: 450)

        // Menu bar extra for quick access
        MenuBarExtra {
            MenuBarView()
                .environmentObject(appState)
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "timer")
                if appState.timerState.isRunning {
                    Text(appState.timerState.formattedTime)
                        .font(.system(size: 11, weight: .medium, design: .monospaced))
                }
            }
        }
        .menuBarExtraStyle(.window)
    }
}

// MARK: - App Delegate
class AppDelegate: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem?

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Configure app window
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            self.configureWindow()
        }

        // Request notification permissions
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                print("Notification permission error: \(error)")
            }
        }
    }

    private func configureWindow() {
        guard let window = NSApplication.shared.windows.first else { return }

        // Window behavior
        window.level = .floating
        window.styleMask.insert(.fullSizeContentView)
        window.styleMask.insert(.resizable)
        window.isMovableByWindowBackground = true
        window.backgroundColor = .clear
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden

        // Min/Max sizes
        window.minSize = NSSize(width: 340, height: 200)
        window.maxSize = NSSize(width: 600, height: 800)

        // Restore saved position
        if let savedFrame = UserDefaults.standard.string(forKey: "windowFrame") {
            window.setFrame(from: savedFrame)
        }

        // Save position when window moves
        NotificationCenter.default.addObserver(
            forName: NSWindow.didMoveNotification,
            object: window,
            queue: .main
        ) { _ in
            UserDefaults.standard.set(window.frameDescriptor, forKey: "windowFrame")
        }

        // Save size when window resizes
        NotificationCenter.default.addObserver(
            forName: NSWindow.didResizeNotification,
            object: window,
            queue: .main
        ) { _ in
            UserDefaults.standard.set(window.frameDescriptor, forKey: "windowFrame")
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return false // Keep running in menu bar
    }
}

// ============================================================================
// MARK: - Window Position Manager
// ============================================================================
// Controls the expand/collapse sizing of the widget.
//
// COLLAPSED STATE SIZING (adjust these values):
// - collapsedWidth: 280 (wider strip for better visibility)
// - collapsedHeight: 56 (slim height)
//
// EXPANDED STATE SIZING (adjust these values):
// - expandedWidth: 360 (full panel width)
// - expandedHeight: 480 (full panel height)
// ============================================================================

class WindowManager: ObservableObject {
    static let shared = WindowManager()

    // ========================================================================
    // COLLAPSED STATE SIZE - Change these to adjust collapsed widget size
    // ========================================================================
    private let collapsedWidth: CGFloat = 380   // Wider strip
    private let collapsedHeight: CGFloat = 60   // Slim height
    private let collapsedMinWidth: CGFloat = 320
    private let collapsedMaxWidth: CGFloat = 500

    // ========================================================================
    // EXPANDED STATE SIZE - Change these to adjust expanded widget size
    // ========================================================================
    private let expandedWidth: CGFloat = 360    // Full panel width
    private let expandedHeight: CGFloat = 480   // Full panel height
    private let expandedMinWidth: CGFloat = 340
    private let expandedMinHeight: CGFloat = 350
    private let expandedMaxWidth: CGFloat = 550
    private let expandedMaxHeight: CGFloat = 700

    @Published var isCollapsed: Bool = false {
        didSet {
            UserDefaults.standard.set(isCollapsed, forKey: "isCollapsed")
            updateWindowSize()
        }
    }

    init() {
        isCollapsed = UserDefaults.standard.bool(forKey: "isCollapsed")
    }

    func updateWindowSize() {
        guard let window = NSApplication.shared.windows.first else { return }

        let currentFrame = window.frame

        if isCollapsed {
            // ================================================================
            // COLLAPSED: Wide strip with low height
            // Similar to: w-72 h-16 (Tailwind) but wider
            // ================================================================
            let newFrame = NSRect(
                x: currentFrame.origin.x,
                y: currentFrame.origin.y + currentFrame.height - collapsedHeight,
                width: collapsedWidth,
                height: collapsedHeight
            )
            window.setFrame(newFrame, display: true, animate: true)
            window.minSize = NSSize(width: collapsedMinWidth, height: collapsedHeight)
            window.maxSize = NSSize(width: collapsedMaxWidth, height: collapsedHeight)
        } else {
            // ================================================================
            // EXPANDED: Full panel
            // Similar to: w-80 h-96 (Tailwind)
            // ================================================================
            let newFrame = NSRect(
                x: currentFrame.origin.x,
                y: currentFrame.origin.y + currentFrame.height - expandedHeight,
                width: expandedWidth,
                height: expandedHeight
            )
            window.setFrame(newFrame, display: true, animate: true)
            window.minSize = NSSize(width: expandedMinWidth, height: expandedMinHeight)
            window.maxSize = NSSize(width: expandedMaxWidth, height: expandedMaxHeight)
        }
    }

    func toggleCollapse() {
        print("🔄 [WINDOW] toggleCollapse called, current state: \(isCollapsed ? "collapsed" : "expanded")")
        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
            isCollapsed.toggle()
        }
        print("✅ [WINDOW] New state: \(isCollapsed ? "collapsed" : "expanded")")
    }
}

// MARK: - App State
class AppState: ObservableObject {
    @Published var selectedTab: SidebarTab = .timer
    @Published var isLoggedIn: Bool = false
    @Published var currentUser: User?

    // Sub-states - Timer and Music live here so they persist across UI changes
    @Published var timerState: TimerState
    @Published var musicPlayer: MusicPlayer
    @Published var tasks: [TaskItem] = []
    @Published var notes: String = ""

    // Window manager
    let windowManager = WindowManager.shared
    
    // Store cancellables for child object subscriptions
    private var cancellables = Set<AnyCancellable>()

    init() {
        print("🚀 [APP] AppState initializing")
        
        self.timerState = TimerState()
        self.musicPlayer = MusicPlayer()
        
        // CRITICAL FIX: Subscribe to nested ObservableObject changes
        // When timerState changes internally, notify AppState so SwiftUI re-renders
        timerState.objectWillChange.sink { [weak self] _ in
            print("🔔 [APP] TimerState changed, triggering AppState update")
            self?.objectWillChange.send()
        }.store(in: &cancellables)
        
        musicPlayer.objectWillChange.sink { [weak self] _ in
            print("🔔 [APP] MusicPlayer changed, triggering AppState update")
            self?.objectWillChange.send()
        }.store(in: &cancellables)
        
        print("✅ [APP] AppState initialized with child subscriptions")
        
        loadLocalData()
    }

    func loadLocalData() {
        // Load tasks from UserDefaults
        if let data = UserDefaults.standard.data(forKey: "tasks"),
           let decoded = try? JSONDecoder().decode([TaskItem].self, from: data) {
            tasks = decoded
        }

        // Load notes from UserDefaults
        notes = UserDefaults.standard.string(forKey: "notes") ?? ""
    }

    func saveTasks() {
        if let encoded = try? JSONEncoder().encode(tasks) {
            UserDefaults.standard.set(encoded, forKey: "tasks")
        }
    }

    func saveNotes() {
        UserDefaults.standard.set(notes, forKey: "notes")
    }
}

// MARK: - Sidebar Tab
enum SidebarTab: String, CaseIterable {
    case music = "Music"
    case timer = "Timer"
    case tasks = "Tasks"
    case notes = "Notes"
    case account = "Account"

    var icon: String {
        switch self {
        case .music: return "speaker.wave.2"
        case .timer: return "timer"
        case .tasks: return "checklist"
        case .notes: return "note.text"
        case .account: return "person.circle"
        }
    }
}
