/* ============================================================
   炼炼 · AI 健身房训练助手 — app.js
   状态管理 / 路由 / 五个视图 / 训练执行模式 / 休息倒计时
   数据全部保存在 localStorage
   ============================================================ */

'use strict';

(function () {
  var DB = window.FITNESS_DB;
  var Engine = window.PlanEngine;

  /* ---------------- 基础工具 ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(msg, ms) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toast._h);
    toast._h = setTimeout(function () { t.classList.add('hidden'); }, ms || 2400);
  }
  function dateKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function weekStartKey(d) {
    d = d || new Date();
    var day = (d.getDay() + 6) % 7; /* 周一为 0 */
    var ms = d.getTime() - day * 86400000;
    return dateKey(new Date(ms));
  }
  function todayPlanIndex() { return (new Date().getDay() + 6) % 7; }
  function greeting() {
    var h = new Date().getHours();
    if (h < 6) { return '夜深了'; }
    if (h < 12) { return '早上好'; }
    if (h < 14) { return '中午好'; }
    if (h < 18) { return '下午好'; }
    return '晚上好';
  }
  function fmtDate() {
    var w = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date().getDay()];
    return (new Date().getMonth() + 1) + '月' + new Date().getDate() + '日 ' + w;
  }
  function fmtRest(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  /* 提示音（休息结束），失败静默 */
  function beep(times) {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) { return; }
      var ctx = new Ctx();
      for (var i = 0; i < (times || 1); i++) {
        (function (delay) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = 880;
          g.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
          g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + delay + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.35);
          o.start(ctx.currentTime + delay);
          o.stop(ctx.currentTime + delay + 0.4);
        })(i * 0.45);
      }
      setTimeout(function () { ctx.close(); }, (times || 1) * 500);
    } catch (e) { /* 忽略音频错误 */ }
  }

  /* ---------------- 状态管理 ---------------- */
  var STORE_KEY = 'afd_state_v1';
  var state = loadState();

  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        s.profile = s.profile || null;
        s.equipment = Array.isArray(s.equipment) ? s.equipment : [];
        s.custom = Array.isArray(s.custom) ? s.custom : [];
        s.plan = s.plan || null;
        s.logs = Array.isArray(s.logs) ? s.logs : [];
        s.disclaimerSeen = !!s.disclaimerSeen;
        s.session = s.session || null;
        return s;
      }
    } catch (e) { /* 损坏则重置 */ }
    return { profile: null, equipment: [], custom: [], plan: null, logs: [], disclaimerSeen: false, session: null };
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 存储失败忽略 */ }
  }

  /* ---------------- 导航 ---------------- */
  var NAVS = [
    { id: 'dashboard', label: '首页', icon: '🏠' },
    { id: 'profile', label: '档案', icon: '📋' },
    { id: 'equipment', label: '器械', icon: '🏋️' },
    { id: 'plan', label: '计划', icon: '📅' },
    { id: 'train', label: '训练', icon: '⚡' }
  ];
  var VIEW_TITLES = { dashboard: '首页', profile: '训练档案', equipment: '器械库', plan: '一周计划', train: '训练执行' };

  function go(view) { location.hash = '#/' + view; }

  function renderNavs() {
    $('#topnav').innerHTML = NAVS.map(function (n) {
      return '<a href="#/' + n.id + '" data-nav="' + n.id + '">' + n.label + '</a>';
    }).join('');
    $('#bottomnav').innerHTML = NAVS.map(function (n) {
      return '<a href="#/' + n.id + '" data-nav="' + n.id + '">' +
        '<span class="ic">' + n.icon + '</span>' + n.label + '</a>';
    }).join('');
  }

  function route() {
    var h = (location.hash || '#/dashboard').replace('#/', '');
    var view = NAVS.some(function (n) { return n.id === h; }) ? h : 'dashboard';
    $$('.view').forEach(function (v) { v.classList.remove('active'); });
    $$('[data-nav]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === view);
    });
    var el = $('#view-' + view);
    el.classList.add('active');
    document.title = VIEW_TITLES[view] + ' · 炼炼 AI 健身房训练助手';
    renderers[view]();
    window.scrollTo(0, 0);
  }

  /* ---------------- 统计 ---------------- */
  function computeStats() {
    var totalSets = 0, volume = 0, thisWeek = 0;
    var wk = weekStartKey();
    state.logs.forEach(function (l) {
      totalSets += l.totalSets || 0;
      volume += l.volume || 0;
      if (l.date >= wk) { thisWeek++; }
    });
    var set = new Set(state.logs.map(function (l) { return l.date; }));
    var streak = 0, d = new Date();
    for (var i = 0; i < 400; i++) {
      var k = dateKey(d);
      if (set.has(k)) { streak++; } else if (i > 0) { break; }
      d.setDate(d.getDate() - 1);
    }
    return { totalSets: totalSets, volume: volume, thisWeek: thisWeek, streak: streak };
  }

  function todayOrNextDay() {
    if (!state.plan || !state.plan.days.length) { return null; }
    var t = todayPlanIndex();
    var days = state.plan.days;
    for (var i = 0; i < days.length; i++) {
      if (days[i].index === t) { return { day: days[i], isToday: true }; }
    }
    /* 今天不是训练日 → 找下一个最近的训练日 */
    for (var k = 1; k <= 7; k++) {
      var idx = (t + k) % 7;
      for (var j = 0; j < days.length; j++) {
        if (days[j].index === idx) { return { day: days[j], isToday: false }; }
      }
    }
    return null;
  }

  /* ---------------- 视图渲染器 ---------------- */
  var renderers = {
    dashboard: renderDashboard,
    profile: renderProfile,
    equipment: renderEquipment,
    plan: renderPlan,
    train: renderTrain
  };

  /* ============ 仪表盘 ============ */
  function renderDashboard() {
    var v = $('#view-dashboard');
    var p = state.profile;
    var stats = computeStats();
    var tn = todayOrNextDay();
    var chips = '';
    if (p) {
      chips = '<span class="chip">' + DB.GOALS[p.goal].emoji + ' ' + DB.GOALS[p.goal].label + '</span>' +
        '<span class="chip muted">' + DB.EXPERIENCE[p.experience].label + '</span>' +
        '<span class="chip muted">每周 ' + p.frequency + ' 练</span>' +
        '<span class="chip muted">单次 ' + p.duration + ' 分钟</span>';
    }

    var todayHtml = '';
    if (!p) {
      todayHtml =
        '<div class="card"><div class="empty">' +
        '<div class="empty-icon">📋</div><p>还没有你的训练档案。先花 1 分钟填写，就能生成专属计划。</p>' +
        '<button class="btn btn-primary" data-go="profile">去填写档案</button></div></div>';
    } else if (!state.plan) {
      todayHtml =
        '<div class="card"><div class="empty">' +
        '<div class="empty-icon">🗓️</div><p>档案已就绪，但还没有生成训练计划。确认器械后即可一键生成。</p>' +
        '<button class="btn btn-primary" data-go="plan">去生成计划</button></div></div>';
    } else if (tn) {
      var day = tn.day;
      var steps = day.steps.slice(0, 4).map(function (s, i) {
        var nm = s.kind === 'exercise' ? s.name : s.name;
        var meta = s.kind === 'exercise' ? (s.sets + ' × ' + s.reps) : (s.minutes + ' 分钟');
        return '<li><span class="n">' + (i + 1) + '</span><span>' + esc(nm) + '</span><span class="m">' + esc(meta) + '</span></li>';
      }).join('');
      var more = day.steps.length > 4 ? '<li style="color:var(--muted-2);font-size:12px;padding:6px 0 0;border:none">还有 ' + (day.steps.length - 4) + ' 个环节…</li>' : '';
      todayHtml =
        '<div class="card today-card"><div class="card-title-row">' +
        '<h2>' + (tn.isToday ? '🔥 今日训练' : '⏭️ 下一训练日') + '</h2>' +
        (tn.isToday ? '<span class="chip">' + day.weekday + ' · ' + day.label + '</span>' : '<span class="chip muted">' + day.weekday + ' · ' + day.label + '</span>') +
        '</div>' +
        '<ul class="today-list">' + steps + more + '</ul>' +
        '<div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">' +
        '<button class="btn btn-primary btn-sm" data-start="' + day.index + '">▶ 开始训练</button>' +
        '<button class="btn btn-ghost btn-sm" data-go="plan">查看完整计划</button>' +
        '</div></div>';
    }

    v.innerHTML =
      '<div class="hero">' +
      '<h1>' + greeting() + '，欢迎回来 🏋️</h1>' +
      '<div class="date-line">' + fmtDate() + (p ? ' · ' + p.height + 'cm / ' + p.weight + 'kg / ' + p.age + '岁 / ' + (p.gender === 'male' ? '男' : '女') : '') + '</div>' +
      (chips ? '<div class="hero-chips">' + chips + '</div>' : '') +
      '<div class="hero-actions">' +
      (p ? '' : '<button class="btn btn-primary" data-go="profile">创建训练档案</button>') +
      '<button class="btn btn-ghost" data-go="equipment">管理器械</button>' +
      (p ? '<button class="btn btn-primary" data-go="plan">' + (state.plan ? '查看我的计划' : '生成一周计划') + '</button>' : '') +
      '</div></div>' +

      '<div class="stat-grid">' +
      statBox(stats.totalSets, '累计完成组数', 'group') +
      statBox(state.logs.length, '完成训练次数', 'plain') +
      statBox(stats.thisWeek + ' / ' + (p ? p.frequency : '—'), '本周进度', 'plain') +
      statBox(stats.streak + ' 天', '连续打卡', 'plain') +
      '</div>' +

      todayHtml +

      '<div class="quick-grid">' +
      quick('📋', '训练档案', 'profile') +
      quick('🏋️', '器械库', 'equipment') +
      quick('🗓️', '一周计划', 'plan') +
      quick('⚡', '开始训练', 'train') +
      '</div>' +

      '<div class="card disclaimer-card">' +
      '<h2>⚕️ 医疗免责声明</h2>' +
      '<p class="sub">训练有风险，请务必阅读</p>' +
      '<details><summary>展开阅读完整声明</summary>' +
      '<div class="full-text">本应用仅供参考，不构成医疗或健康专业意见。开始锻炼前请咨询医生或专业教练，特别是有心血管疾病、高血压、糖尿病、骨关节损伤、术后恢复期、孕期等情况时。训练中如出现胸痛、头晕、恶心、关节剧痛等不适，请立即停止并寻求医疗帮助。请量力而行，循序渐进，注意动作规范。</div>' +
      '</details></div>';

    bindGo(v);
    bindStart(v);
  }

  function statBox(num, lbl, cls) {
    return '<div class="stat"><div class="num ' + (cls === 'plain' ? 'plain' : '') + '">' + num + '</div><div class="lbl">' + lbl + '</div></div>';
  }
  function quick(ic, t, view) {
    return '<a class="quick" href="#/' + view + '"><div class="ic">' + ic + '</div><div class="t">' + t + '</div></a>';
  }
  function bindGo(root) {
    $$('[data-go]', root).forEach(function (b) {
      b.addEventListener('click', function () { go(b.getAttribute('data-go')); });
    });
  }
  function bindStart(root) {
    $$('[data-start]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var idx = parseInt(b.getAttribute('data-start'), 10);
        startTraining(idx);
        go('train');
      });
    });
  }

  /* ============ 档案 ============ */
  var INJURY_OPTIONS = ['none', 'knee', 'back', 'shoulder', 'wrist', 'elbow', 'neck', 'ankle'];

  function renderProfile() {
    var v = $('#view-profile');
    var p = state.profile || {};
    var inj = p.injuries || [];

    function sel(name, options, cur, extra) {
      return '<select name="' + name + '">' + options.map(function (o) {
        return '<option value="' + o[0] + '"' + (String(cur) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>';
      }).join('') + '</select>';
    }

    var goalOpts = Object.keys(DB.GOALS).map(function (k) { return [k, DB.GOALS[k].emoji + ' ' + DB.GOALS[k].label]; });
    var expOpts = Object.keys(DB.EXPERIENCE).map(function (k) { return [k, DB.EXPERIENCE[k].label]; });
    var freqOpts = [1, 2, 3, 4, 5, 6, 7].map(function (k) { return [k, '每周 ' + k + ' 次']; });
    var durOpts = [30, 45, 60, 75, 90].map(function (k) { return [k, k + ' 分钟']; });

    var injuryChips = INJURY_OPTIONS.map(function (k) {
      var on = inj.indexOf(k) >= 0;
      var isNone = k === 'none';
      var disabled = isNone && inj.length > 0;
      return '<button type="button" class="opt' + (on ? ' on' : '') + '" data-injury="' + k + '"' + (disabled ? ' disabled' : '') + '>' +
        (isNone ? '✔ 无伤病' : esc(DB.INJURIES[k])) + '</button>';
    }).join('');

    v.innerHTML =
      '<div class="card"><h2>📋 训练档案</h2><p class="sub">这些信息决定你的计划方向。填写后可在「计划」页一键生成。</p>' +
      '<form id="profileForm">' +
      '<div class="form-grid">' +
      '<div class="field"><label>身高 (cm)</label><input type="number" name="height" min="100" max="250" step="1" placeholder="例如 175" value="' + esc(p.height || '') + '" required></div>' +
      '<div class="field"><label>体重 (kg)</label><input type="number" name="weight" min="30" max="250" step="0.5" placeholder="例如 70" value="' + esc(p.weight || '') + '" required></div>' +
      '<div class="field"><label>年龄</label><input type="number" name="age" min="10" max="90" step="1" placeholder="例如 28" value="' + esc(p.age || '') + '" required></div>' +
      '<div class="field"><label>性别</label>' + sel('gender', [['male', '男'], ['female', '女']], p.gender || 'male') + '</div>' +
      '<div class="field"><label>训练目标</label>' + sel('goal', goalOpts, p.goal || 'muscle') + '</div>' +
      '<div class="field"><label>训练经验</label>' + sel('experience', expOpts, p.experience || 'beginner') + '</div>' +
      '<div class="field"><label>每周训练次数</label>' + sel('frequency', freqOpts, p.frequency || 3) + '</div>' +
      '<div class="field"><label>单次训练时长</label>' + sel('duration', durOpts, p.duration || 60) + '</div>' +
      '<div class="field full"><label>伤病限制（可多选，相关动作将被自动过滤）</label>' +
      '<div class="chip-row" id="injuryRow">' + injuryChips + '</div></div>' +
      '</div>' +
      '<div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">' +
      '<button type="submit" class="btn btn-primary" style="flex:1;min-width:160px">💾 保存档案</button>' +
      (p.height ? '<button type="button" class="btn btn-danger" id="clearProfile">清空档案</button>' : '') +
      '</div>' +
      '<p class="hint" style="margin-top:10px;font-size:12px;color:var(--muted-2)">伤病限制用于过滤承压关节的动作；如不确定请选择「无」并在训练前咨询医生。</p>' +
      '</form></div>' +
      '<div class="card disclaimer-card"><h2>⚕️ 训练前须知</h2><p class="sub" style="margin:0">开始任何锻炼计划前，请咨询医生或专业教练；运动中如有胸痛、头晕、关节剧痛等不适，请立即停止。本应用不构成医疗建议。</p></div>';

    /* 伤病 chip 交互（「无」与其余互斥） */
    var selected = inj.slice();
    var row = $('#injuryRow', v);
    row.addEventListener('click', function (e) {
      var btn = e.target.closest('.opt');
      if (!btn || btn.disabled) { return; }
      var k = btn.getAttribute('data-injury');
      if (k === 'none') {
        selected.length = 0;
        selected.push('none');
      } else {
        var i = selected.indexOf(k);
        if (i >= 0) { selected.splice(i, 1); } else { selected.push(k); }
        var ni = selected.indexOf('none');
        if (ni >= 0) { selected.splice(ni, 1); }
      }
      $$('.opt[data-injury]', row).forEach(function (b) {
        var bk = b.getAttribute('data-injury');
        b.classList.toggle('on', selected.indexOf(bk) >= 0);
        b.disabled = bk === 'none' && selected.length > 0;
      });
      $('#profileForm')._injuries = selected;
    });
    $('#profileForm')._injuries = selected;

    $('#profileForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      var height = parseFloat(f.height.value), weight = parseFloat(f.weight.value), age = parseFloat(f.age.value);
      if (!(height >= 100 && height <= 250)) { toast('身高需在 100-250 cm 之间'); return; }
      if (!(weight >= 30 && weight <= 250)) { toast('体重需在 30-250 kg 之间'); return; }
      if (!(age >= 10 && age <= 90)) { toast('年龄需在 10-90 岁之间'); return; }
      var injs = f._injuries || [];
      if (injs.indexOf('none') < 0 && injs.length === 0) { injs = ['none']; }
      state.profile = {
        height: height, weight: weight, age: age,
        gender: f.gender.value, goal: f.goal.value, experience: f.experience.value,
        frequency: parseInt(f.frequency.value, 10), duration: parseInt(f.duration.value, 10),
        injuries: injs
      };
      saveState();
      toast('✅ 档案已保存');
      go('dashboard');
    });

    var cp = $('#clearProfile');
    if (cp) {
      cp.addEventListener('click', function () {
        if (confirm('确定清空训练档案吗？已生成的计划将保留。')) {
          state.profile = null;
          saveState();
          renderProfile();
          toast('档案已清空');
        }
      });
    }
  }

  /* ============ 器械 ============ */
  function renderEquipment() {
    var v = $('#view-equipment');
    var selKeys = state.equipment.slice();

    function grid(group) {
      return DB.EQUIPMENT.filter(function (e) { return e.group === group; }).map(function (e) {
        var on = selKeys.indexOf(e.key) >= 0;
        return '<div class="equip-item' + (on ? ' on' : '') + '" data-eq="' + e.key + '" role="button" tabindex="0">' +
          '<div class="ic">' + e.icon + '</div><div class="nm">' + e.name + '</div></div>';
      }).join('');
    }

    var customList = state.custom.map(function (c, i) {
      return '<li><span>' + esc(c.name) + '</span><span class="chip muted tag">按 ' + esc(equipLabel(c.equivalent)) + ' 计</span>' +
        '<button class="del" data-delcustom="' + i + '" title="删除">✕</button></li>';
    }).join('');

    v.innerHTML =
      '<div class="card"><h2>🏋️ 器械库</h2><p class="sub">勾选你健身房实际可用的器械 —— 计划只会从这些器械中选动作。变更后请重新生成计划。</p>' +
      '<div class="equip-group-title">自重 · 始终可用</div>' +
      '<div class="equip-grid"><div class="equip-item on locked"><div class="ic">' + DB.BODYWEIGHT.icon + '</div><div class="nm">' + DB.BODYWEIGHT.name + '</div></div></div>' +
      '<div class="equip-group-title">力量器械</div>' +
      '<div class="equip-grid">' + grid('strength') + '</div>' +
      '<div class="equip-group-title">有氧器械</div>' +
      '<div class="equip-grid">' + grid('cardio') + '</div>' +
      '<div class="equip-group-title">辅助器材</div>' +
      '<div class="equip-grid">' + grid('aux') + '</div>' +
      '</div>' +

      '<div class="card"><h2>➕ 自定义器械</h2><p class="sub">健身房有特殊器械？添加后可按「等价类型」参与计划选动作。</p>' +
      '<div class="custom-form">' +
      '<input type="text" id="customName" placeholder="器械名称，如：坐式推胸器" maxlength="20">' +
      '<select id="customEq">' + DB.EQUIPMENT.map(function (e) { return '<option value="' + e.key + '">等价于 ' + e.name + '</option>'; }).join('') + '</select>' +
      '<button class="btn btn-primary btn-sm" id="addCustom">添加</button>' +
      '</div>' +
      (customList ? '<ul class="custom-list">' + customList + '</ul>' : '<p class="hint" style="margin-top:10px">暂无自定义器械</p>') +
      '</div>';

    /* 勾选/取消（立即保存） */
    $$('.equip-item[data-eq]', v).forEach(function (item) {
      function toggle() {
        var k = item.getAttribute('data-eq');
        var i = selKeys.indexOf(k);
        if (i >= 0) { selKeys.splice(i, 1); item.classList.remove('on'); }
        else { selKeys.push(k); item.classList.add('on'); }
        state.equipment = selKeys;
        saveState();
      }
      item.addEventListener('click', toggle);
      item.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });

    /* 自定义器械 */
    $('#addCustom').addEventListener('click', function () {
      var name = $('#customName').value.trim();
      if (!name) { toast('请输入器械名称'); return; }
      state.custom.push({ id: 'c' + Date.now(), name: name, equivalent: $('#customEq').value });
      saveState();
      renderEquipment();
      toast('✅ 已添加自定义器械');
    });
    $$('[data-delcustom]', v).forEach(function (b) {
      b.addEventListener('click', function () {
        state.custom.splice(parseInt(b.getAttribute('data-delcustom'), 10), 1);
        saveState();
        renderEquipment();
        toast('已删除');
      });
    });
  }

  function equipLabel(key) {
    var hit = DB.EQUIPMENT.filter(function (e) { return e.key === key; })[0];
    return hit ? hit.name : key;
  }

  /* ============ 计划 ============ */
  var planDaySel = null;

  function renderPlan() {
    var v = $('#view-plan');
    if (!state.profile) {
      v.innerHTML = '<div class="card"><div class="empty"><div class="empty-icon">📋</div>' +
        '<p>生成计划前，需要先填写你的训练档案。</p>' +
        '<button class="btn btn-primary" data-go="profile">去填写档案</button></div></div>';
      bindGo(v);
      return;
    }

    var hasEquipment = state.equipment.length > 0 || state.custom.length > 0;
    var plan = state.plan;
    var selIdx = planDaySel;
    if (!plan) {
      var equipWarn = '';
      if (!hasEquipment) {
        equipWarn = '<div class="warn-box">⚠️ 当前未勾选任何器械，将按“仅自重”训练兜底。建议先在「器械」页勾选实际可用器械（如哑铃、固定器械、绳索、杠铃等），再生成计划。</div>';
      } else if (state.equipment.length === 0) {
        equipWarn = '<div class="warn-box">⚠️ 当前仅勾选了自定义器械，将按“仅自重 + 自定义器械”生成计划。建议同时勾选实际可用的标准器械。</div>';
      }
      v.innerHTML =
        '<div class="card"><h2>🗓️ 一周训练计划</h2><p class="sub">规则引擎会根据你的档案、目标、频率、时长与可用器械，确定性地生成 7 天一周的排期 —— 同样的配置永远得到同样的计划。</p>' +
        equipWarn +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        '<button class="btn btn-primary" id="genPlan">✨ 生成一周计划</button>' +
        '<button class="btn btn-ghost" data-go="equipment">去勾选器械</button></div>' +
        '<p class="hint" style="margin-top:10px;color:var(--muted-2);font-size:12px">档案：' + esc(DB.GOALS[state.profile.goal].label) + ' · 每周 ' + state.profile.frequency + ' 练 · 单次 ' + state.profile.duration + ' 分钟' +
        (state.profile.injuries.indexOf('none') < 0 ? ' · 伤病限制：' + state.profile.injuries.map(function (k) { return DB.INJURIES[k]; }).join('、') : '') + '</p>' +
        '</div>';
      $('#genPlan').addEventListener('click', function () {
        plan = generatePlan();
        if (plan) { renderPlan(); }
      });
      bindGo(v);
      return;
    }

    if (selIdx == null || !plan.days.some(function (d) { return d.index === selIdx; })) {
      /* 默认定位到今天的训练日（如果有） */
      var t = todayOrNextDay();
      selIdx = t ? t.day.index : plan.days[0].index;
      planDaySel = selIdx;
    }
    var day = null;
    plan.days.forEach(function (d) { if (d.index === selIdx) { day = d; } });

    var tabs = plan.days.map(function (d) {
      var on = d.index === selIdx;
      return '<button class="day-tab' + (on ? ' on' : '') + '" data-day="' + d.index + '">' + d.weekday +
        '<small>' + d.label + '</small></button>';
    }).join('');

    var steps = day.steps.map(function (s, i) {
      if (s.kind === 'exercise') {
        return '<div class="step-card">' +
          '<div class="idx">' + (i + 1) + '</div>' +
          '<div class="body"><div class="name">' + esc(s.name) + '</div>' +
          '<div class="meta">' +
          '<span class="chip muted">' + esc(s.muscleName) + '</span>' +
          '<span class="chip muted">' + esc(s.equipmentName) + '</span>' +
          '<span class="chip info">' + s.sets + ' 组 × ' + esc(s.reps) + '</span>' +
          (s.type === 'compound' ? '<span class="chip">复合动作</span>' : '') +
          '</div>' +
          '<div class="rt">休息 ' + fmtRest(s.rest) + '</div>' +
          '<div class="rir">' + esc(s.rir) + '</div>' +
          '</div></div>';
      }
      if (s.kind === 'cardio') {
        return '<div class="step-card cardio">' +
          '<div class="idx">♥</div>' +
          '<div class="body"><div class="name">🔥 ' + esc(s.name) + '</div>' +
          '<div class="meta"><span class="chip warn">有氧燃脂</span><span class="chip muted">' + esc(s.equipmentName) + '</span>' +
          '<span class="chip info">' + s.minutes + ' 分钟</span></div>' +
          '<div class="rir">' + esc(s.note) + '</div></div></div>';
      }
      return '<div class="step-card ' + s.kind + '">' +
        '<div class="idx">' + (s.kind === 'warmup' ? '热' : '伸') + '</div>' +
        '<div class="body"><div class="name">' + (s.kind === 'warmup' ? '🌡️ ' : '🧘 ') + esc(s.name) + '</div>' +
        '<div class="meta"><span class="chip info">' + s.minutes + ' 分钟</span></div>' +
        '<div class="rir">' + esc(s.note) + '</div></div></div>';
    }).join('');

    var warns = plan.warnings.map(function (w) { return '<div class="warn-box">⚠️ ' + esc(w) + '</div>'; }).join('');

    v.innerHTML =
      '<div class="card"><div class="card-title-row">' +
      '<h2>🗓️ 一周训练计划</h2>' +
      '<button class="btn btn-ghost btn-sm" id="regen">↻ 重新生成</button>' +
      '</div>' +
      '<p class="sub">基于你的档案与器械，确定性生成 · 计划快照于 ' + esc(plan.generatedAt.replace('T', ' ').slice(0, 16)) + '</p>' +
      '<div class="day-tabs">' + tabs + '</div>' +
      warns +
      '<div class="day-head"><h2>' + day.weekday + ' · ' + day.label + '</h2>' +
      '<span class="chip muted">' + esc(day.focus.join(' / ')) + '</span></div>' +
      '<div class="day-meta">' +
      '<span class="chip">' + day.totalSets + ' 组</span>' +
      '<span class="chip muted">约 ' + day.estMinutes + ' 分钟</span>' +
      '<span class="chip muted">' + day.steps.length + ' 个环节</span>' +
      '</div>' +
      '<div style="margin:12px 0">' + steps + '</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<button class="btn btn-primary" data-start="' + day.index + '">▶ 开始这一天</button>' +
      '<button class="btn btn-ghost" data-go="train">进入训练模式</button>' +
      '</div></div>';

    $$('.day-tab', v).forEach(function (b) {
      b.addEventListener('click', function () {
        planDaySel = parseInt(b.getAttribute('data-day'), 10);
        renderPlan();
      });
    });
    $('#regen').addEventListener('click', function () {
      plan = generatePlan();
      if (plan) { renderPlan(); }
    });
    bindGo(v);
    bindStart(v);
  }

  function generatePlan() {
    if (!state.profile) { toast('请先填写训练档案'); go('profile'); return null; }
    var plan = Engine.generate(state.profile, state.equipment, state.custom);
    state.plan = plan;
    planDaySel = null;
    saveState();
    toast('✅ 一周计划已生成');
    return plan;
  }

  /* ============ 训练执行 ============ */
  function renderTrain() {
    var v = $('#view-train');

    if (state.session) {
      renderSession(v);
      return;
    }
    if (!state.plan) {
      v.innerHTML = '<div class="card"><div class="empty"><div class="empty-icon">⚡</div>' +
        '<p>还没有可执行的计划。先去生成一周计划吧。</p>' +
        '<button class="btn btn-primary" data-go="plan">去生成计划</button></div></div>';
      bindGo(v);
      return;
    }

    var days = state.plan.days;
    var t = todayOrNextDay();
    var pre = t ? t.day.index : days[0].index;
    var chips = days.map(function (d) {
      return '<button class="day-tab' + (d.index === pre ? ' on' : '') + '" data-day="' + d.index + '">' + d.weekday +
        '<small>' + d.label + ' · ' + d.totalSets + ' 组</small></button>';
    }).join('');

    v.innerHTML =
      '<div class="card"><h2>⚡ 训练执行</h2><p class="sub">选择训练日，进入逐组执行模式：记录重量/次数，组间自动休息倒计时。</p>' +
      '<div class="day-tabs">' + chips + '</div>' +
      '<button class="btn btn-primary btn-block" id="startDay">▶ 开始训练</button>' +
      '</div>' +
      '<div class="card disclaimer-card"><h2>⚕️ 训练安全提醒</h2><p class="sub" style="margin:0">量力而行，动作规范优先；不适立即停止并咨询医生。</p></div>';

    $$('.day-tab', v).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.day-tab', v).forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      });
    });
    $('#startDay').addEventListener('click', function () {
      var on = $('.day-tab.on', v);
      var idx = on ? parseInt(on.getAttribute('data-day'), 10) : pre;
      startTraining(idx);
      renderSession(v);
    });
  }

  /* --- 训练会话 --- */
  function startTraining(dayIndex) {
    var plan = state.plan;
    if (!plan) { return; }
    var day = null;
    plan.days.forEach(function (d) { if (d.index === dayIndex) { day = d; } });
    if (!day) { return; }

    var units = day.steps.map(function (s) {
      if (s.kind === 'exercise') {
        var sets = [];
        for (var i = 0; i < s.sets; i++) { sets.push({ weight: '', reps: '', done: false }); }
        return {
          kind: 'exercise', id: s.id, name: s.name, equipment: s.equipment, muscle: s.muscle,
          muscleName: s.muscleName, equipmentName: s.equipmentName,
          setsTarget: s.sets, reps: s.reps, rest: s.rest, rir: s.rir, sets: sets
        };
      }
      return {
        kind: s.kind, id: s.id, name: s.name, equipment: s.equipment, equipmentName: s.equipmentName,
        minutes: s.minutes, note: s.note, sets: [{ weight: '', reps: '', done: false }], setsTarget: 1, reps: '—', rest: 0, rir: ''
      };
    });

    state.session = {
      planIndex: dayIndex, dayLabel: day.weekday, label: day.label, type: day.type,
      goal: plan.goal, createdAt: Date.now(),
      units: units, cur: 0
    };
    saveState();
  }

  function sessionDoneSets(sess) {
    var done = 0, total = 0;
    sess.units.forEach(function (u) {
      u.sets.forEach(function (s) { total++; if (s.done) { done++; } });
    });
    return { done: done, total: total };
  }

  function lastWeightFor(name) {
    for (var i = state.logs.length - 1; i >= 0; i--) {
      var units = state.logs[i].units || [];
      for (var j = 0; j < units.length; j++) {
        if (units[j].name === name && units[j].sets && units[j].sets.length) {
          var last = units[j].sets[units[j].sets.length - 1];
          return last.w || '';
        }
      }
    }
    return '';
  }

  function renderSession(v) {
    var sess = state.session;
    if (!sess) { renderTrain(); return; }
    var prog = sessionDoneSets(sess);
    var unit = sess.units[sess.cur];
    var pct = prog.total ? Math.round(prog.done / prog.total * 100) : 0;

    var unitHtml = '';
    if (unit.kind === 'exercise') {
      var rows = unit.sets.map(function (s, i) {
        if (s.done) {
          return '<li class="done"><span class="set-no">✓ 第' + (i + 1) + '组</span>' +
            '<span style="grid-column:2/4;font-size:13px">' + (s.weight ? esc(s.weight) + ' kg × ' : '') + esc(s.reps || '—') + ' 次</span>' +
            '<span class="rec">完成</span></li>';
        }
        var active = i === unit.sets.findIndex(function (x) { return !x.done; });
        if (active) {
          return '<li>' +
            '<span class="set-no">第' + (i + 1) + '组</span>' +
            '<input type="number" min="0" step="0.5" placeholder="重量kg" data-w="' + i + '" value="' + esc(s.weight || '') + '">' +
            '<input type="number" min="0" step="1" placeholder="次数" data-r="' + i + '" value="' + esc(s.reps || '') + '">' +
            '<button class="rec" data-rec="' + i + '">记录本组</button>' +
            '<span class="prev">目标 ' + esc(unit.reps) + ' 次' + (lastWeightFor(unit.name) ? ' · 上次重量 ' + esc(lastWeightFor(unit.name)) + ' kg' : '') + '</span>' +
            '</li>';
        }
        return '<li><span class="set-no">第' + (i + 1) + '组</span><span style="grid-column:2/4;font-size:13px;color:var(--muted-2)">待完成</span><span class="rec" style="opacity:.4">—</span></li>';
      }).join('');

      unitHtml =
        '<div class="card" style="border-color:rgba(184,243,76,.4)">' +
        '<div class="card-title-row"><h2>' + esc(unit.name) + '</h2>' +
        '<span class="chip">' + unit.muscleName + '</span></div>' +
        '<div class="meta" style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:4px">' +
        '<span class="chip muted">' + esc(unit.equipmentName) + '</span>' +
        '<span class="chip info">' + unit.setsTarget + ' 组 × ' + esc(unit.reps) + '</span>' +
        '<span class="chip muted">组间休息 ' + fmtRest(unit.rest) + '</span>' +
        '</div>' +
        '<div class="rir" style="font-size:12px;color:var(--muted-2)">' + esc(unit.rir) + '</div>' +
        '<ul class="set-list">' + rows + '</ul>' +
        '<div class="train-actions">' +
        '<button class="btn btn-ghost btn-sm" id="swapBtn">🔄 器械被占用，换同肌群替代</button>' +
        '</div>' +
        '<div id="altPanel" class="alt-panel hidden"><h4>🔄 同肌群替代动作（优先不同器械）</h4><div id="altList"></div></div>' +
        '</div>';
    } else {
      var icon = unit.kind === 'warmup' ? '🌡️' : (unit.kind === 'cardio' ? '🔥' : '🧘');
      unitHtml =
        '<div class="card" style="border-color:rgba(90,200,250,.4);text-align:center;padding:30px 18px">' +
        '<div style="font-size:44px;margin-bottom:8px">' + icon + '</div>' +
        '<h2 style="justify-content:center;margin-bottom:6px">' + esc(unit.name) + '</h2>' +
        '<p style="color:var(--muted);font-size:14px;margin-bottom:6px">' + (unit.minutes || 5) + ' 分钟</p>' +
        '<p style="color:var(--muted-2);font-size:12.5px;max-width:420px;margin:0 auto 16px">' + esc(unit.note || '') + '</p>' +
        '<button class="btn btn-primary" id="doneStep">完成本环节</button>' +
        '</div>';
    }

    v.innerHTML =
      '<div class="train-progress"><div class="row1">' +
      '<span><b>' + sess.dayLabel + ' · ' + sess.label + '</b>　' + prog.done + ' / ' + prog.total + ' 组</span>' +
      '<span>' + pct + '%</span></div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div></div>' +
      unitHtml +
      '<div style="display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap">' +
      '<button class="btn btn-ghost btn-sm" id="exitTrain">⏸ 退出（进度已保存）</button>' +
      '<span class="hint" style="font-size:11.5px;color:var(--muted-2);align-self:center">逐组记录，认真完成每一组 💦</span>' +
      '</div>';

    /* 事件绑定 */
    if (unit.kind === 'exercise') {
      $$('[data-rec]', v).forEach(function (b) {
        b.addEventListener('click', function () {
          var si = parseInt(b.getAttribute('data-rec'), 10);
          var w = parseFloat($('[data-w="' + si + '"]', v).value);
          var r = parseInt($('[data-r="' + si + '"]', v).value, 10);
          if (isNaN(r) || r < 0) { toast('请填写完成的次数'); return; }
          unit.sets[si].weight = isNaN(w) ? '' : w;
          unit.sets[si].reps = r;
          unit.sets[si].done = true;
          saveState();
          if (si + 1 < unit.sets.length) {
            startRest(unit.rest, function () { renderSession(v); });
          } else {
            advanceAfterUnit(v);
          }
        });
      });
      $('#swapBtn').addEventListener('click', function () {
        var panel = $('#altPanel', v);
        panel.classList.toggle('hidden');
        if (!panel.classList.contains('hidden') && !$('#altList', v).children.length) {
          renderAlts(v);
        }
      });
    } else {
      $('#doneStep').addEventListener('click', function () {
        unit.sets[0].done = true;
        saveState();
        advanceAfterUnit(v);
      });
    }
    $('#exitTrain').addEventListener('click', function () {
      go('dashboard');
      toast('⏸ 训练进度已保存，随时可回来继续');
    });
  }

  function advanceAfterUnit(v) {
    var sess = state.session;
    if (sess.cur + 1 < sess.units.length) {
      sess.cur++;
      saveState();
      renderSession(v);
    } else {
      finishTraining(v);
    }
  }

  /* 同肌群替代动作 */
  function renderAlts(v) {
    var sess = state.session;
    var unit = sess.units[sess.cur];
    var usedIds = sess.units.filter(function (u) { return u.kind === 'exercise' && u.id !== unit.id; }).map(function (u) { return u.id; });
    var eqKeys = (state.plan ? state.plan.equipmentUsed : []).slice();
    state.equipment.forEach(function (k) { if (eqKeys.indexOf(k) < 0) { eqKeys.push(k); } });
    var opts = {
      targetId: unit.id,
      equipmentKeys: eqKeys,
      customEquipment: state.custom,
      injuries: state.profile ? state.profile.injuries : [],
      experience: state.profile ? state.profile.experience : 'beginner',
      usedIds: usedIds,
      goal: sess.goal
    };
    var alts = Engine.alternativesFor(unit.id, opts);
    var list = $('#altList', v);
    if (!alts.length) {
      list.innerHTML = '<p style="font-size:12.5px;color:var(--muted)">当前器械与伤病限制下，没有同肌群替代动作。可尝试：放宽伤病限制 / 增加器械勾选。</p>';
      return;
    }
    list.innerHTML = alts.map(function (a) {
      return '<button class="alt-item" data-alt="' + esc(a.id) + '">' +
        '<span>' + esc(a.name) + '</span>' +
        '<span class="eq">' + esc(a.equipmentName) + (a.sameEquipment ? ' · 同器械' : '') + '</span>' +
        '</button>';
    }).join('');
    $$('.alt-item', list).forEach(function (b) {
      b.addEventListener('click', function () {
        var ex = null;
        DB.EXERCISES.forEach(function (e) { if (e.id === b.getAttribute('data-alt')) { ex = e; } });
        if (!ex) { return; }
        var oldName = unit.name;
        var oldSets = unit.sets || [];
        var sets = [];
        for (var i = 0; i < unit.setsTarget; i++) {
          var prev = oldSets[i];
          if (prev && prev.done) {
            /* 已完成的组原样保留 */
            sets.push({ weight: prev.weight, reps: prev.reps, done: true });
          } else {
            sets.push({ weight: '', reps: '', done: false });
          }
        }
        unit.id = ex.id;
        unit.name = ex.name;
        unit.equipment = ex.equipment;
        unit.equipmentName = Engine.equipName(ex.equipment);
        unit.muscle = ex.muscle;
        unit.muscleName = DB.MUSCLES[ex.muscle];
        unit.sets = sets;
        unit.rir = DB.GOALS[sess.goal].rir;
        saveState();
        toast('🔄 已换成「' + ex.name + '」，已完成的组数保留记录');
        renderSession(v);
      });
    });
  }

  /* --- 休息倒计时 --- */
  var restTimer = null;

  function startRest(seconds, onDone) {
    stopRest();
    if (!seconds || seconds <= 0) { onDone(); return; }
    var total = seconds;
    var remaining = seconds;
    var paused = false;
    var finished = false;

    /* 无论自然结束还是跳过，onDone 只回调一次 */
    function finish() {
      if (finished) { return; }
      finished = true;
      stopRest();
      onDone();
    }

    function paint() {
      var ring = $('#restRing');
      if (!ring) { return; }
      var deg = Math.round((1 - remaining / total) * 360);
      ring.style.background = 'conic-gradient(var(--accent) ' + deg + 'deg, var(--card2) 0deg)';
      $('#restTime').innerHTML = fmtRest(remaining) + ' <small>休息</small>';
    }
    function render() {
      var overlay = document.createElement('div');
      overlay.className = 'rest-overlay';
      overlay.innerHTML =
        '<div class="rest-card">' +
        '<div class="rest-ring" id="restRing"><div class="rest-time" id="restTime"></div></div>' +
        '<div class="rest-lbl">组间休息 · 深呼吸，准备下一组</div>' +
        '<div class="rest-next" id="restNext"></div>' +
        '<div class="rest-btns">' +
        '<button class="btn btn-ghost" id="restPause">⏸ 暂停</button>' +
        '<button class="btn btn-primary" id="restSkip">跳过 →</button>' +
        '</div></div>';
      document.body.appendChild(overlay);
      $('#restPause').addEventListener('click', function () {
        paused = !paused;
        this.textContent = paused ? '▶ 继续' : '⏸ 暂停';
      });
      $('#restSkip').addEventListener('click', function () {
        finish();
      });
      /* overlay 已插入 DOM，此时再查询 ring */
      paint();
    }

    render();
    restTimer = setInterval(function () {
      if (paused) { return; }
      remaining--;
      if (remaining <= 0) {
        clearInterval(restTimer);
        restTimer = null;
        beep(3);
        finish();
        return;
      }
      paint();
    }, 1000);
  }

  function stopRest() {
    if (restTimer) { clearInterval(restTimer); restTimer = null; }
    var overlay = $('.rest-overlay');
    if (overlay) { overlay.remove(); }
  }

  /* --- 完成训练 --- */
  function finishTraining(v) {
    var sess = state.session;
    var prog = sessionDoneSets(sess);
    var volume = 0;
    var units = [];
    var cardioMin = 0;

    sess.units.forEach(function (u) {
      if (u.kind === 'exercise') {
        var sets = u.sets.filter(function (s) { return s.done; }).map(function (s) {
          var w = parseFloat(s.weight) || 0;
          var r = parseInt(s.reps, 10) || 0;
          volume += w * r;
          return { w: s.weight, r: s.reps };
        });
        units.push({ name: u.name, equipment: u.equipment, muscle: u.muscle, sets: sets });
      } else if (u.kind === 'cardio') {
        cardioMin += (u.minutes || 0);
      }
    });

    state.logs.push({
      date: dateKey(), dayLabel: sess.dayLabel, label: sess.label, goal: sess.goal,
      units: units, cardioMin: cardioMin, totalSets: prog.done, volume: volume, ts: Date.now()
    });
    state.session = null;
    saveState();

    var listHtml = units.map(function (u) {
      var txt = u.sets.length
        ? u.sets.map(function (s) { return (s.w || '—') + 'kg×' + (s.r || '—'); }).join(' / ')
        : '未记录';
      return '<li><span>' + esc(u.name) + '</span><span class="r">' + txt + '</span></li>';
    }).join('');

    v.innerHTML =
      '<div class="card finish-hero">' +
      '<div class="big">🎉</div>' +
      '<h2>训练完成！</h2>' +
      '<p style="color:var(--muted);font-size:14px">' + sess.dayLabel + ' · ' + sess.label + ' · 恭喜你坚持完成了今天的计划</p>' +
      '<div class="finish-stats">' +
      '<div class="stat"><div class="num">' + prog.done + '</div><div class="lbl">完成组数</div></div>' +
      '<div class="stat"><div class="num">' + (volume ? volume.toLocaleString() + 'kg' : '—') + '</div><div class="lbl">总容量</div></div>' +
      '<div class="stat"><div class="num">' + (cardioMin || '—') + '</div><div class="lbl">有氧分钟</div></div>' +
      '</div>' +
      (units.length ? '<ul class="summary-list">' + listHtml + '</ul>' : '') +
      '<div style="display:flex;gap:10px;margin-top:18px;justify-content:center;flex-wrap:wrap">' +
      '<button class="btn btn-primary" data-go="dashboard">返回首页</button>' +
      '<button class="btn btn-ghost" data-go="plan">查看计划</button>' +
      '</div></div>';
    bindGo(v);
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    renderNavs();
    window.addEventListener('hashchange', route);
    route();

    /* 首次访问：医疗免责声明 */
    if (!state.disclaimerSeen) {
      var modal = $('#disclaimerModal');
      modal.classList.remove('hidden');
      $('#disclaimerOk').addEventListener('click', function () {
        state.disclaimerSeen = true;
        saveState();
        modal.classList.add('hidden');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
