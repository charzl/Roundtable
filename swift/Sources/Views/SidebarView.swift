import SwiftUI

public struct SidebarView: View {
    @ObservedObject var store: MeetingStore
    @Binding var selectedMeetingId: String?
    let onNewMeeting: () -> Void

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Meeting Records Section
            Text("会议记录")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.rtInk)
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 8)

            ScrollView {
                LazyVStack(spacing: 4) {
                    ForEach(store.meetings) { meeting in
                        let isSelected = selectedMeetingId == meeting.id
                        Button(action: {
                            selectedMeetingId = meeting.id
                        }) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(meeting.topic)
                                    .font(.system(size: 13, weight: isSelected ? .semibold : .medium))
                                    .foregroundColor(.rtInk)
                                    .lineLimit(1)

                                HStack(spacing: 6) {
                                    Text(meeting.status == "completed" ? "已完成" : "进行中")
                                        .font(.system(size: 11))
                                        .foregroundColor(.rtMuted)

                                    Text("·")
                                        .foregroundColor(.rtMuted)

                                    Text("R\(meeting.round)")
                                        .font(.system(size: 11))
                                        .foregroundColor(.rtMuted)

                                    Spacer()

                                    Text("\(meeting.messages.count) 发言")
                                        .font(.system(size: 11))
                                        .foregroundColor(.rtMuted)
                                }
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(isSelected ? Color.rtSoft : Color.clear)
                            .cornerRadius(8)
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 10)
                    }
                }
            }

            // Divider Note
            VStack(alignment: .leading, spacing: 6) {
                Divider()
                    .foregroundColor(.rtLine)
                Text("一次一位公开发言 · 最多 10 轮 · 决定由你做出")
                    .font(.system(size: 11))
                    .foregroundColor(.rtMuted)
                    .lineSpacing(3)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 6)
            }

            // Participants Section
            VStack(alignment: .leading, spacing: 8) {
                Text("参会者")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.rtInk)
                    .padding(.horizontal, 16)

                // Judge (Human)
                HStack(spacing: 10) {
                    Circle()
                        .stroke(Color.rtAccent, lineWidth: 1)
                        .background(Circle().fill(Color.rtSoft))
                        .frame(width: 28, height: 28)
                        .overlay(
                            Text("你")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.rtAccent)
                        )

                    VStack(alignment: .leading, spacing: 1) {
                        Text("你 (Judge)")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.rtInk)
                        Text("裁决者 · 提问与裁定")
                            .font(.system(size: 10))
                            .foregroundColor(.rtAccent)
                    }
                }
                .padding(.horizontal, 16)

                // Selected meeting AI participants or default participants
                let activeParticipants = currentParticipants()
                ForEach(activeParticipants, id: \.self) { p in
                    let info = knownParticipants[p]
                    HStack(spacing: 10) {
                        Circle()
                            .stroke(Color.rtLine, lineWidth: 1)
                            .background(Circle().fill(Color.rtPanel))
                            .frame(width: 28, height: 28)
                            .overlay(
                                Text(String((info?.name ?? p).prefix(2)))
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundColor(.rtInk)
                            )

                        VStack(alignment: .leading, spacing: 1) {
                            Text(info?.name ?? p)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.rtInk)
                            Text(roleLabel(p))
                                .font(.system(size: 10))
                                .foregroundColor(.rtMuted)
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
            .padding(.bottom, 16)
        }
        .frame(minWidth: 220, maxWidth: 260)
        .background(Color.rtPanel)
        .overlay(Rectangle().frame(width: 1).foregroundColor(.rtLine), alignment: .trailing)
    }

    private func currentParticipants() -> [String] {
        if let id = selectedMeetingId, let m = store.meetings.first(where: { $0.id == id }) {
            return m.participants
        }
        return ["claude", "codex", "agy", "cursor"]
    }

    private func roleLabel(_ id: String) -> String {
        if let mId = selectedMeetingId, let m = store.meetings.first(where: { $0.id == mId }) {
            return m.getRoleLabel(participantId: id)
        }
        return "Member / 组员"
    }
}
