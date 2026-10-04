"""
Data models and persistence for Roundtable PySide6.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
import json
import os
from pathlib import Path
from typing import List, Dict, Optional, Any

PARTICIPANTS_INFO = {
    'codex': {'id': 'codex', 'name': 'Codex', 'provider': 'OpenAI', 'color': '#10a37f'},
    'claude': {'id': 'claude', 'name': 'Claude', 'provider': 'Anthropic', 'color': '#d97706'},
    'cursor': {'id': 'cursor', 'name': 'Cursor', 'provider': 'Anysphere', 'color': '#2563eb'},
    'agy': {'id': 'agy', 'name': 'Antigravity', 'provider': '运行时默认模型', 'color': '#7c3aed'},
}

# The Human User acts exclusively as Judge (independent outside observer/decision maker)
JUDGE_INFO = {
    'id': 'human',
    'name': '你 (Judge)',
    'role': 'Judge / 裁决者',
    'color': '#345d46'
}

@dataclass
class Claim:
    id: str
    text: str
    kind: str = "proposal"
    sources: List[str] = field(default_factory=list)
    limitations: Optional[str] = None

@dataclass
class Message:
    id: str
    author: str
    text: str
    round: int
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    origin: str = "provider"  # 'provider' or 'human' (judge)
    ready_to_conclude: bool = False
    claims: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class Decision:
    author: str
    recommendation: str = ""
    options: List[Dict[str, Any]] = field(default_factory=list)
    disagreements: List[str] = field(default_factory=list)
    unknowns: List[str] = field(default_factory=list)

@dataclass
class Meeting:
    id: str
    topic: str
    participants: List[str]  # Selected AI participants (at least 3)
    mode: str = "discussion"  # 'discussion' or 'independent'
    organizer: str = "claude"  # AI Organizer / Host
    leader: str = "codex"      # AI Leader / Summarizer
    max_rounds: int = 10
    round: int = 1
    status: str = "active"  # 'active', 'paused', 'completed'
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    messages: List[Dict[str, Any]] = field(default_factory=list)
    decision: Optional[Dict[str, Any]] = None
    user_decision: Optional[str] = None

    def get_active_speakers(self) -> List[str]:
        """
        Calculates who speaks in round-table discussion rounds:
        - If 3 participants: Organizer also acts as a member in discussion rounds (all 3 speak).
        - If 4+ participants: Organizer is standalone host, remaining 3+ participants speak.
        """
        if len(self.participants) <= 3:
            return list(self.participants)
        else:
            return [p for p in self.participants if p != self.organizer]

    def get_role_label(self, participant_id: str) -> str:
        """Returns human-readable role badge text for UI."""
        if participant_id == 'human':
            return "Judge / 裁决者"
        if participant_id == self.organizer:
            if len(self.participants) <= 3:
                return "Organizer & Member / 主持兼成员"
            else:
                return "Organizer / 独立主持人"
        if participant_id == self.leader:
            return "Leader / 负责人"
        return "Member / 组员"

class MeetingStore:
    def __init__(self, data_dir: Optional[str] = None):
        if not data_dir:
            base = Path.home() / "Library" / "Application Support" / "Roundtable-PySide6" / "data"
            base.mkdir(parents=True, exist_ok=True)
            self.data_dir = base
        else:
            self.data_dir = Path(data_dir)
            self.data_dir.mkdir(parents=True, exist_ok=True)

    def _file_path(self, meeting_id: str) -> Path:
        return self.data_dir / f"{meeting_id}.json"

    def save(self, meeting: Meeting) -> None:
        path = self._file_path(meeting.id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(asdict(meeting), f, ensure_ascii=False, indent=2)

    def load(self, meeting_id: str) -> Optional[Meeting]:
        path = self._file_path(meeting_id)
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if 'organizer' not in data:
                data['organizer'] = data.get('leader', 'claude')
            return Meeting(**data)

    def list_meetings(self) -> List[Meeting]:
        meetings = []
        for file in self.data_dir.glob("*.json"):
            try:
                with open(file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    meetings.append(Meeting(**data))
            except Exception:
                continue
        meetings.sort(key=lambda m: m.created_at, reverse=True)
        return meetings
