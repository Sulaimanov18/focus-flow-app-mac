import Foundation

// MARK: - Task Item
struct TaskItem: Identifiable, Codable, Equatable {
    let id: UUID
    var title: String
    var isDone: Bool
    var createdAt: Date
    var updatedAt: Date

    init(id: UUID = UUID(), title: String, isDone: Bool = false) {
        self.id = id
        self.title = title
        self.isDone = isDone
        self.createdAt = Date()
        self.updatedAt = Date()
    }

    mutating func toggleDone() {
        isDone.toggle()
        updatedAt = Date()
    }

    mutating func updateTitle(_ newTitle: String) {
        title = newTitle
        updatedAt = Date()
    }
}

// MARK: - User Model
struct User: Codable, Identifiable {
    let id: String
    var email: String
    var displayName: String?
    var pomodoroLength: Int = 25
    var shortBreakLength: Int = 5
    var longBreakLength: Int = 15
    var createdAt: Date

    init(id: String, email: String, displayName: String? = nil) {
        self.id = id
        self.email = email
        self.displayName = displayName
        self.createdAt = Date()
    }
}

// MARK: - Pomodoro Session (for stats)
struct PomodoroSession: Codable, Identifiable {
    let id: UUID
    let userId: String
    let startedAt: Date
    var endedAt: Date?
    let type: TimerMode

    init(userId: String, type: TimerMode) {
        self.id = UUID()
        self.userId = userId
        self.startedAt = Date()
        self.type = type
    }

    enum CodingKeys: String, CodingKey {
        case id, userId, startedAt, endedAt, type
    }
}
