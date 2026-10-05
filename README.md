# Roundtable · 圆桌会议

> Native multi-agent AI deliberation, structured debate, and human-in-the-loop decision synthesis.

Roundtable is an independent desktop application designed for structured collaborative deliberation between humans and multiple autonomous AI agents. Rather than single-agent Q&A or sequential chat, Roundtable convenes distinct models into an authentic meeting: cross-examining arguments, evaluating evidence, debating counter-hypotheses, and synthesizing rigorous consensus drafts while explicitly preserving minority dissents.

---

## 🌟 Production Client Stacks

Roundtable provides tailored native desktop applications for each operating system:

| Platform | Production Stack | Package Size | Memory Footprint | Key Highlights |
| :--- | :--- | :--- | :--- | :--- |
| **macOS (Apple Silicon)** | **Swift Native** (`swift/`) | **~0.5 MB** | **~35 MB** | Native SwiftUI & AppKit, zero external runtime, sub-second launch. |
| **Windows 10/11 x64** | **Python (PySide6)** (`python/`) | **~35 MB** | **~105 MB** | Standalone portable bundle, no Python installation needed, Qt 6 native controls. |
| **Linux (Ubuntu x64)** | **Python (PySide6)** (`python/`) | **~64 MB** | **~105 MB** | Portable `.tar.gz`, Wayland & X11 compatibility, full offline capability. |

---

## 🚀 Key Features

- **Role Specialization & Setup Wizard**:
  - **Organizer**: Facilitates the deliberation agenda, calls participants to order, and routes follow-up questions.
  - **Leader**: Synthesizes arguments, balances trade-offs, and authors the official decision proposal.
  - **Members**: Autonomous AI debaters investigating, challenging, and defending specific stances.
  - **Human Judge**: Outside the debater pool; defines evaluation rubrics, probes cross-examinations, and renders final binding determinations.
- **Dynamic Deliberation Logic**:
  - Automatically adjusts roles based on participant count (e.g., 3-agent setup has the Organizer actively debate as a Member; 4+ agent setup allows an independent host).
- **Deliberation Modes**:
  - **Joint Discussion**: Turn-based public debate where participants iteratively rebut and cite preceding claims.
  - **Independent Investigation**: Blind parallel inquiries where models independently investigate questions before results are unsealed simultaneously.
- **Full Dual-Theme Support**:
  - Native Light Mode and Dark Mode dynamically syncing with system preferences.
- **Claim & Citation Tracking**:
  - Explicitly structures claims, cited premises, and dissenting opinions with unique identifiers.
- **Privacy & Local Storage**:
  - Deliberation history and data stored locally on your machine with no third-party telemetry.

---

## 💻 Quick Start

### 1. macOS (Swift Native)
Requires macOS 13.0+ and Xcode / Swift 6.0+.

```bash
cd swift

# Run directly in development
swift run

# Or package into a native macOS app bundle (.app and .zip)
bash package.sh
```

### 2. Windows & Linux (Python PySide6)
Requires Python 3.10+.

```bash
cd python

# Setup virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run desktop application
python main.py

# Or package standalone portable distribution
python package.py
```

---

## 📦 Automated CI / CD Packaging

Roundtable features automated GitHub Actions workflows that produce standalone release packages for each platform:

- **macOS Workflow** ([`build-macos.yml`](.github/workflows/build-macos.yml)): Compiles Swift Native application into `Roundtable-Swift-*-mac-arm64.zip` (**0.51 MB**).
- **Windows Workflow** ([`build-windows.yml`](.github/workflows/build-windows.yml)): Packages PySide6 into a standalone portable `.zip` containing `Roundtable-PySide6.exe` (**~35 MB**).
- **Linux Workflow** ([`build-ubuntu.yml`](.github/workflows/build-ubuntu.yml)): Packages PySide6 into `Roundtable-PySide6-*-linux-x64.tar.gz` (**~64 MB**).
- **Quality Assurance** ([`test.yml`](.github/workflows/test.yml)): Cross-platform automated unit tests verifying core models, state machines, and role dynamics.

---

## 📊 Measured Performance

Benchmarked locally on Apple Silicon (M-series, measured via `vmmap -summary` and binary analysis):

| Architecture | Binary / App Bundle Size | Distribution Package | Physical Footprint | Resident Memory (RSS) | Launch Latency |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Swift Native (macOS)** | **1.51 MB** (.app) | **0.50 MB** (.zip) | **35.0 MB** | 107.2 MB | **~0.08s** |
| **Python PySide6** | 78.14 MB (.app) | 27.31 MB (.zip) | 105.5 MB | 173.8 MB | ~0.62s |

---

## 📄 License & Attribution

- Code developed in this project is licensed under the [Apache License 2.0](LICENSE).
- Upstream stream extraction utilities adapted from `ai-us-stock-lab/roundtable` under MIT; see [NOTICE](NOTICE) and [third_party/roundtable/LICENSE](third_party/roundtable/LICENSE).
- Documentation and architectural specifications can be found in the [`docs/`](docs/) directory.
