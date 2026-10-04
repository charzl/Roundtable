import SwiftUI

public struct MeetingDetailView: View {
    @ObservedObject var coordinator: MeetingCoordinator
    let onSave: () -> Void

    @State private var humanInput: String = ""
    @State private var activeTab: String = "discussion"

    public var body: some View {
        HStack(spacing: 0) {
            // Center Discussion Canvas
            VStack(alignment: .leading, spacing: 14) {
                // Eyebrow Status
                Text("第 \(coordinator.currentMeeting.round) 轮 / 最多 \(coordinator.currentMeeting.maxRounds) 轮 · 公开讨论 · \(statusText())")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.rtMuted)
                    .textCase(.uppercase)

                // Topic Title + Export
                HStack(alignment: .top) {
                    Text(coordinator.currentMeeting.topic)
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(.rtInk)
                        .lineLimit(2)

                    Spacer()

                    Button("导出") {}
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                }

                // Leader & Language Bar
                HStack(spacing: 16) {
                    HStack(spacing: 4) {
                        Text("会议 Leader:")
                            .font(.system(size: 12))
                            .foregroundColor(.rtMuted)
                        Text(knownParticipants[coordinator.currentMeeting.leader]?.name ?? coordinator.currentMeeting.leader)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.rtInk)
                    }

                    Text("输出语言: 随系统")
                        .font(.system(size: 12))
                        .foregroundColor(.rtMuted)

                    Spacer()
                }

                // Tabs: [ 公开讨论 ] [ 总结与决定 ]
                HStack(spacing: 8) {
                    Button(action: { activeTab = "discussion" }) {
                        Text("公开讨论")
                            .font(.system(size: 13, weight: activeTab == "discussion" ? .semibold : .regular))
                            .foregroundColor(.rtInk)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(activeTab == "discussion" ? Color.rtSoft : Color.clear)
                            .cornerRadius(6)
                    }
                    .buttonStyle(.plain)

                    Button(action: { activeTab = "decision" }) {
                        Text("总结与决定")
                            .font(.system(size: 13, weight: activeTab == "decision" ? .semibold : .regular))
                            .foregroundColor(activeTab == "decision" ? .rtInk : .rtMuted)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(activeTab == "decision" ? Color.rtSoft : Color.clear)
                            .cornerRadius(6)
                    }
                    .buttonStyle(.plain)

                    Spacer()
                }

                // Control Pill Bar (Matching #edf1e9)
                HStack {
                    Text(coordinator.isRunning ? coordinator.statusMessage : "尚未开始")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.rtInk)

                    Spacer()

                    if coordinator.isRunning {
                        Button(coordinator.isPaused ? "继续" : "暂停") {
                            if coordinator.isPaused {
                                coordinator.resume()
                            } else {
                                coordinator.pause()
                            }
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)

                        Button("结束并总结") {
                            coordinator.stop()
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    } else if coordinator.currentMeeting.status != "completed" {
                        Button("开始讨论") {
                            coordinator.start()
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 5)
                        .background(Color.rtAccent)
                        .foregroundColor(.white)
                        .font(.system(size: 12, weight: .semibold))
                        .cornerRadius(6)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color.rtSoft)
                .cornerRadius(9)

                // Discussion Scroll View
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
                        .padding(.vertical, 4)
                    }
                    .onChange(of: coordinator.currentMeeting.messages.count) { _ in
                        if let last = coordinator.currentMeeting.messages.last {
                            withAnimation {
                                proxy.scrollTo(last.id, anchor: .bottom)
                            }
                        }
                    }
                }

                // Bottom Human Interruption Composer
                VStack(alignment: .leading, spacing: 6) {
                    Text("插话或补充判断标准")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.rtInk)

                    TextField("例如：请先核实这个假设，再讨论方案。", text: $humanInput)
                        .textFieldStyle(.roundedBorder)
                        .onSubmit {
                            submitSpeech()
                        }

                    HStack {
                        Text("发言会加入共同会议记录。")
                            .font(.system(size: 11))
                            .foregroundColor(.rtMuted)

                        Spacer()

                        Button(action: submitSpeech) {
                            Text("提交发言")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 6)
                                .background(Color.rtAccent)
                                .cornerRadius(6)
                        }
                        .buttonStyle(.plain)
                        .disabled(humanInput.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
                .padding(.top, 4)
            }
            .padding(24)
            .background(Color.rtBg)

            // Right Evidence & Claims Sidebar
            VStack(alignment: .leading, spacing: 12) {
                Text("观点与证据")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.rtInk)

                Text("引用来源不代表已验证。核查记录保留作者与方法。")
                    .font(.system(size: 12))
                    .foregroundColor(.rtMuted)
                    .lineSpacing(3)

                Text("选择一条观点，查看它的依据、方法和限制。")
                    .font(.system(size: 12))
                    .foregroundColor(.rtMuted)
                    .padding(.top, 8)

                // List of extracted claims from messages
                ScrollView {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(allClaims(), id: \.id) { claim in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(claim.text)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(.rtInk)
                                Text("来源: \(claim.sources.joined(separator: ", "))")
                                    .font(.system(size: 10))
                                    .foregroundColor(.rtMuted)
                            }
                            .padding(8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.rtSoft)
                            .cornerRadius(6)
                        }
                    }
                }

                Spacer()
            }
            .padding(20)
            .frame(width: 250)
            .background(Color.rtPanel)
            .overlay(Rectangle().frame(width: 1).foregroundColor(.rtLine), alignment: .leading)
        }
    }

    private func statusText() -> String {
        if coordinator.isRunning {
            return coordinator.isPaused ? "已暂停" : "进行中"
        }
        return coordinator.currentMeeting.status == "completed" ? "已完成" : "尚未开始"
    }

    private func allClaims() -> [Claim] {
        coordinator.currentMeeting.messages.flatMap { $0.claims }
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

        VStack(alignment: .leading, spacing: 8) {
            // Header: Round avatar + Name + Meta
            HStack(spacing: 8) {
                if isHuman {
                    Circle()
                        .stroke(Color.rtAccent, lineWidth: 1)
                        .background(Circle().fill(Color.rtSoft))
                        .frame(width: 26, height: 26)
                        .overlay(
                            Text("你")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.rtAccent)
                        )
                    Text("你")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.rtInk)
                    Text("M-\(String(format: "%03d", message.round)) · 第 \(message.round) 轮 · 人类发言")
                        .font(.system(size: 11))
                        .foregroundColor(.rtMuted)
                } else {
                    Circle()
                        .stroke(Color.rtLine, lineWidth: 1)
                        .background(Circle().fill(Color.white))
                        .frame(width: 26, height: 26)
                        .overlay(
                            Text(String((pInfo?.name ?? message.author).prefix(2)))
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.rtInk)
                        )
                    Text(pInfo?.name ?? message.author)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.rtInk)
                    Text("\(message.id) · 第 \(message.round) 轮 · 模型发言")
                        .font(.system(size: 11))
                        .foregroundColor(.rtMuted)
                }

                Spacer()

                if message.readyToConclude {
                    Text("✓ 建议总结")
                        .font(.system(size: 11))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.rtSoft)
                        .foregroundColor(.rtAccent)
                        .cornerRadius(4)
                }
            }

            // Message text
            Text(message.text)
                .font(.system(size: 14))
                .foregroundColor(.rtInk)
                .lineSpacing(5)
                .textSelection(.enabled)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.rtPanel)
        .cornerRadius(10)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color.rtLine, lineWidth: 1)
        )
    }
}

struct DecisionCardView: View {
    let decision: Decision

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("📋 会议负责人总结与决定 (\(knownParticipants[decision.author]?.name ?? decision.author))")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.rtInk)

            Text(decision.recommendation)
                .font(.system(size: 13))
                .foregroundColor(.rtAccent)
                .fontWeight(.medium)
                .lineSpacing(4)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.rtSoft)
        .cornerRadius(10)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color.rtAccent.opacity(0.6), lineWidth: 1)
        )
    }
}
