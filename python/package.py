#!/usr/bin/env python3
"""
Packaging script for Roundtable PySide6 macOS App using PyInstaller.
"""

import os
import sys
import subprocess
import shutil
import time
from pathlib import Path

def package():
    base_dir = Path(__file__).resolve().parent
    dist_dir = base_dir / "dist"
    build_dir = base_dir / "build"
    app_name = "Roundtable-PySide6"

    # Clean previous
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
    if build_dir.exists():
        shutil.rmtree(build_dir)

    print(f"📦 [PySide6] 开始构建 macOS 原生应用包 / Starting PyInstaller build: {app_name}...")
    start_time = time.time()

    cmd = [
        str(base_dir / ".venv" / "bin" / "pyinstaller"),
        "--noconfirm",
        "--windowed",
        "--name", app_name,
        "--distpath", str(dist_dir),
        "--workpath", str(build_dir),
        "--specpath", str(base_dir),
        # Optimize size: exclude unused Qt modules and heavy packages
        "--exclude-module", "tkinter",
        "--exclude-module", "matplotlib",
        "--exclude-module", "scipy",
        "--exclude-module", "numpy",
        str(base_dir / "main.py")
    ]

    res = subprocess.run(cmd, cwd=str(base_dir), capture_output=True, text=True)
    if res.returncode != 0:
        print("❌ 打包失败 / Build failed:")
        print(res.stderr)
        sys.exit(res.returncode)

    elapsed = time.time() - start_time
    app_path = dist_dir / f"{app_name}.app"
    
    if not app_path.exists():
        print(f"❌ 找不到生成的应用包 / App not found at: {app_path}")
        sys.exit(1)

    # Compute uncompressed size
    size_res = subprocess.run(["du", "-sk", str(app_path)], capture_output=True, text=True)
    app_size_kb = int(size_res.stdout.split()[0])
    app_size_mb = app_size_kb / 1024.0

    # Create ZIP archive to measure compressed distribution size
    zip_path = dist_dir / f"{app_name}-mac-arm64.zip"
    subprocess.run(["ditto", "-c", "-k", "--keepParent", str(app_path), str(zip_path)], check=True)
    zip_size_mb = zip_path.stat().st_size / (1024.0 * 1024.0)

    print(f"✅ [PySide6] 构建完成 / Build completed in {elapsed:.2f}s!")
    print(f"   - App Bundle: {app_path} ({app_size_mb:.2f} MB)")
    print(f"   - Distribution ZIP: {zip_path} ({zip_size_mb:.2f} MB)")

    return {
        'app_path': str(app_path),
        'zip_path': str(zip_path),
        'app_size_mb': app_size_mb,
        'zip_size_mb': zip_size_mb,
        'build_time_s': elapsed
    }

if __name__ == '__main__':
    package()
