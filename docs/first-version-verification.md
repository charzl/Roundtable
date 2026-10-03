# 第一版实现与验收记录

验收日期：2026-10-03。本次是本机开发与实际运行验证，不是发布或部署。代码、自有运行数据和验收产物均属于 Roundtable；未修改 BabyLog。

## 结果与证据

| 范围 | 实际结果 | 本机证据 |
|---|---|---|
| Codex / Claude 共享 MCP | 两者均调用 `roundtable_history`，读到同一条 M-001；保留原始工具结果与完成事件 | `output/verification/provider-probes/{codex,claude}/probe/` |
| 真实双运行时会议 | 两轮、四条真实公开 agent 发言、三条交叉核查；Claude 在 Codex 指出顺序漏洞后撤回自己的提案；生成引用 C-编号的优缺点与决策稿 | 会议 `4c30a295-2c07-4174-8ead-9291716bca7a`；`output/verification/real-meeting/meeting.json` |
| 真实三运行时会议 | Codex、Claude、AGY 各发表真实发言；AGY 的一次格式解析失败保留，修复后重试成功；第一轮后提前总结，由 Codex 起草决策稿 | 会议 `8298d5e2-6b0b-4a01-b29b-f2ece84b2a03`；`output/verification/real-meeting/8298d5e2-6b0b-4a01-b29b-f2ece84b2a03/meeting.json` |
| 桌面窗口 | 真实 Electron 窗口中的建会、人类发言、标签页、共享配置、重载后记录，以及 renderer 无 Node 访问均通过 | `output/verification/desktop-smoke/{result.json,desktop.png}` |
| 真实记录回放与导出 | 打包应用显示三方真实记录、观点与决策稿；导出包含五次调用的提示词、原始输出与清单，保留失败尝试；回放未新增模型调用 | `output/verification/real-desktop/{result.json,export.json,discussion.png,decision.png}` |
| 本地 `.app` | 本机开发打包成功；打包后的真实窗口完成同样的交互验收 | `dist/Roundtable.app`；`output/verification/packaged-desktop-smoke/` |
| 自动化逻辑测试 | 18 项通过：串行发言、十轮上限、全员提前结束、保留未知项、排队插话、暂停/继续、取消、失败重试、MCP 授权、来源引用与配置适配等 | `npm test`；使用隔离测试数据，不是模型接入证据 |
| 依赖 | 本次 `npm audit` 为 0 已报告漏洞；应用服务只使用 Node 内置模块 | `package-lock.json` |

每次真实调用的提示词、原始 JSONL、stderr 与清单位于 `.roundtable/meetings/<会议编号>/calls/<调用编号>/`。公开会议记录位于同一会议目录的 `meeting.json`，研究与核查记录位于 `research.jsonl`。导出包含这些调用材料，但排除带授权及凭据的临时 MCP 配置。

验收用较短的真实会议证明闭环，十轮规则由自动化调度测试验证；没有实际消耗账号额度运行完整十轮会议。三方会议仍有默认模型身份未知、不同观点和待判断事项，并非已验证所有结论正确。

## 状态与配置的证据边界

- CLI 已安装只表示找到入口，不证明登录、工具连通或模型已接收问题。
- `process_started` 表示实际子进程启动；`provider_event`、`output_received` 与完成事件分别保存。只有成功退出、收到完成事件及有效发言，才公开为 provider 输出。
- Codex 本次事件没有暴露实际模型名称，清单保留为未知；Claude 输出确认 `claude-sonnet-5-5`。AGY 本次事件没有明确底层模型名称，因此不能宣称验证了三种不同的大模型。
- Codex / Claude 使用同一配置源，适配格式不同。MCP 配置被传入、服务初始化和具体工具成功调用是不同事实。此次验证的是内置会议工具，不是所有外部 MCP。
- skill 文本随提示词提供并记录哈希，不声称原生 skill 加载器或所有全局 skills 都已同步。
- 研究与核查是带作者的方法和结果记录，不是系统自动认证。声明 supported / disputed / inconclusive 的依据可检查；原观点及修正都保留。
- 最终稿是指定参会者整理的草稿，不是全员确认，也不代替用户决策。模型仍可能误解题目、夸大共识或给出错误引用内容，需要用户查看依据。

## 实现与运行方式

界面使用 Electron，渲染器开启 sandbox / contextIsolation，不提供任意进程或文件接口。本地服务绑定回环地址，API 需要启动时生成的授权；拒绝外来 Origin / Host。服务与桌面窗口分离，供未来手机接入设计复用；本版不开放局域网。

会议服务自动按轮次调用真实 CLI，将完整公开记录和共享研究传给下一位；模型无需自行常驻监听。研究目前在发言调用内执行，独立的并行研究任务调度尚未实现。失败时暂停，不把缺席者计入同意，不自动伪造或补写发言。

共享配置由「共享能力」维护：

```json
{
  "mcpServers": {
    "research": {
      "command": "/绝对路径/已安装的研究工具",
      "args": [],
      "envRefs": { "SERVICE_TOKEN": "MY_SERVICE_TOKEN" },
      "allowedTools": ["read_document"]
    }
  }
}
```

以上只是配置格式示例，不是已安装服务。`allowedTools` 只授权列出的外部工具自动调用。HTTP 类型支持 `url` 及 `bearer_token_env_var`。外部 MCP 的实际协议、认证和工具支持仍须逐项测试。凭据引用环境变量，Codex argv 不放入这些凭据值；临时 Claude 配置调用后清除。会议固定创建时的配置与 skill 版本，修改只影响新会议。

## 仍待完成

- AGY 的本项目共享 MCP 适配、底层模型显示，以及更多长输出与工具事件兼容性。
- 独立并行研究、研究任务认领、模型费用预算与更长会议的上下文处理。
- 外部研究 MCP 的真实连接与权限验证；当前外部配置适配测试使用隔离测试数据。
- 手机 App、远程连接和用户认证。
- 更多 macOS / CPU 架构、长时间运行，以及 Developer ID 签名、公证与分发。当前包仅做本机开发验收。

## 文档与许可

OpenAI 适配方式结合本机 CLI help 与 [官方非交互模式文档](https://learn.chatgpt.com/docs/non-interactive-mode)、[官方 MCP 文档](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) 核对；Claude 使用 [官方非交互文档](https://code.claude.com/docs/en/headless)。Electron 依据 [官方安全文档](https://www.electronjs.org/docs/latest/tutorial/security) 设置隔离边界。

本项目自行开发代码为 Apache-2.0，事件提取辅助函数局部改自上游 MIT 代码。来源及原许可证保留于 `NOTICE` 与 `third_party/roundtable/LICENSE`。只读上游快照不是应用实现，也没有被重新许可。
