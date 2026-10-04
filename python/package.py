#!/usr/bin/env python3
"""
Packaging script for Roundtable PySide6 Desktop App (macOS & Linux/Ubuntu).
"""

import os
import sys
import subprocess
import shutil
import time
import hashlib
from pathlib import Path

def compute_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def package():
    base_dir = Path(__file__).resolve().parent
    dist_dir = base_dir / "dist"
    build_dir = base_dir / "build"
    app_name = "Roundtable-PySide6"
    version = "0.2.2"
    is_macos = (sys.platform == "darwin")
    is_windows = (sys.platform == "win32")
    is_linux = sys.platform.startswith("linux")

    # Clean previous builds
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
    if build_dir.exists():
        shutil.rmtree(build_dir)

    target_os_name = "macOS" if is_macos else ("Windows" if is_windows else ("Linux / Ubuntu" if is_linux else sys.platform))
    print(f"📦 [PySide6] 开始构建 {target_os_name} 原生应用包 / Starting build for {target_os_name}...")
    start_time = time.time()

    pyinstaller_bin = shutil.which("pyinstaller")
    if not pyinstaller_bin:
        venv_bin = base_dir / ".venv" / "bin" / "pyinstaller"
        if not venv_bin.exists():
            venv_bin = base_dir / ".venv" / "Scripts" / "pyinstaller.exe"
        if venv_bin.exists():
            pyinstaller_bin = str(venv_bin)
        else:
            pyinstaller_bin = "pyinstaller"

    cmd = [
        pyinstaller_bin,
        "--noconfirm",
        "--windowed",
        "--name", app_name,
        "--distpath", str(dist_dir),
        "--workpath", str(build_dir),
        "--specpath", str(base_dir),
        # Optimize size: exclude unused heavy modules
        "--exclude-module", "tkinter",
        "--exclude-module", "matplotlib",
        "--exclude-module", "scipy",
        "--exclude-module", "numpy",
        "--exclude-module", "PySide6.QtNetwork",
        "--exclude-module", "PySide6.QtQml",
        "--exclude-module", "PySide6.QtQuick",
        "--exclude-module", "PySide6.QtQuickWidgets",
        "--exclude-module", "PySide6.QtSql",
        "--exclude-module", "PySide6.QtPdf",
        "--exclude-module", "PySide6.QtPdfWidgets",
        "--exclude-module", "PySide6.QtSvg",
        "--exclude-module", "PySide6.QtOpenGL",
        "--exclude-module", "PySide6.QtOpenGLWidgets",
        "--exclude-module", "PySide6.QtTest",
        "--exclude-module", "PySide6.QtPrintSupport",
        "--exclude-module", "PySide6.QtXml",
    ]

    res_path = base_dir / "resources"
    if res_path.exists():
        cmd.extend(["--add-data", f"{res_path}{os.pathsep}resources"])

    if is_macos:
        icon_file = base_dir / "resources" / "AppIcon.icns"
        if icon_file.exists():
            cmd.extend(["--icon", str(icon_file)])
    elif is_windows:
        icon_file = base_dir / "resources" / "icon.ico"
        if icon_file.exists():
            cmd.extend(["--icon", str(icon_file)])
        else:
            icon_png = base_dir / "resources" / "icon.png"
            if icon_png.exists():
                cmd.extend(["--icon", str(icon_png)])
    else:
        icon_png = base_dir / "resources" / "icon.png"
        if icon_png.exists():
            cmd.extend(["--icon", str(icon_png)])

    cmd.append("main.py")

    res = subprocess.run(cmd, cwd=str(base_dir), capture_output=True, text=True)
    if res.returncode != 0:
        print("❌ 打包失败 / Build failed:")
        print(res.stderr)
        sys.exit(res.returncode)

    elapsed = time.time() - start_time

    if is_macos:
        app_path = dist_dir / f"{app_name}.app"
        if not app_path.exists():
            print(f"❌ 找不到生成的应用包 / App not found at: {app_path}")
            sys.exit(1)

        size_res = subprocess.run(["du", "-sk", str(app_path)], capture_output=True, text=True)
        app_size_kb = int(size_res.stdout.split()[0])
        app_size_mb = app_size_kb / 1024.0

        zip_versioned = dist_dir / f"{app_name}-{version}-mac-arm64.zip"
        subprocess.run(["ditto", "-c", "-k", "--keepParent", str(app_path), str(zip_versioned)], check=True)

        zip_size_mb = zip_versioned.stat().st_size / (1024.0 * 1024.0)
        sha256 = compute_sha256(zip_versioned)
        sha_file = dist_dir / f"{app_name}-{version}-mac-arm64.sha256"
        with open(sha_file, "w") as f:
            f.write(f"{sha256}  {zip_versioned.name}\n")

        print(f"✅ [PySide6] macOS 构建完成 / Completed in {elapsed:.2f}s!")
        print(f"   - App Bundle: {app_path} ({app_size_mb:.2f} MB)")
        print(f"   - Distribution ZIP: {zip_versioned} ({zip_size_mb:.2f} MB)")
        print(f"   - SHA256: {sha256}")
        archive_path = zip_versioned

    elif is_windows:
        bundle_dir = dist_dir / app_name
        exe_file = bundle_dir / f"{app_name}.exe"
        if not exe_file.exists():
            print(f"❌ 找不到生成的 Windows 可执行文件 / Exe not found at: {exe_file}")
            sys.exit(1)

        app_size_bytes = sum(f.stat().st_size for f in bundle_dir.rglob("*") if f.is_file())
        app_size_mb = app_size_bytes / (1024.0 * 1024.0)

        import zipfile
        zip_versioned = dist_dir / f"{app_name}-{version}-windows-x64.zip"
        with zipfile.ZipFile(zip_versioned, "w", zipfile.ZIP_DEFLATED) as zf:
            for file in bundle_dir.rglob("*"):
                if file.is_file():
                    zf.write(file, file.relative_to(dist_dir))

        zip_size_mb = zip_versioned.stat().st_size / (1024.0 * 1024.0)
        sha256 = compute_sha256(zip_versioned)
        sha_file = dist_dir / f"{app_name}-{version}-windows-x64.sha256"
        with open(sha_file, "w") as f:
            f.write(f"{sha256}  {zip_versioned.name}\n")

        print(f"✅ [PySide6] Windows 构建完成 / Completed in {elapsed:.2f}s!")
        print(f"   - Distribution Folder: {bundle_dir} ({app_size_mb:.2f} MB)")
        print(f"   - Distribution Archive: {zip_versioned} ({zip_size_mb:.2f} MB)")
        print(f"   - SHA256: {sha256}")
        archive_path = zip_versioned

    else:
        # Linux (Ubuntu) packaging: standalone folder to .tar.gz
        bundle_dir = dist_dir / app_name
        if not bundle_dir.exists():
            print(f"❌ 找不到生成的 Linux 分发目录 / Bundle not found at: {bundle_dir}")
            sys.exit(1)

        size_res = subprocess.run(["du", "-sk", str(bundle_dir)], capture_output=True, text=True)
        app_size_kb = int(size_res.stdout.split()[0])
        app_size_mb = app_size_kb / 1024.0

        tar_versioned = dist_dir / f"{app_name}-{version}-linux-x64.tar.gz"
        subprocess.run(["tar", "-czf", str(tar_versioned), "-C", str(dist_dir), app_name], check=True)

        tar_size_mb = tar_versioned.stat().st_size / (1024.0 * 1024.0)
        sha256 = compute_sha256(tar_versioned)
        sha_file = dist_dir / f"{app_name}-{version}-linux-x64.sha256"
        with open(sha_file, "w") as f:
            f.write(f"{sha256}  {tar_versioned.name}\n")

        print(f"✅ [PySide6] Linux/Ubuntu 构建完成 / Completed in {elapsed:.2f}s!")
        print(f"   - Distribution Folder: {bundle_dir} ({app_size_mb:.2f} MB)")
        print(f"   - Distribution Archive: {tar_versioned} ({tar_size_mb:.2f} MB)")
        print(f"   - SHA256: {sha256}")
        archive_path = tar_versioned

    return {
        'dist_path': str(archive_path),
        'size_mb': archive_path.stat().st_size / (1024.0 * 1024.0),
        'sha256': sha256,
        'build_time_s': elapsed
    }

if __name__ == '__main__':
    package()
