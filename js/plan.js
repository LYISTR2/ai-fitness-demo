/* ============================================================
   炼炼 · AI 健身房训练助手 — plan.js
   确定性一周训练计划引擎（纯函数，无 DOM 依赖）
   相同 档案 + 器械 输入 → 永远输出相同计划
   ============================================================ */

'use strict';

(function (global) {
  var DB = (typeof window !== 'undefined') ? window.FITNESS_DB : require('./exercises.js');

  /* djb2 字符串哈希 → 确定性的轮转偏移 */
  function hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* 每周训练频率 → 训练日均匀分布到一周的下标（0=周一 … 6=周日） */
  var FREQ_SLOTS = {
    1: [2],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 5],
    5: [0, 1, 3, 4, 6],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6]
  };

  /* 从列表中按种子确定性轮转挑选未使用项 */
  function rotatePick(list, seed, usedIds) {
    if (!list || !list.length) { return null; }
    for (var t = 0; t < list.length; t++) {
      var item = list[(seed + t) % list.length];
      if (!usedIds.has(item.id)) { return item; }
    }
    return null;
  }

  /* 最大余数法分配动作数到各肌群 */
  function allocate(focusWeights, n) {
    var entries = Object.keys(focusWeights).map(function (m) {
      return { muscle: m, w: focusWeights[m] };
    }).sort(function (a, b) { return b.w - a.w; });
    var counts = {};
    var used = 0;
    entries.forEach(function (e) {
      var c = Math.floor(n * e.w);
      counts[e.muscle] = c;
      used += c;
    });
    var rest = entries.slice().sort(function (a, b) {
      var ra = (n * a.w) % 1, rb = (n * b.w) % 1;
      return rb - ra;
    });
    var i = 0;
    while (used < n) {
      counts[rest[i % rest.length].muscle]++;
      used++;
      i++;
    }
    return counts;
  }

  function goalPriority(ex, goal) {
    if (!ex.goals || !ex.goals.length) { return 0; }
    return ex.goals.indexOf(goal) >= 0 ? 0 : 1;
  }

  /* 构建候选池：器械可用 + 难度符合 + 无伤病冲突 + 目标适配排序 */
  function buildPool(profile, equipmentKeys) {
    var goal = profile.goal;
    var maxLevel = DB.EXPERIENCE[profile.experience].max;
    var injuries = new Set(profile.injuries || []);
    var eq = new Set(equipmentKeys);
    eq.add('bodyweight'); /* 自重始终可用 */

    var pool = DB.EXERCISES.filter(function (ex) {
      if (!eq.has(ex.equipment)) { return false; }
      if (ex.level > maxLevel) { return false; }
      for (var j = 0; j < ex.joints.length; j++) {
        if (injuries.has(ex.joints[j])) { return false; }
      }
      return true;
    });

    pool.sort(function (a, b) {
      var pa = goalPriority(a, goal), pb = goalPriority(b, goal);
      if (pa !== pb) { return pa - pb; }
      if (a.level !== b.level) { return a.level - b.level; }
      return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
    });
    return { pool: pool, eq: eq, maxLevel: maxLevel, injuries: injuries };
  }

  function byMuscleMap(pool) {
    var map = {};
    pool.forEach(function (ex) {
      (map[ex.muscle] = map[ex.muscle] || []).push(ex);
    });
    return map;
  }

  function exerciseStep(ex, goal, muscle) {
    var cfg = DB.GOALS[goal];
    var rest = (ex.type === 'compound') ? cfg.rest : Math.max(30, cfg.rest - 45);
    return {
      kind: 'exercise',
      id: ex.id,
      name: ex.name,
      equipment: ex.equipment,
      equipmentName: equipName(ex.equipment),
      muscle: muscle,
      muscleName: DB.MUSCLES[muscle] || muscle,
      type: ex.type,
      sets: cfg.sets,
      reps: cfg.reps,
      rest: rest,
      rir: cfg.rir
    };
  }

  function equipName(key) {
    var hit = DB.EQUIPMENT.filter(function (e) { return e.key === key; })[0];
    if (hit) { return hit.name; }
    if (key === 'bodyweight') { return DB.BODYWEIGHT.name; }
    return key;
  }

  function warmupStep() {
    return { kind: 'warmup', id: 'warmup', name: '动态热身 + 轻量有氧', minutes: 5, note: '慢跑/单车/划船机 5 分钟，加上肩、髋、膝的动态活动，激活全身' };
  }

  function cardioStep(ex, minutes, goal) {
    return {
      kind: 'cardio', id: ex.id, name: ex.name,
      equipment: ex.equipment, equipmentName: equipName(ex.equipment),
      muscle: 'cardio', muscleName: '心肺', type: 'cardio', minutes: minutes,
      note: goal === 'fat-loss' ? '保持中等强度（能说话但微喘），稳定输出' : '保持轻-中等强度，注意呼吸节奏'
    };
  }

  function stretchStep() {
    return { kind: 'stretch', id: 'stretch', name: '全身拉伸放松', minutes: 5, note: '重点拉伸今天训练过的肌群，每个部位保持 20-30 秒' };
  }

  function recoverySteps(poolArr, injuries, offset) {
    var steps = [warmupStep()];
    var cardioPool = poolArr.filter(function (e) { return e.type === 'cardio'; });
    var used = new Set(['warmup']);
    if (cardioPool.length) {
      var c = rotatePick(cardioPool, offset, used);
      if (c) { used.add(c.id); steps.push(cardioStep(c, 20, 'fitness')); }
    }
    var coreIds = ['plank', 'dead-bug', 'side-plank', 'bicycle-crunch'];
    var chosen = 0;
    var inj = new Set(injuries || []);
    coreIds.forEach(function (id) {
      if (chosen >= 3) { return; }
      var ex = DB.EXERCISES.filter(function (e) { return e.id === id; })[0];
      if (!ex) { return; }
      var ok = !ex.joints.some(function (j) { return inj.has(j); });
      if (!ok) { return; }
      steps.push({ kind: 'exercise', id: ex.id, name: ex.name, equipment: ex.equipment, equipmentName: equipName(ex.equipment), muscle: 'core', muscleName: '核心', type: 'core', sets: 3, reps: '30-45 秒', rest: 30, rir: '保持稳定核心，不塌腰' });
      chosen++;
    });
    steps.push(stretchStep());
    return steps;
  }

  /* 主入口：确定性生成一周计划 */
  function generate(profile, equipmentKeys, customEquipment) {
    var goal = profile.goal;
    var cfg = DB.GOALS[goal];
    var freq = clamp(profile.frequency || 3, 1, 7);
    var duration = profile.duration || 60;

    /* 自定义器械的等价类型也计入可用器械 */
    var eqKeys = (equipmentKeys || []).slice();
    (customEquipment || []).forEach(function (c) {
      if (c && c.equivalent && eqKeys.indexOf(c.equivalent) < 0) { eqKeys.push(c.equivalent); }
    });
    eqKeys.sort();

    var built = buildPool(profile, eqKeys);
    var pool = built.pool;
    var map = byMuscleMap(pool);

    var baseHash = hash(JSON.stringify({ profile: profile, eq: eqKeys }));
    var n = DB.EX_PER_SESSION[duration] || (duration < 45 ? 4 : (duration < 75 ? 7 : 8));

    var dayTypes = DB.SPLIT[freq];
    var days = [];
    var warnings = [];

    if (pool.filter(function (e) { return e.type !== 'cardio'; }).length < 3) {
      warnings.push('可选动作偏少：请到「器械」页勾选更多器械（如哑铃、固定器械、绳索等），否则计划会比较单调。');
    }
    if (freq >= 5 && pool.filter(function (e) { return e.type !== 'cardio'; }).length < n) {
      warnings.push('训练频率较高且可用器械较少，部分训练日可能出现重复动作。');
    }

    var cardioPool = pool.filter(function (e) { return e.type === 'cardio'; });

    var slots = FREQ_SLOTS[freq] || FREQ_SLOTS[3];
    for (var i = 0; i < slots.length; i++) {
      var idx = slots[i];
      var type = dayTypes[i];
      var dt = DB.DAYTYPE[type];
      var offset = (baseHash + i * 13) % 97;
      var used = new Set(['warmup']);
      var steps = [];

      if (type === 'recovery') {
        steps = recoverySteps(pool, profile.injuries || [], offset);
      } else {
        steps.push(warmupStep());
        var counts = allocate(dt.focus, n);
        var focusOrder = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
        var round = 0;

        focusOrder.forEach(function (muscle) {
          var list = map[muscle] || [];
          var cnt = counts[muscle];
          for (var k = 0; k < cnt; k++) {
            var ex = rotatePick(list, offset + round * 5, used);
            if (!ex) { break; }
            used.add(ex.id);
            steps.push(exerciseStep(ex, goal, muscle));
            round++;
          }
        });

        /* 若某些肌群候选不足，用其余肌群的动作补齐到目标数量 */
        if (steps.length - 1 < n) {
          var allMuscles = Object.keys(map).sort();
          var fi = 0, guard = 0;
          while (steps.length - 1 < n && guard < 200) {
            var m = allMuscles[fi % allMuscles.length];
            var ex = rotatePick(map[m] || [], offset + round * 5 + guard, used);
            if (ex) { used.add(ex.id); steps.push(exerciseStep(ex, goal, m)); round++; }
            fi++; guard++;
          }
        }

        /* 减脂 / 体能塑形：加有氧收尾 */
        if (cfg.cardio && cardioPool.length && duration >= 45) {
          var c = rotatePick(cardioPool, offset + 31, used);
          if (c) { steps.push(cardioStep(c, cfg.cardioMin, goal)); }
        }

        /* 普通训练日以全身拉伸收尾（恢复日已自带拉伸） */
        steps.push(stretchStep());
      }

      var totalSets = 0;
      var estMin = 0;
      steps.forEach(function (s) {
        if (s.kind === 'exercise') {
          totalSets += s.sets;
          estMin += s.sets * (s.rest + 50) / 60 + 1;
        } else {
          estMin += s.minutes || 0;
        }
      });
      /* 热身只计入一次，且估算不超过用户设定时长 */
      estMin = Math.round(Math.min(estMin, duration));

      days.push({
        index: idx,
        weekday: DB.WEEKDAYS_CN[idx],
        type: type,
        label: dt.label,
        focus: Object.keys(dt.focus).map(function (m) { return DB.MUSCLES[m]; }),
        steps: steps,
        totalSets: totalSets,
        estMinutes: estMin
      });
    }

    return {
      ok: true,
      goal: goal,
      generatedAt: new Date().toISOString(),
      profile: profile,
      equipmentUsed: eqKeys,
      days: days,
      warnings: warnings
    };
  }

  /*
   * 器械被占用 → 同肌群替代动作
   * opts: { targetId, equipmentKeys, customEquipment, injuries, experience, usedIds, goal }
   */
  function alternativesFor(targetId, opts) {
    var target = null;
    DB.EXERCISES.forEach(function (e) { if (e.id === targetId) { target = e; } });
    if (!target) { return []; }

    var built = buildPool({ goal: opts.goal || 'muscle', experience: opts.experience || 'beginner', injuries: opts.injuries || [] }, opts.equipmentKeys);
    var used = new Set(opts.usedIds || []);
    used.delete(targetId);

    var list = built.pool.filter(function (e) {
      if (e.id === targetId) { return false; }
      if (e.muscle !== target.muscle) { return false; }
      if (used.has(e.id)) { return false; }
      return true;
    });

    list.sort(function (a, b) {
      var sa = (a.equipment === target.equipment) ? 1 : 0;
      var sb = (b.equipment === target.equipment) ? 1 : 0;
      if (sa !== sb) { return sa - sb; }        /* 优先不同器械 */
      var pa = goalPriority(a, opts.goal || 'muscle'), pb = goalPriority(b, opts.goal || 'muscle');
      if (pa !== pb) { return pa - pb; }
      if (a.level !== b.level) { return a.level - b.level; }
      return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
    });

    return list.slice(0, 5).map(function (e) {
      return {
        id: e.id, name: e.name,
        equipment: e.equipment,
        equipmentName: equipName(e.equipment),
        sameEquipment: e.equipment === target.equipment,
        muscle: DB.MUSCLES[e.muscle],
        level: e.level
      };
    });
  }

  var PlanEngine = {
    generate: generate,
    alternativesFor: alternativesFor,
    hash: hash,
    equipName: equipName,
    goalPriority: goalPriority
  };

  if (typeof window !== 'undefined') { window.PlanEngine = PlanEngine; }
  if (typeof module !== 'undefined' && module.exports) { module.exports = PlanEngine; }
})(typeof window !== 'undefined' ? window : globalThis);
