# Roundtable (圆桌会议) - Python + PySide6 客户端

基于 **Python 3** 与 **PySide6 (Qt6)** 构建的现代化、高性能多 Agent 会议桌面客户端。

---

## 🌟 核心特性 / Features

- **原生 Qt6 硬件加速**：单进程常驻运行，内存开销仅约 110-140MB（比 Electron 节省 60%+）。
- **小巧独立的分发包**：通过 `PySide6-Essentials` 精简优化，macOS 独立 `.app` 仅约 78MB（分发压缩包 27MB，比 Electron 缩减 75%）。
- **多参会者状态机**：完整支持 Codex (OpenAI)、Claude (Anthropic)、Cursor (Anysphere) 与 Antigravity (AGY)。
- **讨论模式与负责人总结**：支持最大 10 轮讨论、参会者互相辩论、人类实时排队插话、会议负责人（Leader）自动草拟总结。
- **跨平台支持**：同一套 Python 源码可在 macOS、Windows 和 Linux 上构建运行。

---

## 🚀 快速启动 / Getting Started

### 1. 环境准备
推荐使用 Python 3.10+：
```bash
cd python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. 运行桌面客户端
```bash
python main.py
```

### 3. 运行自动化测试
```bash
python -m unittest discover -s tests -p "test_*.py"
```

### 4. 独立打包应用 (macOS App & ZIP)
```bash
python package.py
```
打包产物将输出至 `python/dist/`：
- `Roundtable-PySide6.app`
- `Roundtable-PySide6-mac-arm64.zip`

---

## 📁 目录结构 / Project Structure

```text
python/
├── main.py              # 应用入口 (QApplication 初始化与主窗口加载)
├── models.py            # 数据模型 (Meeting, Message, Claim, Decision, MeetingStore)
├── engine.py            # 轮次协调引擎、QThread 异步工作流与总结算法
├── ui.py                # PySide6 UI 界面 (侧边栏、时间线、发言卡片、弹窗)
├── package.py           # 自动化 PyInstaller 打包流水线
├── tests/               # 自动化单元测试
├── requirements.txt     # Python 依赖清单
└── pyproject.toml       # Python 项目元数据
```
