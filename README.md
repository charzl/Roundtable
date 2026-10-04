# 圆桌会议 · Roundtable

让人和多个真实 AI agent 在同一场会议里提问、回应、核查和反驳，形成有依据、保留异议的决策稿。

当前项目采用多技术栈并行架构（Multi-Stack Architecture）：
- 🐍 **`python/`**：**Python + PySide6 客户端**（聚焦开发：跨端灵活、包体仅 78MB、内存仅 140MB，详见 [python/README.md](python/README.md)）
- 🍎 **`swift/`**：**Swift 6.4 原生客户端**（聚焦开发：macOS 原生极致体验、包体不足 1MB、内存仅 100MB、未来直通 iOS，详见 [swift/README.md](swift/README.md)）
- ⚡ **`javascript/`**：**JavaScript / Electron 客户端**（原有基线版本：Node.js 22 本地服务守护进程与 Electron 界面，详见 [javascript/README.md](javascript/README.md)）
- 📊 **`benchmark.py`**：全架构实测数据与能效分析工具（详见 [跨架构实测报告](docs/benchmark-comparison.md)）

---

## 快速导航与本地使用 / Getting Started

### 1. 运行 Python 客户端 (推荐)
```sh
cd python
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

### 2. 运行 Swift 原生客户端 (macOS 极致体验)
```sh
cd swift
swift run
```

### 3. 运行 JavaScript / Electron 客户端 (基线版本)
```sh
npm ci --prefix javascript
npm start
```

创建会议时可选择「共同讨论」或「独立调查」，选择 Leader（负责最终总结）和会议输出语言，再选择参会者与轮数。共同讨论依次发言；独立调查让 Codex、Claude 同时分析同一题目，报告齐备后统一公开，再依次对比、核查与讨论。调查算第 1 轮。默认最多 10 轮；一轮内所有参会者各公开发言一次。只有全员在同一轮建议总结，才自动提前结束；仍可保留交给用户判断的异议和问题。人类在 agent 发言期间提交的内容会排队，于回合边界公开。共同讨论的暂停在当前回合结束后生效；独立调查暂停会取消在途调用，保留已封存报告。结束会取消在途调用并整理已有材料。独立调查失败可单独重试、明确跳过，或暂停后按新题目重做；缺席不计为同意。

应用右上角可选择「中文」「English」「随系统」，默认随系统。会议输出语言单独选择，开始时固定；切换界面语言保留原文、证据及未保存的决定草稿。Leader 在会议结束时汇总全部参会者意见，生成具名总结和决策稿，用户自己的决定单独保存；可更换 Leader重试，并保留旧稿。

点击「导出」保存公开记录、观点、研究和核查记录，以及调用的提示词、原始输出与清单。来源链接存在不代表观点已被验证。

```sh
npm run build:mac
open dist/Roundtable.app

# 生成完整分发包（统一打包入口，生成 DMG、ZIP 与 SHA256 校验和清单）
# Generate full distribution packages (DMG, ZIP, and SHA256 checksums)
npm run package
# 也可运行快捷命令 / Or run shortcut
npm run package:mac
```

打包结果为本机架构的开发版 `.app`、`.dmg` 与 `.zip`，使用 ad-hoc 签名，没有 Developer ID 签名或 Apple 公证。  
Packages are built with ad-hoc signing for local architecture, without Developer ID signing or Apple notarization.

项目配置了 GitHub Actions 自动化工作流（`.github/workflows/build-macos.yml`），基于 GitHub-hosted macOS ARM64 runner（`macos-14` Apple Silicon）在云端并行构建、测试并生成安装包，支持作为 Release 或 Artifact 下载。多平台打包规划及 CI 触发方式详见 [打包架构与 CI 触发设计](docs/packaging-and-ci-plan.md)，GitHub 分支与标签保护规则详见 [GitHub 规则集说明](docs/github-rulesets.md)。  
The project includes a GitHub Actions workflow (`.github/workflows/build-macos.yml`) using GitHub-hosted macOS ARM64 runners (`macos-14` Apple Silicon) to build, test, and package applications as Releases or Artifacts. For multi-platform packaging and CI triggers, see [Packaging Architecture & CI Plan](docs/packaging-and-ci-plan.md); for branch and tag protection rules, see [GitHub Rulesets Guide](docs/github-rulesets.md).

## 当前验证情况

- Codex 和 Claude 已通过同一个会议 MCP 读取公开记录，并完成真实两轮讨论、三条交叉核查及带观点编号的决策稿。
- AGY 已取得真实 CLI 输出，并在一次格式解析失败后重试，完成三运行时会议中的发言。该场会议第一轮后提前总结，失败尝试也保留在记录中。
- 这证明三个真实 CLI 运行时参与，并不证明三种不同的底层模型：AGY 的默认模型身份没有在本次事件中明确暴露。
- 开发窗口及打包后窗口均通过交互验收。自动化调度测试使用隔离的测试数据，不作为真实模型接入证据。
- Codex、Claude 已完成真实并行独立调查、报告统一公开、第二轮相互回应和 Claude 总结；两个失败尝试保留，不算有效报告。
- 0.2.1 三方真实独立调查和两轮会议已完成：Codex、Claude、AGY 均提交及回应，Leader Claude 最后总结，共 7 次成功调用。
- 中文、English、随系统及桌面菜单切换通过；报告、原文、草稿和升级后历史回看通过。
- 验收范围、证据位置及限制见 [第一版验收记录](docs/first-version-verification.md)和[0.2 版验收记录](docs/second-version-verification.md)及 [Leader 与 AGY 更新](docs/leader-agy-verification.md)。

## 共享能力与数据

「共享能力」维护一份 MCP 配置。0.2.2 已合并本机 Codex、Claude、AGY 与 Cursor 的既有定义（检索路径含 `~/.cursor/mcp.json` 与 `.cursor/mcp.json`）：Broadcom、小红书、Robinhood、node_repl、computer-use，去重保留来源及原禁用状态。重新导入用 `npm run import:mcp`（需 Python 3.11+）；导入不等于账号或所有工具已接通。实际状态见 [MCP 合并验收](docs/mcp-import-verification.md)。Codex / Claude / Cursor 接收适配后的配置；共同 skill 内容随提示词提供并记录版本哈希。内置 MCP 支持会议记录、共享研究与观点核查。  
The "Shared Capabilities" module maintains a unified MCP configuration. Version 0.2.2 merges existing MCP definitions across Codex, Claude, AGY, and Cursor (searching paths including `~/.cursor/mcp.json` and `.cursor/mcp.json`): Broadcom, Xiaohongshu, Robinhood, node_repl, and computer-use, deduplicating configs while preserving provenance and original disabled status. Re-import via `npm run import:mcp` (requires Python 3.11+).

桌面应用（`npm start` 和打包 `.app`）统一保存到 `~/Library/Application Support/Roundtable/data/`，窗口偏好位于其旁边的 `electron-profile/`。文件不放在安装包内。旧目录的会议以复制方式迁移，冲突版本另行保留；更新打包前也检查旧包内数据。共享 MCP 与 skills 位于数据目录的 `shared/`。每场会议固定创建时的配置和规范版本；修改用于之后新建的会议。单独运行 `npm run serve` 仍默认使用仓库 `.roundtable/`；也可用 `ROUNDTABLE_DATA_DIR` 指定目录。当前使用 JSON 文件，尚未迁移 SQLite。

Codex、Claude、AGY、Cursor 均可参加共同讨论和独立调查。Cursor 运行时通过本地 `cursor-agent`（或 `cursor agent`）CLI 接入，并自动挂载工作区 `.cursor/mcp.json`；调用真实模型需要完成 `agent login` 或提供 `CURSOR_API_KEY`。按用户当前选择，优先取得 AGY 的意见：AGY 直接分析提示词提供的会议材料，项目共享 MCP 适配仍待完善，其全局工具尚未按调用隔离。Codex / Claude 的独立阶段仅传入内置会议 MCP，暂不接入外部共享 MCP；Mac 文件限制仍保护本项目数据目录，远程共享工具及运行时缓存不在这项文件限制范围。公开讨论可使用统一配置的外部工具，但其连接与权限需逐项验证。更多语言通过 `ui/locales/manifest.json` 和对应资源加入，原文不自动翻译。  
Codex, Claude, AGY, and Cursor can all participate in joint discussions and independent investigations. Cursor runs through the local `cursor-agent` (or `cursor agent`) CLI and mounts scoped `.cursor/mcp.json` per workspace invocation; real model execution requires `agent login` or `CURSOR_API_KEY`.


## 检查

```sh
npm run check
npm test
npm run smoke:desktop
npm run smoke:packaged
```

以下命令会调用真实模型，消耗对应账号额度：

```sh
npm run smoke:providers
npm run smoke:meeting
npm run smoke:independent
npm run smoke:three-independent
```

桌面服务只监听本机回环地址，API 使用临时会话授权。单独开发服务可用 `npm run serve`，按终端输出的本地地址进入。

## 许可与来源

自行开发的代码采用 [Apache License 2.0](LICENSE)。它允许商业使用和闭源衍生，须遵守声明、修改标记及适用 NOTICE 等要求，不要求使用者逐次申请许可。

流式事件提取辅助函数局部借鉴 `ai-us-stock-lab/roundtable` 的 MIT 代码；来源与修改说明见 [NOTICE](NOTICE)，原许可证保存在 [third_party/roundtable/LICENSE](third_party/roundtable/LICENSE)。只读研究快照及其他第三方材料保留各自许可。本项目独立于 BabyLog。

产品需求见 [产品需求与交接](docs/product-brief.md)，上游静态评估见 [现有方案复用评估](docs/solution-reuse-assessment.md)。

模式与交互规则见 [分开调查模式设计](docs/independent-investigation-design.md)。核心流程已实现；更多运行时和后台研究任务仍待扩展。

中英文选择和后续语言包规范见 [多语言设计](docs/localization-design.md)。
