# 0.2 版实现与验收记录

本机验收：2026-10-03（本地时间）。本次未部署、发布、推送 GitHub 或修改 BabyLog；没有启动其他开发 agent。真实参会者调用由应用适配器执行，与隔离的自动化测试数据分别记录。

## 已实现

- 共同讨论与独立调查两种模式。独立调查算第 1 轮，后续串行讨论，全部不超过配置的 1–10 轮；可提前结束。
- 同版本共同输入、并行调用、报告封存、统一公开与对照；后续调用取得全部已公开报告及核查。封存内容不进入公开 API、SSE、公开导出或同伴 MCP。
- 指定/更换总结人、带观点编号的具名决策稿、重试总结及旧稿历史；用户的决定另行保存。
- 调查失败保留证据，其他在途调用可完成；用户单独重试、明确跳过、提前结束，或暂停后改题重新调查。重启将中断调用暂停，不自动花费额度重试。
- 中文、English、随系统，默认随系统；界面和菜单语言与会议输出语言分别设置。输出语言开始时固定，切换界面不改写原文、引用或用户未保存的决定草稿。
- 静态语言资源集中在 `ui/locales/`，通过 manifest 增加语言；系统匹配、英文回退、具名参数与复数格式有公共入口。更多真实语言包、翻译和 SwiftUI 客户端尚未交付。
- 桌面数据统一放在 `~/Library/Application Support/Roundtable/data/`。复制迁移旧记录、不覆盖冲突版本；重建旧安装包前检查并保留包内记录。应用的 `isPackaged` 已正确识别为 true。

## 实际证据

| 验收 | 结果 | 本机材料 |
|---|---|---|
| Codex / Claude 真实独立调查 | 两次成功调查时间重叠、共同输入哈希相同；两份有效报告统一公开 | `output/verification/independent-real/result.json`；会议 `08fb2058-99ea-46af-8e44-f899f0c7c4d3` |
| 真实后续讨论和指定总结 | 第 2 轮两位相互回应、核查和修正；Claude 生成英文决策稿，引用现存观点编号 | 同目录的 `meeting.json`、`export.json`；对应会议调用目录 |
| 失败证据 | 初次 Codex 被文件元数据限制阻止，Claude 报告缺必要字段；修正后重试。共 7 次调用，其中 2 次失败，5 次成功；不以失败计报告 | 同上，所有失败尝试及原始材料保留 |
| 报告与语言界面 | 2 张原文报告卡片、总结人、中文/English/随系统、原文保持、未保存决定草稿保持、导出 7 次调用；无页面错误、无新增 provider 调用 | `output/verification/independent-desktop/` |
| 桌面与安装包 | 创建、人类发言、标签页、共享配置、重载持久化、语言与菜单、渲染器隔离通过；不调用模型 | `output/verification/{desktop-smoke,packaged-desktop-smoke}/` |
| 默认数据与重开 | 安装包被正确识别；数据在包外；恢复的旧会议连续重开两次可读，缺附件提示可见；无新增调用 | `output/verification/default-upgrade/result.json` |
| AGY 原生文件限制试验 | 自己目录可读，同伴 canary 读取实际得到 EPERM；真实 CLI 完成 | `output/verification/agy-isolation/` |
| 自动化验证 | 32 项通过：原有规则、并行与私有范围、重试/跳过、暂停/恢复、输入重做、单轮/十轮、总结与决定历史、语言资源与冻结、升级复制和冲突保留；测试中的回答明确为 fixture | `npm test` |

真实调查中的研究与核查包括 Codex、Claude 写入内置 MCP 的 3 条研究和 2 条验证记录。其中有一次失败尝试留下的自身研究，仍保留身份与调用关联；它不是同伴报告。资料链接不等于本轮重新访问网页，模型记录的研究方法和局限保留原样；本次没有验证完成网络检索或数据库性能实验。

实际成功验证的是两个 CLI 运行时，不能称为三位独立调查，亦不证明底层模型一定不同。十轮上限以自动化调度测试验证，没有额外运行十轮付费验收。

## 独立调查的范围和限制

Codex / Claude 使用自己的工作目录和内置 MCP 投影。macOS `sandbox-exec` 限制读取和写入本项目数据树中属于其他调用的文件；子进程继承限制。原生沙盒测试实际验证自身访问、同伴文件拒绝及子进程拒绝，API/MCP/调度测试使用隔离测试数据。

文件限制允许读取路径元数据，以兼容 Codex 启动；不允许读取其他调用文件内容。它不是所有用户文件、运行时外部缓存、远程服务或账号侧记忆的全面隔离证明。独立阶段不传入外部共享 MCP；Claude 关闭 hooks、自动记忆和 slash commands，并使用严格 MCP 配置。Codex 忽略用户配置并使用 ephemeral 调用。

AGY 虽通过原生文件拒绝试验，但其全局 MCP 不能按调用限定；对临时配置目录的只读试验仍发现全局工具列表。因此本版明确禁止 AGY 独立调查，保留共同讨论入口。不得将该试验写成 AGY 共享 MCP 已接通或完整隔离已实现。

公开讨论中的额外后台研究任务、费用预算、外部 MCP 的逐项连通验证、SQLite/PostgreSQL、手机 App、SwiftUI、远程连接和账号认证仍在后续范围。

## 旧版记录恢复与未恢复附件

初版开发包保留了 Electron 可执行文件名，导致应用错误识别为未打包，默认把会议存入安装包内。发现之前的重建操作删除了这些包内文件。这是实际发生的数据保留错误，不是已完成的迁移。

从仍运行的旧进程成功保存会议 `3bdd4fa5-f23e-4eee-a203-91c7edff7045`：11 条公开记录、观点来源与方法、最终稿、11 次调用的状态，以及原有内部会议状态。先备份并核对，再关闭旧进程。证据位于 `output/verification/storage-recovery/`；恢复的记录已在新版默认目录中回看两次。

这场会议的原始提示词文件、JSONL、stderr 和调用清单文件尚未恢复，导出对这些附件返回 null。没有重跑或重建原始 provider 输出冒充原文件。恢复标记随会议持久化，界面提供中英文提示。公开记录及最终稿可继续查看，不宣称全部原始调用材料都已保留。

修正后的打包脚本在替换旧包前复制遗留数据，桌面默认存储与安装包位置无关，冲突另行保留；此行为通过实际默认启动/重开和复制保留测试。新真实调查会议的全部 7 次调用附件均可导出。

## 重复检查

不调用模型的检查：

```sh
npm run check
npm test
npm run build:mac
npm run smoke:desktop
npm run smoke:packaged
npm run preview:independent
npm run smoke:upgrade
```

`preview:independent` 需要本机已有上述真实验收会议；`smoke:upgrade` 回看默认桌面记录并重开，历史恢复记录检查可以用 `--meeting <ID>` 指定。本地材料包含会议内容，不纳入 Git。打包为本机架构 ad-hoc 签名开发应用，没有 Developer ID 签名、公证或分发。

以下检查会真实调用参会账号并消耗额度，不能作为无调用的界面检查：

```sh
npm run smoke:independent
```

接入以本机 CLI help 与官方文档核对：[Codex 非交互模式](https://learn.chatgpt.com/docs/non-interactive-mode)、[Claude 非交互模式](https://code.claude.com/docs/en/headless)、[Electron app API](https://www.electronjs.org/docs/latest/api/app)。调用证据以本地保存的原始输出为准。
