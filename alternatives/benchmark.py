#!/usr/bin/env python3
"""
Comprehensive Benchmark: Package Size, Startup Latency, and Runtime Memory (RAM)
Comparing Electron (JS) vs PySide6 (Python) vs Swift (Native macOS SwiftUI/AppKit).
"""

import os
import sys
import time
import subprocess
import signal
from pathlib import Path

def get_process_memory_mb(pid: int) -> float:
    """Get total RSS in MB for a process and all its children."""
    try:
        # Get children PIDs
        pgrep_res = subprocess.run(["pgrep", "-P", str(pid)], capture_output=True, text=True)
        pids = [str(pid)]
        if pgrep_res.returncode == 0:
            pids.extend(pgrep_res.stdout.strip().split())

        total_rss_kb = 0
        for p in pids:
            ps_res = subprocess.run(["ps", "-o", "rss=", "-p", p], capture_output=True, text=True)
            if ps_res.returncode == 0 and ps_res.stdout.strip():
                try:
                    total_rss_kb += int(ps_res.stdout.strip().split()[0])
                except ValueError:
                    pass
        return total_rss_kb / 1024.0, len(pids)
    except Exception:
        return 0.0, 1

def measure_runtime(binary_path: str, name: str, wait_seconds: float = 3.0):
    print(f"\n🔬 正在启动与测试 / Launching and measuring: {name}...")
    start_time = time.time()
    
    env = os.environ.copy()
    # Prevent Electron from interfering with dev server if needed
    env["ROUNDTABLE_BENCHMARK"] = "1"
    env["ROUNDTABLE_DATA_DIR"] = "/tmp/roundtable-bench-data"
    
    cmd = [binary_path]
    if "Electron" in name:
        cmd.append("--user-data-dir=/tmp/roundtable-bench-profile")

    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=env)
    launch_time = time.time() - start_time
    
    # Wait for app window to stabilize
    time.sleep(wait_seconds)
    
    # Measure memory
    rss_mb, proc_count = get_process_memory_mb(proc.pid)
    
    # Terminate gracefully
    try:
        proc.terminate()
        proc.wait(timeout=2)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass

    print(f"   ⏱️ 启动时间 / Startup: {launch_time * 1000:.1f} ms")
    print(f"   👥 进程数量 / Process Count: {proc_count}")
    print(f"   💾 运行内存 / Memory (RSS): {rss_mb:.2f} MB")
    
    return {
        'name': name,
        'startup_ms': launch_time * 1000,
        'proc_count': proc_count,
        'rss_mb': rss_mb
    }

def main():
    root = Path(__file__).resolve().parent.parent
    dist_electron = root / "dist" / "Roundtable.app"
    bin_electron = dist_electron / "Contents" / "MacOS" / "Roundtable"
    
    dist_pyside = root / "alternatives" / "pyside6" / "dist" / "Roundtable-PySide6.app"
    bin_pyside = dist_pyside / "Contents" / "MacOS" / "Roundtable-PySide6"
    
    dist_swift = root / "alternatives" / "swift" / "dist" / "Roundtable-Swift.app"
    bin_swift = dist_swift / "Contents" / "MacOS" / "RoundtableSwift"

    # Package sizes
    def get_bundle_size_mb(path: Path) -> float:
        res = subprocess.run(["du", "-sk", str(path)], capture_output=True, text=True)
        return int(res.stdout.split()[0]) / 1024.0

    def get_file_size_mb(path: Path) -> float:
        return path.stat().st_size / (1024.0 * 1024.0)

    # 1. Electron
    zip_electron = root / "dist" / "Roundtable-0.2.2-mac-arm64.zip"
    size_electron_app = get_bundle_size_mb(dist_electron)
    size_electron_zip = get_file_size_mb(zip_electron)

    # 2. PySide6
    zip_pyside = root / "alternatives" / "pyside6" / "dist" / "Roundtable-PySide6-mac-arm64.zip"
    size_pyside_app = get_bundle_size_mb(dist_pyside)
    size_pyside_zip = get_file_size_mb(zip_pyside)

    # 3. Swift
    zip_swift = root / "alternatives" / "swift" / "dist" / "Roundtable-Swift-mac-arm64.zip"
    size_swift_app = get_bundle_size_mb(dist_swift)
    size_swift_zip = get_file_size_mb(zip_swift)

    print("=" * 70)
    print("📊 ROUNDTABLE 跨架构包体积对比 / PACKAGE SIZE COMPARISON")
    print("=" * 70)
    print(f"1. Electron (JavaScript/Node):")
    print(f"   - App Bundle (.app):  {size_electron_app:.2f} MB")
    print(f"   - Compressed (.zip):  {size_electron_zip:.2f} MB")
    print(f"2. PySide6 (Python/Qt6):")
    print(f"   - App Bundle (.app):  {size_pyside_app:.2f} MB (-{(1 - size_pyside_app/size_electron_app)*100:.1f}%)")
    print(f"   - Compressed (.zip):  {size_pyside_zip:.2f} MB (-{(1 - size_pyside_zip/size_electron_zip)*100:.1f}%)")
    print(f"3. Swift (SwiftUI/AppKit Native):")
    print(f"   - App Bundle (.app):  {size_swift_app:.2f} MB (-{(1 - size_swift_app/size_electron_app)*100:.1f}%)")
    print(f"   - Compressed (.zip):  {size_swift_zip:.2f} MB (-{(1 - size_swift_zip/size_electron_zip)*100:.1f}%)")

    print("\n" + "=" * 70)
    print("🧠 运行内存与进程消耗实测 / RUNTIME MEMORY & PROCESS BENCHMARK")
    print("=" * 70)

    res_swift = measure_runtime(str(bin_swift), "Swift (SwiftUI/AppKit Native)")
    res_pyside = measure_runtime(str(bin_pyside), "PySide6 (Python/Qt6)")
    res_electron = measure_runtime(str(bin_electron), "Electron (JavaScript/Chromium)")

    print("\n" + "=" * 70)
    print("📋 综合对比数据汇总表 / COMPREHENSIVE BENCHMARK SUMMARY")
    print("=" * 70)
    print(f"| 架构方案 (Stack) | 安装包体积 (App Bundle) | 分发压缩包 (ZIP) | 进程数 (Processes) | 运行内存 (RAM RSS) |")
    print(f"|---|---|---|---|---|")
    print(f"| **Swift 原生** | **{size_swift_app:.2f} MB** | **{size_swift_zip:.2f} MB** | **{res_swift['proc_count']}** | **{res_swift['rss_mb']:.2f} MB** |")
    print(f"| **PySide6** | {size_pyside_app:.2f} MB | {size_pyside_zip:.2f} MB | {res_pyside['proc_count']} | {res_pyside['rss_mb']:.2f} MB |")
    print(f"| **Electron (当前)** | {size_electron_app:.2f} MB | {size_electron_zip:.2f} MB | {res_electron['proc_count']} | {res_electron['rss_mb']:.2f} MB |")

if __name__ == '__main__':
    main()
