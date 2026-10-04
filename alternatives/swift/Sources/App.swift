import SwiftUI

@main
struct RoundtableSwiftApp: App {
    @StateObject private var store = MeetingStore()
    @State private var selectedMeetingId: String?
    @State private var showNewMeetingSheet: Bool = false
    @State private var coordinator: MeetingCoordinator?

    var body: some Scene {
        WindowGroup {
            NavigationSplitView {
                SidebarView(store: store, selectedMeetingId: $selectedMeetingId, onNewMeeting: {
                    showNewMeetingSheet = true
                })
                .frame(minWidth: 260)
            } detail: {
                if let coordinator = coordinator {
                    MeetingDetailView(coordinator: coordinator, onSave: {
                        store.save(coordinator.currentMeeting)
                    })
                } else {
                    VStack(spacing: 12) {
                        Image(systemName: "person.3.sequence.fill")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        Text("请选择或新建圆桌会议 / Select or create a meeting")
                            .font(.headline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .navigationTitle("圆桌会议 · Roundtable (Swift Native)")
            .sheet(isPresented: $showNewMeetingSheet) {
                NewMeetingSheet { newMeeting in
                    store.save(newMeeting)
                    selectedMeetingId = newMeeting.id
                    setupCoordinator(for: newMeeting)
                    coordinator?.start()
                }
            }
            .onAppear {
                if selectedMeetingId == nil, let first = store.meetings.first {
                    selectedMeetingId = first.id
                    setupCoordinator(for: first)
                }
            }
            .onChange(of: selectedMeetingId) { newId in
                if let id = newId, let m = store.meetings.first(where: { $0.id == id }) {
                    setupCoordinator(for: m)
                }
            }
        }
        .windowStyle(.titleBar)
        .defaultSize(width: 1100, height: 750)
    }

    private func setupCoordinator(for meeting: Meeting) {
        coordinator?.stop()
        coordinator = MeetingCoordinator(meeting: meeting, onUpdate: { updated in
            store.save(updated)
        })
    }
}
