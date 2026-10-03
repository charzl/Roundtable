# 现有方案复用评估

评估日期：2026-10-02。

本次只读取公开文档、许可证与部分源码，没有安装项目、运行上游代码、启动 agent、调用模型、部署或修改 BabyLog。以下结论是静态评估，不是接入验收结果。

## 本次需求基准

- 第一阶段运行在 Mac mini；后续手机 App 接入同一个会议服务。
- 真实的不同 provider / agent 参与，共享公开记录，持续回应、提问、质疑和研究。
- 同时只有一位公开发言；研究可以并行。
- 最多 10 轮，可以提前收敛；到上限必须交付折中方案或 pros and cons，由用户判断，保留异议。
- 重要观点能追溯到来源、分析输入、工具产物及验证记录。
- MCP 配置与 skills 尽量集中维护；不能把共享配置等同于加载成功或调用成功。

## 推荐结论

优先评估以 `ai-us-stock-lab/roundtable` 为基础进行派生开发。它已有应用结构和接近的用户流程，比同时拼接多个完整项目更合适。建议以工作台的串行讨论路径为起点，吸收委员会模式的摘要、分歧与决策展示，再统一会议调度和研究记录。

Murmur 更适合参考消息协议和外部唤起机制；CC Switch 更适合参考或配套使用共享配置管理；LLM Council 暂时只参考交互与评审思想。

该判断并不意味着立即导入上游应用。后续应先验证 Mac mini 上两种真实运行时的接入、工具加载、输出身份和讨论闭环，再确定采用范围。

## 项目对照

| 项目 | 建议采用方式 | 可复用内容 | 主要限制 |
|---|---|---|---|
| [Roundtable 多引擎圆桌](https://github.com/ai-us-stock-lab/roundtable) | 第一候选：作为派生开发基础 | CLI 调用、流式输出处理、聊天记录、回放、轮次控制、分歧摘要、决策卡、能力内容装配 | 会议规则、工具接入、研究产物、可信状态和移动接入仍需改造及实测 |
| [Murmur](https://github.com/instavm/murmur) | 参考协议；需要外部监听时再考虑局部代码复用 | 共享房间、消息游标、长轮询、消息触发 headless CLI | 默认单房间、终端界面、实验性监督程序；不能作为完整会议调度直接叠加 |
| [CC Switch](https://github.com/farion1231/cc-switch) | 配套配置工具候选；参考集中目录和同步机制 | MCP 集中配置、skills 的链接或复制同步 | 配置同步不保证运行时支持、权限或执行成功；它不是会议服务 |
| [LLM Council](https://github.com/karpathy/llm-council) | 暂时仅参考设计 | 独立回答、交叉评审、结果汇总与答案展示 | 原版是固定阶段流程；作者表示不继续维护；本次未找到明确源码复用许可证 |

## 第一个项目：源码确认的适配点与缺口

核查版本：`v0.4.2`，提交 `ec07e195e802d52a6754a09eac8fda21c70143f7`。后续版本可能不同。只读源码快照保存在本仓库 `output/research/upstream-roundtable-ec07e195e802/`；`SOURCE.json` 记录下载来源及文件列表。

### 1. 可以复用串行讨论，但不能原样采用两套调度

工作台的 `relay()` 依次等待每位参会者返回，再把公开消息加入历史，适合作为“一次一位公开发言”的起点。其参会名单可以包含多位 agent。

委员会的 `runNextRound()` 固定取两位辩手，并通过 `Promise.all` 同时调用。后续发给辩手的上下文包含上一轮对手发言与摘要，并不是每次自动读取全部会议记录。因此委员会路径需要改成适用于多位参会者的统一调度与明确上下文规则。

来源：[工作台源码](https://github.com/ai-us-stock-lab/roundtable/blob/ec07e195e802d52a6754a09eac8fda21c70143f7/src/workbench.js#L748)、[委员会源码](https://github.com/ai-us-stock-lab/roundtable/blob/ec07e195e802d52a6754a09eac8fda21c70143f7/src/orchestrator.js#L252)。

### 2. 轮数和收敛判定必须按我们的规则修改

- 工作台互聊硬上限是 8 轮；委员会创建接口允许上限 10 轮。这是两条不同的流程，不能笼统说项目已经支持我们需要的十轮会议。
- 工作台中，一位 agent 返回特定“无新增”标记即结束全场；不能据此推断其他参会者都确认收敛。
- 委员会自动模式使用连续摘要中分歧块的文本一致性判断收敛。文本不变只能说明摘要没有变化，不能证明证据已核实或方案已形成。
- 委员会自动跑完后不会自动生成决策卡，而是等待用户另行触发。我们需要在停止讨论时产出决策材料，并将选择权留给用户。

来源：[工作台结束逻辑](https://github.com/ai-us-stock-lab/roundtable/blob/ec07e195e802d52a6754a09eac8fda21c70143f7/src/workbench.js#L795)、[自动轮次与决策流程](https://github.com/ai-us-stock-lab/roundtable/blob/ec07e195e802d52a6754a09eac8fda21c70143f7/src/orchestrator.js#L404)、[服务器轮数限制](https://github.com/ai-us-stock-lab/roundtable/blob/ec07e195e802d52a6754a09eac8fda21c70143f7/src/server.js#L760)。

### 3. 共享能力装配值得采用，但还不是共享 MCP 已完成

`capabilities.js` 能从统一目录读取能力文本，向不同角色的提示词注入相同内容，并记录目录、模板与内容信息。这适合用作统一讨论规范的基础。

但 `profile.js` 会追加隔离参数：Claude 路径限制配置来源与 MCP；Codex 路径忽略用户配置。示例适配器还禁止 Claude 的部分工具。源码中记录的上游作者探针结论只是上游证据，不是我们在当前环境中的验证。

需要另行设计：共享 MCP 配置的运行时适配、实际工具发现与连通状态、授权范围、共享 skill 的兼容性和版本，以及研究任务与产物的归档。不能只取消全部隔离限制来实现共享。

来源：[能力装配](https://github.com/ai-us-stock-lab/roundtable/blob/ec07e195e802d52a6754a09eac8fda21c70143f7/src/capabilities.js#L81)、[配置隔离](https://github.com/ai-us-stock-lab/roundtable/blob/ec07e195e802d52a6754a09eac8fda21c70143f7/src/profile.js#L44)、[示例适配器](https://github.com/ai-us-stock-lab/roundtable/blob/ec07e195e802d52a6754a09eac8fda21c70143f7/adapters/agents.example.json)。

### 4. 保留调用记录不等于观点证据已验证

项目保存提示词、原始输出、摘要和上下文装配清单，能够帮助排查一次调用使用了什么材料。它也有证据纪律文本，但这些记录与提示词要求不能直接证明关键观点正确。

我们需要在此基础上增加观点编号、来源引用、研究输入与产物、独立核查记录和修正历史，使最终决策卡能引用这些证据。保留失败、缺席、上下文裁剪和未验证状态。

来源：[调用与落盘流程](https://github.com/ai-us-stock-lab/roundtable/blob/ec07e195e802d52a6754a09eac8fda21c70143f7/src/orchestrator.js#L205)、[证据纪律](https://github.com/ai-us-stock-lab/roundtable/blob/ec07e195e802d52a6754a09eac8fda21c70143f7/capabilities/evidence-discipline.md)。

### 5. 状态必须对应能证明的事件

委员会 `call()` 在调用 `runAgent()` 前即发布 `running` 状态；工作台互聊也提前发布相同状态。此时还不能证明子进程启动成功或 provider 开始处理。`done` 来自调用返回成功，仍应校验是否有有效输出。

建议区分已排队、准备调用、进程已启动、provider 事件确认、收到输出、已完成和失败。接入层只声明自己能证明的状态。

来源：[状态发布位置](https://github.com/ai-us-stock-lab/roundtable/blob/ec07e195e802d52a6754a09eac8fda21c70143f7/src/orchestrator.js#L209)、[子进程与结果处理](https://github.com/ai-us-stock-lab/roundtable/blob/ec07e195e802d52a6754a09eac8fda21c70143f7/src/runner.js#L189)。

### 6. Mac 与手机接入仍待验证

核心程序为 Node.js，不能据此直接宣称已在 Mac mini 验证。示例适配器含有 Windows 路径与环境假设，应重新确认本机路径、认证、CLI 参数和工具加载。

服务器只绑定本机回环地址并检查 Host / Origin。未来手机连接需要新增访问和会话授权设计，而不是只更改监听地址。

来源：[示例适配器](https://github.com/ai-us-stock-lab/roundtable/blob/ec07e195e802d52a6754a09eac8fda21c70143f7/adapters/agents.example.json)、[本机监听](https://github.com/ai-us-stock-lab/roundtable/blob/ec07e195e802d52a6754a09eac8fda21c70143f7/src/server.js#L1337)。

## 许可证核查

- Roundtable：MIT，允许代码复用与修改；复用时保留适用的版权和许可声明。[LICENSE](https://github.com/ai-us-stock-lab/roundtable/blob/ec07e195e802d52a6754a09eac8fda21c70143f7/LICENSE)
- Murmur：Apache-2.0；若复用及分发，按许可保留相关声明、标记修改，并处理适用的 NOTICE。[LICENSE](https://github.com/instavm/murmur/blob/main/LICENSE)
- CC Switch：MIT，适合按许可复用选定代码或作为配套工具。[LICENSE](https://github.com/farion1231/cc-switch/blob/main/LICENSE)
- LLM Council：仓库目录与 GitHub 元数据本次没有提供明确许可证，暂不把代码复制进本项目；可继续研究交互设计。[仓库](https://github.com/karpathy/llm-council)

项目许可证不代表其所有依赖、外部资源和 provider 接入条件已经逐项审查。实际采用时应固定具体版本及引用范围。

## 推荐采用顺序

1. 以 Roundtable 为第一候选，先验证真实双 agent 讨论；此验证尚未执行。
2. 统一串行发言、最多十轮、提前结束与自动输出决策材料的规则。
3. 建立本项目的共享 MCP / skill 目录及运行时适配，加入共享研究与证据记录。
4. 只有当外部监听机制确有需要时，参考或局部采用 Murmur，避免出现两套互相触发的主持程序。
5. CC Switch 作为配置管理候选继续评估；不在本次改写任何全局配置。
