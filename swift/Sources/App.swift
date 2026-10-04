import SwiftUI

// Exact palette from javascript/ui/style.css
extension Color {
    static let rtBg = Color(red: 245/255, green: 245/255, blue: 240/255) // #f5f5f0
    static let rtPanel = Color.white // #ffffff
    static let rtInk = Color(red: 37/255, green: 55/255, blue: 47/255) // #25372f
    static let rtMuted = Color(red: 106/255, green: 120/255, blue: 111/255) // #6a786f
    static let rtLine = Color(red: 220/255, green: 227/255, blue: 218/255) // #dce3da
    static let rtSoft = Color(red: 237/255, green: 241/255, blue: 233/255) // #edf1e9
    static let rtAccent = Color(red: 52/255, green: 93/255, blue: 70/255) // #345d46
    static let rtAccentHover = Color(red: 38/255, green: 75/255, blue: 54/255) // #264b36
}

@main
struct RoundtableSwiftApp: App {
    @StateObject private var store = MeetingStore()
    @State private var selectedMeetingId: String?
    @State private var showNewMeetingSheet: Bool = false
    @State private var coordinator: MeetingCoordinator?

    var body: some Scene {
        WindowGroup {
            VStack(spacing: 0) {
                // Top Header Bar (Matching JavaScript UI)
                HStack(spacing: 16) {
                    // Brand Logo: ◌ 圆桌会议 Roundtable
                    HStack(spacing: 8) {
                        Text("◌")
                            .font(.system(size: 26, weight: .light))
                            .foregroundColor(.rtAccent)
                        Text("圆桌会议")
                            .font(.system(size: 19, weight: .semibold))
                            .foregroundColor(.rtInk)
                        Text("Roundtable")
                            .font(.system(size: 12, weight: .regular))
                            .foregroundColor(.rtMuted)
                    }

                    Spacer()

                    // Right Actions
                    HStack(spacing: 14) {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(Color.rtAccent)
                                .frame(width: 7, height: 7)
                            Text("本地服务已就绪")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.rtAccent)
                        }

                        HStack(spacing: 4) {
                            Text("界面语言")
                                .font(.system(size: 12))
                                .foregroundColor(.rtMuted)
                            Menu("中文") {
                                Button("中文") {}
                                Button("English") {}
                            }
                            .menuStyle(.borderlessButton)
                            .font(.system(size: 12))
                        }

                        Button("共享能力") {}
                            .buttonStyle(.bordered)
                            .controlSize(.small)

                        Button(action: { showNewMeetingSheet = true }) {
                            Text("+ 新会议")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color.rtAccent)
                                .cornerRadius(8)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 24)
                .frame(height: 64)
                .background(Color.rtPanel)
                .overlay(Rectangle().frame(height: 1).foregroundColor(.rtLine), alignment: .bottom)

                // 3-Column Split View Layout
                NavigationSplitView {
                    SidebarView(store: store, selectedMeetingId: $selectedMeetingId, onNewMeeting: {
                        showNewMeetingSheet = true
                    })
                    .frame(minWidth: 230, idealWidth: 240, maxWidth: 260)
                } detail: {
                    if let coordinator = coordinator {
                        MeetingDetailView(coordinator: coordinator, onSave: {
                            store.save(coordinator.currentMeeting)
                        })
                    } else {
                        VStack(spacing: 14) {
                            Text("◌")
                                .font(.system(size: 56, weight: .ultraLight))
                                .foregroundColor(.rtAccent)
                            Text("把不同的判断聚在一起，让真实的发言推动决策。")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.rtInk)
                            Text("请从左侧选择已有记录，或点击右上角「+ 新会议」开启讨论。")
                                .font(.system(size: 13))
                                .foregroundColor(.rtMuted)
                            Button(action: { showNewMeetingSheet = true }) {
                                Text("开始第一个圆桌会议")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 18)
                                    .padding(.vertical, 8)
                                    .background(Color.rtAccent)
                                    .cornerRadius(8)
                            }
                            .buttonStyle(.plain)
                            .padding(.top, 8)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.rtBg)
                    }
                }
            }
            .navigationTitle("圆桌会议 · Roundtable")
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
        .defaultSize(width: 1200, height: 800)
    }

    private func setupCoordinator(for meeting: Meeting) {
        coordinator?.stop()
        coordinator = MeetingCoordinator(meeting: meeting, onUpdate: { updated in
            store.save(updated)
        })
    }
}
