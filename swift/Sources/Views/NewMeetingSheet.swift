import SwiftUI

public struct NewMeetingSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onCreate: (Meeting) -> Void

    @State private var topic: String = ""
    @State private var selectedParticipants: Set<String> = ["codex", "claude", "cursor", "agy"]
    @State private var mode: String = "discussion"
    @State private var organizer: String = "claude"
    @State private var leader: String = "codex"
    @State private var maxRounds: Int = 10

    private var sortedCandidates: [String] {
        ["claude", "codex", "agy", "cursor"]
    }

    private var selectedList: [String] {
        sortedCandidates.filter { selectedParticipants.contains($0) }
    }

    private var isValidCount: Bool {
        selectedParticipants.count >= 3
    }

    private var rulePromptText: String {
        let orgName = knownParticipants[organizer]?.name ?? organizer
        let ldrName = knownParticipants[leader]?.name ?? leader
        let members = selectedList.filter { $0 != organizer && $0 != leader }.map { knownParticipants[$0]?.name ?? $0 }
        let membersStr = members.joined(separator: "、")

        if selectedParticipants.count == 3 {
            return "💡 3 角色规格联动生效：\n• \(orgName) 为组织者 (Organizer)，将兼任 Member 下场参与圆桌辩论。\n• \(ldrName) 为负责人 (Leader)，起草最终决策。\n• \(membersStr.isEmpty ? "其他组员" : membersStr) 为讨论组员。共 3 位 AI 依次发言辩论。"
        } else if selectedParticipants.count >= 4 {
            return "💡 4+ 角色规格联动生效：\n• \(orgName) 单独拎出作为独立主持人负责开场与控场。\n• 由 \(ldrName) (Leader) 与 \(membersStr.isEmpty ? "成员们" : membersStr) 等共 \(selectedParticipants.count - 1) 位 AI 展开圆桌讨论。"
        } else {
            return "⚠️ 请至少勾选 3 位 AI 参会者。"
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header
            HStack {
                Text("◌ 圆桌会议配置向导")
                    .font(.system(size: 19, weight: .bold))
                    .foregroundColor(.rtInk)
                Spacer()
                Button("✕") {
                    dismiss()
                }
                .buttonStyle(.plain)
                .font(.system(size: 15))
                .foregroundColor(.rtMuted)
            }

            // Judge Banner
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text("⚖️ 你的席位：Judge (裁决者)")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.rtAccent)
                    Spacer()
                }
                Text("你负责设立评判标准、在会议中随时追问并在最后做出裁定。（人类不作为 AI 候选人参选，AI 亦不引用人类发言作为参会候选观点）")
                    .font(.system(size: 11))
                    .foregroundColor(.rtMuted)
                    .lineSpacing(2)
            }
            .padding(10)
            .background(Color.rtSoft)
            .cornerRadius(8)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.rtAccent.opacity(0.4), lineWidth: 1))

            // Topic textarea
            VStack(alignment: .leading, spacing: 5) {
                Text("讨论议题与判断标准:")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.rtInk)
                TextEditor(text: $topic)
                    .frame(height: 60)
                    .padding(6)
                    .background(Color.rtPanel)
                    .cornerRadius(8)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.rtLine, lineWidth: 1))
            }

            // Meeting Mode
            HStack {
                Text("会议模式:")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.rtInk)
                Picker("", selection: $mode) {
                    Text("讨论模式 (Discussion)").tag("discussion")
                    Text("独立调研模式 (Independent)").tag("independent")
                }
                .pickerStyle(.menu)
            }

            // AI Candidates (Min 3)
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("选择参会 AI 候选人 · 至少 3 位")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.rtInk)
                    Spacer()
                    if !isValidCount {
                        Text("⚠️ 至少需选择 3 位")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.red)
                    }
                }

                VStack(spacing: 4) {
                    participantRow(id: "claude", name: "Claude", desc: "Anthropic · CLI 默认模型")
                    participantRow(id: "codex", name: "Codex", desc: "OpenAI · CLI 默认模型")
                    participantRow(id: "agy", name: "Antigravity", desc: "运行时默认模型")
                    participantRow(id: "cursor", name: "Cursor", desc: "Anysphere · CLI 默认模型")
                }
            }

            // Role Assignments: Organizer & Leader
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Organizer (组织者/主持):")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.rtInk)
                    Picker("", selection: $organizer) {
                        ForEach(selectedList, id: \.self) { id in
                            Text(knownParticipants[id]?.name ?? id).tag(id)
                        }
                    }
                    .pickerStyle(.menu)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Leader (负责人/总结):")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.rtInk)
                    Picker("", selection: $leader) {
                        ForEach(selectedList, id: \.self) { id in
                            Text(knownParticipants[id]?.name ?? id).tag(id)
                        }
                    }
                    .pickerStyle(.menu)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("最多轮数:")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.rtInk)
                    Stepper("\(maxRounds)", value: $maxRounds, in: 1...10)
                }
            }

            // Dynamic Rule Banner
            Text(rulePromptText)
                .font(.system(size: 11))
                .foregroundColor(.rtInk)
                .padding(8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.rtSoft.opacity(0.6))
                .cornerRadius(6)

            Spacer()

            // Actions
            HStack {
                Spacer()
                Button("取消") {
                    dismiss()
                }
                .buttonStyle(.bordered)

                Button(action: {
                    let participantsList = selectedList
                    let finalTopic = topic.trimmingCharacters(in: .whitespaces).isEmpty ? "圆桌架构讨论：多智能体决策与原生性能评测" : topic
                    let newMeeting = Meeting(
                        id: "M-\(UUID().uuidString.prefix(6))",
                        topic: finalTopic,
                        participants: participantsList,
                        mode: mode,
                        organizer: organizer,
                        leader: leader,
                        maxRounds: maxRounds
                    )
                    onCreate(newMeeting)
                    dismiss()
                }) {
                    Text("开启新讨论")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 7)
                        .background(isValidCount ? Color.rtAccent : Color.gray)
                        .cornerRadius(8)
                }
                .buttonStyle(.plain)
                .disabled(!isValidCount)
            }
        }
        .padding(22)
        .frame(minWidth: 540, minHeight: 620)
        .background(Color.rtBg)
        .onChange(of: selectedParticipants) { _ in
            if !selectedParticipants.contains(organizer) {
                organizer = selectedList.first ?? "claude"
            }
            if !selectedParticipants.contains(leader) {
                leader = selectedList.dropFirst().first ?? selectedList.first ?? "codex"
            }
        }
    }

    private func participantRow(id: String, name: String, desc: String) -> some View {
        let isSelected = selectedParticipants.contains(id)
        return HStack(spacing: 10) {
            Toggle("", isOn: Binding(
                get: { isSelected },
                set: { checked in
                    if checked { selectedParticipants.insert(id) }
                    else { selectedParticipants.remove(id) }
                }
            ))
            .toggleStyle(.checkbox)

            VStack(alignment: .leading, spacing: 1) {
                Text(name)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.rtInk)
                Text(desc)
                    .font(.system(size: 10))
                    .foregroundColor(.rtMuted)
            }
            Spacer()
        }
        .padding(.vertical, 4)
        .padding(.horizontal, 10)
        .background(Color.rtPanel)
        .cornerRadius(6)
        .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.rtLine, lineWidth: 1))
    }
}
