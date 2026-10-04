"""
PySide6 User Interface for Roundtable.
Clean, modern macOS style matching the Electron version.
"""

from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QFont, QColor, QPalette, QIcon
from PySide6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QListWidget, QListWidgetItem, QTextEdit, QLineEdit,
    QSplitter, QFrame, QScrollArea, QDialog, QComboBox, QCheckBox,
    QSpinBox, QGroupBox, QMessageBox
)
from models import Meeting, PARTICIPANTS_INFO, MeetingStore
from engine import MeetingWorker

STYLE_SHEET = """
QMainWindow {
    background-color: #f7f7f5;
}
QSplitter::handle {
    background-color: #e5e5e0;
}
#Sidebar {
    background-color: #ebebe6;
    border-right: 1px solid #deded8;
}
#Header {
    background-color: #ffffff;
    border-bottom: 1px solid #e5e5e0;
    padding: 12px 16px;
}
#ChatArea {
    background-color: #fbfbf9;
}
.MessageCard {
    background-color: #ffffff;
    border: 1px solid #e8e8e3;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 8px;
}
.DecisionCard {
    background-color: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    padding: 14px;
    margin: 8px 0;
}
QPushButton {
    background-color: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 6px 14px;
    font-weight: 500;
}
QPushButton:hover {
    background-color: #f3f4f6;
}
QPushButton#PrimaryBtn {
    background-color: #2563eb;
    color: #ffffff;
    border: none;
}
QPushButton#PrimaryBtn:hover {
    background-color: #1d4ed8;
}
QLineEdit, QTextEdit {
    background-color: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 6px 10px;
}
"""

class NewMeetingDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("新建圆桌会议 / New Meeting")
        self.resize(460, 480)
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)

        # Topic
        layout.addWidget(QLabel("<b>会议议题 / Topic:</b>"))
        self.topic_edit = QLineEdit()
        self.topic_edit.setPlaceholderText("例如：对比 Electron、PySide6 与 Swift 的桌面端优劣势")
        layout.addWidget(self.topic_edit)

        # Participants
        layout.addWidget(QLabel("<b>参会 Agent / Participants:</b>"))
        self.cb_codex = QCheckBox("Codex (OpenAI)")
        self.cb_claude = QCheckBox("Claude (Anthropic)")
        self.cb_cursor = QCheckBox("Cursor (Anysphere)")
        self.cb_agy = QCheckBox("Antigravity (AGY)")

        self.cb_codex.setChecked(True)
        self.cb_claude.setChecked(True)
        self.cb_cursor.setChecked(True)

        layout.addWidget(self.cb_codex)
        layout.addWidget(self.cb_claude)
        layout.addWidget(self.cb_cursor)
        layout.addWidget(self.cb_agy)

        # Mode
        layout.addWidget(QLabel("<b>讨论模式 / Mode:</b>"))
        self.mode_combo = QComboBox()
        self.mode_combo.addItem("逐轮共同讨论 / Discussion Mode", "discussion")
        self.mode_combo.addItem("同题独立调查 / Independent Mode", "independent")
        layout.addWidget(self.mode_combo)

        # Leader
        layout.addWidget(QLabel("<b>会议负责人 / Designated Leader:</b>"))
        self.leader_combo = QComboBox()
        self.leader_combo.addItem("Claude", "claude")
        self.leader_combo.addItem("Codex", "codex")
        self.leader_combo.addItem("Cursor", "cursor")
        self.leader_combo.addItem("Antigravity", "agy")
        layout.addWidget(self.leader_combo)

        # Max Rounds
        layout.addWidget(QLabel("<b>最大讨论轮次 / Max Rounds (1-10):</b>"))
        self.rounds_spin = QSpinBox()
        self.rounds_spin.setRange(1, 10)
        self.rounds_spin.setValue(3)
        layout.addWidget(self.rounds_spin)

        # Buttons
        btn_box = QHBoxLayout()
        self.btn_cancel = QPushButton("取消 / Cancel")
        self.btn_ok = QPushButton("创建会议 / Create")
        self.btn_ok.setObjectName("PrimaryBtn")

        self.btn_cancel.clicked.connect(self.reject)
        self.btn_ok.clicked.connect(self.accept)

        btn_box.addStretch()
        btn_box.addWidget(self.btn_cancel)
        btn_box.addWidget(self.btn_ok)
        layout.addLayout(btn_box)

    def get_data(self):
        participants = []
        if self.cb_codex.isChecked(): participants.append('codex')
        if self.cb_claude.isChecked(): participants.append('claude')
        if self.cb_cursor.isChecked(): participants.append('cursor')
        if self.cb_agy.isChecked(): participants.append('agy')
        if not participants:
            participants = ['claude', 'codex']

        return {
            'topic': self.topic_edit.text().strip() or "新建讨论",
            'participants': participants,
            'mode': self.mode_combo.currentData(),
            'leader': self.leader_combo.currentData(),
            'max_rounds': self.rounds_spin.value()
        }

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("圆桌会议 · Roundtable (PySide6)")
        self.resize(1180, 800)
        self.setStyleSheet(STYLE_SHEET)

        self.store = MeetingStore()
        self.worker = None
        self.current_meeting = None

        self.init_ui()
        self.load_meetings()

    def init_ui(self):
        splitter = QSplitter(Qt.Horizontal)

        # 1. Left Sidebar
        sidebar = QFrame()
        sidebar.setObjectName("Sidebar")
        sidebar_layout = QVBoxLayout(sidebar)
        sidebar_layout.setContentsMargins(12, 16, 12, 16)

        title_lbl = QLabel("<b>圆桌会议 · Roundtable</b>")
        title_lbl.setStyleSheet("font-size: 15px; color: #1f2937;")
        sidebar_layout.addWidget(title_lbl)

        btn_new = QPushButton("+ 新建会议 / New")
        btn_new.setObjectName("PrimaryBtn")
        btn_new.clicked.connect(self.on_new_meeting)
        sidebar_layout.addWidget(btn_new)

        sidebar_layout.addWidget(QLabel("<b>会议历史 / History:</b>"))
        self.meetings_list = QListWidget()
        self.meetings_list.itemClicked.connect(self.on_meeting_selected)
        sidebar_layout.addWidget(self.meetings_list)

        splitter.addWidget(sidebar)

        # 2. Main Right Panel
        main_panel = QFrame()
        main_layout = QVBoxLayout(main_panel)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # Top Header
        self.header = QFrame()
        self.header.setObjectName("Header")
        header_layout = QHBoxLayout(self.header)

        self.topic_lbl = QLabel("请选择或新建一个会议")
        self.topic_lbl.setStyleSheet("font-size: 16px; font-weight: 600; color: #111827;")
        header_layout.addWidget(self.topic_lbl)

        header_layout.addStretch()

        self.status_badge = QLabel("空闲 / Idle")
        self.status_badge.setStyleSheet("color: #4b5563; background: #e5e7eb; padding: 4px 8px; border-radius: 4px;")
        header_layout.addWidget(self.status_badge)

        self.btn_pause = QPushButton("暂停 / Pause")
        self.btn_pause.clicked.connect(self.on_toggle_pause)
        self.btn_pause.setEnabled(False)
        header_layout.addWidget(self.btn_pause)

        main_layout.addWidget(self.header)

        # Discussion Scroll Area
        self.scroll_area = QScrollArea()
        self.scroll_area.setObjectName("ChatArea")
        self.scroll_area.setWidgetResizable(True)
        self.chat_container = QWidget()
        self.chat_layout = QVBoxLayout(self.chat_container)
        self.chat_layout.setAlignment(Qt.AlignTop)
        self.chat_layout.setContentsMargins(20, 20, 20, 20)
        self.scroll_area.setWidget(self.chat_container)
        main_layout.addWidget(self.scroll_area)

        # Bottom Interruption Bar
        bottom_bar = QFrame()
        bottom_bar.setStyleSheet("background: #ffffff; border-top: 1px solid #e5e5e0; padding: 10px 16px;")
        bottom_layout = QHBoxLayout(bottom_bar)

        self.input_edit = QLineEdit()
        self.input_edit.setPlaceholderText("人类排队插话发言 / Human speech or clarification...")
        self.input_edit.returnPressed.connect(self.on_send_human_speech)
        bottom_layout.addWidget(self.input_edit)

        self.btn_send = QPushButton("插话 / Speak")
        self.btn_send.clicked.connect(self.on_send_human_speech)
        bottom_layout.addWidget(self.btn_send)

        main_layout.addWidget(bottom_bar)

        splitter.addWidget(main_panel)
        splitter.setStretchFactor(0, 1)
        splitter.setStretchFactor(1, 3)

        self.setCentralWidget(splitter)

    def load_meetings(self):
        self.meetings_list.clear()
        meetings = self.store.list_meetings()
        if not meetings:
            # Create a sample comparison meeting
            sample = Meeting(
                id="M-ARCH-001",
                topic="跨技术栈对比：Electron vs PySide6 vs Native Swift 资源与性能",
                participants=['claude', 'codex', 'cursor'],
                leader='claude',
                max_rounds=3,
                messages=[
                    {
                        'id': 'M-01-01',
                        'author': 'claude',
                        'text': '从架构上看，Electron 基于 Chromium + Node.js，跨平台开发极快但内存基线高；PySide6 基于 Qt6 C++，单进程内存紧凑；SwiftUI 是 macOS 顶级原生体验，体积与内存消耗最低。',
                        'round': 1,
                        'origin': 'provider',
                        'ready_to_conclude': True
                    }
                ]
            )
            self.store.save(sample)
            meetings = [sample]

        for m in meetings:
            item = QListWidgetItem(f"[{m.status.upper()}] {m.topic[:24]}...")
            item.setData(Qt.UserRole, m.id)
            self.meetings_list.addItem(item)

        if self.meetings_list.count() > 0:
            self.meetings_list.setCurrentRow(0)
            self.on_meeting_selected(self.meetings_list.item(0))

    def on_meeting_selected(self, item):
        meeting_id = item.data(Qt.UserRole)
        m = self.store.load(meeting_id)
        if not m:
            return
        self.current_meeting = m
        self.topic_lbl.setText(f"{m.topic} (Round {m.round}/{m.max_rounds})")
        self.status_badge.setText(f"状态: {m.status}")
        self.render_messages(m)

    def render_messages(self, meeting: Meeting):
        # Clear existing
        while self.chat_layout.count():
            child = self.chat_layout.takeAt(0)
            if child.widget():
                child.widget().deleteLater()

        for msg in meeting.messages:
            self.add_message_card(msg)

        if meeting.decision:
            self.add_decision_card(meeting.decision)

    def add_message_card(self, msg: dict):
        card = QFrame()
        card.setProperty("class", "MessageCard")
        card_layout = QVBoxLayout(card)

        # Header: Author & Round
        hdr = QHBoxLayout()
        author_id = msg.get('author', 'human')
        info = PARTICIPANTS_INFO.get(author_id, {'name': '人类发言者 (Human)', 'color': '#2563eb'})
        
        author_lbl = QLabel(f"<b>{info['name']}</b> · 第 {msg.get('round', 1)} 轮")
        author_lbl.setStyleSheet(f"color: {info['color']}; font-size: 13px;")
        hdr.addWidget(author_lbl)
        hdr.addStretch()

        if msg.get('ready_to_conclude'):
            ready_lbl = QLabel("✓ 建议总结 / Ready")
            ready_lbl.setStyleSheet("color: #059669; font-size: 11px;")
            hdr.addWidget(ready_lbl)

        card_layout.addLayout(hdr)

        # Body
        body_lbl = QLabel(msg.get('text', ''))
        body_lbl.setWordWrap(True)
        body_lbl.setStyleSheet("font-size: 14px; line-height: 1.5; color: #1f2937; margin-top: 4px;")
        card_layout.addWidget(body_lbl)

        self.chat_layout.addWidget(card)

    def add_decision_card(self, decision: dict):
        card = QFrame()
        card.setProperty("class", "DecisionCard")
        card_layout = QVBoxLayout(card)

        title = QLabel(f"<b>📋 会议负责人总结草稿 / Leader's Summary ({decision.get('author', 'Leader')})</b>")
        title.setStyleSheet("color: #166534; font-size: 14px;")
        card_layout.addWidget(title)

        rec = QLabel(decision.get('recommendation', ''))
        rec.setWordWrap(True)
        rec.setStyleSheet("color: #14532d; font-size: 13px; margin: 4px 0;")
        card_layout.addWidget(rec)

        self.chat_layout.addWidget(card)

    def on_new_meeting(self):
        dlg = NewMeetingDialog(self)
        if dlg.exec():
            data = dlg.get_data()
            import uuid
            m_id = f"M-{uuid.uuid4().hex[:6].upper()}"
            m = Meeting(
                id=m_id,
                topic=data['topic'],
                participants=data['participants'],
                mode=data['mode'],
                leader=data['leader'],
                max_rounds=data['max_rounds']
            )
            self.store.save(m)
            self.load_meetings()

            # Start meeting worker
            self.start_meeting(m)

    def start_meeting(self, meeting: Meeting):
        self.current_meeting = meeting
        self.btn_pause.setEnabled(True)
        self.btn_pause.setText("暂停 / Pause")

        self.worker = MeetingWorker(meeting)
        self.worker.turn_started.connect(lambda p, r: self.status_badge.setText(f"轮到 {p} (第 {r} 轮)..."))
        self.worker.turn_finished.connect(lambda msg: (self.add_message_card(msg), self.store.save(self.current_meeting)))
        self.worker.meeting_completed.connect(lambda dec: (self.add_decision_card(dec), self.status_badge.setText("已完成 / Done"), self.btn_pause.setEnabled(False), self.store.save(self.current_meeting)))
        self.worker.round_advanced.connect(lambda r: self.topic_lbl.setText(f"{self.current_meeting.topic} (Round {r}/{self.current_meeting.max_rounds})"))
        self.worker.start()

    def on_toggle_pause(self):
        if not self.worker:
            return
        if self.worker._is_paused:
            self.worker.resume()
            self.btn_pause.setText("暂停 / Pause")
        else:
            self.worker.pause()
            self.btn_pause.setText("继续 / Resume")

    def on_send_human_speech(self):
        text = self.input_edit.text().strip()
        if not text or not self.current_meeting:
            return
        self.input_edit.clear()

        msg = {
            'id': f"M-HUMAN-{len(self.current_meeting.messages) + 1}",
            'author': 'human',
            'text': f"[人类插话] {text}",
            'round': self.current_meeting.round,
            'origin': 'human'
        }
        self.current_meeting.messages.append(msg)
        self.add_message_card(msg)
        self.store.save(self.current_meeting)
