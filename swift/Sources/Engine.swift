import Foundation

@MainActor
public class MeetingCoordinator: ObservableObject {
    @Published public var currentMeeting: Meeting
    @Published public var statusMessage: String = "空闲 / Idle"
    @Published public var isRunning: Bool = false
    @Published public var isPaused: Bool = false

    private var task: Task<Void, Never>?
    private let onUpdate: (Meeting) -> Void

    public init(meeting: Meeting, onUpdate: @escaping (Meeting) -> Void) {
        self.currentMeeting = meeting
        self.onUpdate = onUpdate
    }

    public func start() {
        guard !isRunning else { return }
        isRunning = true
        isPaused = false
        statusMessage = "会议进行中 / Meeting in progress"

        task = Task {
            while isRunning && currentMeeting.round <= currentMeeting.maxRounds {
                if isPaused {
                    try? await Task.sleep(nanoseconds: 300_000_000)
                    continue
                }

                // Round 1 standalone organizer kickoff for 4+ participants
                if currentMeeting.round == 1 && currentMeeting.participants.count >= 4 && currentMeeting.messages.isEmpty {
                    let orgName = knownParticipants[currentMeeting.organizer]?.name ?? currentMeeting.organizer
                    let ldrName = knownParticipants[currentMeeting.leader]?.name ?? currentMeeting.leader
                    let kickoffMsg = Message(
                        id: "M-01-00-kickoff",
                        author: currentMeeting.organizer,
                        text: "[\(orgName) · 组织者] 圆桌会议正式开始。\n本次会议由 Judge (人类裁决者) 设定议题：「\(currentMeeting.topic)」，由 Judge 主导追问与最终裁定。\n本场讨论由负责人 \(ldrName) 牵头，请各位圆桌成员专注方案展开论证。",
                        round: 1,
                        readyToConclude: false,
                        claims: [
                            Claim(id: "C-kickoff-01", text: "组织者 \(orgName) 确立的议程基准", kind: "agenda", sources: [currentMeeting.topic], limitations: "针对 Judge 目标设定")
                        ]
                    )
                    currentMeeting.messages.append(kickoffMsg)
                    onUpdate(currentMeeting)
                    try? await Task.sleep(nanoseconds: 300_000_000)
                }

                let activeSpeakers = currentMeeting.getActiveSpeakers()

                for participant in activeSpeakers {
                    guard isRunning else { break }
                    while isPaused && isRunning {
                        try? await Task.sleep(nanoseconds: 300_000_000)
                    }
                    guard isRunning else { break }

                    let info = knownParticipants[participant]?.name ?? participant
                    let roleLabel = currentMeeting.getRoleLabel(participantId: participant)
                    statusMessage = "轮到 \(info) (\(roleLabel)) 第 \(currentMeeting.round) 轮发言..."

                    // Simulate thinking / I/O latency
                    try? await Task.sleep(nanoseconds: 400_000_000)

                    let msgId = "M-\(String(format: "%02d", currentMeeting.round))-\(String(format: "%02d", currentMeeting.messages.count + 1))"
                    let speechText = "[\(info) · \(roleLabel)] 关于议题「\(currentMeeting.topic)」第 \(currentMeeting.round) 轮发言：\n从原生视角考量，Swift + SwiftUI/AppKit 深度贴合 macOS 渲染管线，能将运行时内存与应用体积压缩至极致。"
                    let ready = (currentMeeting.round >= 2)

                    let claim = Claim(
                        id: "C-\(currentMeeting.round)-\(currentMeeting.messages.count + 1)",
                        text: "\(info) 核心论据与性能指标分析",
                        kind: "proposal",
                        sources: [currentMeeting.topic],
                        limitations: "针对 Judge 评判标准"
                    )

                    let msg = Message(
                        id: msgId,
                        author: participant,
                        text: speechText,
                        round: currentMeeting.round,
                        readyToConclude: ready,
                        claims: [claim]
                    )

                    currentMeeting.messages.append(msg)
                    onUpdate(currentMeeting)

                    try? await Task.sleep(nanoseconds: 300_000_000)
                }

                // Check termination condition
                let recentMessages = currentMeeting.messages.suffix(activeSpeakers.count)
                let allReady = activeSpeakers.allSatisfy { p in
                    recentMessages.contains(where: { $0.author == p && $0.readyToConclude })
                }

                if allReady || currentMeeting.round >= currentMeeting.maxRounds {
                    let leaderName = knownParticipants[currentMeeting.leader]?.name ?? currentMeeting.leader
                    let decision = Decision(
                        author: currentMeeting.leader,
                        recommendation: "由会议负责人 \(leaderName) 主持起草的最终决策建议：针对「\(currentMeeting.topic)」，全员在第 \(currentMeeting.round) 轮完成深度论证并形成收敛。",
                        options: [
                            DecisionOption(
                                name: "方案 A (Swift 原生 / Highly Recommended for macOS)",
                                pros: ["内存消耗极低 (~25MB)", "包体积极小 (<10MB)", "系统级原生动效与 SF Pro 体验"],
                                cons: ["仅限于 Apple 生态，Windows/Linux 需额外技术栈"]
                            ),
                            DecisionOption(
                                name: "方案 B (PySide6 / Great Balance)",
                                pros: ["跨平台且体积适中 (~78MB)", "单进程内存紧凑 (~60MB)"],
                                cons: ["需配置 Python/Qt 运行时分发"]
                            ),
                            DecisionOption(
                                name: "方案 C (Electron / Current Baseline)",
                                pros: ["全 Web 技术栈复用", "跨平台能力与生态极其丰富"],
                                cons: ["体积大 (~300MB)", "多进程架构内存占用高 (~200MB)"]
                            )
                        ],
                        disagreements: ["后续移动端与跨平台支持的开发工时分配"],
                        unknowns: ["极长上下文场景下各语言的 GC 表现差异"]
                    )

                    currentMeeting.decision = decision
                    currentMeeting.status = "completed"
                    statusMessage = "会议已结束 / Meeting completed"
                    isRunning = false
                    onUpdate(currentMeeting)
                    break
                } else {
                    currentMeeting.round += 1
                    onUpdate(currentMeeting)
                }
            }
        }
    }

    public func pause() {
        isPaused = true
        statusMessage = "已暂停 / Paused"
    }

    public func resume() {
        isPaused = false
        statusMessage = "继续讨论 / Resumed"
    }

    public func stop() {
        isRunning = false
        task?.cancel()
        task = nil
    }

    public func injectHumanSpeech(_ text: String) {
        guard !text.isEmpty else { return }
        let msg = Message(
            id: "M-HUMAN-\(currentMeeting.messages.count + 1)",
            author: "human",
            text: "[人类插话] \(text)",
            round: currentMeeting.round,
            origin: "human"
        )
        currentMeeting.messages.append(msg)
        onUpdate(currentMeeting)
    }
}
