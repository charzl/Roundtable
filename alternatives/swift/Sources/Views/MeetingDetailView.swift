import SwiftUI

public struct MeetingDetailView: View {
    @ObservedObject var coordinator: MeetingCoordinator
    let onSave: () -> Void

    @State private var humanInput: String = ""

    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(coordinator.currentMeeting.topic)
                        .font(.title3)
                        .fontWeight(.bold)
                    HStack(spacing: 8) {
                        Text("第 \(coordinator.currentMeeting.round) / \(coordinator.currentMeeting.maxRounds) 轮")
                            .font(.caption)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.blue.opacity(0.1))
                            .foregroundColor(.blue)
                            .cornerRadius(4)

                        Text("负责人: \(knownParticipants[coordinator.currentMeeting.leader]?.name ?? coordinator.currentMeeting.leader)")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        Text(coordinator.statusMessage)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                Spacer()

                if coordinator.isRunning {
                    Button(coordinator.isPaused ? "继续 / Resume" : "暂停 / Pause") {
                        if coordinator.isPaused {
                            coordinator.resume()
                        } else {
                            coordinator.pause()
                        }
                    }
                    .buttonStyle(.bordered)
                } else if coordinator.currentMeeting.status != "completed" {
                    Button("启动会议 / Start") {
                        coordinator.start()
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
            .padding(16)
            .background(Color(NSColor.windowBackgroundColor))
            .overlay(Divider(), alignment: .bottom)

            // Chat Messages Scroll
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(coordinator.currentMeeting.messages) { msg in
                            MessageCardView(message: msg)
                                .id(msg.id)
                        }

                        if let decision = coordinator.currentMeeting.decision {
                            DecisionCardView(decision: decision)
                                .id("decision-card")
                        }
                    }
                    .padding(16)
                }
                .onChange(of: coordinator.currentMeeting.messages.count) { _ in
                    if let last = coordinator.currentMeeting.messages.last {
                        withAnimation {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
            }

            // Bottom Human Interruption Bar
            HStack(spacing: 10) {
                TextField("人类排队插话发言 / Speak or clarify...", text: $humanInput)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit {
                        submitSpeech()
                    }

                Button("发送 / Send") {
                    submitSpeech()
                }
                .buttonStyle(.borderedProminent)
                .disabled(humanInput.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(12)
            .background(Color(NSColor.windowBackgroundColor))
            .overlay(Divider(), alignment: .top)
        }
    }

    private func submitSpeech() {
        let text = humanInput.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        coordinator.injectHumanSpeech(text)
        humanInput = ""
        onSave()
    }
}

struct MessageCardView: View {
    let message: Message

    var body: some View {
        let isHuman = message.origin == "human"
        let pInfo = knownParticipants[message.author]

        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(isHuman ? "人类发言者 (Human)" : (pInfo?.name ?? message.author))
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(isHuman ? .blue : Color.primary)

                Text("· 第 \(message.round) 轮")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                if message.readyToConclude {
                    Text("✓ 建议总结")
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.green.opacity(0.1))
                        .foregroundColor(.green)
                        .cornerRadius(4)
                }
            }

            Text(message.text)
                .font(.body)
                .lineSpacing(4)
                .textSelection(.enabled)

            if !message.claims.isEmpty {
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(message.claims) { c in
                        Text("📌 论点 [\(c.id)]: \(c.text)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.top, 4)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
        )
    }
}

struct DecisionCardView: View {
    let decision: Decision

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("📋 会议负责人总结草稿 / Leader's Summary")
                    .font(.headline)
                    .foregroundColor(.green)
                Spacer()
                Text("由 \(knownParticipants[decision.author]?.name ?? decision.author) 起草")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Text(decision.recommendation)
                .font(.body)
                .foregroundColor(.primary)

            if !decision.options.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(decision.options, id: \.name) { opt in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(opt.name)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            if !opt.pros.isEmpty {
                                Text("Pros: " + opt.pros.joined(separator: ", "))
                                    .font(.caption)
                                    .foregroundColor(.green)
                            }
                            if !opt.cons.isEmpty {
                                Text("Cons: " + opt.cons.joined(separator: ", "))
                                    .font(.caption)
                                    .foregroundColor(.red)
                            }
                        }
                        .padding(6)
                        .background(Color.gray.opacity(0.05))
                        .cornerRadius(4)
                    }
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.green.opacity(0.08))
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.green.opacity(0.3), lineWidth: 1)
        )
    }
}
