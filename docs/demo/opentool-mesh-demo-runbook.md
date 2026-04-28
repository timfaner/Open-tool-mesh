# OpenTool Mesh Demo 运行与展示方案

## 1. 文档目标

本文用于指导 OpenTool Mesh 黑客松 demo 的本地启动、双终端演示、评委讲解口径与故障兜底。唯一主线固定为：

`publish -> discover -> verify -> call -> trace -> report`

所有演示动作都必须围绕 `/workspace/project/docs/product/opentool-mesh-产品说明与验收边界.md` 的验收边界展开，不扩展到 marketplace、payment、swarm 或通用 MCP Registry 替代叙事。

## 2. 演示目标与判定标准

### 2.1 评委必须看见的事实

1. agent 不是从本地硬编码 endpoint 直接调工具。
2. agent 先按 capability 发现工具，再解析 ENS identity。
3. manifest 来自 0G，并在调用前完成 hash / owner / schema / version 校验。
4. agent 与 remote tool node 分离，且通过 AXL 发起远程调用。
5. 每次调用都会生成 trace，并写回 0G。
6. dashboard 以 Discovery / Manifest / Invocation / Memory 四段讲清完整链路，并落到 final report。

### 2.2 本次 demo 的固定故事线

1. 发布方发布 `solidity-pattern-scanner`。
2. 该工具具备 `solidity-static-analysis` capability。
3. 工具 identity 绑定到 ENS。
4. manifest 与 capability index 写入 0G。
5. Audit Agent 接收 Solidity 合约后，不知道具体 endpoint，只知道需要 `solidity-static-analysis`。
6. Agent 发现并验证工具。
7. Agent 通过 AXL 调用远端节点。
8. Tool node 返回结构化 findings。
9. Agent 把 execution trace 写回 0G。
10. Dashboard 展示 trace 与最终 audit report。

## 3. 演示形态

### 3.1 最低展示形态

- 一个 dashboard 页面
- 两个终端
- 一个 agent client 进程
- 一个 remote tool node 进程
- 一次完整 audit run

### 3.2 推荐展示形态

- 终端 A：Audit Agent / CLI 操作
- 终端 B：Remote Tool Node 日志
- 浏览器：Dashboard 页面
- 如有余力，可增加第二个 tool node `test-case-suggester` 作为 P1 加分演示

## 4. 双终端 / 双节点演示要求

### 4.1 终端分工

#### 终端 A：Agent 侧

负责展示：

1. publish 或 resolve / discover / call / trace 命令
2. agent 接收合约输入
3. capability 查询结果
4. manifest 校验结果
5. AXL 调用发起日志
6. trace 写入与 final report 输出

#### 终端 B：Remote Tool Node 侧

负责展示：

1. tool node 独立启动
2. AXL peer 信息
3. 收到远端请求
4. 执行扫描逻辑
5. 返回结构化 findings

### 4.2 必须明确说出的口径

- “这里是两个独立进程，不是 agent 内部直接调用本地函数。”
- “agent 只知道 capability，不预置具体工具 endpoint。”
- “AXL 负责 agent 与 remote tool node 的 P2P 调用，ENS 和 0G 不负责执行。”

## 5. 启动前检查清单

### 5.1 演示前置依赖

1. `b1097c2a` 对应的 SDK / CLI / audit agent / tool node 核心实现已经落地。
2. dashboard 页面可展示一条完整 run。
3. 至少准备一份可演示的 Solidity 合约输入样例。
4. 至少准备一份已发布 manifest 与可解析的 tool identity。
5. 至少完成一次可查询的 trace 持久化写入。

### 5.2 环境变量清单

演示现场至少需要下列变量，命名可按实现调整，但职责不要变化：

| 变量 | 用途 |
| --- | --- |
| `OTM_ENS_RPC_URL` | ENS 解析所需链 RPC |
| `OTM_ENS_NAME` | 工具 ENS identity，例如 `scanner.audittool.eth` |
| `OTM_0G_STORAGE_ENDPOINT` | 0G Storage 读写入口 |
| `OTM_0G_KV_ENDPOINT` | 0G KV capability / trace index 入口 |
| `OTM_AXL_AGENT_PEER_ID` | agent 侧 AXL peer 标识 |
| `OTM_AXL_TOOL_PEER_ID` | remote tool node 侧 AXL peer 标识 |
| `OTM_TRACE_NAMESPACE` | trace 写入命名空间 |
| `OTM_MANIFEST_URI` | 已发布 manifest URI，供发布校验与回放 |
| `OTM_DASHBOARD_BASE_URL` | dashboard 地址 |

### 5.3 演示数据准备

建议固定一组 demo 数据，避免现场漂移：

- Solidity 输入：一份包含明显风险点的示例合约
- Requested capability：`solidity-static-analysis`
- Tool identity：一个固定 ENS 名称
- Manifest version：一个固定版本号，例如 `0.1.0`
- Trace id：演示成功后生成，并在 report 中被引用

## 6. 标准本地启动顺序

以下顺序是讲解顺序，也是现场启动顺序。

### 6.1 第一步：准备浏览器与 dashboard

先打开 dashboard，确保页面包含四个区块：

1. Discovery
2. Manifest
3. Invocation
4. Memory

如果 dashboard 支持 run selector，预先切到本次 demo 使用的 run。

### 6.2 第二步：启动 remote tool node

在终端 B 启动 remote tool node，并展示：

1. 进程独立存在
2. AXL peer id
3. 对外暴露的 capability
4. 当前使用的 manifest version

命令以实际实现为准，但现场展示目标固定为：

```bash
# 占位示例：以最终落地命令替换
<tool-node-start-command>
```

### 6.3 第三步：在终端 A 准备 agent / CLI

在终端 A 准备 agent 运行环境，确保：

1. agent 与 tool node 不是同一进程
2. agent 拥有 ENS / 0G / AXL 所需配置
3. agent 输入是 Solidity 合约或其路径

```bash
# 占位示例：以最终落地命令替换
<agent-or-cli-prepare-command>
```

### 6.4 第四步：如需完整闭环，从 publish 开始

若现场时间允许并且 CLI 可稳定运行，先执行一次发布动作：

```bash
# 占位示例：以最终落地命令替换
<publish-command>
```

发布阶段必须能说明：

1. tool identity 是什么
2. manifest 被写到哪里
3. capability index 被写到哪里
4. ENS 上记录了什么

### 6.5 第五步：执行 audit run

在终端 A 发起完整 audit 流程：

```bash
# 占位示例：以最终落地命令替换
<audit-run-command>
```

执行时要让评委依次看到：

1. agent 需要的 capability
2. 候选工具发现结果
3. ENS 解析结果
4. 0G manifest 读取结果
5. manifest 验证结果
6. AXL 远程调用发起
7. remote tool node 返回 findings
8. trace 写入成功
9. final report 输出 trace id

## 7. 评委演示脚本

### 7.1 开场口径

“OpenTool Mesh 不是再做一个 agent，而是把 agent 工具调用从本地硬编码，升级为可发现、可验证、可远程调用、可复盘的基础设施层。今天我们只演示最小闭环：publish -> discover -> verify -> call -> trace -> report。”

### 7.2 Publish

“这里发布的不是一个本地函数，而是一个具备 ENS identity、0G manifest 和 capability index 的远程工具。”

评委应看到：

- tool identity
- manifest URI
- manifest hash
- capability
- owner 信息

### 7.3 Discover

“Agent 并不知道具体工具地址，它只知道自己需要 `solidity-static-analysis`，然后通过 capability index 找到候选工具，再从 ENS 解析身份入口。”

评委应看到：

- requested capability
- resolved tool identity
- 非硬编码口径

### 7.4 Verify

“在调用前，agent 会验证 manifest hash、owner、version、schema compatibility，不兼容就拒绝调用。”

评委应看到：

- manifest URI
- manifest hash
- owner
- version
- schema status

### 7.5 Call

“现在发生的是 agent 到 remote tool node 的 AXL 调用，而不是 agent 内部函数执行。”

此时同时指向两个终端：

- 终端 A：发起请求
- 终端 B：收到请求并返回结果

评委应看到：

- AXL peer
- request / response
- findings summary

### 7.6 Trace

“每次调用都会变成一条 0G trace，记录 tool identity、manifest reference、input hash、output hash、status 和 artifact。”

评委应看到：

- input hash
- output hash
- trace URI
- trace status

### 7.7 Report

“最终报告不是孤立文本，它引用了 trace id，所以评委可以追溯这份结果到底是哪个 agent、基于哪个 manifest、调用了哪个远程节点得到的。”

评委应看到：

- final report
- findings
- trace id / trace URI

## 8. Dashboard 展示重点

dashboard 必须服务讲解，不是做泛数据大屏。

### 8.1 Discovery

必须显示：

- `Requested capability`
- `Resolved identity`
- `Tool`
- 明确的 `Not hardcoded` 提示

### 8.2 Manifest

必须显示：

- `Manifest URI`
- `Manifest hash`
- `Owner`
- `Version`
- `Schema verified`

### 8.3 Invocation

必须显示：

- `AXL peer`
- `Tool call status`
- `Audit Agent -> Remote Tool Node` 方向关系
- findings 或 response summary

### 8.4 Memory

必须显示：

- `Input hash`
- `Output hash`
- `Trace URI`
- artifact / report 引用

## 9. 故障兜底方案

### 9.1 Publish 阶段失败

如果现场重新发布失败，不要卡在链路前半段。改用预先发布好的 manifest 与 capability index，口径切换为：

“为保证演示节奏，我们直接使用已发布好的工具身份与 manifest，重点展示 agent 如何发现、验证、调用和追踪。”

### 9.2 ENS 解析不稳定

准备一份本地缓存的 identity -> manifest pointer 结果。口径必须诚实：

“这里展示的是预解析缓存结果，但结构与正式 ENS 解析返回一致，目的只是规避现场网络抖动。”

不要把缓存说成正式链上实时结果。

### 9.3 0G 写入抖动

至少准备两级兜底：

1. 预先存在的 manifest / trace 样例
2. 本地持久化的同构 JSON 输出

口径：

“现场如果 0G 写入延迟较高，我们仍然展示同一份结构化 trace，说明系统记录了哪些 provenance 字段。”

### 9.4 AXL 调用失败

这是最不能失分的一段。必须预演。

兜底方式：

1. 先确保两个进程都能独立启动
2. 预备一次已跑通的成功日志
3. 如实时调用失败，立即切换到成功 run 的 dashboard 与终端日志回放

口径：

“我们要证明的是 agent 与 remote tool node 的分离及 AXL 调用路径；这里回放的是同一版本代码已跑通的一次成功 run。”

### 9.5 Dashboard 未刷新

准备静态 run 页面或固定 run id 链接。避免现场依赖最新数据自动刷新。

## 10. 演示节奏建议

建议控制在 5 到 7 分钟：

1. 30 秒：项目定位
2. 45 秒：publish / identity / manifest
3. 60 秒：discover / verify
4. 90 秒：双终端展示远程调用
5. 60 秒：trace / dashboard / report
6. 30 秒：总结为何这不是硬编码工具调用

## 11. 验收映射

| 验收项 | demo 中如何证明 |
| --- | --- |
| 工具可发布 | 展示 tool identity、manifest URI、capability、owner、0G 存储位置 |
| agent 可发现工具 | 展示 capability 查询与 resolved identity，而非本地 endpoint |
| manifest 可验证 | 展示 hash / owner / version / schema status |
| agent 可远程调用 tool node | 双终端展示 agent 与 remote node 分离，以及 AXL request / response |
| trace 写入 0G | 展示 input hash / output hash / trace URI / artifact |
| dashboard 讲清完整链路 | 展示 Discovery / Manifest / Invocation / Memory 四段与 final report |

## 12. 当前仓库状态备注

截至本手册编写时，仓库中已有产品说明、架构文档与 dashboard spec，但根目录工作区配置与统一启动命令尚未完整落地。因此：

1. 本文中的启动命令暂以占位形式表达，待开发任务完成后替换为真实命令。
2. 演示顺序、分工、验收口径与故障兜底已经固定，可先用于团队对齐。
3. 在 `b1097c2a` 完成后，应立即补齐本手册中的实际命令、端口、peer id 与环境变量默认值。

