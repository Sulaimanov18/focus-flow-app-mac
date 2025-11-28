import Foundation
import Security

// MARK: - Supabase Configuration
struct SupabaseConfig {
    static let projectURL = "https://ruurweewhfxzhvrhrcig.supabase.co"
    static let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dXJ3ZWV3aGZ4emh2cmhyY2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNTk2MTEsImV4cCI6MjA3OTgzNTYxMX0.a6WWSop-WtFcy0G_dHE4zIxVXKeV61Yd7Nrb5oQYRG4"
}

// MARK: - API Errors
enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case networkError(Error)
    case decodingError(Error)
    case serverError(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .invalidResponse: return "Invalid response from server"
        case .unauthorized: return "Unauthorized - please log in again"
        case .networkError(let error): return "Network error: \(error.localizedDescription)"
        case .decodingError(let error): return "Data error: \(error.localizedDescription)"
        case .serverError(let message): return message
        }
    }
}

// MARK: - Auth Response Models
struct AuthResponse: Codable {
    let accessToken: String
    let tokenType: String
    let expiresIn: Int
    let refreshToken: String
    let user: SupabaseUser

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case tokenType = "token_type"
        case expiresIn = "expires_in"
        case refreshToken = "refresh_token"
        case user
    }
}

struct SupabaseUser: Codable {
    let id: String
    let email: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case createdAt = "created_at"
    }
}

struct AuthErrorResponse: Codable {
    let error: String?
    let errorDescription: String?
    let message: String?

    enum CodingKeys: String, CodingKey {
        case error
        case errorDescription = "error_description"
        case message
    }
}

// MARK: - Supabase Service
class SupabaseService: ObservableObject {
    static let shared = SupabaseService()

    @Published var isAuthenticated: Bool = false
    @Published var currentUser: SupabaseUser?
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    private var accessToken: String? {
        didSet {
            if let token = accessToken {
                KeychainHelper.save(key: "accessToken", value: token)
            } else {
                KeychainHelper.delete(key: "accessToken")
            }
        }
    }

    private var refreshToken: String? {
        didSet {
            if let token = refreshToken {
                KeychainHelper.save(key: "refreshToken", value: token)
            } else {
                KeychainHelper.delete(key: "refreshToken")
            }
        }
    }

    private init() {
        // Load saved tokens
        accessToken = KeychainHelper.load(key: "accessToken")
        refreshToken = KeychainHelper.load(key: "refreshToken")

        if accessToken != nil {
            isAuthenticated = true
            // Optionally fetch user profile
            Task {
                await fetchCurrentUser()
            }
        }
    }

    // MARK: - Authentication

    @MainActor
    func signUp(email: String, password: String) async throws {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        let url = URL(string: "\(SupabaseConfig.projectURL)/auth/v1/signup")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")

        let body = ["email": email, "password": password]
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        if httpResponse.statusCode == 200 || httpResponse.statusCode == 201 {
            let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)
            self.accessToken = authResponse.accessToken
            self.refreshToken = authResponse.refreshToken
            self.currentUser = authResponse.user
            self.isAuthenticated = true
        } else {
            if let errorResponse = try? JSONDecoder().decode(AuthErrorResponse.self, from: data) {
                let message = errorResponse.errorDescription ?? errorResponse.message ?? errorResponse.error ?? "Sign up failed"
                self.errorMessage = message
                throw APIError.serverError(message)
            }
            throw APIError.serverError("Sign up failed with status \(httpResponse.statusCode)")
        }
    }

    @MainActor
    func signIn(email: String, password: String) async throws {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        let url = URL(string: "\(SupabaseConfig.projectURL)/auth/v1/token?grant_type=password")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")

        let body = ["email": email, "password": password]
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        if httpResponse.statusCode == 200 {
            let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)
            self.accessToken = authResponse.accessToken
            self.refreshToken = authResponse.refreshToken
            self.currentUser = authResponse.user
            self.isAuthenticated = true
        } else {
            if let errorResponse = try? JSONDecoder().decode(AuthErrorResponse.self, from: data) {
                let message = errorResponse.errorDescription ?? errorResponse.message ?? errorResponse.error ?? "Sign in failed"
                self.errorMessage = message
                throw APIError.serverError(message)
            }
            throw APIError.serverError("Sign in failed with status \(httpResponse.statusCode)")
        }
    }

    @MainActor
    func signOut() {
        accessToken = nil
        refreshToken = nil
        currentUser = nil
        isAuthenticated = false
    }

    @MainActor
    func fetchCurrentUser() async {
        guard let token = accessToken else { return }

        let url = URL(string: "\(SupabaseConfig.projectURL)/auth/v1/user")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                // Token might be expired
                isAuthenticated = false
                return
            }

            let user = try JSONDecoder().decode(SupabaseUser.self, from: data)
            self.currentUser = user
        } catch {
            print("Failed to fetch user: \(error)")
        }
    }

    // MARK: - Data Operations

    func fetchTasks() async throws -> [TaskItem] {
        guard let token = accessToken else {
            throw APIError.unauthorized
        }

        let url = URL(string: "\(SupabaseConfig.projectURL)/rest/v1/tasks?select=*&order=created_at.desc")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }

        let tasks = try JSONDecoder().decode([TaskItem].self, from: data)
        return tasks
    }

    func saveTasks(_ tasks: [TaskItem]) async throws {
        guard let token = accessToken, let user = currentUser else {
            throw APIError.unauthorized
        }

        // Upsert tasks
        let url = URL(string: "\(SupabaseConfig.projectURL)/rest/v1/tasks")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("resolution=merge-duplicates", forHTTPHeaderField: "Prefer")

        // Add user_id to tasks
        struct TaskWithUser: Codable {
            let id: UUID
            let title: String
            let isDone: Bool
            let userId: String
            let createdAt: Date
            let updatedAt: Date

            enum CodingKeys: String, CodingKey {
                case id, title
                case isDone = "is_done"
                case userId = "user_id"
                case createdAt = "created_at"
                case updatedAt = "updated_at"
            }
        }

        let tasksWithUser = tasks.map { task in
            TaskWithUser(
                id: task.id,
                title: task.title,
                isDone: task.isDone,
                userId: user.id,
                createdAt: task.createdAt,
                updatedAt: task.updatedAt
            )
        }

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        request.httpBody = try encoder.encode(tasksWithUser)

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 || httpResponse.statusCode == 201 else {
            throw APIError.invalidResponse
        }
    }

    func fetchNotes() async throws -> String {
        guard let token = accessToken, let user = currentUser else {
            throw APIError.unauthorized
        }

        let url = URL(string: "\(SupabaseConfig.projectURL)/rest/v1/notes?user_id=eq.\(user.id)&select=content&limit=1")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }

        struct NoteResponse: Codable {
            let content: String
        }

        let notes = try JSONDecoder().decode([NoteResponse].self, from: data)
        return notes.first?.content ?? ""
    }

    func saveNotes(_ content: String) async throws {
        guard let token = accessToken, let user = currentUser else {
            throw APIError.unauthorized
        }

        let url = URL(string: "\(SupabaseConfig.projectURL)/rest/v1/notes")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue(SupabaseConfig.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("resolution=merge-duplicates", forHTTPHeaderField: "Prefer")

        struct NotePayload: Codable {
            let userId: String
            let content: String
            let updatedAt: Date

            enum CodingKeys: String, CodingKey {
                case userId = "user_id"
                case content
                case updatedAt = "updated_at"
            }
        }

        let payload = NotePayload(userId: user.id, content: content, updatedAt: Date())
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        request.httpBody = try encoder.encode(payload)

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 || httpResponse.statusCode == 201 else {
            throw APIError.invalidResponse
        }
    }
}

// MARK: - Keychain Helper
class KeychainHelper {
    static func save(key: String, value: String) {
        let data = value.data(using: .utf8)!

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]

        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }

    static func load(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess, let data = result as? Data else {
            return nil
        }

        return String(data: data, encoding: .utf8)
    }

    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]

        SecItemDelete(query as CFDictionary)
    }
}
