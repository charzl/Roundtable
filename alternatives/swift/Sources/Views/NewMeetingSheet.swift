import SwiftUI

public struct NewMeetingSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onCreate: (Meeting) -> Void

    @State private var topic: String = ""
    @State private var selectedParticipants: Set<String> = ["claude", "codex", "cursor"]
    @State private var mode: String = "discussion"
    @State private var leader: String = "claude"
    @State private var maxRounds: Int = 3

    public var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("新建圆桌会议 / New Meeting")
                .font(.title2)
                .fontWeight(.bold)

            VStack(alignment: .leading, spacing: 6) {
                Text("会议议题 / Topic:")
                    .fontWeight(.medium)
                TextField("例如：Swift vs PySide6 vs Electron 性能深度测评", text: $topic)
                    .textFieldStyle(.roundedBorder)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("参会 Agent / Participants:")
                    .fontWeight(.medium)
                HStack(spacing: 12) {
                    ForEach(["claude", "codex", "cursor", "agy"], id: \.self) { id in
                        Toggle(knownParticipants[id]?.name ?? id, isOn: Binding(
                            get: { selectedParticipants.contains(id) },
                            set: { isSelected in
                                if isSelected { selectedParticipants.insert(id) }
                                else { selectedParticipants.remove(id) }
                            }
                        ))
                        .toggleStyle(.checkbox)
                    }
                }
            }

            HStack(spacing: 24) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("讨论模式 / Mode:")
                        .fontWeight(.medium)
                    Picker("", selection: $mode) {
                        Text("逐轮共同讨论 / Discussion").tag("discussion")
                        Text("同题独立调查 / Independent").tag("independent")
                    }
                    .pickerStyle(.menu)
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("会议负责人 / Leader:")
                        .fontWeight(.medium)
                    Picker("", selection: $leader) {
                        ForEach(["claude", "codex", "cursor", "agy"], id: \.self) { id in
                            Text(knownParticipants[id]?.name ?? id).tag(id)
                        }
                    }
                    .pickerStyle(.menu)
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("最大讨论轮次 / Max Rounds: \(maxRounds)")
                    .fontWeight(.medium)
                Slider(value: Binding(get: { Double(maxRounds) }, set: { maxRounds = Int($0) }), in: 1...10, step: 1)
            }

            Divider()

            HStack {
                Spacer()
                Button("取消 / Cancel") {
                    dismiss()
                }
                .keyboardShortcut(.cancelAction)

                Button("创建并开始 / Create") {
                    let participantsList = Array(selectedParticipants).isEmpty ? ["claude", "codex"] : Array(selectedParticipants)
                    let newMeeting = Meeting(
                        id: "M-\(UUID().uuidString.prefix(6))",
                        topic: topic.trimmingCharacters(in: .whitespaces).isEmpty ? "新议题讨论" : topic,
                        participants: participantsList,
                        mode: mode,
                        leader: leader,
                        maxRounds: maxRounds
                    )
                    onCreate(newMeeting)
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
                .keyboardShortcut(.defaultAction)
            }
        }
        .padding(24)
        .frame(minWidth: 480, minHeight: 400)
    }
}
