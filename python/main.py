#!/usr/bin/env python3
"""
Roundtable (圆桌会议) - PySide6 Native Desktop App
"""

import sys
import os
from PySide6.QtWidgets import QApplication
from PySide6.QtCore import Qt
from ui import MainWindow

def main():
    # macOS HighDPI scaling
    QApplication.setHighDpiScaleFactorRoundingPolicy(Qt.HighDpiScaleFactorRoundingPolicy.PassThrough)
    
    app = QApplication(sys.argv)
    app.setApplicationName("Roundtable")
    app.setOrganizationName("Roundtable")

    window = MainWindow()
    window.show()

    sys.exit(app.exec())

if __name__ == '__main__':
    main()
