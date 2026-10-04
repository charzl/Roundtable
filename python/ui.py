"""
PySide6 User Interface for Roundtable (圆桌会议).
Faithfully matching the JavaScript / Electron version's visual design,
color palette, typography, three-column layout, and iconic ◌ brand logo.
Includes full Light Mode and Dark Mode support adapting to system appearance,
plus dedicated Setup view for Organizer, Leader, Members, and Judge.
"""

from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QFont, QColor, QPalette, QIcon, QPainter, QBrush, QPen
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QListWidget, QListWidgetItem, QTextEdit, QLineEdit,
    QSplitter, QFrame, QScrollArea, QDialog, QComboBox, QCheckBox,
    QSpinBox, QGroupBox, QMessageBox
)
from models import Meeting, PARTICIPANTS_INFO, JUDGE_INFO, MeetingStore
from engine import MeetingWorker


def get_theme_colors(is_dark: bool) -> dict:
    if is_dark:
        return {
            'bg_main': '#141a17',
            'bg_card': '#1c2420',
            'bg_card_alt': '#243029',
            'border': '#2d3b33',
            'text_primary': '#e5eae7',
            'text_muted': '#8e9e95',
            'accent': '#3ea168',
            'accent_hover': '#4dbb7b',
            'pill_bg': '#222c27',
            'danger': '#f87171'
        }
    else:
        return {
            'bg_main': '#f5f5f0',
            'bg_card': '#ffffff',
            'bg_card_alt': '#edf1e9',
            'border': '#dce3da',
            'text_primary': '#25372f',
            'text_muted': '#6a786f',
            'accent': '#345d46',
            'accent_hover': '#264b36',
            'pill_bg': '#edf1e9',
            'danger': '#dc2626'
        }


def get_theme_stylesheet(is_dark: bool) -> str:
    c = get_theme_colors(is_dark)
    return f"""
QWidget {{
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", sans-serif;
    color: {c['text_primary']};
}}
QMainWindow {{
    background-color: {c['bg_main']};
}}
QSplitter::handle {{
    background-color: {c['border']};
}}

/* Header Bar */
#HeaderBar {{
    background-color: {c['bg_card']};
    border-bottom: 1px solid {c['border']};
    min-height: 64px;
    max-height: 64px;
    padding: 0 24px;
}}
#BrandIcon {{
    font-size: 28px;
    font-weight: 300;
    color: {c['accent']};
}}
#BrandTitle {{
    font-size: 19px;
    font-weight: 600;
    color: {c['text_primary']};
}}
#BrandSubtitle {{
    font-size: 12px;
    font-weight: 400;
    color: {c['text_muted']};
    margin-left: 6px;
}}

/* Sidebars & Main Panels */
#LeftSidebar {{
    background-color: {c['bg_card']};
    border-right: 1px solid {c['border']};
}}
#RightSidebar {{
    background-color: {c['bg_card']};
    border-left: 1px solid {c['border']};
}}
#MainCanvas {{
    background-color: {c['bg_main']};
}}

/* Control Pills & Tabs */
#ControlBar {{
    background-color: {c['pill_bg']};
    border-radius: 9px;
    padding: 10px 14px;
}}
#TabsBar {{
    border-bottom: 1px solid {c['border']};
    background: transparent;
}}

/* Buttons */
QPushButton {{
    background-color: {c['bg_card']};
    border: 1px solid {c['border']};
    border-radius: 8px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    color: {c['text_primary']};
}}
QPushButton:hover {{
    background-color: {c['bg_card_alt']};
}}
QPushButton:disabled {{
    opacity: 0.45;
    background-color: {c['bg_main']};
    color: {c['text_muted']};
}}

/* Primary Action Button (Forest / Sage Green) */
QPushButton#PrimaryBtn {{
    background-color: {c['accent']};
    border: 1px solid {c['accent']};
    color: #ffffff;
    font-weight: 600;
}}
QPushButton#PrimaryBtn:hover {{
    background-color: {c['accent_hover']};
    border-color: {c['accent_hover']};
}}

/* Input & Textarea */
QLineEdit, QTextEdit {{
    background-color: {c['bg_card']};
    border: 1px solid {c['border']};
    border-radius: 9px;
    padding: 8px 12px;
    color: {c['text_primary']};
    font-size: 13px;
}}
QLineEdit:focus, QTextEdit:focus {{
    border: 2px solid {c['accent']};
}}

/* ComboBox & Dropdown Popup (Adaptive Theme) */
QComboBox {{
    background-color: {c['bg_card']};
    color: {c['text_primary']};
    border: 1px solid {c['border']};
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 13px;
}}
QComboBox:hover {{
    background-color: {c['bg_card_alt']};
    border-color: {c['accent']};
}}
QComboBox::drop-down {{
    border: none;
    width: 24px;
}}
QComboBox QAbstractItemView {{
    background-color: {c['bg_card']};
    color: {c['text_primary']};
    border: 1px solid {c['border']};
    border-radius: 8px;
    padding: 4px;
    outline: none;
    selection-background-color: {c['pill_bg']};
    selection-color: {c['accent']};
}}
QComboBox QAbstractItemView::item {{
    min-height: 28px;
    padding: 4px 10px;
    border-radius: 5px;
    color: {c['text_primary']};
}}
QComboBox QAbstractItemView::item:selected {{
    background-color: {c['pill_bg']};
    color: {c['accent']};
    font-weight: 600;
}}

/* Meeting List Widget */
QListWidget {{
    background-color: transparent;
    border: none;
    outline: none;
}}
QListWidget::item {{
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 4px;
    color: {c['text_primary']};
}}
QListWidget::item:hover {{
    background-color: {c['bg_main']};
}}
QListWidget::item:selected {{
    background-color: {c['pill_bg']};
    color: {c['text_primary']};
    font-weight: 500;
}}

/* Message Cards */
.MessageCard {{
    background-color: {c['bg_card']};
    border: 1px solid {c['border']};
    border-radius: 10px;
    padding: 16px 18px;
}}

.JudgeCard {{
    background-color: {c['bg_card']};
    border: 2px solid {c['accent']};
    border-radius: 10px;
    padding: 16px 18px;
}}

.DecisionCard {{
    background-color: {c['bg_card']};
    border: 2px solid {c['accent']};
    border-radius: 10px;
    padding: 18px 20px;
}}

.ClaimBadge {{
    background-color: {c['pill_bg']};
    border: 1px solid {c['border']};
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12px;
    margin-top: 6px;
}}
"""


class AvatarBadge(QLabel):
    """Circular 30x30 avatar badge matching Roundtable aesthetic."""
    def __init__(self, text: str, border_color: str, bg_color: str, text_color: str, parent=None):
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
    """
    Roundtable Meeting Setup Wizard (圆桌会议配置向导).
    Enforces minimum 3 AI participants, lets user assign Organizer and Leader,
    and positions the human exclusively as the Judge.
    """
    def __init__(self, is_dark: bool = False, parent=None):
        super().__init__(parent)
        self.is_dark = is_dark
        self.setWindowTitle("圆桌会议设置向导 · Roundtable Setup")
        self.resize(560, 680)
        self.apply_dialog_style()
        self.init_ui()

    def apply_dialog_style(self):
        c = get_theme_colors(self.is_dark)
        self.setStyleSheet(f"""
            QDialog {{ background-color: {c['bg_main']}; }}
            QLabel {{ color: {c['text_primary']}; font-size: 13px; }}
            .CardRow {{
                background-color: {c['bg_card']};
                border: 1px solid {c['border']};
                border-radius: 8px;
                padding: 10px 14px;
                margin-bottom: 6px;
            }}
            .JudgeBanner {{
                background-color: {c['pill_bg']};
                border: 1px solid {c['accent']};
                border-radius: 8px;
                padding: 12px 14px;
            }}
            .RuleBanner {{
                background-color: {c['bg_card']};
                border: 1px dashed {c['accent']};
                border-radius: 8px;
                padding: 10px 12px;
            }}
            QCheckBox {{
                color: {c['text_primary']};
                font-size: 13px;
                spacing: 8px;
            }}
            QComboBox {{
                background-color: {c['bg_card']};
                color: {c['text_primary']};
                border: 1px solid {c['border']};
                border-radius: 8px;
                padding: 6px 12px;
                font-size: 13px;
            }}
            QComboBox QAbstractItemView {{
                background-color: {c['bg_card']};
                color: {c['text_primary']};
                border: 1px solid {c['border']};
                selection-background-color: {c['pill_bg']};
                selection-color: {c['accent']};
                padding: 4px;
                outline: none;
            }}
            QComboBox QAbstractItemView::item:selected {{
                background-color: {c['pill_bg']};
                color: {c['accent']};
                font-weight: 600;
            }}
            QTextEdit, QSpinBox {{
                background-color: {c['bg_card']};
                color: {c['text_primary']};
                border: 1px solid {c['border']};
                border-radius: 8px;
                padding: 6px 10px;
            }}
            QPushButton {{
                background-color: {c['bg_card']};
                color: {c['text_primary']};
                border: 1px solid {c['border']};
                border-radius: 8px;
                padding: 6px 16px;
                font-size: 13px;
            }}
            QPushButton#PrimaryBtn {{
                background-color: {c['accent']};
                border: 1px solid {c['accent']};
                color: #ffffff;
                font-weight: 600;
            }}
            QPushButton#PrimaryBtn:hover {{
                background-color: {c['accent_hover']};
            }}
        """)

    def init_ui(self):
        c = get_theme_colors(self.is_dark)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(28, 22, 28, 22)
        layout.setSpacing(12)

        # 1. Dialog Header
        hdr = QLabel("<b>◌ 新圆桌会议配置向导</b>")
        hdr.setStyleSheet(f"font-size: 20px; font-weight: 600; color: {c['text_primary']};")
        layout.addWidget(hdr)

        # 2. Judge Identity Banner (人类专属角色说明)
        judge_banner = QFrame()
        judge_banner.setProperty("class", "JudgeBanner")
        j_lay = QVBoxLayout(judge_banner)
        j_lay.setContentsMargins(10, 8, 10, 8)
        j_lay.setSpacing(4)
        j_title = QLabel("<b>⚖️ 你的席位：Judge (裁决者)</b>")
        j_title.setStyleSheet(f"font-size: 13px; color: {c['accent']}; font-weight: 600;")
        j_desc = QLabel("你负责设置议题标准、在会议中随时提问追问，并在最后做出裁定。（人类不进入 AI 候选池，AI 亦不引用人类发言作为参会候选观点）")
        j_desc.setStyleSheet(f"color: {c['text_muted']}; font-size: 11px; line-height: 1.4;")
        j_desc.setWordWrap(True)
        j_lay.addWidget(j_title)
        j_lay.addWidget(j_desc)
        layout.addWidget(judge_banner)

        # 3. Topic Input
        layout.addWidget(QLabel("<b>讨论议题与判断标准:</b>"))
        self.topic_edit = QTextEdit()
        self.topic_edit.setPlaceholderText("说明问题背景，以及你作为 Judge 最看重的决策指标与权衡标准...")
        self.topic_edit.setFixedHeight(65)
        layout.addWidget(self.topic_edit)

        # 4. Mode Selection
        mode_layout = QHBoxLayout()
        mode_layout.addWidget(QLabel("会议模式:"))
        self.mode_combo = QComboBox()
        self.mode_combo.addItem("公开讨论模式 (Discussion)", "discussion")
        self.mode_combo.addItem("独立调研模式 (Independent)", "independent")
        mode_layout.addWidget(self.mode_combo)
        layout.addLayout(mode_layout)

        # 5. AI Candidate Pool Selection (至少 3 位)
        self.lbl_candidates = QLabel("<b>选择参会 AI 候选人 · 至少 3 位</b>")
        layout.addWidget(self.lbl_candidates)

        self.cb_codex = QCheckBox("Codex (OpenAI) · CLI 默认模型")
        self.cb_claude = QCheckBox("Claude (Anthropic) · CLI 默认模型")
        self.cb_agy = QCheckBox("Antigravity (AGY) · 运行时默认模型")
        self.cb_cursor = QCheckBox("Cursor (Anysphere) · CLI 默认模型")

        self.checkboxes = {
            'codex': self.cb_codex,
            'claude': self.cb_claude,
            'agy': self.cb_agy,
            'cursor': self.cb_cursor
        }

        for cb_id, cb in self.checkboxes.items():
            cb.setChecked(True)
            cb.stateChanged.connect(self.on_candidates_changed)
            row = QFrame()
            row.setProperty("class", "CardRow")
            r_lay = QHBoxLayout(row)
            r_lay.setContentsMargins(10, 6, 10, 6)
            r_lay.addWidget(cb)
            layout.addWidget(row)

        # 6. Role Assignment: Organizer & Leader
        roles_layout = QHBoxLayout()
        roles_layout.setSpacing(12)

        org_box = QVBoxLayout()
        org_box.addWidget(QLabel("Organizer (组织者/主持人):"))
        self.organizer_combo = QComboBox()
        self.organizer_combo.currentIndexChanged.connect(self.update_rule_prompt)
        org_box.addWidget(self.organizer_combo)
        roles_layout.addLayout(org_box)

        leader_box = QVBoxLayout()
        leader_box.addWidget(QLabel("Leader (负责人/总结人):"))
        self.leader_combo = QComboBox()
        self.leader_combo.currentIndexChanged.connect(self.update_rule_prompt)
        leader_box.addWidget(self.leader_combo)
        roles_layout.addLayout(leader_box)

        layout.addLayout(roles_layout)

        # 7. Dynamic Rule Prompt Banner (3-role vs 4+-role explanation)
        self.rule_banner = QFrame()
        self.rule_banner.setProperty("class", "RuleBanner")
        b_lay = QVBoxLayout(self.rule_banner)
        b_lay.setContentsMargins(10, 8, 10, 8)
        self.lbl_rule_prompt = QLabel()
        self.lbl_rule_prompt.setWordWrap(True)
        self.lbl_rule_prompt.setStyleSheet(f"font-size: 12px; color: {c['text_primary']}; line-height: 1.4;")
        b_lay.addWidget(self.lbl_rule_prompt)
        layout.addWidget(self.rule_banner)

        # 8. Max rounds & Language
        meta_layout = QHBoxLayout()
        meta_layout.addWidget(QLabel("最多讨论轮数:"))
        self.rounds_spin = QSpinBox()
        self.rounds_spin.setRange(1, 10)
        self.rounds_spin.setValue(10)
        meta_layout.addWidget(self.rounds_spin)
        meta_layout.addStretch()
        layout.addLayout(meta_layout)

        # Validation error message
        self.lbl_error = QLabel()
        self.lbl_error.setStyleSheet(f"color: {c['danger']}; font-size: 12px; font-weight: 500;")
        self.lbl_error.hide()
        layout.addWidget(self.lbl_error)

        # Actions
        actions = QHBoxLayout()
        actions.addStretch()
        btn_cancel = QPushButton("取消")
        btn_cancel.clicked.connect(self.reject)
        actions.addWidget(btn_cancel)

        self.btn_create = QPushButton("开启新讨论")
        self.btn_create.setObjectName("PrimaryBtn")
        self.btn_create.clicked.connect(self.on_submit)
        actions.addWidget(self.btn_create)

        layout.addLayout(actions)

        # Trigger initial population
        self.on_candidates_changed()

    def get_selected_candidates(self) -> list:
        return [p_id for p_id, cb in self.checkboxes.items() if cb.isChecked()]

    def on_candidates_changed(self):
        selected = self.get_selected_candidates()
        
        # Remember current selections
        cur_org = self.organizer_combo.currentData()
        cur_ldr = self.leader_combo.currentData()

        # Repopulate Organizer and Leader combos
        self.organizer_combo.blockSignals(True)
        self.leader_combo.blockSignals(True)
        self.organizer_combo.clear()
        self.leader_combo.clear()

        for p_id in selected:
            name = PARTICIPANTS_INFO.get(p_id, {}).get('name', p_id)
            self.organizer_combo.addItem(name, p_id)
            self.leader_combo.addItem(name, p_id)

        # Restore or pick sensible defaults
        if cur_org in selected:
            idx = self.organizer_combo.findData(cur_org)
            if idx >= 0: self.organizer_combo.setCurrentIndex(idx)
        else:
            if 'claude' in selected:
                self.organizer_combo.setCurrentIndex(self.organizer_combo.findData('claude'))
            elif selected:
                self.organizer_combo.setCurrentIndex(0)

        if cur_ldr in selected:
            idx = self.leader_combo.findData(cur_ldr)
            if idx >= 0: self.leader_combo.setCurrentIndex(idx)
        else:
            if 'codex' in selected:
                self.leader_combo.setCurrentIndex(self.leader_combo.findData('codex'))
            elif len(selected) > 1:
                self.leader_combo.setCurrentIndex(1)
            elif selected:
                self.leader_combo.setCurrentIndex(0)

        self.organizer_combo.blockSignals(False)
        self.leader_combo.blockSignals(False)

        # Validation: at least 3 participants
        c = get_theme_colors(self.is_dark)
        if len(selected) < 3:
            self.lbl_error.setText("⚠️ 必须选择至少 3 位 AI 参会者（1位Organizer + 1位Leader + 1位Member）")
            self.lbl_error.show()
            self.btn_create.setEnabled(False)
        else:
            self.lbl_error.hide()
            self.btn_create.setEnabled(True)

        self.update_rule_prompt()

    def update_rule_prompt(self):
        selected = self.get_selected_candidates()
        org_id = self.organizer_combo.currentData() or "Organizer"
        ldr_id = self.leader_combo.currentData() or "Leader"
        org_name = PARTICIPANTS_INFO.get(org_id, {}).get('name', org_id)
        ldr_name = PARTICIPANTS_INFO.get(ldr_id, {}).get('name', ldr_id)

        members = [PARTICIPANTS_INFO.get(p, {}).get('name', p) for p in selected if p not in (org_id, ldr_id)]
        members_str = "、".join(members) if members else "其他组员"

        if len(selected) == 3:
            msg = (
                f"💡 <b>3 角色规格联动生效</b>：\n"
                f"• <b>{org_name}</b> 为组织者 (Organizer)，将<b>兼任 Member</b> 下场参与圆桌辩论。\n"
                f"• <b>{ldr_name}</b> 为负责人 (Leader)，负责引导讨论与起草最终决策。\n"
                f"• <b>{members_str}</b> 为讨论组员 (Member)。圆桌发言圈共 <b>3 位 AI</b> 依次发言。"
            )
        elif len(selected) >= 4:
            msg = (
                f"💡 <b>4+ 角色规格联动生效</b>：\n"
                f"• <b>{org_name}</b> 单独拎出作为<b>独立主持人</b>负责开场与控场，不占用圆桌辩论槽位。\n"
                f"• 由 <b>{ldr_name}</b> (Leader) 与 <b>{members_str}</b> (Members) 等共 <b>{len(selected)-1} 位 AI</b> 展开专注讨论。"
            )
        else:
            msg = "⚠️ 参会人数不足 3 位，请勾选至少 3 位 AI。"

        self.lbl_rule_prompt.setText(msg)

    def on_submit(self):
        selected = self.get_selected_candidates()
        if len(selected) < 3:
            return
        self.accept()

    def get_data(self) -> dict:
        topic = self.topic_edit.toPlainText().strip()
        if not topic:
            topic = "圆桌架构讨论：多智能体决策与原生性能评测"

        return {
            'topic': topic,
            'participants': self.get_selected_candidates(),
            'mode': self.mode_combo.currentData(),
            'organizer': self.organizer_combo.currentData(),
            'leader': self.leader_combo.currentData(),
            'max_rounds': self.rounds_spin.value()
        }


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("圆桌会议 · Roundtable")
        self.resize(1200, 800)

        # Detect System Color Scheme
        app = QApplication.instance()
        self.is_dark = (app.styleHints().colorScheme() == Qt.ColorScheme.Dark) if app else False
        self.apply_theme()

        # Connect system appearance changes
        if app:
            try:
                app.styleHints().colorSchemeChanged.connect(self.on_system_theme_changed)
            except Exception:
                pass

        self.store = MeetingStore()
        self.worker = None
        self.current_meeting = None

        self.init_ui()
        self.load_meetings()

    def apply_theme(self):
        self.setStyleSheet(get_theme_stylesheet(self.is_dark))

    def on_system_theme_changed(self):
        app = QApplication.instance()
        self.is_dark = (app.styleHints().colorScheme() == Qt.ColorScheme.Dark) if app else False
        self.apply_theme()
        if self.current_meeting:
            self.update_participants_sidebar(self.current_meeting)
            self.render_messages(self.current_meeting)

    def toggle_theme_manual(self):
        self.is_dark = not self.is_dark
        self.apply_theme()
        self.btn_theme_toggle.setText("☀️ 浅色模式" if self.is_dark else "🌙 深色模式")
        if self.current_meeting:
            self.update_participants_sidebar(self.current_meeting)
            self.render_messages(self.current_meeting)

    def init_ui(self):
        c = get_theme_colors(self.is_dark)
        root_container = QWidget()
        root_layout = QVBoxLayout(root_container)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)

        # ==========================================
        # 1. Top Header Bar
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

        # Theme Toggle Button
        self.btn_theme_toggle = QPushButton("☀️ 浅色模式" if self.is_dark else "🌙 深色模式")
        self.btn_theme_toggle.clicked.connect(self.toggle_theme_manual)
        hb_layout.addWidget(self.btn_theme_toggle)

        # Status
        status_conn = QLabel("● 本地服务已就绪")
        status_conn.setStyleSheet("color: #345d46; font-size: 12px; font-weight: 500;")
        hb_layout.addWidget(status_conn)

        # Setup / New Meeting Button
        btn_new_header = QPushButton("+ 新会议向导")
        btn_new_header.setObjectName("PrimaryBtn")
        btn_new_header.clicked.connect(self.on_new_meeting)
        hb_layout.addWidget(btn_new_header)

        root_layout.addWidget(header_bar)

        # ==========================================
        # 2. Main Three-Column Splitter Layout
        # ==========================================
        splitter = QSplitter(Qt.Horizontal)

        # ------------------------------------------
        # Column 1: Left Sidebar
        # ------------------------------------------
        left_sidebar = QFrame()
        left_sidebar.setObjectName("LeftSidebar")
        left_layout = QVBoxLayout(left_sidebar)
        left_layout.setContentsMargins(16, 20, 16, 20)
        left_layout.setSpacing(12)

        lbl_meetings_hdr = QLabel("会议记录")
        lbl_meetings_hdr.setStyleSheet("font-size: 14px; font-weight: 600; padding-left: 6px;")
        left_layout.addWidget(lbl_meetings_hdr)

        self.meetings_list = QListWidget()
        self.meetings_list.itemClicked.connect(self.on_meeting_selected)
        left_layout.addWidget(self.meetings_list, 2)

        # Sidebar Divider Note
        note_divider = QLabel("至少 3 位 AI 参会 · Judge 裁决 · 一次一位公开发言")
        note_divider.setStyleSheet("font-size: 11px; line-height: 1.5; padding-top: 10px;")
        note_divider.setWordWrap(True)
        left_layout.addWidget(note_divider)

        # Participants Section
        lbl_participants_hdr = QLabel("参会人员与席位")
        lbl_participants_hdr.setStyleSheet("font-size: 14px; font-weight: 600; padding-left: 6px; margin-top: 6px;")
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
        center_layout.setContentsMargins(28, 20, 28, 20)
        center_layout.setSpacing(12)

        # Eyebrow Round Status
        self.eyebrow_lbl = QLabel("第 1 轮 / 最多 10 轮 · 公开讨论 · 尚未开始")
        self.eyebrow_lbl.setStyleSheet("font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;")
        center_layout.addWidget(self.eyebrow_lbl)

        # Topic Title + Export Button
        topic_row = QHBoxLayout()
        self.topic_lbl = QLabel("请选择或新建圆桌会议")
        self.topic_lbl.setStyleSheet("font-size: 22px; font-weight: 600;")
        self.topic_lbl.setWordWrap(True)
        topic_row.addWidget(self.topic_lbl, 1)

        btn_export = QPushButton("导出")
        btn_export.clicked.connect(self.on_export)
        topic_row.addWidget(btn_export)
        center_layout.addLayout(topic_row)

        # Role Bar: Organizer, Leader, Judge
        roles_bar = QHBoxLayout()
        roles_bar.setSpacing(16)
        self.organizer_lbl = QLabel("组织者: -")
        self.organizer_lbl.setStyleSheet("font-size: 12px; font-weight: 500;")
        roles_bar.addWidget(self.organizer_lbl)

        self.leader_lbl = QLabel("负责人: -")
        self.leader_lbl.setStyleSheet("font-size: 12px; font-weight: 500;")
        roles_bar.addWidget(self.leader_lbl)

        self.judge_lbl = QLabel("Judge: 你 (负责追问与裁决)")
        self.judge_lbl.setStyleSheet("font-size: 12px; font-weight: 600;")
        roles_bar.addWidget(self.judge_lbl)
        roles_bar.addStretch()
        center_layout.addLayout(roles_bar)

        # Control Bar: Start, Pause, Finish
        self.control_bar = QFrame()
        self.control_bar.setObjectName("ControlBar")
        cb_layout = QHBoxLayout(self.control_bar)
        cb_layout.setContentsMargins(12, 6, 12, 6)

        self.turn_state_lbl = QLabel("状态: 准备就绪")
        self.turn_state_lbl.setStyleSheet("font-size: 13px; font-weight: 500;")
        cb_layout.addWidget(self.turn_state_lbl)
        cb_layout.addStretch()

        self.btn_start = QPushButton("开始讨论")
        self.btn_start.setObjectName("PrimaryBtn")
        self.btn_start.clicked.connect(self.on_start_meeting)
        cb_layout.addWidget(self.btn_start)

        self.btn_pause = QPushButton("暂停")
        self.btn_pause.clicked.connect(self.on_pause_meeting)
        cb_layout.addWidget(self.btn_pause)

        self.btn_finish = QPushButton("提前结束并总结")
        self.btn_finish.clicked.connect(self.on_finish_meeting)
        cb_layout.addWidget(self.btn_finish)

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

        # Judge Speech Composer
        composer_frame = QFrame()
        composer_layout = QVBoxLayout(composer_frame)
        composer_layout.setContentsMargins(0, 6, 0, 0)
        composer_layout.setSpacing(8)

        lbl_composer = QLabel("<b>⚖️ Judge 提问与补充标准</b>")
        lbl_composer.setStyleSheet("font-size: 13px; font-weight: 500;")
        composer_layout.addWidget(lbl_composer)

        self.input_edit = QTextEdit()
        self.input_edit.setPlaceholderText("作为 Judge 提出追问、质疑假设或更新判断标准（例如：请先论证内存 footprint，再谈部署速度）...")
        self.input_edit.setFixedHeight(65)
        composer_layout.addWidget(self.input_edit)

        compose_actions = QHBoxLayout()
        note_lbl = QLabel("Judge 的提问将作为参会 AI 的最新指导标准展开响应。")
        note_lbl.setStyleSheet("font-size: 11px;")
        compose_actions.addWidget(note_lbl)
        compose_actions.addStretch()

        self.btn_submit_speech = QPushButton("提交 Judge 提问")
        self.btn_submit_speech.setObjectName("PrimaryBtn")
        self.btn_submit_speech.clicked.connect(self.on_send_judge_speech)
        compose_actions.addWidget(self.btn_submit_speech)
        composer_layout.addLayout(compose_actions)

        center_layout.addWidget(composer_frame)

        splitter.addWidget(center_panel)

        # ------------------------------------------
        # Column 3: Right Sidebar
        # ------------------------------------------
        right_sidebar = QFrame()
        right_sidebar.setObjectName("RightSidebar")
        right_layout = QVBoxLayout(right_sidebar)
        right_layout.setContentsMargins(20, 24, 20, 24)
        right_layout.setSpacing(12)

        lbl_evidence_hdr = QLabel("观点与证据")
        lbl_evidence_hdr.setStyleSheet("font-size: 14px; font-weight: 600;")
        right_layout.addWidget(lbl_evidence_hdr)

        lbl_evidence_desc = QLabel("引用来源不代表已验证。核查记录保留作者与方法。")
        lbl_evidence_desc.setStyleSheet("font-size: 12px; line-height: 1.5;")
        lbl_evidence_desc.setWordWrap(True)
        right_layout.addWidget(lbl_evidence_desc)

        self.evidence_content = QLabel("选择一条观点，查看它的依据、方法和限制。")
        self.evidence_content.setStyleSheet("font-size: 12px; margin-top: 14px;")
        self.evidence_content.setWordWrap(True)
        right_layout.addWidget(self.evidence_content)
        right_layout.addStretch()

        splitter.addWidget(right_sidebar)

        # Set Column Proportions: 230px | 700px | 270px
        splitter.setSizes([230, 700, 270])
        splitter.setStretchFactor(0, 0)
        splitter.setStretchFactor(1, 1)
        splitter.setStretchFactor(2, 0)

        root_layout.addWidget(splitter)
        self.setCentralWidget(root_container)

    def load_meetings(self):
        self.meetings_list.clear()
        meetings = self.store.list_meetings()
        if not meetings:
            # Create a clean initial 4-role meeting (1 Standalone Organizer + 1 Leader + 2 Members + Judge)
            sample = Meeting(
                id="M-DEFAULT-01",
                topic="圆桌架构讨论：多智能体协作中主持人与裁决者职责分离",
                participants=['claude', 'codex', 'agy', 'cursor'],
                organizer='claude',
                leader='codex',
                max_rounds=10,
                messages=[
                    {
                        'id': 'M-00-Judge',
                        'author': 'human',
                        'text': '本次会议目标：明确 3 角色与 4+ 角色的动态分工，确立 Judge 的裁决标准。',
                        'round': 1,
                        'origin': 'human'
                    }
                ]
            )
            self.store.save(sample)
            meetings = [sample]

        for m in meetings:
            item = QListWidgetItem()
            item.setText(f"{m.topic[:24]}...\n{m.status} · 轮次 {m.round}/{m.max_rounds}")
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
        
        org_name = PARTICIPANTS_INFO.get(m.organizer, {}).get('name', m.organizer)
        ldr_name = PARTICIPANTS_INFO.get(m.leader, {}).get('name', m.leader)
        self.organizer_lbl.setText(f"组织者: {org_name}")
        self.leader_lbl.setText(f"负责人: {ldr_name}")
        self.eyebrow_lbl.setText(f"第 {m.round} 轮 / 最多 {m.max_rounds} 轮 · 公开讨论 · {m.status}")
        self.turn_state_lbl.setText("尚未开始" if m.status == "active" and not m.messages else f"状态: {m.status}")

        self.update_participants_sidebar(m)
        self.render_messages(m)

    def update_participants_sidebar(self, meeting: Meeting):
        c = get_theme_colors(self.is_dark)
        while self.participants_container.count():
            child = self.participants_container.takeAt(0)
            if child.widget():
                child.widget().deleteLater()

        # 1. Judge participant (The Human User)
        h_row = QWidget()
        h_lay = QHBoxLayout(h_row)
        h_lay.setContentsMargins(4, 2, 4, 2)
        h_lay.addWidget(AvatarBadge("你", border_color=c['accent'], bg_color=c['pill_bg'], text_color=c['accent']))
        h_info = QVBoxLayout()
        h_info.setSpacing(0)
        h_name = QLabel("<b>你 (Judge)</b>")
        h_role = QLabel("裁决者 · 提问与裁决")
        h_role.setStyleSheet(f"color: {c['accent']}; font-size: 11px; font-weight: 500;")
        h_info.addWidget(h_name)
        h_info.addWidget(h_role)
        h_lay.addLayout(h_info)
        h_lay.addStretch()
        self.participants_container.addWidget(h_row)

        # 2. AI Participants with dynamic roles
        for p_id in meeting.participants:
            info = PARTICIPANTS_INFO.get(p_id, {'name': p_id, 'color': '#6a786f'})
            row = QWidget()
            r_lay = QHBoxLayout(row)
            r_lay.setContentsMargins(4, 2, 4, 2)
            badge_text = info['name'][:2]
            r_lay.addWidget(AvatarBadge(badge_text, border_color=c['border'], bg_color=c['bg_card'], text_color=c['text_primary']))
            
            p_info = QVBoxLayout()
            p_info.setSpacing(0)
            p_name = QLabel(f"<b>{info['name']}</b>")
            
            role_text = meeting.get_role_label(p_id)
            p_role = QLabel(role_text)
            p_role.setStyleSheet(f"color: {c['text_muted']}; font-size: 11px;")
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
        c = get_theme_colors(self.is_dark)
        card = QFrame()
        author_id = msg.get('author', 'human')

        if author_id == 'human':
            card.setProperty("class", "JudgeCard")
        else:
            card.setProperty("class", "MessageCard")

        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(14, 12, 14, 12)
        card_layout.setSpacing(8)

        # Header: Avatar + Author + Role Badge
        hdr = QHBoxLayout()
        hdr.setSpacing(8)

        if author_id == 'human':
            avatar = AvatarBadge("你", border_color=c['accent'], bg_color=c['pill_bg'], text_color=c['accent'])
            name_text = f"<b>你 · Judge (裁决者)</b>"
            meta_text = f"第 {msg.get('round', 1)} 轮 · Judge 提问与判断标准"
        else:
            info = PARTICIPANTS_INFO.get(author_id, {'name': author_id})
            avatar = AvatarBadge(info['name'][:2], border_color=c['border'], bg_color=c['bg_card'], text_color=c['text_primary'])
            role_str = self.current_meeting.get_role_label(author_id) if self.current_meeting else "参会者"
            name_text = f"<b>{info['name']}</b> <span style='font-size: 11px; color: {c['accent']};'>[{role_str}]</span>"
            meta_text = f"{msg.get('id', 'M-000')} · 第 {msg.get('round', 1)} 轮"

        hdr.addWidget(avatar)

        name_lbl = QLabel(name_text)
        hdr.addWidget(name_lbl)

        meta_lbl = QLabel(meta_text)
        meta_lbl.setStyleSheet(f"color: {c['text_muted']}; font-size: 11px;")
        hdr.addWidget(meta_lbl)
        hdr.addStretch()

        if msg.get('ready_to_conclude'):
            ready_lbl = QLabel("✓ 建议总结")
            ready_lbl.setStyleSheet(f"color: {c['accent']}; font-size: 11px; background: {c['pill_bg']}; padding: 2px 6px; border-radius: 4px;")
            hdr.addWidget(ready_lbl)

        card_layout.addLayout(hdr)

        # Message Body
        body_lbl = QLabel(msg.get('text', ''))
        body_lbl.setWordWrap(True)
        body_lbl.setStyleSheet(f"font-size: 14px; line-height: 1.8; color: {c['text_primary']};")
        card_layout.addWidget(body_lbl)

        self.chat_layout.addWidget(card)

    def add_decision_card(self, decision: dict):
        c = get_theme_colors(self.is_dark)
        card = QFrame()
        card.setProperty("class", "DecisionCard")
        card_layout = QVBoxLayout(card)

        title = QLabel(f"<b>📋 会议负责人总结与决策草案 ({decision.get('author', 'Leader')})</b>")
        title.setStyleSheet(f"color: {c['text_primary']}; font-size: 15px;")
        card_layout.addWidget(title)

        rec = QLabel(decision.get('recommendation', ''))
        rec.setWordWrap(True)
        rec.setStyleSheet(f"color: {c['accent']}; font-size: 13px; margin: 6px 0; font-weight: 500;")
        card_layout.addWidget(rec)

        self.chat_layout.addWidget(card)

    def on_new_meeting(self):
        dlg = NewMeetingDialog(is_dark=self.is_dark, parent=self)
        if dlg.exec():
            data = dlg.get_data()
            import uuid
            m_id = f"M-{uuid.uuid4().hex[:6].upper()}"
            m = Meeting(
                id=m_id,
                topic=data['topic'],
                participants=data['participants'],
                mode=data['mode'],
                organizer=data['organizer'],
                leader=data['leader'],
                max_rounds=data['max_rounds']
            )
            self.store.save(m)
            self.load_meetings()

    def on_start_meeting(self):
        if not self.current_meeting or self.current_meeting.status == "completed":
            return
        if self.worker and self.worker.isRunning():
            return

        self.btn_start.setEnabled(False)
        self.btn_pause.setEnabled(True)

        self.worker = MeetingWorker(self.current_meeting)
        self.worker.turn_started.connect(self.on_turn_started)
        self.worker.turn_finished.connect(self.on_turn_finished)
        self.worker.round_advanced.connect(self.on_round_advanced)
        self.worker.meeting_completed.connect(self.on_meeting_completed)
        self.worker.status_changed.connect(self.on_status_changed)
        self.worker.start()

    def on_turn_started(self, participant: str, round_num: int):
        info = PARTICIPANTS_INFO.get(participant, {'name': participant})
        role_label = self.current_meeting.get_role_label(participant)
        self.turn_state_lbl.setText(f"第 {round_num} 轮：{info['name']} ({role_label}) 正在发言...")

    def on_turn_finished(self, msg: dict):
        self.add_message_card(msg)
        self.store.save(self.current_meeting)

    def on_round_advanced(self, new_round: int):
        self.eyebrow_lbl.setText(f"第 {new_round} 轮 / 最多 {self.current_meeting.max_rounds} 轮 · 公开讨论 · 进行中")
        self.store.save(self.current_meeting)

    def on_meeting_completed(self, decision: dict):
        self.turn_state_lbl.setText("会议已完成，Leader 已交付决策草案")
        self.btn_start.setEnabled(False)
        self.btn_pause.setEnabled(False)
        self.add_decision_card(decision)
        self.store.save(self.current_meeting)

    def on_status_changed(self, text: str):
        self.turn_state_lbl.setText(text)

    def on_pause_meeting(self):
        if self.worker and self.worker.isRunning():
            if self.worker._is_paused:
                self.worker.resume()
                self.btn_pause.setText("暂停")
            else:
                self.worker.pause()
                self.btn_pause.setText("继续")

    def on_finish_meeting(self):
        if self.worker and self.worker.isRunning():
            self.worker.stop()
        if self.current_meeting:
            leader_info = PARTICIPANTS_INFO.get(self.current_meeting.leader, {'name': self.current_meeting.leader})
            decision = {
                'author': self.current_meeting.leader,
                'recommendation': f"Judge 提前结束讨论。由负责人 {leader_info['name']} 总结当前第 {self.current_meeting.round} 轮意见并起草草案。",
                'options': [
                    {'name': '方案 A (推荐)', 'pros': ['原生开销极低', '秒开体验'], 'cons': ['开发需投入原生代码']}
                ],
                'disagreements': [],
                'unknowns': []
            }
            self.current_meeting.decision = decision
            self.current_meeting.status = "completed"
            self.store.save(self.current_meeting)
            self.on_meeting_completed(decision)

    def on_send_judge_speech(self):
        text = self.input_edit.toPlainText().strip()
        if not text or not self.current_meeting:
            return

        import uuid
        msg = {
            'id': f"M-JUDGE-{uuid.uuid4().hex[:4].upper()}",
            'author': 'human',
            'text': text,
            'round': self.current_meeting.round,
            'origin': 'human'
        }
        self.current_meeting.messages.append(msg)
        self.store.save(self.current_meeting)
        self.add_message_card(msg)
        self.input_edit.clear()

    def on_export(self):
        if not self.current_meeting:
            return
        QMessageBox.information(
            self,
            "导出会议记录",
            f"会议记录「{self.current_meeting.id}」已保存在本地数据库：\n{self.store.data_dir}"
        )
