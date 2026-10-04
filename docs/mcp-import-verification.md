# 0.2.2：本机 MCP 配置合并

按用户要求，将 Codex、Claude、AGY 的既有 MCP 定义汇总进 Roundtable 的共享配置。这里只导入本机配置，不改变原有 provider 全局配置，也不改 BabyLog。

## 本机结果

10 条来源定义合并为 5 种服务，无未导入项：

| 服务 | 来源 | 配置与连接状态 |
|---|---|---|
| broadcom | Codex、Claude、AGY | 去重为一份；实际 stdio 初始化及 tools/list 成功，发现 22 个工具 |
| xiaohongshu | Codex、Claude、AGY | 统一 url/serverUrl 格式；实际 HTTP 初始化及 tools/list 成功，发现 18 个工具 |
| robinhood-trading | Codex、Claude 项目注册项 | 去重为一份；不携带账号 OAuth 的初始化返回 HTTP 401，跨运行时授权未验证 |
| node_repl | Codex | 保留命令、环境引用和 120 秒启动配置；依赖桌面运行环境，本次没有启动验证 |
| computer-use | Codex | 保留原有 enabled=false，不启动、不悄悄启用 |

工具列表检查没有执行 tools/call，没有调用模型，也没有读取账号业务资料、发布内容、发送消息或进行交易。列出工具不证明所有工具、账号登录或所有模型的实际调用均已成功。Robinhood 的 401 不证明用户在原 Codex 中未登录；既有 OAuth 授权没有被复制到其他客户端。

## 配置位置

- 桌面：`~/Library/Application Support/Roundtable/data/shared/mcp.json`。
- 开发服务：仓库 `.roundtable/shared/mcp.json`。
- 同目录 `mcp-import.json` 保存来源、去重、别名和未转换项；`mcp-secrets.json` 保存原有环境变量值，配置只保留 envRefs。
- 配置、私有值和导入记录均为 0600；修改前备份到同目录 `backups/`。本机这些内容不进入 Git，分发包仍使用空的默认外部配置。

重复导入命令：

```sh
npm run import:mcp
node scripts/import-mcp.js --shared-dir .roundtable/shared
```

导入器用 Python 3.11+ 读取 Codex TOML 和各 JSON 配置，Node 负责规范化、去重、备份和写入。读取 Claude 注册文件中的项目 MCP 条目，不打开或修改其他项目的文件。同名且配置不同的服务保留运行时别名，不覆盖既有定义。重复导入保持相同配置。

运行时私有环境值由宿主解析，不进入公开配置、提示词或 Codex argv。每次 Claude 临时配置与 cwd 启动描述调用后清除。禁用服务不会传入运行时。Codex 保留 cwd 和服务时限字段；Claude 通过 stdio 启动器处理 cwd，其配置不传入 Codex 专用时限字段。

## 适配边界

Codex、Claude 的共同讨论调用接收共享配置；两者独立调查阶段仍按现有规则只传内置会议 MCP。新会议固定创建时的配置快照，旧会议不会被改写或重新调用。

AGY 来源已汇入共享注册表。AGY 本身继续使用其既有全局 MCP（Broadcom、小红书已经在该全局配置中），尚未实现由 Roundtable 每次调用注入全部注册表的适配；不得称为五种服务已在三个运行时全部接通。

导入不新增自动写操作授权。Claude 的外部自动调用仍由 allowedTools 控制；现有配置没有提供工具允许列表时，用户可在共享配置中设置明确工具名。OAuth、桌面桥接和实际工具调用继续单独验证。

## 验证

本地证据在 `output/verification/mcp-import/`：

- `result.json`：5 种服务、原全局文件哈希未变、来源计数、0600 权限、0 个未导入项。
- `connections.json`：实际 MCP 初始化和工具列表结果，0 次模型调用、0 次工具业务调用。
- `desktop/`：打包应用「共享能力」显示 5 种服务，私有值不出现在编辑器，私有文件路由为 404；不启动模型。

34 项测试通过，新增合并冲突/去重/重复导入、禁用状态、私有环境值和 cwd stdio 启动检查；测试中的工具输出为 fixture。打包窗口和历史重开验证继续通过。

格式依据 [Codex MCP 官方文档](https://learn.chatgpt.com/docs/extend/mcp)、[Claude MCP 官方文档](https://code.claude.com/docs/en/mcp)，AGY serverUrl 以本机原配置和 CLI help 核对。本次没有部署、发布或推送 GitHub。
