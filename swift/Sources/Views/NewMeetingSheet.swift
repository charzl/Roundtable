import SwiftUI

public struct NewMeetingSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onCreate: (Meeting) -> Void

    @State private var topic: String = ""
    @State private var selectedParticipants: Set<String> = ["codex", "claude", "cursor", "agy"]
    @State private var mode: String = "discussion"
    @State private var leader: String = "codex"
    @State private var maxRounds: Int = 10

    public var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                Text("新圆桌会议")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.rtInk)
                Spacer()
                Button("✕") {
                    dismiss()
                }
                .buttonStyle(.plain)
                .font(.system(size: 16))
                .foregroundColor(.rtMuted)
            }

            // Topic textarea
            VStack(alignment: .leading, spacing: 6) {
                Text("想一起讨论什么？")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.rtInk)
                TextEditor(text: $topic)
                    .frame(height: 70)
                    .padding(6)
                    .background(Color.white)
                    .cornerRadius(8)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.rtLine, lineWidth: 1))
            }

            // Meeting Mode
            HStack {
                Text("会议模式:")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.rtInk)
                Picker("", selection: $mode) {
                    Text("讨论模式 (Discussion)").tag("discussion")
                    Text("独立调研模式 (Independent)").tag("independent")
                }
                .pickerStyle(.menu)
            }

            // Participants
            VStack(alignment: .leading, spacing: 6) {
                Text("选择参会者 · 至少两位")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.rtInk)

                VStack(spacing: 6) {
                    participantRow(id: "codex", name: "Codex", desc: "已找到 CLI · 接入待验证 · OpenAI [CLI 默认模型]")
                    participantRow(id: "claude", name: "Claude", desc: "已找到 CLI · 接入待验证 · Anthropic [CLI 默认模型]")
                    participantRow(id: "agy", name: "Antigravity", desc: "已找到 CLI · 接入待验证 · 运行时默认模型 [CLI 默认模型]")
                    participantRow(id: "cursor", name: "Cursor", desc: "已找到 CLI · 接入待验证 · Anysphere [CLI 默认模型]")
                }
            }

            // Leader & Max rounds
            HStack(spacing: 20) {
                HStack {
                    Text("Leader（负责最终总结）:")
                        .font(.system(size: 12))
                        .foregroundColor(.rtInk)
                    Picker("", selection: $leader) {
                        ForEach(["codex", "claude", "cursor", "agy"], id: \.self) { id in
                            Text(knownParticipants[id]?.name ?? id).tag(id)
                        }
                    }
                    .pickerStyle(.menu)
                }

                HStack {
                    Text("最多轮数:")
                        .font(.system(size: 12))
                        .foregroundColor(.rtInk)
                    Stepper("\(maxRounds)", value: $maxRounds, in: 1...10)
                }
            }

            Spacer()

            // Actions
            HStack {
                Spacer()
                Button("取消") {
                    dismiss()
                }
                .buttonStyle(.bordered)

                Button(action: {
                    let participantsList = Array(selectedParticipants).isEmpty ? ["codex", "claude"] : Array(selectedParticipants)
                    let newMeeting = Meeting(
                        id: "M-\(UUID().uuidString.prefix(6))",
                        topic: topic.trimmingCharacters(in: .whitespaces).isEmpty ? "新建圆桌讨论" : topic,
                        participants: participantsList,
                        mode: mode,
                        leader: leader,
                        maxRounds: maxRounds
                    )
                    onCreate(newMeeting)
                    dismiss()
                }) {
                    Text("开始新讨论")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 7)
                        .background(Color.rtAccent)
                        .cornerRadius(8)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(24)
        .frame(minWidth: 500, minHeight: 520)
        .background(Color.rtBg)
    }

    private func participantRow(id: String, name: String, desc: String) -> some View {
        let isSelected = selectedParticipants.contains(id)
        return HStack(spacing: 12) {
            Toggle("", isOn: Binding(
                get: { isSelected },
                set: { checked in
                    if checked { selectedParticipants.insert(id) }
                    else { selectedParticipants.remove(id) }
                }
            ))
            .toggleStyle(.checkbox)

            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.rtInk)
                Text(desc)
                    .font(.system(size: 11))
                    .foregroundColor(.rtMuted)
            }
            Spacer()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.rtPanel)
        .cornerRadius(8)
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.rtLine, lineWidth: 1))
    }
}
