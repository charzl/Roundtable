"""
PySide6 User Interface for Roundtable (圆桌会议).
Faithfully matching the JavaScript / Electron version's visual design,
color palette, typography, three-column layout, and iconic ◌ brand logo.
"""

from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QFont, QColor, QPalette, QIcon, QPainter, QBrush, QPen
from PySide6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QListWidget, QListWidgetItem, QTextEdit, QLineEdit,
    QSplitter, QFrame, QScrollArea, QDialog, QComboBox, QCheckBox,
    QSpinBox, QGroupBox, QMessageBox
)
from models import Meeting, PARTICIPANTS_INFO, MeetingStore
from engine import MeetingWorker

# Exact CSS theme from javascript/ui/style.css
STYLE_SHEET = """
QWidget {
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", sans-serif;
    color: #25372f;
}
QMainWindow {
    background-color: #f5f5f0;
}
QSplitter::handle {
    background-color: #dce3da;
}

/* Header Bar */
#HeaderBar {
    background-color: #ffffff;
    border-bottom: 1px solid #dce3da;
    min-height: 64px;
    max-height: 64px;
    padding: 0 24px;
}
#BrandIcon {
    font-size: 28px;
    font-weight: 300;
    color: #345d46;
}
#BrandTitle {
    font-size: 19px;
    font-weight: 600;
    color: #25372f;
}
#BrandSubtitle {
    font-size: 12px;
    font-weight: 400;
    color: #6a786f;
    margin-left: 6px;
}

/* Sidebars & Main Panels */
#LeftSidebar {
    background-color: #ffffff;
    border-right: 1px solid #dce3da;
}
#RightSidebar {
    background-color: #ffffff;
    border-left: 1px solid #dce3da;
}
#MainCanvas {
    background-color: #f5f5f0;
}

/* Control Pills & Tabs */
#ControlBar {
    background-color: #edf1e9;
    border-radius: 9px;
    padding: 10px 14px;
}
#TabsBar {
    border-bottom: 1px solid #dce3da;
    background: transparent;
}

/* Buttons */
QPushButton {
    background-color: #ffffff;
    border: 1px solid #dce3da;
    border-radius: 8px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    color: #25372f;
}
QPushButton:hover {
    background-color: #edf1e9;
}
QPushButton:disabled {
    opacity: 0.45;
    background-color: #f5f5f0;
    color: #6a786f;
}

/* Primary Action Button (Forest / Sage Green #345d46) */
QPushButton#PrimaryBtn {
    background-color: #345d46;
    border: 1px solid #345d46;
    color: #ffffff;
    font-weight: 600;
}
QPushButton#PrimaryBtn:hover {
    background-color: #264b36;
    border-color: #264b36;
}

/* Input & Textarea */
QLineEdit, QTextEdit {
    background-color: #ffffff;
    border: 1px solid #dce3da;
    border-radius: 9px;
    padding: 8px 12px;
    color: #25372f;
    font-size: 13px;
}
QLineEdit:focus, QTextEdit:focus {
    border: 2px solid #345d46;
}

/* Meeting List Widget */
QListWidget {
    background-color: transparent;
    border: none;
    outline: none;
}
QListWidget::item {
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 4px;
    color: #25372f;
}
QListWidget::item:hover {
    background-color: #f5f5f0;
}
QListWidget::item:selected {
    background-color: #edf1e9;
    color: #25372f;
    font-weight: 500;
}

/* Message Cards */
.MessageCard {
    background-color: #ffffff;
    border: 1px solid #dce3da;
    border-radius: 10px;
    padding: 16px 18px;
    margin-bottom: 12px;
}
.DecisionCard {
    background-color: #edf1e9;
    border: 1px solid #345d46;
    border-radius: 10px;
    padding: 18px 20px;
    margin-top: 14px;
    margin-bottom: 14px;
}
"""

class AvatarBadge(QLabel):
    """Circular 30px avatar badge matching the JavaScript avatar."""
    def __init__(self, text: str, border_color: str = "#dce3da", bg_color: str = "#ffffff", text_color: str = "#25372f", parent=None):
        super().__init__(text, parent)
        self.setFixedSize(30, 30)
        self.setAlignment(Qt.AlignCenter)
        self.setStyleSheet(f"""
            QLabel {{
                background-color: {bg_color};
                border: 1px solid {border_color};
                border-radius: 15px;
                color: {text_color};
                font-size: 11px;
                font-weight: 600;
            }}
        """)

class NewMeetingDialog(QDialog):
    """New meeting modal matching new-dialog in JavaScript version."""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("新圆桌会议 / New Roundtable Meeting")
        self.resize(520, 560)
        self.setStyleSheet("""
            QDialog { background-color: #f5f5f0; }
            QLabel { color: #25372f; font-size: 13px; }
            .CardRow {
                background-color: #ffffff;
                border: 1px solid #dce3da;
                border-radius: 8px;
                padding: 10px 14px;
                margin-bottom: 8px;
            }
        """)
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(28, 24, 28, 24)
        layout.setSpacing(14)

        # Title
        hdr = QLabel("<b>新圆桌会议</b>")
        hdr.setStyleSheet("font-size: 20px; font-weight: 600; color: #25372f;")
        layout.addWidget(hdr)

        # Topic
        layout.addWidget(QLabel("<b>想一起讨论什么？</b>"))
        self.topic_edit = QTextEdit()
        self.topic_edit.setPlaceholderText("说明问题、背景，以及你重视的判断标准。")
        self.topic_edit.setFixedHeight(75)
        layout.addWidget(self.topic_edit)

        # Mode
        mode_layout = QHBoxLayout()
        mode_layout.addWidget(QLabel("会议模式:"))
        self.mode_combo = QComboBox()
        self.mode_combo.addItem("公开讨论模式 (Discussion)", "discussion")
        self.mode_combo.addItem("独立调研模式 (Independent)", "independent")
        mode_layout.addWidget(self.mode_combo)
        layout.addLayout(mode_layout)

        # Participants selection
        layout.addWidget(QLabel("<b>选择参会者 · 至少两位</b>"))
        
        self.cb_codex = QCheckBox("  Codex (OpenAI) · CLI 默认模型")
        self.cb_claude = QCheckBox("  Claude (Anthropic) · CLI 默认模型")
        self.cb_agy = QCheckBox("  Antigravity (AGY) · 运行时默认模型")
        self.cb_cursor = QCheckBox("  Cursor (Anysphere) · CLI 默认模型")

        for cb in [self.cb_codex, self.cb_claude, self.cb_agy, self.cb_cursor]:
            cb.setChecked(True)
            row = QFrame()
            row.setProperty("class", "CardRow")
            r_lay = QHBoxLayout(row)
            r_lay.setContentsMargins(10, 8, 10, 8)
            r_lay.addWidget(cb)
            layout.addWidget(row)

        # Leader & Max rounds
        meta_layout = QHBoxLayout()
        meta_layout.addWidget(QLabel("Leader (负责最终总结):"))
        self.leader_combo = QComboBox()
        self.leader_combo.addItem("Codex", "codex")
        self.leader_combo.addItem("Claude", "claude")
        self.leader_combo.addItem("Cursor", "cursor")
        self.leader_combo.addItem("Antigravity", "agy")
        meta_layout.addWidget(self.leader_combo)

        meta_layout.addWidget(QLabel("最多轮数:"))
        self.rounds_spin = QSpinBox()
        self.rounds_spin.setRange(1, 10)
        self.rounds_spin.setValue(10)
        meta_layout.addWidget(self.rounds_spin)
        layout.addLayout(meta_layout)

        # Actions
        actions = QHBoxLayout()
        actions.addStretch()
        btn_cancel = QPushButton("取消")
        btn_cancel.clicked.connect(self.reject)
        actions.addWidget(btn_cancel)

        btn_create = QPushButton("开始新讨论")
        btn_create.setObjectName("PrimaryBtn")
        btn_create.clicked.connect(self.accept)
        actions.addWidget(btn_create)

        layout.addLayout(actions)

    def get_data(self):
        participants = []
        if self.cb_codex.isChecked(): participants.append('codex')
        if self.cb_claude.isChecked(): participants.append('claude')
        if self.cb_agy.isChecked(): participants.append('agy')
        if self.cb_cursor.isChecked(): participants.append('cursor')
        if len(participants) < 2:
            participants = ['claude', 'codex']

        return {
            'topic': self.topic_edit.toPlainText().strip() or "新建圆桌讨论",
            'participants': participants,
            'mode': self.mode_combo.currentData(),
            'leader': self.leader_combo.currentData(),
            'max_rounds': self.rounds_spin.value()
        }


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("圆桌会议 · Roundtable")
        self.resize(1200, 800)
        self.setStyleSheet(STYLE_SHEET)

        self.store = MeetingStore()
        self.worker = None
        self.current_meeting = None

        self.init_ui()
        self.load_meetings()

    def init_ui(self):
        root_container = QWidget()
        root_layout = QVBoxLayout(root_container)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)

        # ==========================================
        # 1. Top Header Bar (Matching JavaScript UI)
        # ==========================================
        header_bar = QFrame()
        header_bar.setObjectName("HeaderBar")
        hb_layout = QHBoxLayout(header_bar)
        hb_layout.setContentsMargins(28, 0, 28, 0)
        hb_layout.setSpacing(16)

        # Brand: ◌ 圆桌会议 Roundtable
        brand_box = QHBoxLayout()
        brand_box.setSpacing(10)
        
        lbl_brand_icon = QLabel("◌")
        lbl_brand_icon.setObjectName("BrandIcon")
        brand_box.addWidget(lbl_brand_icon)

        lbl_brand_text = QLabel("圆桌会议")
        lbl_brand_text.setObjectName("BrandTitle")
        brand_box.addWidget(lbl_brand_text)

        lbl_brand_sub = QLabel("Roundtable")
        lbl_brand_sub.setObjectName("BrandSubtitle")
        brand_box.addWidget(lbl_brand_sub)
        
        hb_layout.addLayout(brand_box)
        hb_layout.addStretch()

        # Right Bar Actions
        status_conn = QLabel("● 本地服务已就绪")
        status_conn.setStyleSheet("color: #345d46; font-size: 12px; font-weight: 500;")
        hb_layout.addWidget(status_conn)

        lang_lbl = QLabel("界面语言")
        lang_lbl.setStyleSheet("color: #6a786f; font-size: 12px;")
        hb_layout.addWidget(lang_lbl)

        lang_combo = QComboBox()
        lang_combo.addItem("中文")
        lang_combo.addItem("English")
        lang_combo.setStyleSheet("border: 1px solid #dce3da; border-radius: 7px; padding: 4px 8px; font-size: 12px;")
        hb_layout.addWidget(lang_combo)

        btn_capabilities = QPushButton("共享能力")
        hb_layout.addWidget(btn_capabilities)

        btn_new_header = QPushButton("+ 新会议")
        btn_new_header.setObjectName("PrimaryBtn")
        btn_new_header.clicked.connect(self.on_new_meeting)
        hb_layout.addWidget(btn_new_header)

        root_layout.addWidget(header_bar)

        # ==========================================
        # 2. Main Three-Column Splitter Layout
        # ==========================================
        splitter = QSplitter(Qt.Horizontal)

        # ------------------------------------------
        # Column 1: Left Sidebar (Meetings & Participants)
        # ------------------------------------------
        left_sidebar = QFrame()
        left_sidebar.setObjectName("LeftSidebar")
        left_layout = QVBoxLayout(left_sidebar)
        left_layout.setContentsMargins(16, 20, 16, 20)
        left_layout.setSpacing(12)

        lbl_meetings_hdr = QLabel("会议记录")
        lbl_meetings_hdr.setStyleSheet("font-size: 14px; font-weight: 600; color: #25372f; padding-left: 6px;")
        left_layout.addWidget(lbl_meetings_hdr)

        self.meetings_list = QListWidget()
        self.meetings_list.itemClicked.connect(self.on_meeting_selected)
        left_layout.addWidget(self.meetings_list, 2)

        # Sidebar Divider Note
        note_divider = QLabel("一次一位公开发言 · 最多 10 轮 · 决定由你做出")
        note_divider.setStyleSheet("color: #6a786f; font-size: 12px; line-height: 1.6; border-top: 1px solid #dce3da; padding-top: 14px;")
        note_divider.setWordWrap(True)
        left_layout.addWidget(note_divider)

        # Participants Section
        lbl_participants_hdr = QLabel("参会者")
        lbl_participants_hdr.setStyleSheet("font-size: 14px; font-weight: 600; color: #25372f; padding-left: 6px; margin-top: 8px;")
        left_layout.addWidget(lbl_participants_hdr)

        self.participants_container = QVBoxLayout()
        self.participants_container.setSpacing(8)
        left_layout.addLayout(self.participants_container)
        left_layout.addStretch()

        splitter.addWidget(left_sidebar)

        # ------------------------------------------
        # Column 2: Center Main Discussion Panel
        # ------------------------------------------
        center_panel = QFrame()
        center_panel.setObjectName("MainCanvas")
        center_layout = QVBoxLayout(center_panel)
        center_layout.setContentsMargins(28, 24, 28, 20)
        center_layout.setSpacing(14)

        # Eyebrow Round Status
        self.eyebrow_lbl = QLabel("第 1 轮 / 最多 10 轮 · 公开讨论 · 尚未开始")
        self.eyebrow_lbl.setStyleSheet("font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6a786f;")
        center_layout.addWidget(self.eyebrow_lbl)

        # Topic Title + Export Button
        topic_row = QHBoxLayout()
        self.topic_lbl = QLabel("请选择或新建圆桌会议")
        self.topic_lbl.setStyleSheet("font-size: 24px; font-weight: 600; color: #25372f;")
        self.topic_lbl.setWordWrap(True)
        topic_row.addWidget(self.topic_lbl, 1)

        btn_export = QPushButton("导出")
        btn_export.clicked.connect(self.on_export)
        topic_row.addWidget(btn_export)
        center_layout.addLayout(topic_row)

        # Leader & Language Bar
        settings_row = QHBoxLayout()
        settings_row.addWidget(QLabel("会议 Leader:"))
        self.leader_lbl = QLabel("Codex")
        self.leader_lbl.setStyleSheet("font-weight: 500; color: #25372f;")
        settings_row.addWidget(self.leader_lbl)

        settings_row.addSpacing(16)
        settings_row.addWidget(QLabel("输出语言: 随系统"))
        settings_row.addStretch()
        center_layout.addLayout(settings_row)

        # Tabs: [ 公开讨论 ] [ 总结与决定 ]
        tabs_row = QHBoxLayout()
        self.tab_discussion = QPushButton("公开讨论")
        self.tab_discussion.setStyleSheet("background-color: #edf1e9; font-weight: 600; border: none;")
        tabs_row.addWidget(self.tab_discussion)

        self.tab_decision = QPushButton("总结与决定")
        self.tab_decision.setStyleSheet("background: transparent; border: none; color: #6a786f;")
        tabs_row.addWidget(self.tab_decision)
        tabs_row.addStretch()
        center_layout.addLayout(tabs_row)

        # Status & Control Pill Bar
        self.control_bar = QFrame()
        self.control_bar.setObjectName("ControlBar")
        ctrl_layout = QHBoxLayout(self.control_bar)
        ctrl_layout.setContentsMargins(14, 10, 14, 10)

        self.turn_state_lbl = QLabel("尚未开始")
        self.turn_state_lbl.setStyleSheet("font-size: 13px; font-weight: 500; color: #25372f;")
        ctrl_layout.addWidget(self.turn_state_lbl)
        ctrl_layout.addStretch()

        self.btn_start = QPushButton("开始讨论")
        self.btn_start.setObjectName("PrimaryBtn")
        self.btn_start.clicked.connect(self.on_start_meeting)
        ctrl_layout.addWidget(self.btn_start)

        self.btn_pause = QPushButton("暂停")
        self.btn_pause.clicked.connect(self.on_toggle_pause)
        self.btn_pause.setEnabled(False)
        ctrl_layout.addWidget(self.btn_pause)

        self.btn_finish = QPushButton("结束并总结")
        self.btn_finish.clicked.connect(self.on_finish_meeting)
        self.btn_finish.setEnabled(False)
        ctrl_layout.addWidget(self.btn_finish)

        center_layout.addWidget(self.control_bar)

        # Discussion Scroll Area
        self.scroll_area = QScrollArea()
        self.scroll_area.setWidgetResizable(True)
        self.scroll_area.setStyleSheet("background-color: transparent; border: none;")
        self.chat_container = QWidget()
        self.chat_container.setStyleSheet("background-color: transparent;")
        self.chat_layout = QVBoxLayout(self.chat_container)
        self.chat_layout.setAlignment(Qt.AlignTop)
        self.chat_layout.setContentsMargins(0, 6, 0, 6)
        self.chat_layout.setSpacing(10)
        self.scroll_area.setWidget(self.chat_container)
        center_layout.addWidget(self.scroll_area, 1)

        # Human Speech Composer
        composer_frame = QFrame()
        composer_layout = QVBoxLayout(composer_frame)
        composer_layout.setContentsMargins(0, 6, 0, 0)
        composer_layout.setSpacing(8)

        lbl_composer = QLabel("<b>插话或补充判断标准</b>")
        lbl_composer.setStyleSheet("font-size: 13px; font-weight: 500; color: #25372f;")
        composer_layout.addWidget(lbl_composer)

        self.input_edit = QTextEdit()
        self.input_edit.setPlaceholderText("例如：请先核实这个假设，再讨论方案。")
        self.input_edit.setFixedHeight(65)
        composer_layout.addWidget(self.input_edit)

        compose_actions = QHBoxLayout()
        note_lbl = QLabel("发言会加入共同会议记录。")
        note_lbl.setStyleSheet("color: #6a786f; font-size: 12px;")
        compose_actions.addWidget(note_lbl)
        compose_actions.addStretch()

        self.btn_submit_speech = QPushButton("提交发言")
        self.btn_submit_speech.setObjectName("PrimaryBtn")
        self.btn_submit_speech.clicked.connect(self.on_send_human_speech)
        compose_actions.addWidget(self.btn_submit_speech)
        composer_layout.addLayout(compose_actions)

        center_layout.addWidget(composer_frame)

        splitter.addWidget(center_panel)

        # ------------------------------------------
        # Column 3: Right Sidebar (Evidence & Claims)
        # ------------------------------------------
        right_sidebar = QFrame()
        right_sidebar.setObjectName("RightSidebar")
        right_layout = QVBoxLayout(right_sidebar)
        right_layout.setContentsMargins(20, 24, 20, 24)
        right_layout.setSpacing(12)

        lbl_evidence_hdr = QLabel("观点与证据")
        lbl_evidence_hdr.setStyleSheet("font-size: 14px; font-weight: 600; color: #25372f;")
        right_layout.addWidget(lbl_evidence_hdr)

        lbl_evidence_desc = QLabel("引用来源不代表已验证。核查记录保留作者与方法。")
        lbl_evidence_desc.setStyleSheet("color: #6a786f; font-size: 12px; line-height: 1.5;")
        lbl_evidence_desc.setWordWrap(True)
        right_layout.addWidget(lbl_evidence_desc)

        self.evidence_content = QLabel("选择一条观点，查看它的依据、方法和限制。")
        self.evidence_content.setStyleSheet("color: #6a786f; font-size: 12px; margin-top: 14px;")
        self.evidence_content.setWordWrap(True)
        right_layout.addWidget(self.evidence_content)
        right_layout.addStretch()

        splitter.addWidget(right_sidebar)

        # Set Column Proportions: 220px | 1fr | 260px
        splitter.setSizes([220, 720, 260])
        splitter.setStretchFactor(0, 0)
        splitter.setStretchFactor(1, 1)
        splitter.setStretchFactor(2, 0)

        root_layout.addWidget(splitter)
        self.setCentralWidget(root_container)

    def load_meetings(self):
        self.meetings_list.clear()
        meetings = self.store.list_meetings()
        if not meetings:
            sample = Meeting(
                id="M-DESKTOP-01",
                topic="桌面验收：讨论应用的验证方法（只创建，不调用模型）",
                participants=['codex', 'claude', 'agy', 'cursor'],
                leader='codex',
                max_rounds=10,
                messages=[
                    {
                        'id': 'M-001',
                        'author': 'human',
                        'text': '桌面验收：讨论应用的验证方法（只创建，不调用模型）',
                        'round': 1,
                        'origin': 'human'
                    },
                    {
                        'id': 'M-002',
                        'author': 'human',
                        'text': '这条人类补充需要持久化。',
                        'round': 1,
                        'origin': 'human'
                    }
                ]
            )
            self.store.save(sample)
            meetings = [sample]

        for m in meetings:
            item = QListWidgetItem()
            item.setText(f"{m.topic[:22]}...\n{m.status} · 2026/10/4")
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
        self.topic_lbl.setText(m.topic)
        self.leader_lbl.setText(PARTICIPANTS_INFO.get(m.leader, {}).get('name', m.leader))
        self.eyebrow_lbl.setText(f"第 {m.round} 轮 / 最多 {m.max_rounds} 轮 · 公开讨论 · {m.status}")
        self.turn_state_lbl.setText("尚未开始" if m.status == "active" and not m.messages else f"状态: {m.status}")

        self.update_participants_sidebar(m)
        self.render_messages(m)

    def update_participants_sidebar(self, meeting: Meeting):
        while self.participants_container.count():
            child = self.participants_container.takeAt(0)
            if child.widget():
                child.widget().deleteLater()

        # Human participant
        h_row = QWidget()
        h_lay = QHBoxLayout(h_row)
        h_lay.setContentsMargins(4, 2, 4, 2)
        h_lay.addWidget(AvatarBadge("你", border_color="#345d46", bg_color="#edf1e9", text_color="#345d46"))
        h_info = QVBoxLayout()
        h_info.setSpacing(0)
        h_name = QLabel("<b>你</b>")
        h_role = QLabel("会议发起人")
        h_role.setStyleSheet("color: #6a786f; font-size: 11px;")
        h_info.addWidget(h_name)
        h_info.addWidget(h_role)
        h_lay.addLayout(h_info)
        h_lay.addStretch()
        self.participants_container.addWidget(h_row)

        # AI Participants
        for p_id in meeting.participants:
            info = PARTICIPANTS_INFO.get(p_id, {'name': p_id, 'color': '#6a786f'})
            row = QWidget()
            r_lay = QHBoxLayout(row)
            r_lay.setContentsMargins(4, 2, 4, 2)
            badge_text = info['name'][:2]
            r_lay.addWidget(AvatarBadge(badge_text, border_color="#dce3da", bg_color="#ffffff", text_color="#25372f"))
            p_info = QVBoxLayout()
            p_info.setSpacing(0)
            p_name = QLabel(f"<b>{info['name']}</b>")
            p_role_text = "Leader · 会议负责人" if p_id == meeting.leader else "等待发言"
            p_role = QLabel(p_role_text)
            p_role.setStyleSheet("color: #6a786f; font-size: 11px;")
            p_info.addWidget(p_name)
            p_info.addWidget(p_role)
            r_lay.addLayout(p_info)
            r_lay.addStretch()
            self.participants_container.addWidget(row)

    def render_messages(self, meeting: Meeting):
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
        card_layout.setContentsMargins(14, 12, 14, 12)
        card_layout.setSpacing(8)

        # Header: Avatar + Author + Round
        hdr = QHBoxLayout()
        hdr.setSpacing(8)

        author_id = msg.get('author', 'human')
        if author_id == 'human':
            avatar = AvatarBadge("你", border_color="#345d46", bg_color="#edf1e9", text_color="#345d46")
            name_text = "<b>你</b>"
            meta_text = f"M-{msg.get('round', 1):03d} · 第 {msg.get('round', 1)} 轮 · 人类发言"
        else:
            info = PARTICIPANTS_INFO.get(author_id, {'name': author_id})
            avatar = AvatarBadge(info['name'][:2], border_color="#dce3da", bg_color="#ffffff", text_color="#25372f")
            name_text = f"<b>{info['name']}</b>"
            meta_text = f"{msg.get('id', 'M-000')} · 第 {msg.get('round', 1)} 轮 · 模型发言"

        hdr.addWidget(avatar)

        name_lbl = QLabel(name_text)
        name_lbl.setStyleSheet("font-size: 13px; color: #25372f;")
        hdr.addWidget(name_lbl)

        meta_lbl = QLabel(meta_text)
        meta_lbl.setStyleSheet("color: #6a786f; font-size: 11px;")
        hdr.addWidget(meta_lbl)
        hdr.addStretch()

        if msg.get('ready_to_conclude'):
            ready_lbl = QLabel("✓ 建议总结")
            ready_lbl.setStyleSheet("color: #345d46; font-size: 11px; background: #edf1e9; padding: 2px 6px; border-radius: 4px;")
            hdr.addWidget(ready_lbl)

        card_layout.addLayout(hdr)

        # Message Body
        body_lbl = QLabel(msg.get('text', ''))
        body_lbl.setWordWrap(True)
        body_lbl.setStyleSheet("font-size: 14px; line-height: 1.8; color: #25372f;")
        card_layout.addWidget(body_lbl)

        self.chat_layout.addWidget(card)

    def add_decision_card(self, decision: dict):
        card = QFrame()
        card.setProperty("class", "DecisionCard")
        card_layout = QVBoxLayout(card)

        title = QLabel(f"<b>📋 会议负责人总结与决定 ({decision.get('author', 'Leader')})</b>")
        title.setStyleSheet("color: #25372f; font-size: 15px;")
        card_layout.addWidget(title)

        rec = QLabel(decision.get('recommendation', ''))
        rec.setWordWrap(True)
        rec.setStyleSheet("color: #345d46; font-size: 13px; margin: 6px 0; font-weight: 500;")
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

    def on_start_meeting(self):
        if not self.current_meeting:
            return
        self.btn_start.setEnabled(False)
        self.btn_pause.setEnabled(True)
        self.btn_finish.setEnabled(True)
        self.btn_pause.setText("暂停")

        self.worker = MeetingWorker(self.current_meeting)
        self.worker.turn_started.connect(lambda p, r: self.turn_state_lbl.setText(f"轮到 {PARTICIPANTS_INFO.get(p, {}).get('name', p)} (第 {r} 轮)..."))
        self.worker.turn_finished.connect(lambda msg: (self.add_message_card(msg), self.store.save(self.current_meeting)))
        self.worker.meeting_completed.connect(lambda dec: (
            self.add_decision_card(dec),
            self.turn_state_lbl.setText("会议已完成"),
            self.btn_pause.setEnabled(False),
            self.btn_finish.setEnabled(False),
            self.store.save(self.current_meeting)
        ))
        self.worker.round_advanced.connect(lambda r: self.eyebrow_lbl.setText(f"第 {r} 轮 / 最多 {self.current_meeting.max_rounds} 轮 · 公开讨论 · 进行中"))
        self.worker.start()

    def on_toggle_pause(self):
        if not self.worker:
            return
        if self.worker._is_paused:
            self.worker.resume()
            self.btn_pause.setText("暂停")
        else:
            self.worker.pause()
            self.btn_pause.setText("继续")

    def on_finish_meeting(self):
        if self.worker:
            self.worker.stop()
        self.turn_state_lbl.setText("会议已手动结束")
        self.btn_pause.setEnabled(False)
        self.btn_finish.setEnabled(False)
        self.btn_start.setEnabled(True)

    def on_send_human_speech(self):
        text = self.input_edit.toPlainText().strip()
        if not text or not self.current_meeting:
            return
        self.input_edit.clear()

        msg = {
            'id': f"M-HUMAN-{len(self.current_meeting.messages) + 1:03d}",
            'author': 'human',
            'text': text,
            'round': self.current_meeting.round,
            'origin': 'human'
        }
        self.current_meeting.messages.append(msg)
        self.add_message_card(msg)
        self.store.save(self.current_meeting)

    def on_export(self):
        if not self.current_meeting:
            return
        QMessageBox.information(self, "导出会议", f"会议「{self.current_meeting.topic}」记录已保存在本地数据仓库中。")
