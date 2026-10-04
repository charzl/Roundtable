# Roundtable (圆桌会议) - JavaScript / Electron 桌面客户端

基于 **Node.js 22** 与 **Electron** 构建的跨平台多 Agent 会议客户端与本地服务守护进程。

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
