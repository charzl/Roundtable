import unittest
import tempfile
import shutil
import os
import sys
from pathlib import Path

# Add python dir to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from models import Meeting, Message, Claim, Decision, MeetingStore, PARTICIPANTS_INFO

class TestModels(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.store = MeetingStore(self.test_dir)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_participants_definition(self):
        self.assertIn('codex', PARTICIPANTS_INFO)
        self.assertIn('claude', PARTICIPANTS_INFO)
        self.assertIn('cursor', PARTICIPANTS_INFO)
        self.assertIn('agy', PARTICIPANTS_INFO)

    def test_meeting_creation_and_store(self):
        m = Meeting(
            id="M-TEST-001",
            topic="测试议题：Python 单元测试",
            participants=['claude', 'codex'],
            leader='claude',
            max_rounds=5
        )
        self.assertEqual(m.round, 1)
        self.assertEqual(m.status, 'active')
        
        self.store.save(m)
        loaded = self.store.load("M-TEST-001")
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded.topic, "测试议题：Python 单元测试")
        self.assertEqual(loaded.leader, "claude")

    def test_message_with_claims(self):
        msg = Message(
            id="M-01-01",
            author="claude",
            text="Claude 发言正文",
            round=1,
            ready_to_conclude=True,
            claims=[
                {"id": "C-1", "text": "核心观点", "kind": "proposal", "sources": ["S-1"]}
            ]
        )
        self.assertEqual(msg.author, "claude")
        self.assertTrue(msg.ready_to_conclude)
        self.assertEqual(len(msg.claims), 1)

    def test_list_meetings(self):
        m1 = Meeting(id="M-1", topic="Topic 1", participants=['claude'])
        m2 = Meeting(id="M-2", topic="Topic 2", participants=['codex'])
        self.store.save(m1)
        self.store.save(m2)

        meetings = self.store.list_meetings()
        self.assertEqual(len(meetings), 2)
        ids = [m.id for m in meetings]
        self.assertIn("M-1", ids)
        self.assertIn("M-2", ids)

    def test_claim_and_decision_models(self):
        c = Claim(id="C-1", text="Swift 性能最优", kind="proposal", sources=["benchmark.py"], limitations="macOS only")
        self.assertEqual(c.id, "C-1")
        self.assertEqual(c.limitations, "macOS only")

        d = Decision(author="codex", recommendation="推荐采用 Python 与 Swift 架构", disagreements=["Electron 废弃时机"])
        self.assertEqual(d.author, "codex")
        self.assertIn("Electron 废弃时机", d.disagreements)

if __name__ == '__main__':
    unittest.main()
