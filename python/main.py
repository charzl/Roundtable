#!/usr/bin/env python3
"""
Roundtable (圆桌会议) - PySide6 Native Desktop App
"""

import sys
import os
from pathlib import Path
from PySide6.QtWidgets import QApplication
from PySide6.QtGui import QIcon
from PySide6.QtCore import Qt
from ui import MainWindow

def main():
    # macOS HighDPI scaling
    QApplication.setHighDpiScaleFactorRoundingPolicy(Qt.HighDpiScaleFactorRoundingPolicy.PassThrough)
    
    app = QApplication(sys.argv)
    app.setApplicationName("Roundtable")
    app.setOrganizationName("Roundtable")

    icon_path = Path(__file__).resolve().parent / "resources" / "icon.png"
    if not icon_path.exists():
        icon_path = Path(__file__).resolve().parent / "resources" / "AppIcon.icns"
    if icon_path.exists():
        app.setWindowIcon(QIcon(str(icon_path)))

    window = MainWindow()
    if icon_path.exists():
        window.setWindowIcon(QIcon(str(icon_path)))
    window.show()

    sys.exit(app.exec())

if __name__ == '__main__':
    main()
