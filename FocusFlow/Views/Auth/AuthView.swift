import SwiftUI

struct AuthView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var supabase = SupabaseService.shared

    @State private var isSignUp = false
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""

    var body: some View {
        VStack(spacing: 20) {
            // Header
            VStack(spacing: 8) {
                Image(systemName: "timer")
                    .font(.system(size: 40))
                    .foregroundColor(.accentColor)

                Text("FocusFlow")
                    .font(.title2)
                    .fontWeight(.bold)

                Text(isSignUp ? "Create your account" : "Welcome back")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding(.top, 20)

            // Form
            VStack(spacing: 12) {
                TextField("Email", text: $email)
                    .textFieldStyle(.roundedBorder)

                SecureField("Password", text: $password)
                    .textFieldStyle(.roundedBorder)

                if isSignUp {
                    SecureField("Confirm Password", text: $confirmPassword)
                        .textFieldStyle(.roundedBorder)
                }
            }
            .padding(.horizontal)

            // Error message
            if let error = supabase.errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            // Action button
            Button(action: performAuth) {
                HStack {
                    if supabase.isLoading {
                        ProgressView()
                            .scaleEffect(0.8)
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    }
                    Text(isSignUp ? "Sign Up" : "Sign In")
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(Color.accentColor)
                .foregroundColor(.white)
                .cornerRadius(8)
            }
            .buttonStyle(.plain)
            .disabled(!isFormValid || supabase.isLoading)
            .opacity(isFormValid ? 1 : 0.6)
            .padding(.horizontal)

            // Toggle sign up / sign in
            Button(action: { isSignUp.toggle() }) {
                Text(isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up")
                    .font(.caption)
                    .foregroundColor(.accentColor)
            }
            .buttonStyle(.plain)

            Spacer()

            // Skip button (use offline)
            Button(action: skipAuth) {
                Text("Continue without account")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .buttonStyle(.plain)
            .padding(.bottom, 20)
        }
        .frame(width: 280)
        .onChange(of: supabase.isAuthenticated) { authenticated in
            if authenticated {
                appState.isLoggedIn = true
                if let user = supabase.currentUser {
                    appState.currentUser = User(
                        id: user.id,
                        email: user.email ?? ""
                    )
                }
                // Sync data from cloud
                Task {
                    await syncFromCloud()
                }
            }
        }
    }

    private var isFormValid: Bool {
        let emailValid = email.contains("@") && email.contains(".")
        let passwordValid = password.count >= 6

        if isSignUp {
            return emailValid && passwordValid && password == confirmPassword
        }
        return emailValid && passwordValid
    }

    private func performAuth() {
        Task {
            do {
                if isSignUp {
                    try await supabase.signUp(email: email, password: password)
                } else {
                    try await supabase.signIn(email: email, password: password)
                }
            } catch {
                print("Auth error: \(error)")
            }
        }
    }

    private func skipAuth() {
        appState.isLoggedIn = false
        appState.selectedTab = .timer
    }

    @MainActor
    private func syncFromCloud() async {
        do {
            // Fetch tasks
            let cloudTasks = try await supabase.fetchTasks()
            if !cloudTasks.isEmpty {
                appState.tasks = cloudTasks
                appState.saveTasks()
            }

            // Fetch notes
            let cloudNotes = try await supabase.fetchNotes()
            if !cloudNotes.isEmpty {
                appState.notes = cloudNotes
                appState.saveNotes()
            }
        } catch {
            print("Sync error: \(error)")
        }
    }
}

// MARK: - Account Settings View
struct AccountSettingsView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var supabase = SupabaseService.shared
    @State private var showingLogoutConfirm = false

    var body: some View {
        VStack(spacing: 16) {
            // User info
            if let user = appState.currentUser {
                VStack(spacing: 8) {
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.accentColor)

                    Text(user.email)
                        .font(.headline)

                    Text("Syncing to cloud")
                        .font(.caption)
                        .foregroundColor(.green)
                }
                .padding()
            }

            Divider()

            // Sync status
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("Tasks synced")
                    Spacer()
                    Text("\(appState.tasks.count) items")
                        .foregroundColor(.secondary)
                }

                HStack {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                    Text("Notes synced")
                    Spacer()
                }
            }
            .font(.subheadline)
            .padding(.horizontal)

            Spacer()

            // Logout button
            Button(action: { showingLogoutConfirm = true }) {
                HStack {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                    Text("Sign Out")
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(Color.red.opacity(0.1))
                .foregroundColor(.red)
                .cornerRadius(8)
            }
            .buttonStyle(.plain)
            .padding(.horizontal)
            .padding(.bottom, 20)
            .alert("Sign Out", isPresented: $showingLogoutConfirm) {
                Button("Cancel", role: .cancel) { }
                Button("Sign Out", role: .destructive) {
                    supabase.signOut()
                    appState.isLoggedIn = false
                    appState.currentUser = nil
                }
            } message: {
                Text("Are you sure you want to sign out? Your local data will be preserved.")
            }
        }
    }
}
