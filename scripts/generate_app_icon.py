#!/usr/bin/env python3
import os
import subprocess
from pathlib import Path
from PySide6.QtGui import (
    QImage, QPainter, QColor, QPen, QBrush, QPainterPath,
    QFont, QLinearGradient
)
from PySide6.QtCore import Qt, QRectF, QPointF

def generate_roundtable_icon():
    size = 1024
    img = QImage(size, size, QImage.Format_ARGB32)
    img.fill(Qt.transparent)

    painter = QPainter(img)
    painter.setRenderHint(QPainter.Antialiasing, True)
    painter.setRenderHint(QPainter.TextAntialiasing, True)

    # 1. macOS Squircle Background with subtle drop shadow
    # Margins: 100px on all sides -> 824x824 rounded squircle
    margin = 100.0
    rect = QRectF(margin, margin, size - 2 * margin, size - 2 * margin)
    corner_radius = 185.0

    # Draw subtle soft shadow
    shadow_color = QColor(20, 35, 25, 45)
    for offset in range(1, 12):
        s_rect = QRectF(margin, margin + offset * 2.5, size - 2 * margin, size - 2 * margin)
        s_path = QPainterPath()
        s_path.addRoundedRect(s_rect, corner_radius, corner_radius)
        painter.fillPath(s_path, shadow_color)

    # Main Card Gradient: Deep pine/forest green (#25372f -> #345d46)
    grad = QLinearGradient(0, margin, 0, size - margin)
    grad.setColorAt(0.0, QColor("#3a674e")) # vibrant sage green
    grad.setColorAt(1.0, QColor("#22372c")) # deep forest ink
    
    squircle_path = QPainterPath()
    squircle_path.addRoundedRect(rect, corner_radius, corner_radius)
    painter.fillPath(squircle_path, grad)

    # Crisp inner border highlight
    border_pen = QPen(QColor(255, 255, 255, 40), 4)
    painter.setPen(border_pen)
    painter.setBrush(Qt.NoBrush)
    painter.drawPath(squircle_path)

    # 2. Draw the Roundtable (Dotted Ring ◌ and Inner Round Table)
    center = QPointF(size / 2.0, size / 2.0 - 10.0)
    
    # Outer subtle glow
    glow_pen = QPen(QColor(255, 255, 255, 30), 16)
    painter.setPen(glow_pen)
    painter.drawEllipse(center, 230, 230)

    # Dashed/Dotted Circular Ring (representing Roundtable seats)
    dash_pen = QPen(QColor(255, 255, 255, 240), 18)
    dash_pen.setStyle(Qt.CustomDashLine)
    dash_pen.setDashPattern([3.0, 3.5]) # Elegant circular dashed pattern
    dash_pen.setCapStyle(Qt.RoundCap)
    painter.setPen(dash_pen)
    painter.drawEllipse(center, 220, 220)

    # Inner circular tabletop
    table_brush = QBrush(QColor(255, 255, 255, 25))
    painter.setBrush(table_brush)
    inner_pen = QPen(QColor(255, 255, 255, 120), 4)
    painter.setPen(inner_pen)
    painter.drawEllipse(center, 140, 140)

    # 4 Cardinal Agent Nodes (Codex, Claude, Cursor, AGY)
    agent_colors = [
        QColor("#10a37f"), # Codex green
        QColor("#d97706"), # Claude amber
        QColor("#2563eb"), # Cursor blue
        QColor("#a855f7")  # AGY violet
    ]
    node_radius = 26.0
    orbit = 220.0
    import math
    for idx, col in enumerate(agent_colors):
        angle = idx * (math.pi / 2.0) - (math.pi / 4.0)
        nx = center.x() + orbit * math.cos(angle)
        ny = center.y() + orbit * math.sin(angle)
        # White outer ring
        painter.setPen(QPen(QColor("#ffffff"), 6))
        painter.setBrush(QBrush(col))
        painter.drawEllipse(QPointF(nx, ny), node_radius, node_radius)

    # Center Minimal Tabletop Emblem (◌ symbol or subtle cross)
    painter.setPen(QPen(QColor(255, 255, 255, 180), 8, Qt.SolidLine, Qt.RoundCap))
    painter.drawEllipse(center, 20, 20)

    painter.end()

    # Save 1024x1024 PNG
    out_dir = Path("resources")
    out_dir.mkdir(exist_ok=True)
    png_path = out_dir / "AppIcon_1024.png"
    img.save(str(png_path), "PNG")
    print(f"Generated {png_path}")

    # Generate macOS .iconset
    iconset_dir = out_dir / "AppIcon.iconset"
    iconset_dir.mkdir(exist_ok=True)

    sizes = [
        (16, 1), (16, 2),
        (32, 1), (32, 2),
        (128, 1), (128, 2),
        (256, 1), (256, 2),
        (512, 1), (512, 2),
    ]

    for s, scale in sizes:
        target_size = s * scale
        name = f"icon_{s}x{s}.png" if scale == 1 else f"icon_{s}x{s}@2x.png"
        target_path = iconset_dir / name
        subprocess.run([
            "sips", "-z", str(target_size), str(target_size),
            str(png_path), "--out", str(target_path)
        ], stdout=subprocess.DEVNULL, check=True)

    # Compile .iconset to .icns with iconutil
    icns_path = out_dir / "AppIcon.icns"
    subprocess.run(["iconutil", "-c", "icns", str(iconset_dir), "-o", str(icns_path)], check=True)
    print(f"Generated {icns_path}")

    # Copy to Python & Swift resources
    (Path("python/resources")).mkdir(exist_ok=True)
    (Path("swift/Resources")).mkdir(exist_ok=True)
    import shutil
    shutil.copy2(icns_path, "python/resources/AppIcon.icns")
    shutil.copy2(icns_path, "swift/Resources/AppIcon.icns")
    shutil.copy2(png_path, "python/resources/icon.png")
    shutil.copy2(png_path, "swift/Resources/icon.png")
    print("Copied AppIcon.icns to python/resources and swift/Resources!")

if __name__ == '__main__':
    generate_roundtable_icon()
