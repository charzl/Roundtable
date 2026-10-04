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
    origin: str = "provider"  # 'provider' or 'human'
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
    participants: List[str]
    mode: str = "discussion"  # 'discussion' or 'independent'
    leader: str = "claude"
    max_rounds: int = 10
    round: int = 1
    status: str = "active"  # 'active', 'paused', 'completed'
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    messages: List[Dict[str, Any]] = field(default_factory=list)
    decision: Optional[Dict[str, Any]] = None
    user_decision: Optional[str] = None

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
