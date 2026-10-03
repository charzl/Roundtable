# 圆桌会议 · Roundtable

让人和多个真实 AI agent 在同一场会议里提问、回应、核查和反驳，形成有依据、保留异议的决策稿。

第一版是运行在 Mac mini 上的 macOS 桌面应用：Electron 界面 + 独立本地会议服务 + Codex / Claude / AGY CLI 适配器。后续手机 App 可接入会议服务；本版尚无手机 App 或远程接入。

## 本地使用

本机需安装 Node.js，以及至少两种可用的参会 CLI，并完成各自登录。本项目不会复制账号凭据或修改全局 MCP 配置。

```sh
npm ci
npm start
```

创建会议、选择参会者与轮数后，点击「开始讨论」。默认最多 10 轮；一轮内所有参会者各公开发言一次。只有全员在同一轮建议总结，才自动提前结束；仍可保留交给用户判断的异议和问题。人类在 agent 发言期间提交的内容会排队，于回合边界公开。暂停在当前回合结束后生效，结束可取消当前调用并整理已有记录。

点击「导出」保存公开记录、观点、研究和核查记录，以及调用的提示词、原始输出与清单。来源链接存在不代表观点已被验证。

```sh
npm run build:mac
open dist/Roundtable.app
```

打包结果为本机架构的开发版 `.app`，使用 ad-hoc 签名，没有 Developer ID 签名或 Apple 公证。没有自动发布或部署。

## 当前验证情况

- Codex 和 Claude 已通过同一个会议 MCP 读取公开记录，并完成真实两轮讨论、三条交叉核查及带观点编号的决策稿。
- AGY 已取得真实 CLI 输出，并在一次格式解析失败后重试，完成三运行时会议中的发言。该场会议第一轮后提前总结，失败尝试也保留在记录中。
- 这证明三个真实 CLI 运行时参与，并不证明三种不同的底层模型：AGY 的默认模型身份没有在本次事件中明确暴露。
- 开发窗口及打包后窗口均通过交互验收。自动化调度测试使用隔离的测试数据，不作为真实模型接入证据。
- 验收范围、证据位置及限制见 [第一版验收记录](docs/first-version-verification.md)。

## 共享能力与数据

「共享能力」维护一份 MCP 配置。Codex / Claude 接收适配后的同一份配置；共同 skill 内容随提示词提供并记录版本哈希。内置 MCP 支持会议记录、共享研究与观点核查。

开发模式数据在 `.roundtable/`；打包应用数据在 `~/Library/Application Support/roundtable-desktop/data/`（以实际 Electron userData 路径为准）。共享 MCP 与 skills 位于数据目录的 `shared/`。每场会议固定创建时的配置和规范版本；修改用于之后新建的会议。

AGY 的本项目共享 MCP 配置适配尚未验证。本版研究在发言调用内执行，独立的并行研究任务调度尚未实现。外部 MCP、网络研究、长期运行及更多机器兼容性需继续验证。

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
```

桌面服务只监听本机回环地址，API 使用临时会话授权。单独开发服务可用 `npm run serve`，按终端输出的本地地址进入。

## 许可与来源

自行开发的代码采用 [Apache License 2.0](LICENSE)。它允许商业使用和闭源衍生，须遵守声明、修改标记及适用 NOTICE 等要求，不要求使用者逐次申请许可。

流式事件提取辅助函数局部借鉴 `ai-us-stock-lab/roundtable` 的 MIT 代码；来源与修改说明见 [NOTICE](NOTICE)，原许可证保存在 [third_party/roundtable/LICENSE](third_party/roundtable/LICENSE)。只读研究快照及其他第三方材料保留各自许可。本项目独立于 BabyLog。

产品需求见 [产品需求与交接](docs/product-brief.md)，上游静态评估见 [现有方案复用评估](docs/solution-reuse-assessment.md)。
