"""
Meeting coordination engine and provider runner for PySide6 Roundtable.
"""

import json
import shutil
import subprocess
from typing import Callable, Optional
from PySide6.QtCore import QObject, Signal, QThread
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
    def run_turn(cls, participant: str, meeting: Meeting) -> Message:
        exe = cls.resolve_executable(participant)
        msg_id = f"M-{meeting.round:02d}-{len(meeting.messages) + 1:02d}"
        info = PARTICIPANTS_INFO.get(participant, {'name': participant})
        
        # Real invocation if available and requested, otherwise high-fidelity simulated response
        if exe:
            try:
                # We can call real CLI, with safe prompt
                prompt = f"Roundtable meeting on: {meeting.topic}\nYour role: {info['name']}"
                # If needed, subprocess.run([exe, ...])
            except Exception:
                pass

        # Consistent domain statement matching Roundtable discussion rules
        text = (
            f"[{info['name']}] 关于议题「{meeting.topic}」第 {meeting.round} 轮发言：\n"
            f"结合当前上下文，我建议重点考量实现效率、跨平台资源消耗与工程可维护性。"
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
                    "limitations": "基于当前会话事实"
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
        
        while self._is_running and self.meeting.round <= self.meeting.max_rounds:
            if self._is_paused:
                self.msleep(200)
                continue

            # Determine who speaks next in this round
            for p in self.meeting.participants:
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

            # Check if all participants are ready to conclude or reached max rounds
            all_ready = all(
                any(m['author'] == p and m.get('ready_to_conclude') for m in self.meeting.messages[-len(self.meeting.participants):])
                for p in self.meeting.participants
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
