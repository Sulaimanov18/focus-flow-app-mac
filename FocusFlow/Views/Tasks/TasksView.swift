import SwiftUI

struct TasksView: View {
    @EnvironmentObject var appState: AppState
    @State private var newTaskText: String = ""
    @FocusState private var isInputFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            // Add task input
            taskInput
                .padding(.horizontal, 16)
                .padding(.vertical, 12)

            Divider()
                .padding(.horizontal, 16)

            // Task list
            if appState.tasks.isEmpty {
                emptyState
            } else {
                taskList
            }
        }
    }

    // MARK: - Task Input
    private var taskInput: some View {
        HStack(spacing: 8) {
            Image(systemName: "plus.circle.fill")
                .foregroundColor(.accentColor)
                .font(.system(size: 18))

            TextField("Add a task...", text: $newTaskText)
                .textFieldStyle(.plain)
                .font(.system(size: 13))
                .focused($isInputFocused)
                .onSubmit {
                    addTask()
                }
        }
        .padding(10)
        .background(Color.secondary.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Empty State
    private var emptyState: some View {
        VStack(spacing: 8) {
            Spacer()

            Image(systemName: "checklist")
                .font(.system(size: 40))
                .foregroundColor(.secondary.opacity(0.5))

            Text("No tasks yet")
                .font(.headline)
                .foregroundColor(.secondary)

            Text("Add a task above to get started")
                .font(.caption)
                .foregroundColor(.secondary.opacity(0.8))

            Spacer()
        }
    }

    // MARK: - Task List
    private var taskList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(sortedTasks) { task in
                    TaskRow(task: task, onToggle: {
                        toggleTask(task)
                    }, onDelete: {
                        deleteTask(task)
                    })
                }
            }
            .padding(.vertical, 8)
        }
    }

    // MARK: - Sorted Tasks
    private var sortedTasks: [TaskItem] {
        appState.tasks.sorted { task1, task2 in
            // Sort incomplete tasks first, then by creation date (newest first)
            if task1.isDone != task2.isDone {
                return !task1.isDone
            }
            return task1.createdAt > task2.createdAt
        }
    }

    // MARK: - Actions
    private func addTask() {
        let trimmed = newTaskText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        let task = TaskItem(title: trimmed)
        appState.tasks.append(task)
        appState.saveTasks()
        newTaskText = ""
    }

    private func toggleTask(_ task: TaskItem) {
        if let index = appState.tasks.firstIndex(where: { $0.id == task.id }) {
            appState.tasks[index].toggleDone()
            appState.saveTasks()
        }
    }

    private func deleteTask(_ task: TaskItem) {
        appState.tasks.removeAll { $0.id == task.id }
        appState.saveTasks()
    }
}

// MARK: - Task Row
struct TaskRow: View {
    let task: TaskItem
    let onToggle: () -> Void
    let onDelete: () -> Void

    @State private var isHovering = false

    var body: some View {
        HStack(spacing: 12) {
            // Checkbox
            Button(action: onToggle) {
                Image(systemName: task.isDone ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 18))
                    .foregroundColor(task.isDone ? .green : .secondary)
            }
            .buttonStyle(.plain)

            // Task title
            Text(task.title)
                .font(.system(size: 13))
                .foregroundColor(task.isDone ? .secondary : .primary)
                .strikethrough(task.isDone, color: .secondary)
                .lineLimit(2)

            Spacer()

            // Delete button (visible on hover)
            if isHovering {
                Button(action: onDelete) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                }
                .buttonStyle(.plain)
                .transition(.opacity)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(isHovering ? Color.secondary.opacity(0.05) : Color.clear)
        .contentShape(Rectangle())
        .onHover { hovering in
            withAnimation(.easeInOut(duration: 0.15)) {
                isHovering = hovering
            }
        }
    }
}

#Preview {
    TasksView()
        .environmentObject(AppState())
        .frame(width: 280, height: 350)
}
