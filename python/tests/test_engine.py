import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from models import Meeting
from engine import ProviderRunner

class TestEngine(unittest.TestCase):
    def test_provider_resolution(self):
        # Test candidate resolver does not crash
        res_cursor = ProviderRunner.resolve_executable('cursor')
        res_codex = ProviderRunner.resolve_executable('codex')
        # Regardless of machine installation, returns string or None
        self.assertTrue(res_cursor is None or isinstance(res_cursor, str))
        self.assertTrue(res_codex is None or isinstance(res_codex, str))

    def test_provider_run_turn(self):
        m = Meeting(
            id="M-ENG-001",
            topic="测试议题：轮次推进与事实陈述",
            participants=['claude', 'codex'],
            round=1
        )
        msg = ProviderRunner.run_turn('claude', m)
        self.assertEqual(msg.author, 'claude')
        self.assertEqual(msg.round, 1)
        self.assertIn("测试议题", msg.text)
        self.assertFalse(msg.ready_to_conclude)

        # In round 2, participant should be ready to conclude
        m.round = 2
        msg2 = ProviderRunner.run_turn('codex', m)
        self.assertTrue(msg2.ready_to_conclude)
        self.assertTrue(len(msg2.claims) > 0)

if __name__ == '__main__':
    unittest.main()
