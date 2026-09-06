# Phase1 施工规格（摘自产品体验 · 分阶段施工规格）

只做 Phase1。不做 Phase2 动效、Phase3 动作指导。

## Token
- `--bg-daily:#F7F8FA`；`--bg-train:#14171B`；`--card:#fff`；`--accent:#C8F750`；`--accent-ink:#182003`；`--radius-card:22px`
- 深浅两套 `--text`/`--muted`
- 日常页 `body.view-daily`；`#/train` 会话中强制训练深色壳（含休息层）
- accent 配深字；勿全文涂绿

## #/dashboard → 今日训练首页
- 保留 P0 三步引导置顶
- 主卡：课名、动作数、预计分钟、主 CTA「开始训练」→`#/train`（有 session「继续训练」）
- 下：「继续上次」短进度；无则隐藏
- 移除/下沉第一屏：四指标、趋势图、历史表、查看示例（可 `details`「训练统计」或隐藏）
- 无计划 CTA 逻辑与 P0 不冲突（无计划不直跳训练空页）

## #/train → Hevy 风
- 顶：动作名 + 演示占位（图标/占位，不接视频）
- 中：组行 = 组号|重量|次数|上次摘要；当前组高亮
- 底 fixed 实底大按钮「完成本组」≥48dp；电光绿+深字
- 休息层保留 P0 restNext + 保持打开；自重显示「自重」
- 步进器/撤销/替代保留

## 轻跟 token
profile / equipment / plan / bottomnav；选中用电光绿，勿整栏涂绿；bottomnav「概览」可改「首页」

## 不动
Android 壳、计划引擎、localStorage schema

## 验收
- 日常浅/训练深切换正确
- 首页无数据墙第一屏
- CTA 与 P0 引导不冲突
- 底按钮固定实底；对比度可读；触控≥48dp；完成态非唯颜色
- 休息层文案完整
- 360/393/430 宽可用；底栏不被主按钮遮死
