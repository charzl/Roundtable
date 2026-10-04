import Foundation

public struct ParticipantInfo: Identifiable, Codable, Hashable {
    public var id: String
    public var name: String
    public var provider: String
    public var hexColor: String
}

public let knownParticipants: [String: ParticipantInfo] = [
    "codex": ParticipantInfo(id: "codex", name: "Codex", provider: "OpenAI", hexColor: "#10a37f"),
    "claude": ParticipantInfo(id: "claude", name: "Claude", provider: "Anthropic", hexColor: "#d97706"),
    "cursor": ParticipantInfo(id: "cursor", name: "Cursor", provider: "Anysphere", hexColor: "#2563eb"),
    "agy": ParticipantInfo(id: "agy", name: "Antigravity", provider: "运行时默认模型", hexColor: "#7c3aed")
]

public struct Claim: Codable, Identifiable, Hashable {
    public var id: String
    public var text: String
    public var kind: String
    public var sources: [String]
    public var limitations: String?
}

public struct Message: Codable, Identifiable, Hashable {
    public var id: String
    public var author: String
    public var text: String
    public var round: Int
    public var timestamp: String
    public var origin: String
    public var readyToConclude: Bool
    public var claims: [Claim]

    public init(id: String, author: String, text: String, round: Int, timestamp: String = ISO8601DateFormatter().string(from: Date()), origin: String = "provider", readyToConclude: Bool = false, claims: [Claim] = []) {
        self.id = id
        self.author = author
        self.text = text
        self.round = round
        self.timestamp = timestamp
        self.origin = origin
        self.readyToConclude = readyToConclude
        self.claims = claims
    }
}

public struct DecisionOption: Codable, Hashable {
    public var name: String
    public var pros: [String]
    public var cons: [String]
}

public struct Decision: Codable, Hashable {
    public var author: String
    public var recommendation: String
    public var options: [DecisionOption]
    public var disagreements: [String]
    public var unknowns: [String]
}

public struct Meeting: Codable, Identifiable, Hashable {
    public var id: String
    public var topic: String
    public var participants: [String]
    public var mode: String
    public var leader: String
    public var maxRounds: Int
    public var round: Int
    public var status: String
    public var createdAt: String
    public var messages: [Message]
    public var decision: Decision?
    public var userDecision: String?

    public init(id: String, topic: String, participants: [String], mode: String = "discussion", leader: String = "claude", maxRounds: Int = 10, round: Int = 1, status: String = "active", createdAt: String = ISO8601DateFormatter().string(from: Date()), messages: [Message] = [], decision: Decision? = nil, userDecision: String? = nil) {
        self.id = id
        self.topic = topic
        self.participants = participants
        self.mode = mode
        self.leader = leader
        self.maxRounds = maxRounds
        self.round = round
        self.status = status
        self.createdAt = createdAt
        self.messages = messages
        self.decision = decision
        self.userDecision = userDecision
    }
}

public class MeetingStore: ObservableObject {
    @Published public var meetings: [Meeting] = []
    private let dataDir: URL

    public init() {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        self.dataDir = appSupport.appendingPathComponent("Roundtable-Swift/data")
        try? FileManager.default.createDirectory(at: dataDir, withIntermediateDirectories: true)
        loadMeetings()
    }

    public func loadMeetings() {
        var loaded: [Meeting] = []
        if let files = try? FileManager.default.contentsOfDirectory(at: dataDir, includingPropertiesForKeys: nil) {
            let decoder = JSONDecoder()
            for file in files where file.pathExtension == "json" {
                if let data = try? Data(contentsOf: file), let m = try? decoder.decode(Meeting.self, from: data) {
                    loaded.append(m)
                }
            }
        }
        if loaded.isEmpty {
            let sample = Meeting(
                id: "M-SWIFT-001",
                topic: "跨端与原生性能调研：Electron、PySide6 与 Swift 架构横评",
                participants: ["claude", "codex", "cursor"],
                leader: "claude",
                maxRounds: 3,
                messages: [
                    Message(
                        id: "M-01-01",
                        author: "claude",
                        text: "Swift 原生版利用 macOS AppKit / SwiftUI 与 Metal 渲染，零额外运行时开销，内存底噪约 20-30MB，包体积不足 10MB，性能与体验均为原生最高水准。",
                        round: 1,
                        readyToConclude: true
                    )
                ]
            )
            save(sample)
            loaded.append(sample)
        }
        loaded.sort(by: { $0.createdAt > $1.createdAt })
        self.meetings = loaded
    }

    public func save(_ meeting: Meeting) {
        let file = dataDir.appendingPathComponent("\(meeting.id).json")
        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted
        if let data = try? encoder.encode(meeting) {
            try? data.write(to: file)
        }
        if let idx = meetings.firstIndex(where: { $0.id == meeting.id }) {
            meetings[idx] = meeting
        } else {
            meetings.insert(meeting, at: 0)
        }
    }
}
