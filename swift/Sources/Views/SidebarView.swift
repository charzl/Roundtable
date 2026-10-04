import SwiftUI

public struct SidebarView: View {
    @ObservedObject var store: MeetingStore
    @Binding var selectedMeetingId: String?
    let onNewMeeting: () -> Void

    public var body: some View {
        List(selection: $selectedMeetingId) {
            Section(header: Text("历史会议 / Meetings")) {
                ForEach(store.meetings) { meeting in
                    NavigationLink(value: meeting.id) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(meeting.topic)
                                .font(.headline)
                                .lineLimit(1)

                            HStack(spacing: 6) {
                                Text(meeting.status.uppercased())
                                    .font(.caption2)
                                    .fontWeight(.bold)
                                    .padding(.horizontal, 4)
                                    .padding(.vertical, 1)
                                    .background(meeting.status == "completed" ? Color.green.opacity(0.15) : Color.blue.opacity(0.15))
                                    .foregroundColor(meeting.status == "completed" ? .green : .blue)
                                    .cornerRadius(3)

                                Text("R\(meeting.round)")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)

                                Spacer()

                                Text("\(meeting.messages.count) 发言")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
        }
        .listStyle(.sidebar)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: onNewMeeting) {
                    Label("新建会议", systemImage: "plus")
                }
            }
        }
    }
}
