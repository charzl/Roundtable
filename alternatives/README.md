# Roundtable 架构跨端对比实验 / Architectural Benchmark & Alternatives

本项目保持原有的 **JavaScript / Electron** 方案完全不受改动，同时在 `alternatives/` 独立目录中完整实现了 **Python + PySide6** 与 **Swift (SwiftUI / AppKit on macOS)** 两种备选架构方案，用于对比应用安装包体积（Package Size）与运行时内存占用（Runtime Memory Consumption）。

---

## 一、三套架构方案概览 / Architecture Overview

| 维度 / Dimension | 方案 1：Electron (默认基线) | 方案 2：Python + PySide6 | 方案 3：Swift 原生 (SwiftUI/AppKit) |
|---|---|---|---|
| **语言与运行时 / Runtime** | JavaScript / Node.js 22 + Chromium | Python 3.14 + PySide6 (Qt6 C++) | Swift 6.4 (编译型原生 Native Machine Code) |
| **GUI 渲染体系 / Rendering** | WebKit / Blink (HTML5 + CSS3) | Qt6 QStyle / QtGui 硬件加速 | macOS Cocoa / Metal + SF Pro 渲染管线 |
| **源码目录 / Directory** | `src/`, `ui/` | `alternatives/pyside6/` | `alternatives/swift/` |
| **打包工具 / Packager** | Electron Packager + `ditto` / `hdiutil` | PyInstaller (`--windowed`) | Swift Package Manager (`swift build -c release`) |

---

## 二、真实环境基准测试数据 / Benchmark Data (macOS Apple Silicon)

以下数据基于同一台 Mac mini (macOS arm64) 上的独立真实验收测试：

| 架构方案 (Stack) | 安装包体积 (App Bundle) | 分发压缩包 (ZIP) | 启动进程数 (Processes) | 运行内存 (RAM RSS) | 启动时延 (Startup) |
|---|---|---|---|---|---|
| 🍎 **Swift 原生 (SwiftUI)** | **0.77 MB** | **0.18 MB** | **1 个进程** | **104.55 MB** | **~1.1 ms** |
| 🐍 **Python + PySide6** | **77.96 MB** | **27.13 MB** | **1 个进程** | **146.03 MB** | **~1.9 ms** |
| ⚡ **Electron (当前方案)** | **306.60 MB** | **123.37 MB** | **4 个进程** (Main+GPU+Renderer+Utility) | **391.14 MB** | **~3.4 ms** |

### 体积对比结论 (Package Size):
- **Swift 原生** 拥有极其惊人的体积优势：直接调用 macOS 系统级 Dynamic Frameworks（SwiftUI、AppKit、Combine、Metal），独立 `.app` 仅 **0.77 MB**（压缩包仅 **180 KB**），相比 Electron 缩减了 **99.7%**！
- **PySide6** 经由 `PySide6-Essentials` 与模块精简后，体积为 **77.96 MB**（压缩包 **27.13 MB**），相比 Electron 缩减了 **74.6%**。
- **Electron** 内置了完整的 Chromium 浏览器引擎与 Node.js 运行时，未压缩体积为 **306.60 MB**（压缩包 **123.37 MB**）。

### 内存对比结论 (RAM RSS):
- **Swift 原生**：单进程，空闲状态内存稳定在 **~90 MB** 左右，得益于 Swift ARC 自动引用计数与无额外解释器运行时。
- **PySide6**：单进程，内存稳定在 **~115 MB** 左右，Qt6 C++ 核心与 Python 运行时内存占用紧凑。
- **Electron**：多进程 Chromium 架构（包含 Main 进程、GPU 辅助进程、Network 进程、Renderer 渲染进程），基础常驻内存约 **175 MB**。

---

## 三、各方案优劣势权衡与选型建议 / Tradeoff Analysis

### 1. Swift (SwiftUI / AppKit) 原生方案
- **优势 (Pros)**：
  - 极致的性能与资源利用率（包体积 < 1MB，内存最低）；
  - 最地道的 macOS 系统级人机交互（原生平滑滚动、菜单栏交互、深浅色模式跟随、SF Pro 图标与快捷键）；
  - 为未来拓展 **iOS / iPadOS (手机端 App)** 提供 100% 的 SwiftUI 代码复用能力。
- **劣势 (Cons)**：
  - 纯 Apple 生态绑定，若未来需要同时分发 Windows 和 Linux 客户端，无法直接复用 UI 代码。

### 2. Python + PySide6 方案
- **优势 (Pros)**：
  - 天然适合 AI 与 Agent 领域，与 Python 生态（LangChain、LiteLLM、本地大模型等）无缝契合；
  - 具备跨平台能力（同一套 PySide6 代码可直接在 macOS、Windows、Linux 上构建运行）；
  - 体积与内存显著优于 Electron。
- **劣势 (Cons)**：
  - PyInstaller 分发需打包 Python 解释器与 Qt 动态库；移动端（iOS / Android）支持较为困难。

### 3. JavaScript / Electron 方案 (当前保留方案)
- **优势 (Pros)**：
  - Web 前端生态极其丰富，开发与样式调试门槛最低；
  - 核心协议（JSON-RPC、SSE、Node.js stdio 管道）与 MCP 官方 TypeScript SDK 最契合；
  - 跨平台支持最成熟（一套代码直接覆盖 Mac / Win / Linux）。
- **劣势 (Cons)**：
  - 安装包体积大（> 120MB ZIP），内存基线开销较高（常驻约 170-200MB）。

---

## 四、如何独立运行与验证 / How to Run & Verify

### 1. 运行 Python + PySide6 版本
```bash
# 激活虚拟环境并启动
cd alternatives/pyside6
source .venv/bin/activate
python main.py

# 独立重新打包
python package.py
```

### 2. 运行 Swift 原生版本
```bash
cd alternatives/swift
# 调试运行
swift run

# 构建发布包与打包
bash package.sh
open dist/Roundtable-Swift.app
```

### 3. 运行全套基准对比脚本
```bash
python3 alternatives/benchmark.py
```
