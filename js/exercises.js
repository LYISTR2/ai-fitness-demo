/* ============================================================
   炼炼 · AI 健身房训练助手 — exercises.js
   器械定义 / 动作数据库 / 目标配置 / 训练分化
   纯数据 + 确定性规则常量，浏览器与 Node 双端可用
   ============================================================ */

'use strict';

/* ---------- 器械目录 ---------- */
var EQUIPMENT = [
  { key: 'barbell',    name: '杠铃',        icon: '🏋️', group: 'strength' },
  { key: 'dumbbell',   name: '哑铃',        icon: '💪', group: 'strength' },
  { key: 'machine',    name: '固定器械',     icon: '🦾', group: 'strength' },
  { key: 'cable',      name: '绳索/龙门架',  icon: '🪢', group: 'strength' },
  { key: 'smith',      name: '史密斯机',     icon: '🏗️', group: 'strength' },
  { key: 'squat-rack', name: '深蹲架',       icon: '⬜', group: 'strength' },
  { key: 'bench',      name: '训练凳',       icon: '🪑', group: 'strength' },
  { key: 'pullup',     name: '引体架',       icon: '🧗', group: 'strength' },
  { key: 'kettlebell', name: '壶铃',        icon: '🫖', group: 'strength' },
  { key: 'band',       name: '弹力带',       icon: '🎗️', group: 'strength' },
  { key: 'mat',        name: '瑜伽垫',       icon: '🧘', group: 'aux' },
  { key: 'treadmill',  name: '跑步机',       icon: '🏃', group: 'cardio' },
  { key: 'bike',       name: '动感单车',     icon: '🚴', group: 'cardio' },
  { key: 'elliptical', name: '椭圆机',       icon: '🚶', group: 'cardio' },
  { key: 'rower',      name: '划船机',       icon: '🚣', group: 'cardio' },
  { key: 'stair',      name: '台阶器',       icon: '🪜', group: 'cardio' }
];
/* 自重始终可用，无需勾选 */
var BODYWEIGHT = { key: 'bodyweight', name: '自重训练', icon: '🧍', note: '无需器械，始终可用' };

/* ---------- 肌群 ---------- */
var MUSCLES = {
  chest: '胸',
  back: '背',
  shoulders: '肩',
  biceps: '肱二头',
  triceps: '肱三头',
  quads: '股四头',
  hamstrings: '腘绳肌',
  glutes: '臀',
  calves: '小腿',
  core: '核心',
  cardio: '心肺'
};

/* ---------- 伤病限制（与动作关节标签对应） ---------- */
var INJURIES = {
  'none': '无',
  knee: '膝盖',
  back: '腰背',
  shoulder: '肩部',
  wrist: '手腕',
  elbow: '手肘',
  neck: '颈部',
  ankle: '脚踝'
};

/* ---------- 训练目标 ---------- */
var GOALS = {
  muscle:  { label: '增肌',    emoji: '💪', sets: 4, reps: '8-12',  rest: 75,  rir: '每组保留 1-2 次余力（RIR 1-2）', cardio: false, cardioMin: 0 },
  strength:{ label: '增力',    emoji: '🏋️', sets: 5, reps: '3-6',   rest: 180, rir: '接近力竭，保留 0-1 次余力（RIR 0-1）', cardio: false, cardioMin: 0 },
  'fat-loss': { label: '减脂', emoji: '🔥', sets: 3, reps: '12-15', rest: 45,  rir: '轻-中等强度，保留 2-3 次余力（RIR 2-3）', cardio: true, cardioMin: 15 },
  fitness: { label: '体能塑形', emoji: '⚡', sets: 4, reps: '10-12', rest: 60,  rir: '中等强度，保留约 2 次余力（RIR 2）', cardio: true, cardioMin: 12 }
};

/* ---------- 训练经验 → 动作难度上限 ---------- */
var EXPERIENCE = {
  novice:       { label: '新手', max: 1 },
  beginner:     { label: '初级', max: 2 },
  intermediate: { label: '中级', max: 3 },
  advanced:     { label: '高级', max: 3 }
};

/* ---------- 每周天数 → 分化 ---------- */
var SPLIT = {
  1: ['fullbody'],
  2: ['fullbody', 'fullbody'],
  3: ['push', 'pull', 'legs'],
  4: ['upper', 'lower', 'upper', 'lower'],
  5: ['push', 'pull', 'legs', 'upper', 'lower'],
  6: ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
  7: ['push', 'pull', 'legs', 'upper', 'lower', 'fullbody', 'recovery']
};

/* 各训练日的肌群权重（和为 1，用于分配动作数量） */
var DAYTYPE = {
  fullbody: { label: '全身日', focus: { chest: .20, back: .20, quads: .20, shoulders: .15, glutes: .10, hamstrings: .05, core: .10 } },
  push:     { label: '推日',   focus: { chest: .42, shoulders: .30, triceps: .28 } },
  pull:     { label: '拉日',   focus: { back: .60, biceps: .40 } },
  legs:     { label: '腿日',   focus: { quads: .40, glutes: .30, hamstrings: .20, calves: .10 } },
  upper:    { label: '上肢日', focus: { chest: .25, back: .25, shoulders: .20, biceps: .15, triceps: .15 } },
  lower:    { label: '下肢日', focus: { quads: .35, glutes: .30, hamstrings: .20, calves: .15 } },
  recovery: { label: '恢复日', focus: { core: 1 } }
};

/* 单次时长(min) → 动作数（不含热身/有氧收尾） */
var EX_PER_SESSION = { 30: 4, 45: 5, 60: 7, 75: 8, 90: 9 };

var WEEKDAYS_CN = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/*
 * 动作数据库
 * id        —— 唯一标识
 * name      —— 中文名
 * equipment —— 所需器械（EQUIPMENT/BODYWEIGHT 的 key）
 * muscle    —— 主要肌群
 * joints    —— 参与/承压关节（与 INJURIES 对应，用于伤病过滤）
 * level     —— 难度 1 新手友好 ~ 3 进阶
 * type      —— compound 复合 / isolation 孤立 / cardio 有氧 / core 核心
 * goals     —— 适合的目标；缺省表示所有目标可用
 */
var EXERCISES = [
  /* ================= 胸 ================= */
  { id: 'barbell-bench',      name: '杠铃卧推',         equipment: 'barbell',    muscle: 'chest',     joints: ['shoulder', 'wrist', 'elbow'], level: 2, type: 'compound', goals: ['strength', 'muscle'] },
  { id: 'dumbbell-bench',     name: '哑铃卧推',         equipment: 'dumbbell',   muscle: 'chest',     joints: ['shoulder', 'elbow'], level: 2, type: 'compound', goals: ['strength', 'muscle'] },
  { id: 'incline-db-press',   name: '上斜哑铃卧推',     equipment: 'dumbbell',   muscle: 'chest',     joints: ['shoulder', 'elbow'], level: 2, type: 'compound' },
  { id: 'machine-chest-press',name: '坐姿推胸器',       equipment: 'machine',    muscle: 'chest',     joints: ['shoulder', 'elbow'], level: 1, type: 'compound' },
  { id: 'smith-bench',        name: '史密斯卧推',       equipment: 'smith',      muscle: 'chest',     joints: ['shoulder', 'wrist'], level: 2, type: 'compound', goals: ['strength'] },
  { id: 'pec-deck',           name: '蝴蝶机夹胸',       equipment: 'machine',    muscle: 'chest',     joints: ['shoulder'], level: 1, type: 'isolation', goals: ['muscle'] },
  { id: 'cable-fly',          name: '绳索夹胸',         equipment: 'cable',      muscle: 'chest',     joints: ['shoulder'], level: 2, type: 'isolation', goals: ['muscle'] },
  { id: 'dumbbell-fly',       name: '哑铃飞鸟',         equipment: 'dumbbell',   muscle: 'chest',     joints: ['shoulder'], level: 2, type: 'isolation', goals: ['muscle'] },
  { id: 'pushup',             name: '俯卧撑',           equipment: 'bodyweight', muscle: 'chest',     joints: ['wrist', 'shoulder'], level: 1, type: 'compound' },
  { id: 'dips',               name: '双杠臂屈伸',       equipment: 'bodyweight', muscle: 'chest',     joints: ['shoulder', 'elbow', 'wrist'], level: 3, type: 'compound', goals: ['strength'] },
  { id: 'bench-pushup',       name: '上斜俯卧撑',       equipment: 'bench',      muscle: 'chest',     joints: ['shoulder'], level: 1, type: 'compound' },

  /* ================= 背 ================= */
  { id: 'lat-pulldown',       name: '高位下拉',         equipment: 'cable',      muscle: 'back',      joints: ['shoulder', 'elbow'], level: 1, type: 'compound' },
  { id: 'seated-row',         name: '坐姿绳索划船',     equipment: 'cable',      muscle: 'back',      joints: ['shoulder', 'elbow', 'back'], level: 1, type: 'compound' },
  { id: 'chest-supported-row',name: '器械划船',         equipment: 'machine',    muscle: 'back',      joints: ['back', 'shoulder', 'elbow'], level: 1, type: 'compound' },
  { id: 'db-row',             name: '单臂哑铃划船',     equipment: 'dumbbell',   muscle: 'back',      joints: ['back', 'shoulder'], level: 1, type: 'compound' },
  { id: 'barbell-row',        name: '杠铃俯身划船',     equipment: 'barbell',    muscle: 'back',      joints: ['back', 'shoulder', 'wrist'], level: 2, type: 'compound', goals: ['strength', 'muscle'] },
  { id: 't-bar-row',          name: 'T杠划船',          equipment: 'barbell',    muscle: 'back',      joints: ['back', 'shoulder'], level: 3, type: 'compound', goals: ['strength'] },
  { id: 'pullup',             name: '引体向上',         equipment: 'pullup',     muscle: 'back',      joints: ['shoulder', 'elbow', 'wrist'], level: 3, type: 'compound', goals: ['strength'] },
  { id: 'assisted-pullup',    name: '助力引体向上',     equipment: 'machine',    muscle: 'back',      joints: ['shoulder', 'elbow'], level: 2, type: 'compound' },
  { id: 'machine-pulldown',   name: '器械下拉',         equipment: 'machine',    muscle: 'back',      joints: ['shoulder', 'elbow'], level: 1, type: 'compound' },
  { id: 'straight-arm-pulldown', name: '直臂下压',      equipment: 'cable',      muscle: 'back',      joints: ['shoulder', 'elbow'], level: 2, type: 'isolation', goals: ['muscle'] },
  { id: 'face-pull',          name: '面拉',             equipment: 'cable',      muscle: 'back',      joints: ['shoulder'], level: 2, type: 'isolation' },
  { id: 'reverse-pec',        name: '反向蝴蝶机',       equipment: 'machine',    muscle: 'back',      joints: ['shoulder'], level: 2, type: 'isolation' },
  { id: 'deadlift',           name: '传统硬拉',         equipment: 'barbell',    muscle: 'back',      joints: ['back', 'knee', 'wrist'], level: 3, type: 'compound', goals: ['strength'] },

  /* ================= 肩 ================= */
  { id: 'machine-shoulder-press', name: '坐姿肩推器',   equipment: 'machine',    muscle: 'shoulders', joints: ['shoulder'], level: 1, type: 'compound' },
  { id: 'db-shoulder-press',  name: '哑铃肩推',         equipment: 'dumbbell',   muscle: 'shoulders', joints: ['shoulder', 'back'], level: 2, type: 'compound' },
  { id: 'barbell-ohp',        name: '杠铃站姿推举',     equipment: 'barbell',    muscle: 'shoulders', joints: ['shoulder', 'back', 'wrist'], level: 3, type: 'compound', goals: ['strength'] },
  { id: 'smith-ohp',          name: '史密斯推举',       equipment: 'smith',      muscle: 'shoulders', joints: ['shoulder', 'back'], level: 2, type: 'compound' },
  { id: 'arnold-press',       name: '阿诺德推举',       equipment: 'dumbbell',   muscle: 'shoulders', joints: ['shoulder', 'elbow'], level: 3, type: 'compound', goals: ['muscle'] },
  { id: 'lateral-raise',      name: '哑铃侧平举',       equipment: 'dumbbell',   muscle: 'shoulders', joints: ['shoulder'], level: 1, type: 'isolation' },
  { id: 'cable-lateral-raise',name: '绳索侧平举',       equipment: 'cable',      muscle: 'shoulders', joints: ['shoulder'], level: 2, type: 'isolation' },
  { id: 'front-raise',        name: '哑铃前平举',       equipment: 'dumbbell',   muscle: 'shoulders', joints: ['shoulder'], level: 1, type: 'isolation' },
  { id: 'db-shrug',           name: '哑铃耸肩',         equipment: 'dumbbell',   muscle: 'shoulders', joints: ['neck'], level: 1, type: 'isolation' },

  /* ================= 肱二头 ================= */
  { id: 'db-curl',            name: '哑铃弯举',         equipment: 'dumbbell',   muscle: 'biceps',    joints: ['elbow'], level: 1, type: 'isolation' },
  { id: 'barbell-curl',       name: '杠铃弯举',         equipment: 'barbell',    muscle: 'biceps',    joints: ['elbow', 'wrist'], level: 1, type: 'isolation' },
  { id: 'hammer-curl',        name: '锤式弯举',         equipment: 'dumbbell',   muscle: 'biceps',    joints: ['elbow'], level: 1, type: 'isolation' },
  { id: 'cable-curl',         name: '绳索弯举',         equipment: 'cable',      muscle: 'biceps',    joints: ['elbow'], level: 1, type: 'isolation' },
  { id: 'preacher-curl',      name: '牧师凳弯举',       equipment: 'bench',      muscle: 'biceps',    joints: ['elbow'], level: 2, type: 'isolation' },
  { id: 'band-curl',          name: '弹力带弯举',       equipment: 'band',       muscle: 'biceps',    joints: ['elbow'], level: 1, type: 'isolation' },

  /* ================= 肱三头 ================= */
  { id: 'cable-pushdown',     name: '绳索下压',         equipment: 'cable',      muscle: 'triceps',   joints: ['elbow'], level: 1, type: 'isolation' },
  { id: 'bench-dips',         name: '凳上臂屈伸',       equipment: 'bench',      muscle: 'triceps',   joints: ['shoulder', 'elbow'], level: 1, type: 'compound' },
  { id: 'overhead-extension', name: '哑铃颈后臂屈伸',   equipment: 'dumbbell',   muscle: 'triceps',   joints: ['elbow', 'shoulder'], level: 2, type: 'isolation' },
  { id: 'skull-crusher',      name: '仰卧臂屈伸',       equipment: 'barbell',    muscle: 'triceps',   joints: ['elbow', 'shoulder'], level: 3, type: 'isolation' },
  { id: 'close-grip-bench',   name: '窄距卧推',         equipment: 'barbell',    muscle: 'triceps',   joints: ['shoulder', 'wrist', 'elbow'], level: 3, type: 'compound', goals: ['strength'] },
  { id: 'kickback',           name: '俯身哑铃臂屈伸',   equipment: 'dumbbell',   muscle: 'triceps',   joints: ['elbow'], level: 2, type: 'isolation' },
  { id: 'band-pushdown',      name: '弹力带下压',       equipment: 'band',       muscle: 'triceps',   joints: ['elbow'], level: 1, type: 'isolation' },

  /* ================= 腿：股四头 ================= */
  { id: 'bodyweight-squat',   name: '徒手深蹲',         equipment: 'bodyweight', muscle: 'quads',     joints: ['knee', 'ankle'], level: 1, type: 'compound' },
  { id: 'goblet-squat',       name: '高脚杯深蹲',       equipment: 'dumbbell',   muscle: 'quads',     joints: ['knee', 'ankle'], level: 1, type: 'compound' },
  { id: 'barbell-squat',      name: '杠铃深蹲',         equipment: 'barbell',    muscle: 'quads',     joints: ['knee', 'back', 'ankle'], level: 2, type: 'compound', goals: ['strength', 'muscle'] },
  { id: 'front-squat',        name: '前蹲',             equipment: 'barbell',    muscle: 'quads',     joints: ['knee', 'back', 'wrist', 'ankle'], level: 3, type: 'compound', goals: ['strength'] },
  { id: 'leg-press',          name: '腿举',             equipment: 'machine',    muscle: 'quads',     joints: ['knee', 'back'], level: 1, type: 'compound' },
  { id: 'hack-squat',         name: '哈克深蹲',         equipment: 'machine',    muscle: 'quads',     joints: ['knee', 'back'], level: 3, type: 'compound', goals: ['strength'] },
  { id: 'smith-squat',        name: '史密斯深蹲',       equipment: 'smith',      muscle: 'quads',     joints: ['knee', 'back'], level: 2, type: 'compound' },
  { id: 'walking-lunge',      name: '哑铃箭步蹲',       equipment: 'dumbbell',   muscle: 'quads',     joints: ['knee', 'ankle'], level: 2, type: 'compound' },
  { id: 'leg-extension',      name: '腿屈伸',           equipment: 'machine',    muscle: 'quads',     joints: ['knee'], level: 1, type: 'isolation' },
  { id: 'kettlebell-squat',   name: '壶铃深蹲',         equipment: 'kettlebell', muscle: 'quads',     joints: ['knee', 'ankle'], level: 1, type: 'compound' },
  { id: 'band-squat',         name: '弹力带深蹲',       equipment: 'band',       muscle: 'quads',     joints: ['knee', 'ankle'], level: 1, type: 'compound' },

  /* ================= 腿：腘绳肌 ================= */
  { id: 'db-rdl',             name: '哑铃罗马尼亚硬拉', equipment: 'dumbbell',   muscle: 'hamstrings', joints: ['back', 'knee'], level: 1, type: 'compound' },
  { id: 'romanian-deadlift',  name: '罗马尼亚硬拉',     equipment: 'barbell',    muscle: 'hamstrings', joints: ['back', 'knee'], level: 2, type: 'compound', goals: ['strength', 'muscle'] },
  { id: 'leg-curl',           name: '俯卧腿弯举',       equipment: 'machine',    muscle: 'hamstrings', joints: ['knee'], level: 1, type: 'isolation' },
  { id: 'seated-leg-curl',    name: '坐姿腿弯举',       equipment: 'machine',    muscle: 'hamstrings', joints: ['knee'], level: 1, type: 'isolation' },
  { id: 'band-leg-curl',      name: '弹力带腿弯举',     equipment: 'band',       muscle: 'hamstrings', joints: ['knee'], level: 2, type: 'isolation' },
  { id: 'single-leg-rdl',     name: '单腿罗马尼亚硬拉', equipment: 'dumbbell',   muscle: 'hamstrings', joints: ['back', 'knee'], level: 2, type: 'compound' },

  /* ================= 臀 ================= */
  { id: 'hip-thrust',         name: '杠铃臀桥',         equipment: 'barbell',    muscle: 'glutes',    joints: ['back'], level: 2, type: 'compound', goals: ['muscle'] },
  { id: 'glute-bridge',       name: '自重臀桥',         equipment: 'mat',        muscle: 'glutes',    joints: [], level: 1, type: 'isolation' },
  { id: 'db-hip-thrust',      name: '哑铃臀桥',         equipment: 'dumbbell',   muscle: 'glutes',    joints: ['back'], level: 2, type: 'compound', goals: ['muscle'] },
  { id: 'kettlebell-swing',   name: '壶铃摇摆',         equipment: 'kettlebell', muscle: 'glutes',    joints: ['back'], level: 2, type: 'compound', goals: ['fitness', 'fat-loss'] },
  { id: 'cable-pullthrough',  name: '绳索挺身',         equipment: 'cable',      muscle: 'glutes',    joints: ['back'], level: 2, type: 'compound' },
  { id: 'glute-kickback',     name: '绳索后踢腿',       equipment: 'cable',      muscle: 'glutes',    joints: ['ankle'], level: 1, type: 'isolation', goals: ['muscle'] },
  { id: 'sumo-deadlift',      name: '相扑硬拉',         equipment: 'barbell',    muscle: 'glutes',    joints: ['back', 'knee'], level: 3, type: 'compound', goals: ['strength'] },

  /* ================= 小腿 ================= */
  { id: 'standing-calf-raise',name: '站姿提踵',         equipment: 'machine',    muscle: 'calves',    joints: ['ankle'], level: 1, type: 'isolation' },
  { id: 'seated-calf-raise',  name: '坐姿提踵',         equipment: 'machine',    muscle: 'calves',    joints: ['knee'], level: 1, type: 'isolation' },
  { id: 'db-calf-raise',      name: '哑铃提踵',         equipment: 'dumbbell',   muscle: 'calves',    joints: ['ankle'], level: 1, type: 'isolation' },

  /* ================= 核心 ================= */
  { id: 'plank',              name: '平板支撑',         equipment: 'mat',        muscle: 'core',      joints: [], level: 1, type: 'core' },
  { id: 'side-plank',         name: '侧平板支撑',       equipment: 'mat',        muscle: 'core',      joints: [], level: 1, type: 'core' },
  { id: 'dead-bug',           name: '死虫式',           equipment: 'mat',        muscle: 'core',      joints: [], level: 1, type: 'core' },
  { id: 'bicycle-crunch',     name: '卷腹自行车',       equipment: 'mat',        muscle: 'core',      joints: [], level: 1, type: 'core' },
  { id: 'leg-raise-floor',    name: '仰卧举腿',         equipment: 'mat',        muscle: 'core',      joints: ['back'], level: 1, type: 'core' },
  { id: 'russian-twist',      name: '俄罗斯转体',       equipment: 'mat',        muscle: 'core',      joints: ['back'], level: 1, type: 'core' },
  { id: 'cable-crunch',       name: '绳索卷腹',         equipment: 'cable',      muscle: 'core',      joints: ['knee'], level: 1, type: 'core' },
  { id: 'mountain-climber',   name: '登山跑',           equipment: 'mat',        muscle: 'core',      joints: ['wrist'], level: 2, type: 'core' },
  { id: 'hanging-leg-raise',  name: '悬垂举腿',         equipment: 'pullup',     muscle: 'core',      joints: ['shoulder', 'wrist'], level: 3, type: 'core', goals: ['muscle', 'strength'] },

  /* ================= 有氧 ================= */
  { id: 'treadmill-run',      name: '跑步机走/慢跑',    equipment: 'treadmill',  muscle: 'cardio',    joints: ['knee', 'ankle'], level: 1, type: 'cardio', goals: ['fat-loss', 'fitness'] },
  { id: 'treadmill-incline',  name: '跑步机上坡走',     equipment: 'treadmill',  muscle: 'cardio',    joints: ['ankle'], level: 1, type: 'cardio', goals: ['fat-loss', 'fitness'] },
  { id: 'bike-interval',      name: '动感单车间歇',     equipment: 'bike',       muscle: 'cardio',    joints: ['knee'], level: 1, type: 'cardio', goals: ['fat-loss', 'fitness'] },
  { id: 'elliptical',         name: '椭圆机',           equipment: 'elliptical', muscle: 'cardio',    joints: ['knee'], level: 1, type: 'cardio', goals: ['fat-loss', 'fitness'] },
  { id: 'rower-interval',     name: '划船机间歇',       equipment: 'rower',      muscle: 'cardio',    joints: ['back'], level: 1, type: 'cardio', goals: ['fat-loss', 'fitness'] },
  { id: 'stair-climb',        name: '台阶器爬楼',       equipment: 'stair',      muscle: 'cardio',    joints: ['knee', 'ankle'], level: 1, type: 'cardio', goals: ['fat-loss', 'fitness'] },
  { id: 'jumping-jacks',      name: '开合跳',           equipment: 'bodyweight', muscle: 'cardio',    joints: ['knee', 'ankle'], level: 1, type: 'cardio', goals: ['fat-loss', 'fitness'] }
];

var FITNESS_DB = {
  EQUIPMENT: EQUIPMENT,
  BODYWEIGHT: BODYWEIGHT,
  MUSCLES: MUSCLES,
  INJURIES: INJURIES,
  GOALS: GOALS,
  EXPERIENCE: EXPERIENCE,
  SPLIT: SPLIT,
  DAYTYPE: DAYTYPE,
  EX_PER_SESSION: EX_PER_SESSION,
  WEEKDAYS_CN: WEEKDAYS_CN,
  EXERCISES: EXERCISES
};

if (typeof window !== 'undefined') { window.FITNESS_DB = FITNESS_DB; }
if (typeof module !== 'undefined' && module.exports) { module.exports = FITNESS_DB; }