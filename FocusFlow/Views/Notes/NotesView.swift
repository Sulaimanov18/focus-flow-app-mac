import SwiftUI

struct NotesView: View {
    @EnvironmentObject var appState: AppState
    @State private var saveTimer: Timer?

    var body: some View {
        VStack(spacing: 0) {
            // Notes text editor
            TextEditor(text: $appState.notes)
                .font(.system(size: 13))
                .scrollContentBackground(.hidden)
                .background(Color.clear)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .onChange(of: appState.notes) { _ in
                    scheduleAutoSave()
                }

            Spacer(minLength: 0)

            // Footer with word count
            HStack {
                Text("\(wordCount) words")
                    .font(.caption2)
                    .foregroundColor(.secondary)

                Spacer()

                Text("Auto-saved")
                    .font(.caption2)
                    .foregroundColor(.secondary.opacity(0.7))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Color.secondary.opacity(0.05))
        }
    }

    // MARK: - Word Count
    private var wordCount: Int {
        appState.notes
            .split { $0.isWhitespace || $0.isNewline }
            .count
    }

    // MARK: - Auto Save
    private func scheduleAutoSave() {
        // Cancel existing timer
        saveTimer?.invalidate()

        // Schedule new save after 1 second of inactivity
        saveTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: false) { _ in
            appState.saveNotes()
        }
    }
}

#Preview {
    NotesView()
        .environmentObject(AppState())
        .frame(width: 280, height: 350)
}
