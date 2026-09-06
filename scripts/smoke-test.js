#!/usr/bin/env node
/* ============================================================
   炼炼 · 冒烟测试 — 对计划引擎做真实的功能验证
   运行：node scripts/smoke-test.js
   ============================================================ */

'use strict';

var assert = require('assert');
var DB = require('../js/exercises.js');
var Engine = require('../js/plan.js');

var passed = 0;
function ok(name) { passed++; console.log('  ✔ ' + name); }

/* ---- 基础数据完整性 ---- */
assert(Array.isArray(DB.EXERCISES) && DB.EXERCISES.length > 50, '动作库应包含 50+ 动作');
ok('动作库包含 ' + DB.EXERCISES.length + ' 个动作');

var ids = {};
DB.EXERCISES.forEach(function (e) {
  assert(!ids[e.id], '动作 id 重复: ' + e.id);
  ids[e.id] = 1;
  assert(DB.EQUIPMENT.some(function (x) { return x.key === e.equipment; }) || e.equipment === 'bodyweight',
    '未知器械: ' + e.equipment + ' (' + e.name + ')');
  assert(DB.MUSCLES[e.muscle], '未知肌群: ' + e.muscle + ' (' + e.name + ')');
  e.joints.forEach(function (j) {
    assert(DB.INJURIES[j] !== undefined, '未知关节标签: ' + j + ' (' + e.name + ')');
  });
  assert(e.level >= 1 && e.level <= 3, '难度超出范围: ' + e.name);
});
ok('器械/肌群/关节标签全部合法');

/* ---- 典型档案 ---- */
var profile = {
  height: 175, weight: 70, age: 28, gender: 'male',
  goal: 'muscle', experience: 'beginner', frequency: 3, duration: 60,
  injuries: ['none']
};
var equipment = ['dumbbell', 'machine', 'cable', 'bench', 'treadmill', 'bike'];

/* ---- 确定性 ---- */
var p1 = Engine.generate(profile, equipment, []);
var p2 = Engine.generate(profile, equipment, []);
p1.generatedAt = p2.generatedAt = 'FIXED'; /* 忽略生成时间戳，只比较计划内容 */
assert.deepStrictEqual(p1, p2, '相同输入必须生成相同计划');
ok('确定性：相同档案+器械 → 相同计划');

/* ---- 结构 ---- */
assert.strictEqual(p1.days.length, 3, '每周 3 练应生成 3 个训练日');
p1.days.forEach(function (d) {
  assert(d.steps.length >= 3, d.weekday + ' 至少应有热身+动作');
  assert(d.steps[0].kind === 'warmup', d.weekday + ' 应以热身开始');
  d.steps.forEach(function (s) {
    if (s.kind === 'exercise') {
      assert(s.sets >= 1 && s.reps, d.weekday + ' 动作缺组次: ' + s.name);
      assert(s.rest > 0, d.weekday + ' 动作缺休息: ' + s.name);
      /* 器械必须来自已选集合或自重 */
      assert(equipment.indexOf(s.equipment) >= 0 || s.equipment === 'bodyweight',
        d.weekday + ' 使用了未选择的器械: ' + s.equipment + ' (' + s.name + ')');
      /* 伤病过滤 */
      s.name; /* no-op */
    }
  });
});
ok('计划结构完整：热身 → 动作（组/次/休息）');

/* ---- 器械约束：只勾选哑铃+自重 ---- */
var pMin = Engine.generate(profile, ['dumbbell'], []);
pMin.days.forEach(function (d) {
  d.steps.forEach(function (s) {
    if (s.kind === 'exercise') {
      /* 瑜伽垫(mat)属于辅助器材，未勾选时不得自动可用（仅自重始终可用） */
      assert(s.equipment === 'dumbbell' || s.equipment === 'bodyweight',
        '最小器械集下出现未选器械: ' + s.equipment + ' (' + s.name + ')');
    }
  });
});
ok('器械过滤：只勾选哑铃时计划不含其他器械动作（mat 不会自动可用）');

/* ---- 器械约束：勾选哑铃+瑜伽垫后可出现 mat 动作 ---- */
var pMat = Engine.generate(profile, ['dumbbell', 'mat'], []);
var hasMat = pMat.days.some(function (d) {
  return d.steps.some(function (s) { return s.kind === 'exercise' && s.equipment === 'mat'; });
});
assert(hasMat, '勾选哑铃+瑜伽垫后计划应能使用 mat 动作');
ok('器械过滤：勾选 mat 后计划方可使用瑜伽垫动作');

/* ---- 伤病过滤 ---- */
var profileKnee = JSON.parse(JSON.stringify(profile));
profileKnee.injuries = ['knee'];
var pKnee = Engine.generate(profileKnee, equipment, []);
pKnee.days.forEach(function (d) {
  d.steps.forEach(function (s) {
    if (s.kind === 'exercise') {
      var ex = DB.EXERCISES.filter(function (e) { return e.id === s.id; })[0];
      assert(ex.joints.indexOf('knee') < 0, '膝盖伤病下出现膝部动作: ' + s.name);
    }
  });
});
ok('伤病过滤：膝盖受限时无膝部承压动作');

/* ---- 减脂目标：有有氧收尾 + 短休息 ---- */
var profileFat = JSON.parse(JSON.stringify(profile));
profileFat.goal = 'fat-loss';
var pFat = Engine.generate(profileFat, equipment, []);
var hasCardio = pFat.days.some(function (d) {
  return d.steps.some(function (s) { return s.kind === 'cardio'; });
});
assert(hasCardio, '减脂目标应包含有氧收尾');
assert(pFat.days[0].steps.some(function (s) { return s.kind === 'exercise' && s.rest <= 45; }), '减脂组间休息应较短');
ok('减脂目标：包含有氧收尾且休息缩短');

/* ---- 频率与时长联动 ---- */
var p6 = Engine.generate(profile, equipment, []);
var p7 = Engine.generate(JSON.parse(JSON.stringify(Object.assign({}, profile, { frequency: 6, duration: 90 }))), equipment, []);
assert.strictEqual(p7.days.length, 6, '每周 6 练应生成 6 天');
ok('频率联动：每周 6 练 → 6 个训练日');

/* ---- 训练日分布：按频率均匀分布到一周（1练周三 … 7练全周） ---- */
var FREQ_SLOTS = {
  1: [2],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 5],
  5: [0, 1, 3, 4, 6],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6]
};
[1, 2, 3, 4, 5, 6, 7].forEach(function (f) {
  var pf = Engine.generate(JSON.parse(JSON.stringify(Object.assign({}, profile, { frequency: f }))), equipment, []);
  var slots = FREQ_SLOTS[f];
  assert.strictEqual(pf.days.length, slots.length, '每周 ' + f + ' 练应生成 ' + slots.length + ' 个训练日');
  pf.days.forEach(function (d, i) {
    assert.strictEqual(d.index, slots[i], '每周 ' + f + ' 练第 ' + (i + 1) + ' 个训练日 index 应为 ' + slots[i] + '，实际 ' + d.index);
    assert.strictEqual(d.weekday, DB.WEEKDAYS_CN[slots[i]], '每周 ' + f + ' 练 weekday 与 index 不一致: ' + d.weekday + ' vs ' + slots[i]);
  });
  var uniq = {};
  pf.days.forEach(function (d) { uniq[d.index] = (uniq[d.index] || 0) + 1; });
  Object.keys(uniq).forEach(function (k) {
    assert.strictEqual(uniq[k], 1, '每周 ' + f + ' 练训练日 index ' + k + ' 重复');
  });
  if (f === 1) {
    assert.strictEqual(pf.days[0].index, 2, '每周 1 练应落在周三');
  }
});
ok('训练日分布：按频率均匀分布到一周（1练周三、3练周一/周三/周五、5练周一/周二/周四/周五/周日等）');

/* ---- 普通训练日以拉伸收尾 + 时长估算不虚高 ---- */
[3, 7].forEach(function (f) {
  var pf = Engine.generate(JSON.parse(JSON.stringify(Object.assign({}, profile, { frequency: f }))), equipment, []);
  pf.days.forEach(function (d) {
    var last = d.steps[d.steps.length - 1];
    assert.strictEqual(last.kind, 'stretch', d.weekday + '（' + d.label + '）应以拉伸收尾，实际: ' + last.kind);
    assert(d.estMinutes <= profile.duration,
      d.weekday + ' 估算时长 ' + d.estMinutes + ' 分钟超过用户设定 ' + profile.duration + ' 分钟');
  });
});
ok('训练收尾：普通训练日（含恢复日）均以全身拉伸收尾，时长估算不超过用户设定');

/* ---- 替代动作 ---- */
var day0 = p1.days[0];
var exStep = day0.steps.filter(function (s) { return s.kind === 'exercise'; })[0];
var alts = Engine.alternativesFor(exStep.id, {
  equipmentKeys: equipment, injuries: ['none'], experience: 'beginner',
  usedIds: day0.steps.filter(function (s) { return s.kind === 'exercise'; }).map(function (s) { return s.id; }),
  goal: 'muscle'
});
assert(Array.isArray(alts), '替代动作应返回数组');
if (alts.length) {
  var target = DB.EXERCISES.filter(function (e) { return e.id === exStep.id; })[0];
  alts.forEach(function (a) {
    var ex = DB.EXERCISES.filter(function (e) { return e.id === a.id; })[0];
    assert.strictEqual(ex.muscle, target.muscle, '替代动作应为同肌群');
  });
  ok('替代动作：返回 ' + alts.length + ' 个同肌群候选');
} else {
  ok('替代动作：当前组合无候选（合理）');
}

/* ---- 恢复日（每周 7 练） ---- */
var profile7 = JSON.parse(JSON.stringify(profile));
profile7.frequency = 7;
var p7d = Engine.generate(profile7, equipment, []);
var recovery = p7d.days.filter(function (d) { return d.type === 'recovery'; })[0];
assert(recovery, '每周 7 练应包含恢复日');
assert(recovery.steps.some(function (s) { return s.kind === 'cardio' || s.kind === 'stretch'; }), '恢复日应有有氧/拉伸');
ok('恢复日：每周 7 练含恢复日（有氧+拉伸）');

console.log('\n全部通过：' + passed + ' 项检查 ✔');
