"""
Meeting coordination engine and provider runner for PySide6 Roundtable.
"""

import json
import shutil
import subprocess
from typing import Callable, Optional, Dict, Any, List
try:
    from PySide6.QtCore import QObject, Signal, QThread
except ImportError:
    class QObject:
        def __init__(self, parent=None): pass
    class QThread:
        def __init__(self, parent=None): pass
        def start(self): pass
        def msleep(self, ms): pass
    def Signal(*args, **kwargs):
        class DummySignal:
            def emit(self, *a, **k): pass
            def connect(self, fn): pass
        return DummySignal()
from models import Meeting, Message, Decision, PARTICIPANTS_INFO

class ProviderRunner:
    @staticmethod
    def resolve_executable(name: str) -> Optional[str]:
        candidates = ['cursor-agent', 'agent', 'cursor'] if name == 'cursor' else [name]
        for c in candidates:
            path = shutil.which(c)
            if path:
                return path
        return None

    @classmethod
    def run_organizer_kickoff(cls, organizer: str, meeting: Meeting) -> Message:
        org_info = PARTICIPANTS_INFO.get(organizer, {'name': organizer})
        leader_info = PARTICIPANTS_INFO.get(meeting.leader, {'name': meeting.leader})
        msg_id = f"M-{meeting.round:02d}-00-kickoff"
        text = (
            f"[{org_info['name']} · 组织者] 圆桌会议正式开始。\n"
            f"本次会议由 Judge (人类裁决者) 设定议题：「{meeting.topic}」，并由 Judge 主导后续追问与最终裁决。\n"
            f"本场讨论由负责人 {leader_info['name']} 牵头，请各位圆桌成员专注方案权衡展开论证。"
        )
        return Message(
            id=msg_id,
            author=organizer,
            text=text,
            round=meeting.round,
            ready_to_conclude=False,
            claims=[
                {
                    "id": f"C-kickoff-01",
                    "text": f"组织者 {org_info['name']} 确立的议程与探讨基准",
                    "kind": "agenda",
                    "sources": [meeting.topic],
                    "limitations": "由 Judge 设定初始目标"
                }
            ]
        )

    @classmethod
    def run_turn(cls, participant: str, meeting: Meeting) -> Message:
        exe = cls.resolve_executable(participant)
        msg_id = f"M-{meeting.round:02d}-{len(meeting.messages) + 1:02d}"
        info = PARTICIPANTS_INFO.get(participant, {'name': participant})
        role_label = meeting.get_role_label(participant)

        # Check for latest Judge inquiry (without quoting human as a peer provider)
        judge_messages = [m for m in meeting.messages if m.get('author') == 'human']
        judge_context = ""
        if judge_messages:
            latest_judge = judge_messages[-1]['text']
            judge_context = f"\n响应 Judge 提出的指导要求：「{latest_judge[:60]}...」"

        text = (
            f"[{info['name']} · {role_label}] 关于议题「{meeting.topic}」第 {meeting.round} 轮发言：\n"
            f"结合当前上下文，我建议重点考量实现效率、跨平台资源消耗与工程可维护性。{judge_context}"
        )
        ready = (meeting.round >= 2)
        
        return Message(
            id=msg_id,
            author=participant,
            text=text,
            round=meeting.round,
            ready_to_conclude=ready,
            claims=[
                {
                    "id": f"C-{meeting.round}-{len(meeting.messages) + 1}",
                    "text": f"{info['name']} 提出的关键论点与方案权衡",
                    "kind": "proposal",
                    "sources": [meeting.topic],
                    "limitations": "针对 Judge 评判标准展开"
                }
            ]
        )

class MeetingWorker(QThread):
    turn_started = Signal(str, int)     # participant, round
    turn_finished = Signal(dict)        # message dict
    round_advanced = Signal(int)        # new round
    meeting_completed = Signal(dict)    # decision dict
    status_changed = Signal(str)        # status message

    def __init__(self, meeting: Meeting, parent=None):
        super().__init__(parent)
        self.meeting = meeting
        self._is_running = True
        self._is_paused = False

    def pause(self):
        self._is_paused = True
        self.status_changed.emit("已暂停 / Paused")

    def resume(self):
        self._is_paused = False
        self.status_changed.emit("继续讨论 / Resumed")

    def stop(self):
        self._is_running = False

    def run(self):
        self.status_changed.emit("会议进行中 / Meeting in progress")
        
        # Round 1 standalone organizer kickoff for 4+ participants
        if self.meeting.round == 1 and len(self.meeting.participants) >= 4 and not self.meeting.messages:
            self.turn_started.emit(self.meeting.organizer, 1)
            self.msleep(300)
            kickoff_msg = ProviderRunner.run_organizer_kickoff(self.meeting.organizer, self.meeting)
            k_dict = {
                'id': kickoff_msg.id,
                'author': kickoff_msg.author,
                'text': kickoff_msg.text,
                'round': kickoff_msg.round,
                'timestamp': kickoff_msg.timestamp,
                'origin': kickoff_msg.origin,
                'ready_to_conclude': kickoff_msg.ready_to_conclude,
                'claims': kickoff_msg.claims
            }
            self.meeting.messages.append(k_dict)
            self.turn_finished.emit(k_dict)
            self.msleep(300)

        while self._is_running and self.meeting.round <= self.meeting.max_rounds:
            if self._is_paused:
                self.msleep(200)
                continue

            active_speakers = self.meeting.get_active_speakers()

            # Determine who speaks next in this round
            for p in active_speakers:
                if not self._is_running:
                    break
                while self._is_paused and self._is_running:
                    self.msleep(200)
                if not self._is_running:
                    break

                self.turn_started.emit(p, self.meeting.round)
                self.msleep(400)  # Simulated thinking time for UI responsiveness

                msg = ProviderRunner.run_turn(p, self.meeting)
                msg_dict = {
                    'id': msg.id,
                    'author': msg.author,
                    'text': msg.text,
                    'round': msg.round,
                    'timestamp': msg.timestamp,
                    'origin': msg.origin,
                    'ready_to_conclude': msg.ready_to_conclude,
                    'claims': msg.claims
                }
                self.meeting.messages.append(msg_dict)
                self.turn_finished.emit(msg_dict)
                self.msleep(300)

            # Check if all active speakers are ready to conclude or reached max rounds
            all_ready = all(
                any(m['author'] == p and m.get('ready_to_conclude') for m in self.meeting.messages[-len(active_speakers):])
                for p in active_speakers
            )

            if all_ready or self.meeting.round >= self.meeting.max_rounds:
                # Generate Leader Summary
                leader_info = PARTICIPANTS_INFO.get(self.meeting.leader, {'name': self.meeting.leader})
                decision = {
                    'author': self.meeting.leader,
                    'recommendation': f"由会议负责人 {leader_info['name']} 主持起草的最终决策建议：针对「{self.meeting.topic}」，全员在第 {self.meeting.round} 轮达成充分交流与共识。",
                    'options': [
                        {
                            'name': '方案 A (推荐 / Recommended)',
                            'pros': ['性能卓越', '原生资源占用低', '开箱即用'],
                            'cons': ['开发成本与跨平台维护要求高']
                        },
                        {
                            'name': '方案 B (备选 / Alternative)',
                            'pros': ['生态成熟', '开发迭代极快'],
                            'cons': ['打包体积与运行内存相对较大']
                        }
                    ],
                    'disagreements': ['不同技术栈在后续跨端维护成本上的取舍'],
                    'unknowns': ['超大并发下的长效内存稳定性']
                }
                self.meeting.decision = decision
                self.meeting.status = "completed"
                self.meeting_completed.emit(decision)
                break
            else:
                self.meeting.round += 1
                self.round_advanced.emit(self.meeting.round)

        self.status_changed.emit("会议已结束 / Meeting completed")
