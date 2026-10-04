# Roundtable (圆桌会议) - JavaScript / Electron 客户端 (已废弃 / Deprecated)

> [!WARNING]
> **此 JavaScript / Electron 实现已废弃并归档供后续参考 (Deprecated for reference only)。**
> 
> - **废弃原因**：打包体积较大（约 123MB ~ 307MB）且多进程运行时物理内存占用高（约 156MB+）。
> - **后续主力开发**：聚焦于轻量高性能的 [Python (PySide6)](../python/README.md)（约 27MB）与 [Swift Native (SwiftUI/AppKit)](../swift/README.md)（约 0.48MB）。
> - **保留价值**：本目录完好保留了 41 项完备的单元测试、协议解析逻辑、MCP 配置文件导入器与 UI 样式设计规范，供 Python 与 Swift 版本参考与移植。

---

## 🌟 核心特性 / Features

- **原生 Chromium Web 界面**：采用现代化 HTML5/CSS3 与原生 ES Modules 构建，零前端重型框架依赖。
- **独立本地服务 (`npm run serve`)**：具备独立的 REST 与 SSE (Server-Sent Events) API，支持无头服务模式。
- **多 Agent 真实 CLI 接入**：已完整接入 Codex、Claude、Cursor、Antigravity，支持流式日志解析、独立调查沙箱与结构化总结。
- **统一 MCP 适配与导入**：支持跨客户端 MCP 工具配置去重导入与按调用安全分发。

---

## 🚀 快速启动 / Getting Started

### 1. 安装依赖
```bash
cd javascript
npm install
```

### 2. 启动桌面客户端
```bash
npm start
```

### 3. 独立启动本地会议服务守护进程 (Headless Daemon)
```bash
npm run serve
```

### 4. 运行全量单元测试 (41 项测试套件)
```bash
npm test
```

### 5. 打包 macOS 应用 (.dmg, .zip, .app)
```bash
npm run package:mac
```
产物将输出至 `dist/` 目录。
