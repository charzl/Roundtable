# 圆桌会议 · Roundtable

让人和多个真实 AI agent 在同一场会议里提问、回应、核查和反驳，形成有依据、保留异议的决策稿。

当前 0.2.2 版是运行在 Mac mini 上的 macOS 桌面应用：Electron 界面 + 独立本地会议服务 + Codex / Claude / AGY CLI 适配器。后续手机 App 可接入会议服务；本版尚无手机 App 或远程接入。

## 本地使用

本机需安装 Node.js，以及至少两种可用的参会 CLI，并完成各自登录。本项目不会复制账号凭据或修改全局 MCP 配置。

```sh
npm ci
npm start
```

创建会议时可选择「共同讨论」或「独立调查」，选择 Leader（负责最终总结）和会议输出语言，再选择参会者与轮数。共同讨论依次发言；独立调查让 Codex、Claude 同时分析同一题目，报告齐备后统一公开，再依次对比、核查与讨论。调查算第 1 轮。默认最多 10 轮；一轮内所有参会者各公开发言一次。只有全员在同一轮建议总结，才自动提前结束；仍可保留交给用户判断的异议和问题。人类在 agent 发言期间提交的内容会排队，于回合边界公开。共同讨论的暂停在当前回合结束后生效；独立调查暂停会取消在途调用，保留已封存报告。结束会取消在途调用并整理已有材料。独立调查失败可单独重试、明确跳过，或暂停后按新题目重做；缺席不计为同意。

应用右上角可选择「中文」「English」「随系统」，默认随系统。会议输出语言单独选择，开始时固定；切换界面语言保留原文、证据及未保存的决定草稿。Leader 在会议结束时汇总全部参会者意见，生成具名总结和决策稿，用户自己的决定单独保存；可更换 Leader重试，并保留旧稿。

点击「导出」保存公开记录、观点、研究和核查记录，以及调用的提示词、原始输出与清单。来源链接存在不代表观点已被验证。

```sh
npm run build:mac
open dist/Roundtable.app

# 生成完整分发包（DMG 与 ZIP，附带 SHA256 校验和）
npm run package:mac
```

打包结果为本机架构的开发版 `.app`、`.dmg` 与 `.zip`，使用 ad-hoc 签名，没有 Developer ID 签名或 Apple 公证。

项目配置了 GitHub Actions 自动化工作流（`.github/workflows/build-macos.yml`），基于 GitHub-hosted macOS runner（`macos-14` Apple Silicon 与 `macos-13` Intel）在云端并行构建、测试并生成 macOS 安装包（DMG 与 ZIP），支持作为 Release 或 Artifact 下载。

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

「共享能力」维护一份 MCP 配置。0.2.2 已合并本机 Codex、Claude、AGY 的既有定义：Broadcom、小红书、Robinhood、node_repl、computer-use，去重保留来源及原禁用状态。重新导入用 `npm run import:mcp`（需 Python 3.11+）；导入不等于账号或所有工具已接通。实际状态见 [MCP 合并验收](docs/mcp-import-verification.md)。Codex / Claude 接收适配后的同一份配置；共同 skill 内容随提示词提供并记录版本哈希。内置 MCP 支持会议记录、共享研究与观点核查。

桌面应用（`npm start` 和打包 `.app`）统一保存到 `~/Library/Application Support/Roundtable/data/`，窗口偏好位于其旁边的 `electron-profile/`。文件不放在安装包内。旧目录的会议以复制方式迁移，冲突版本另行保留；更新打包前也检查旧包内数据。共享 MCP 与 skills 位于数据目录的 `shared/`。每场会议固定创建时的配置和规范版本；修改用于之后新建的会议。单独运行 `npm run serve` 仍默认使用仓库 `.roundtable/`；也可用 `ROUNDTABLE_DATA_DIR` 指定目录。当前使用 JSON 文件，尚未迁移 SQLite。

Codex、Claude、AGY 均可参加共同讨论和独立调查。按用户当前选择，优先取得 AGY 的意见：AGY 直接分析提示词提供的会议材料，项目共享 MCP 适配仍待完善，其全局工具尚未按调用隔离。Codex / Claude 的独立阶段仅传入内置会议 MCP，暂不接入外部共享 MCP；Mac 文件限制仍保护本项目数据目录，远程共享工具及运行时缓存不在这项文件限制范围。公开讨论可使用统一配置的外部工具，但其连接与权限需逐项验证。更多语言通过 `ui/locales/manifest.json` 和对应资源加入，原文不自动翻译。

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
