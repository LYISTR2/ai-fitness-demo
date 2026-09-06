# 炼炼 · AI 健身房训练助手

一个可公网部署的中文 AI 健身房训练计划助手 Web Demo。纯前端实现（HTML/CSS/JavaScript），
由 nginx Docker 容器托管，**不依赖 npm / Node 构建链**，数据全部保存在浏览器 localStorage。

## 功能（真实可交互 MVP）

| 模块 | 说明 |
| --- | --- |
| 🏠 首页仪表盘 | 档案摘要、今日/下一训练日、累计组数、完成次数、本周进度、连续打卡 |
| 📋 档案录入 | 身高、体重、年龄、性别、目标（增肌/增力/减脂/体能塑形）、经验、每周次数、单次时长、伤病限制（多选，自动过滤承压动作） |
| 🏋️ 器械库 | 16 类器械勾选 + 自定义器械添加（可指定「等价类型」参与计划选动作），自重始终可用 |
| 🗓️ 一周计划 | 确定性规则引擎：按档案 → 目标 → 频率分化（全身/推拉腿/上下肢/恢复日）→ 时长定动作数 → 器械池选动作，生成 7 天排期。**同样配置永远得到同样计划** |
| ⚡ 训练执行 | 逐组完成：记录重量/次数（自动提示上次重量）、组间休息倒计时（环形进度 + 结束提示音）、可暂停/跳过 |
| 🔄 替代动作 | 器械被占用时，一键提供同肌群替代动作（优先不同器械、过滤伤病与难度） |
| 💾 本地存储 | 档案、器械、计划、训练历史、进行中的训练进度全部持久化，刷新不丢失 |
| ⚕️ 免责声明 | 首次访问弹窗 + 各页面页脚常驻声明，明确"不构成医疗建议" |

## 技术栈

- 纯 HTML / CSS / JavaScript（原生，无框架、无构建工具、无 CDN 依赖）
- nginx:1.27-alpine（Docker 镜像约 50MB）
- 移动端优先（底部 Tab 导航），桌面端自适应（顶部导航 + 多列布局）
- 深色健身风 UI：自绘样式，零外部字体/图标资源（Emoji 图标）

## 快速开始

```bash
cd /opt/ai-fitness-demo
docker compose up -d --build
# 访问 http://<服务器IP>:18088
```

- 宿主机端口：**18088**（已在 docker-compose.yml 映射）
- 容器名：`ai-fitness-demo-web`
- 健康检查：`docker compose ps` 中 STATUS 显示 `healthy` 即就绪

### 常用命令

```bash
docker compose ps              # 查看状态（含健康检查）
docker compose logs -f web     # 查看日志
docker compose restart web     # 重启
docker compose down            # 停止（保留镜像）
docker compose up -d --build   # 更新后重建
```

## 目录结构

```
/opt/ai-fitness-demo
├── index.html            # 单页入口 + 免责声明弹窗
├── css/style.css         # 全部样式（移动优先）
├── js/
│   ├── exercises.js      # 动作库（90+ 动作）、器械、目标/分化常量
│   ├── plan.js           # 确定性计划引擎（纯函数，可单测）
│   └── app.js            # 状态管理、路由、5 个视图、训练执行、倒计时
├── scripts/smoke-test.js # Node 冒烟测试（验证引擎规则）
├── nginx.conf            # 站点配置（gzip/缓存/安全头）
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 规则引擎说明（确定性）

1. **分化**：每周 1-2 练 → 全身日；3 练 → 推/拉/腿；4 练 → 上肢/下肢×2；
   5 练 → 推拉腿+上下肢；6 练 → 推拉腿×2；7 练 → 再加全身日与恢复日（有氧+核心+拉伸）。
2. **动作数**：单次时长 30/45/60/75/90 分钟 → 4/5/7/8/9 个动作。
3. **组次休息**：增肌 4×8-12 休 75s；增力 5×3-6 休 180s；减脂 3×12-15 休 45s + 有氧收尾 15min；体能塑形 4×10-12 休 60s + 有氧 12min。
4. **过滤**：未勾选器械、难度超出经验、伤病限制关节（膝/腰背/肩/腕/肘/颈/踝）的动作一律排除。
5. **轮转**：以档案+器械的哈希值做确定性偏移，同一肌群内按动作轮转，避免连续训练日重复，且同配置结果恒定。

## 自定义与扩展

- **加动作**：在 `js/exercises.js` 的 `EXERCISES` 数组中追加对象
  `{ id, name, equipment, muscle, joints, level, type, goals? }`，刷新即生效。
- **改组次/休息**：调整 `GOALS` 常量。
- **加器械**：在 `EQUIPMENT` 数组追加 `{ key, name, icon, group }`。

## 测试

```bash
cd /opt/ai-fitness-demo
node --check js/exercises.js && node --check js/plan.js && node --check js/app.js   # 语法检查
node scripts/smoke-test.js                                                           # 引擎规则冒烟测试
docker compose config -q                                                             # compose 配置校验
```

## 医疗免责声明

本应用仅供参考，不构成医疗或健康专业意见。开始任何锻炼计划前请咨询医生或专业教练，
特别是有心血管疾病、高血压、糖尿病、骨关节损伤、术后恢复期、孕期等情况时；
训练中如出现胸痛、头晕、恶心、关节剧痛等不适，请立即停止并寻求医疗帮助。
请量力而行，循序渐进，注意动作规范。
