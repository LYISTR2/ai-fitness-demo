/* ============================================================
   健身计划 · 本地规则训练助手 — app.js
   状态管理 / 路由 / 视图（含动作指导） / 训练执行模式 / 休息倒计时
   数据全部保存在 localStorage（非在线大模型）
   ============================================================ */

'use strict';

(function () {
  var DB = window.FITNESS_DB;
  var Engine = window.PlanEngine;


  /* Compact, local outline icons; no external font or runtime dependency. */
  function icon(name) {
    var paths = {
      dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
      profile: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4"/>',
      equipment: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/>',
      barbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/>',
      dumbbell: '<path d="M6.5 8v8M17.5 8v8M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
      machine: '<rect x="4" y="3" width="16" height="18" rx="2"/><rect x="7.5" y="6.5" width="9" height="7" rx="1"/><circle cx="12" cy="17" r="1.3"/>',
      cable: '<path d="M5 4c6 2 8 5 7 8s2 5 7 8"/><circle cx="4.2" cy="3.6" r="1.4"/><circle cx="19.8" cy="20.4" r="1.4"/>',
      smith: '<path d="M4 3v18M20 3v18M4 6h16M8 10h8l-1.5 6h-5Z"/>',
      'squat-rack': '<path d="M5 3v18M19 3v18M3 7h4M17 7h4M5 13h14"/>',
      bench: '<path d="M3 13h18M5 13l1.5-4h11L19 13M6 13v5M18 13v5"/>',
      pullup: '<path d="M4 3v4M20 3v4M4 7h16M9 7v8a3 3 0 0 0 6 0V7"/>',
      kettlebell: '<path d="M9 7a4.5 4.5 0 1 0 .2 0"/><path d="M9.5 7a5 3.4 0 0 1 5 0"/><path d="M8 7h8l1.2 4.5a6.3 6.3 0 1 1-10.4 0Z"/>',
      band: '<path d="M7 4c-2.5 3-2.5 13 0 16M17 4c2.5 3 2.5 13 0 16M7 9c2.5-2 7.5-2 10 0M7 15c2.5 2 7.5 2 10 0"/>',
      mat: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 9.5h16M4 14.5h16"/>',
      treadmill: '<path d="M17 4a2.5 2.5 0 1 1-2.5 2.5"/><path d="M14.5 6.5 6 9.5m0 0a2 2 0 1 0 .01 3.99M6 9.5l10 3.5m0 0a2 2 0 1 0 .01 3.99M16 13l-1 6M3.5 20.5h17"/>',
      bike: '<circle cx="5.5" cy="17" r="3.2"/><circle cx="18.5" cy="17" r="3.2"/><path d="M5.5 17 9 9h6.5M18.5 17 14.5 9M8 9h5"/>',
      elliptical: '<circle cx="6" cy="17.5" r="2.6"/><circle cx="18" cy="17.5" r="2.6"/><path d="M6 15 14 4h6M18 15 10 4H4"/>',
      rower: '<path d="M4 17c2.5-1.5 5.5-1.5 8 0s5.5 1.5 8 0M14 4l5 5"/><path d="m9.5 6.5 6 6"/><circle cx="8" cy="5.5" r="1.5"/><path d="m11 8 4 4-5 3-2.5-2.5Z"/>',
      stair: '<path d="M4 20h4v-4h4v-4h4V8h4V4"/><path d="M4 20V4"/>',
      train: '<circle cx="6.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/><rect x="4" y="4" width="16" height="11" rx="2"/><path d="M4 9h16M9 4v5M15 4v5"/>',
      bodyweight: '<circle cx="12" cy="5" r="2"/><path d="M12 7.5v6M12 13.5l-3.5 7M12 13.5l3.5 7M7 9.5c1.6-1.2 8.4-1.2 10 0"/>',
      plan: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/>',
      bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>',
      arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/>'
    };
    return '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.equipment) + '</svg>';
  }

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


  /* Phase2 motion helpers — never gate saveState */
  function prefersReducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  function flashJustDoneRow(root, setIdx, then) {
    var row = root && root.querySelector ? root.querySelector('.hevy-row[data-set="' + setIdx + '"]') : null;
    if (!row) { then(); return; }
    row.classList.remove('current');
    row.classList.add('done', 'hevy-row--just-done');
    var check = row.querySelector('.hevy-check');
    if (check) {
      check.textContent = '✓';
      check.setAttribute('aria-label', '已完成');
    }
    /* 输入框改成静态展示，避免闪一下再整页重绘突兀 */
    var wIn = row.querySelector('[data-w]');
    var rIn = row.querySelector('[data-r]');
    if (wIn) {
      var wv = Number(wIn.value);
      var wTxt = wv === 0 ? '自重' : wIn.value;
      wIn.outerHTML = '<span style="text-align:center;font-size:13px;font-weight:650">' + esc(String(wTxt)) + '</span>';
    }
    if (rIn) {
      rIn.outerHTML = '<span style="text-align:center;font-size:13px;font-weight:650">' + esc(String(rIn.value)) + '</span>';
    }
    var ms = prefersReducedMotion() ? 0 : 150;
    if (!ms) { then(); return; }
    setTimeout(then, ms);
  }
  function transitionExercise(v, applyRender) {
    if (prefersReducedMotion()) { applyRender(); return; }
    var stage = v.querySelector('.hevy-stage');
    if (!stage) { applyRender(); return; }
    stage.classList.add('hevy-stage--leave');
    setTimeout(function () {
      applyRender();
      var ns = v.querySelector('.hevy-stage');
      if (!ns) { return; }
      ns.classList.add('hevy-stage--enter');
      setTimeout(function () { ns.classList.remove('hevy-stage--enter'); }, 280);
    }, 220);
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
    { id: 'dashboard', label: '首页', icon: '' },
    { id: 'profile', label: '档案', icon: '' },
    { id: 'equipment', label: '器械', icon: '' },
    { id: 'plan', label: '计划', icon: '' },
    { id: 'train', label: '训练', icon: '' }
  ];
  var VIEW_TITLES = { dashboard: '首页', profile: '训练档案', equipment: '器械库', plan: '一周计划', train: '训练执行', guide: '动作指导' };

  function go(view) { location.hash = '#/' + view; }

  function renderNavs() {
    $('#topnav').innerHTML = NAVS.map(function (n) {
      return '<a href="#/' + n.id + '" data-nav="' + n.id + '" aria-label="' + n.label + '" title="' + n.label + '">' + icon(n.id) + '<span>' + n.label + '</span></a>';
    }).join('');
    $('#bottomnav').innerHTML = NAVS.map(function (n) {
      return '<a href="#/' + n.id + '" data-nav="' + n.id + '">' +
        '<span class="ic">' + icon(n.id) + '</span>' + n.label + '</a>';
    }).join('');
  }

  function setShellMode(view) {
    var trainMode = view === 'train';
    var guideMode = view === 'guide';
    document.body.classList.toggle('view-train', trainMode);
    document.body.classList.toggle('view-guide', guideMode);
    document.body.classList.toggle('view-daily', !trainMode);
    if (!trainMode) { document.body.classList.remove('has-train-cta'); }
  }

  function route() {
    var h = (location.hash || '#/dashboard').replace('#/', '');
    var guideId = null;
    var view;
    if (h.indexOf('guide/') === 0) {
      view = 'guide';
      guideId = decodeURIComponent(h.slice('guide/'.length).split(/[?&]/)[0]);
    } else {
      view = NAVS.some(function (n) { return n.id === h; }) ? h : 'dashboard';
    }
    setShellMode(view);
    $$('.view').forEach(function (v) { v.classList.remove('active'); });
    /* 指导页不进底栏；有进行中的训练时保持「训练」高亮 */
    var navHighlight = view;
    if (view === 'guide' && state.session) { navHighlight = 'train'; }
    else if (view === 'guide') { navHighlight = ''; }
    $$('[data-nav]').forEach(function (a) {
      var on = a.getAttribute('data-nav') === navHighlight;
      a.classList.toggle('active', on);
      if (on) { a.setAttribute('aria-current', 'page'); } else { a.removeAttribute('aria-current'); }
    });
    var el = $('#view-' + view);
    if (!el) { view = 'dashboard'; el = $('#view-dashboard'); }
    el.classList.add('active');
    document.title = (VIEW_TITLES[view] || '动作指导') + ' · 健身计划 · 本地规则训练助手';
    $('#pageLocation').textContent = VIEW_TITLES[view] || '动作指导';
    if (view === 'guide') { renderGuide(guideId); }
    else { renderers[view](); }
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
  function hasNonBodyweightEquip() {
    return (state.equipment && state.equipment.length > 0) || (state.custom && state.custom.length > 0);
  }

  function onboardHtml() {
    if (state.profile && state.plan) { return ''; }
    var s1 = !!state.profile;
    var s2 = hasNonBodyweightEquip();
    var s3 = !!state.plan;
    var current = !s1 ? 1 : (!s2 && !s3 ? 2 : 3);
    if (s1 && s2 && !s3) { current = 3; }
    if (s1 && !s2 && !s3) { current = 2; }
    function cls(n, done) {
      if (done) { return 'done'; }
      if (n === current) { return 'current'; }
      return '';
    }
    var ctaGo = current === 1 ? 'profile' : (current === 2 ? 'equipment' : 'plan');
    var ctaLabel = current === 1 ? '① 创建训练档案' : (current === 2 ? '② 勾选可用器械' : '③ 生成训练计划');
    return '<section class="onboard-card" aria-label="新手引导">' +
      '<div class="onboard-kicker">首次使用 · 三步开始</div>' +
      '<h2>三步开启你的训练计划</h2>' +
      '<p>① 填写档案 → ② 勾选器械 → ③ 生成计划。计划由本地规则生成，不是在线大模型。</p>' +
      '<ol class="onboard-steps">' +
      '<li class="' + cls(1, s1) + '"><span class="step-idx">' + (s1 ? '✓' : '1') + '</span><div><b>① 档案</b>目标、水平与可用时间</div></li>' +
      '<li class="' + cls(2, s2) + '"><span class="step-idx">' + (s2 ? '✓' : '2') + '</span><div><b>② 勾选器械</b>有什么勾什么；仅自重也可，生成前会确认</div></li>' +
      '<li class="' + cls(3, s3) + '"><span class="step-idx">' + (s3 ? '✓' : '3') + '</span><div><b>③ 生成计划</b>本地规则排一周训练</div></li>' +
      '</ol>' +
      '<button type="button" class="btn btn-primary onboard-cta" data-go="' + ctaGo + '">' + ctaLabel + '</button>' +
      '</section>';
  }


  var dashboardRange = 30, dashboardDemo = false, dashboardMetric = 'calories', historySearch = '', historyPage = 0, statsSinkOpen = false;
  function demoLogs() {
    var records=[];
    for(var i=89;i>=0;i--){
      var d=new Date();d.setDate(d.getDate()-i);
      if([1,3,5,6].indexOf(d.getDay())<0)continue;
      var minutes=32+(i*7%29),weight=70;
      records.push({date:dateKey(d),label:i%2?'上肢力量':'下肢与核心',goal:'muscle',totalSets:12+i%8,strengthSets:12+i%8,volume:1600+(i*137%2600),durationMinutes:minutes,calories:Math.round(3.5*weight*minutes/60),estimateVersion:1});
    }
    return records;
  }
  function metricText(value){return value.toLocaleString('zh-CN',{maximumFractionDigits:0});}
  function metricCard(label,value,unit,key,detail){
    return '<article class="metric-card"><div class="metric-label">'+label+'<span class="metric-icon">'+icon(key)+'</span></div><div class="metric-value">'+value+'<small>'+unit+'</small></div><div class="metric-detail">'+detail+'</div><p>'+(dashboardDemo?'示例数据 · 仅供预览':'根据当前浏览器中的训练记录')+'</p></article>';
  }
  function weekDotsHtml() {
    var labels = ['一','二','三','四','五','六','日'];
    var start = new Date();
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    var planIdx = {};
    if (state.plan && state.plan.days) {
      state.plan.days.forEach(function (d) { planIdx[d.index] = d; });
    }
    var logs = state.logs || [];
    return '<div class="week-dots" aria-label="本周训练日">' + labels.map(function (l, i) {
      var d = new Date(start);
      d.setDate(d.getDate() + i);
      var key = dateKey(d);
      var isToday = key === dateKey();
      var isTrain = !!planIdx[i];
      var done = logs.some(function (x) { return x.date === key; });
      var cls = 'week-dot' + (isTrain ? ' train-day' : '') + (isToday ? ' today' : '') + (done ? ' done' : '');
      var title = '周' + l + (isTrain ? ' · 训练日' : ' · 休息') + (done ? ' · 已练' : '');
      return '<span class="' + cls + '" title="' + title + '">' + l + '</span>';
    }).join('') + '</div>';
  }

  function prevSetsFor(unit) {
    for (var i = state.logs.length - 1; i >= 0; i--) {
      var units = state.logs[i].units || [];
      for (var j = 0; j < units.length; j++) {
        if (units[j].name === unit.name || units[j].id === unit.id) {
          return units[j].sets || [];
        }
      }
    }
    return [];
  }

  function formatPrevCell(set, repUnit) {
    if (!set) { return '—'; }
    var w = set.w != null ? set.w : set.weight;
    var r = set.r != null ? set.r : set.reps;
    if (w == null && r == null) { return '—'; }
    var wTxt = Number(w) === 0 ? '自重' : ((w === '' || w == null) ? '—' : (w + 'kg'));
    var rTxt = (r == null || r === '') ? '—' : (r + (repUnit || '次'));
    return wTxt + '×' + rTxt;
  }

  function renderDashboard(){
    var v=$('#view-dashboard'), M=window.FitnessMetrics;
    var logs=dashboardDemo?demoLogs():state.logs;
    var points=M.series(logs,dashboardRange,new Date());
    var selected=logs.filter(function(l){return l.date>=points[0].date&&l.date<=points[points.length-1].date;});
    var known=selected.filter(function(l){return M.finite(l.calories);});
    var timed=selected.filter(function(l){return M.finite(l.durationMinutes);});
    var calories=known.reduce(function(t,l){return t+l.calories;},0);
    var minutes=timed.reduce(function(t,l){return t+l.durationMinutes;},0);
    var volume=selected.reduce(function(t,l){return t+(Number(l.volume)||0);},0);
    var days=new Set(selected.map(function(l){return l.date;})).size;
    var tn=todayOrNextDay();
    var missing=selected.length-known.length;
    var dashGo = !state.profile ? 'profile' : (!state.plan ? (hasNonBodyweightEquip() ? 'plan' : 'equipment') : 'train');
    var dashLabel = !state.profile ? '创建训练档案' : (!state.plan ? (hasNonBodyweightEquip() ? '去生成计划' : '去勾选器械') : (state.session ? '继续训练' : '开始训练'));

    var heroTitle = '今日训练';
    var heroName = '';
    var heroMeta = '';
    var heroEmpty = '';
    if (!state.profile) {
      heroName = '先建立训练档案';
      heroEmpty = '<p class="hero-empty">填写目标、水平与可用时间，三步即可生成本地规则计划。</p>';
    } else if (!state.plan) {
      heroName = hasNonBodyweightEquip() ? '可以生成一周计划了' : '先勾选可用器械';
      heroEmpty = '<p class="hero-empty">' + (hasNonBodyweightEquip() ? '器械已勾选，去生成适合你的训练安排。' : '有什么勾什么；仅自重也可，生成前会确认。') + '</p>';
    } else if (tn) {
      heroName = esc(tn.day.label);
      var exCount = (tn.day.steps || []).filter(function (s) { return s.kind === 'exercise'; }).length;
      heroMeta = '<div class="hero-meta">' +
        '<span>' + (tn.isToday ? '今日' : '下一训练日 · ' + esc(tn.day.weekday)) + '</span>' +
        '<span>' + exCount + ' 个动作</span>' +
        '<span>' + tn.day.totalSets + ' 组</span>' +
        (tn.day.estMinutes ? '<span>约 ' + tn.day.estMinutes + ' 分钟</span>' : '') +
        '</div>';
    } else {
      heroName = '本周暂无训练日';
      heroEmpty = '<p class="hero-empty">打开计划页查看或重新生成安排。</p>';
    }

    var continueHtml = '';
    if (state.session) {
      var prog = sessionDoneSets(state.session);
      var pct = prog.total ? Math.round(prog.done / prog.total * 100) : 0;
      continueHtml =
        '<div class="continue-card" role="status">' +
        '<div><div class="cc-label">继续上次</div><div class="cc-title">' + esc(state.session.dayLabel) + ' · ' + esc(state.session.label) + '</div></div>' +
        '<div class="cc-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' +
        '<span class="cc-pct">' + prog.done + '/' + prog.total + ' 组</span>' +
        '<button type="button" class="btn btn-sm btn-primary" data-go="train">继续</button>' +
        '</div>';
    }

    var statsInner =
      '<div class="dash-heading"><div><h2 style="margin:0;font-size:18px">训练统计</h2><p style="margin:6px 0 0;font-size:13px;color:var(--muted-2)">近 ' + dashboardRange + ' 天 · 可切换示例预览</p></div><div class="dash-actions"><button class="btn btn-ghost" id="demoToggle" aria-pressed="' + dashboardDemo + '">' + (dashboardDemo ? '返回我的数据' : '查看示例') + '</button></div></div>' +
      (dashboardDemo ? '<div class="demo-banner" role="status">' + icon('shield') + '<span><b>示例预览</b>　所有图表和记录均为模拟数据，不会保存到你的档案。</span></div>' : '') +
      '<div class="metrics-grid">' +
      metricCard('估算热量消耗', selected.length && !known.length ? '—' : metricText(calories), 'kcal', 'train', missing ? '有 ' + missing + ' 次训练缺少估算数据' : '近 ' + dashboardRange + ' 天的训练消耗') +
      metricCard('估算训练时长', selected.length && !timed.length ? '—' : metricText(minutes), '分钟', 'clock', '近 ' + dashboardRange + ' 天 · 已完成环节') +
      metricCard('完成训练', metricText(selected.length), '次', 'check', days + ' 个活跃训练日') +
      metricCard('累计训练容量', metricText(volume), 'kg', 'equipment', '记录重量 × 次数之和') + '</div>' +
      '<section class="card chart-card" aria-labelledby="chartTitle"><div class="chart-header"><div><h2 id="chartTitle">训练消耗趋势</h2><p class="sub">按天汇总，查看最近 ' + dashboardRange + ' 天的训练表现</p></div><div class="range-switch" role="group" aria-label="统计时间范围">' + [90, 30, 7].map(function (n) { return '<button data-range="' + n + '" aria-pressed="' + (dashboardRange === n) + '" class="' + (dashboardRange === n ? 'on' : '') + '">近 ' + n + ' 天</button>'; }).join('') + '</div></div><div class="chart-toolbar"><label class="metric-select">展示指标 <select id="chartMetric"><option value="calories"' + (dashboardMetric === 'calories' ? ' selected' : '') + '>估算消耗 · kcal</option><option value="durationMinutes"' + (dashboardMetric === 'durationMinutes' ? ' selected' : '') + '>估算时长 · 分钟</option><option value="volume"' + (dashboardMetric === 'volume' ? ' selected' : '') + '>训练容量 · kg</option></select></label><span class="chart-legend"><i></i>' + (dashboardDemo ? '示例训练数据' : '已完成的训练') + '</span></div>' + renderTrend(points, selected.length, missing) +
      '<details class="estimate-note"><summary>这些数据如何计算？</summary><p>热量为粗略总能耗估算（包含静息消耗），不是手表或传感器测量。使用训练开始时的体重 × MET × 估算分钟 ÷ 60；力量训练采用 3.5 MET，有氧统一假设 5 MET，热身与拉伸假设 2.3 MET。力量时长按每次动作 3 秒及已完成组之间的计划休息估算，其他环节采用计划时长。仅统计标记完成的内容，实际强度和休息会造成差异。旧记录不补算，缺失日以虚线标记并中断曲线，累计值仅合计已知部分。没有训练记录的日期显示为 0。</p><a href="https://pacompendium.com/conditioning-exercise/" target="_blank" rel="noopener">MET 参考：2024 身体活动汇编 ↗</a></details></section>' +
      '<div class="fitness-lower"><section class="card week-card"><div class="card-title-row"><h2>本周训练</h2><span class="chip muted">' + (dashboardDemo ? '示例' : (state.profile ? '每周 ' + state.profile.frequency + ' 练' : '尚未设置目标')) + '</span></div>' + renderWeek(logs) + '<div class="next-workout"><div><span>' + (tn && tn.isToday ? '今日计划' : '下一步') + '</span><h3>' + (dashboardDemo ? '安排好节奏，持续训练' : tn ? esc(tn.day.label) : state.profile ? '生成你的训练计划' : '建立你的训练档案') + '</h3><p>' + (dashboardDemo ? '可切回我的数据，开始记录真实训练。' : tn ? esc(tn.day.weekday) + ' · ' + tn.day.totalSets + ' 组 · 约 ' + tn.day.estMinutes + ' 分钟' : '根据目标与器械，安排适合你的训练。') + '</p></div><button class="btn" data-go="' + (state.profile ? 'plan' : 'profile') + '">' + icon('arrow') + '<span>查看</span></button></div></section><section class="card habits-card"><h2>训练摘要</h2><p class="sub">近 ' + dashboardRange + ' 天</p><div class="summary-metric"><span>单次平均估算消耗</span><strong>' + (known.length ? metricText(calories / known.length) + ' kcal' : '—') + '</strong></div><div class="summary-metric"><span>单次平均估算时长</span><strong>' + (timed.length ? metricText(minutes / timed.length) + ' 分钟' : '—') + '</strong></div><div class="summary-metric"><span>热量数据完整度</span><strong>' + known.length + ' / ' + selected.length + ' 次</strong></div></section></div>' +
      '<section class="card history-card" aria-labelledby="historyTitle"><div class="chart-header"><div><h2 id="historyTitle">训练记录 <span class="chip muted">' + selected.length + '</span></h2><p class="sub">与上方时间范围同步</p></div><label class="history-search"><span class="sr-only">搜索训练名称或日期</span><input id="historySearch" type="search" placeholder="搜索训练名称或日期…" value="' + esc(historySearch) + '"></label></div><div id="historyContent"></div></section>';

    v.innerHTML =
      onboardHtml() +
      '<div class="home-header"><div><div class="home-date">' + fmtDate() + '</div><h1>今日训练</h1></div>' + weekDotsHtml() + '</div>' +
      '<section class="today-hero" aria-label="今日训练">' +
      '<div class="hero-kicker">' + heroTitle + '</div>' +
      '<h2>' + heroName + '</h2>' +
      heroMeta + heroEmpty +
      '<button type="button" class="btn btn-primary" data-go="' + dashGo + '">' + icon('train') + dashLabel + '</button>' +
      '</section>' +
      continueHtml +
      '<details class="stats-sink"' + (statsSinkOpen ? ' open' : '') + '><summary>训练统计</summary><div class="stats-sink-body">' + statsInner + '</div></details>';

    bindGo(v);
    var sink = v.querySelector('.stats-sink');
    if (sink) {
      sink.addEventListener('toggle', function () { statsSinkOpen = sink.open; });
    }
    $('#demoToggle').addEventListener('click',function(){dashboardDemo=!dashboardDemo;historyPage=0;historySearch='';renderDashboard();});
    $$('[data-range]',v).forEach(function(b){b.addEventListener('click',function(){dashboardRange=Number(b.dataset.range);historyPage=0;renderDashboard();});});
    $('#chartMetric').addEventListener('change',function(){dashboardMetric=this.value;renderDashboard();});
    var scrub=$('#chartScrub');
    if(scrub){scrub.addEventListener('input',function(){showPoint(points,Number(this.value));});showPoint(points,points.length-1);}
    $('#historySearch').addEventListener('input',function(){historySearch=this.value;historyPage=0;renderHistory(selected);});
    renderHistory(selected);
  }

  function renderTrend(points,count,missing){
    var metric=dashboardMetric,unit=metric==='calories'?'kcal':metric==='volume'?'kg':'分钟';
    var max=Math.max.apply(null,points.map(function(p){return p[metric];}).concat([1]));
    var ceiling=Math.ceil(max/4)*4;
    var coords=points.map(function(p,i){return {x:48+i*904/(points.length-1),y:220-p[metric]/ceiling*184};});
    var missingKey=metric==='calories'?'missing':metric==='durationMinutes'?'missingDuration':null;
    var segments=[],segment=[];
    coords.forEach(function(p,i){if(missingKey&&points[i][missingKey]){if(segment.length)segments.push(segment);segment=[];}else{segment.push(p);}});
    if(segment.length)segments.push(segment);
    var line=segments.map(function(s){return s.map(function(p,i){return(i?'L':'M')+p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' ');}).join(' ');
    var area=segments.map(function(s){return s.map(function(p,i){return(i?'L':'M')+p.x.toFixed(1)+','+p.y.toFixed(1);}).join(' ')+' L'+s[s.length-1].x.toFixed(1)+',220 L'+s[0].x.toFixed(1)+',220 Z';}).join(' ');
    var svg='<svg class="trend-svg" viewBox="0 0 1000 260" role="img" aria-label="近 '+dashboardRange+' 天'+(metric==='calories'?'估算消耗':metric==='volume'?'训练容量':'估算时长')+'趋势；可使用下方日期滑块查看每日数据"><defs><linearGradient id="fitnessFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="currentColor" stop-opacity=".32"/><stop offset="100%" stop-color="currentColor" stop-opacity=".02"/></linearGradient></defs>';
    for(var i=0;i<=4;i++){var y=220-i*46;svg+='<line class="chart-gridline" x1="48" x2="952" y1="'+y+'" y2="'+y+'"/><text x="36" y="'+(y+4)+'" text-anchor="end">'+Math.round(ceiling*i/4)+'</text>';}
    svg+='<path d="'+area+'" fill="url(#fitnessFill)"/><path d="'+line+'" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke"/>';
    // Mask unknown calorie days instead of claiming missing historical values are zero.
    points.forEach(function(p,i){if(missingKey&&p[missingKey]){var x=coords[i].x;svg+='<path d="M'+x+',36 V220" stroke="var(--muted-2)" stroke-dasharray="3 5" stroke-width="1"/>';}});
    [0,Math.floor((points.length-1)/4),Math.floor((points.length-1)/2),Math.floor((points.length-1)*3/4),points.length-1].forEach(function(i){svg+='<text x="'+coords[i].x+'" y="248" text-anchor="middle">'+points[i].date.slice(5).replace('-','/')+'</text>';});
    svg+='</svg>';
    return '<div class="trend-wrap">'+svg+(!count?'<div class="chart-empty"><strong>让第一条训练记录成为起点</strong><p>完成训练后，消耗和时长会展示在这里。点击上方「查看示例」可预览图表。</p></div>':'')+'</div><div class="chart-readout" id="chartReadout" aria-live="polite"></div><label class="chart-scrubber"><span>查看每日数据</span><input id="chartScrub" type="range" min="0" max="'+(points.length-1)+'" value="'+(points.length-1)+'" aria-label="查看每日训练数据"><span>'+unit+'</span></label>';
  }
  function showPoint(points,index){
    var p=points[index],metric=dashboardMetric,unit=metric==='calories'?'kcal':metric==='volume'?'kg':'分钟';
    $('#chartReadout').innerHTML='<span>'+p.date+'</span><strong>'+(((metric==='calories'&&p.missing)||(metric==='durationMinutes'&&p.missingDuration))?'数据不完整 · 已知 '+metricText(p[metric]):metricText(p[metric]))+' '+unit+'</strong><span>'+p.sessions+' 次训练</span>';
    $('#chartScrub').setAttribute('aria-valuetext',p.date+'，'+(metric==='calories'&&p.missing?'数据不完整，已知 ':'')+metricText(p[metric])+' '+unit);
  }
  function renderWeek(logs){
    var start=new Date();start.setDate(start.getDate()-(start.getDay()+6)%7);
    var labels=['一','二','三','四','五','六','日'];
    return '<div class="week-days">'+labels.map(function(l,i){var d=new Date(start);d.setDate(d.getDate()+i);var key=dateKey(d),n=logs.filter(function(x){return x.date===key;}).length;return '<div class="week-day '+(n?'done':'')+' '+(key===dateKey()?'today':'')+'"><span>周'+l+'</span><div aria-label="'+key+'，'+n+' 次训练">'+(n?icon('check'):d.getDate())+'</div><small>'+(n?n+' 次':'—')+'</small></div>';}).join('')+'</div>';
  }
  function renderHistory(logs){
    var M=window.FitnessMetrics;
    var rows=logs.filter(function(l){return (String(l.label||'训练')+' '+l.date).toLowerCase().indexOf(historySearch.toLowerCase())>=0;}).sort(function(a,b){return b.date.localeCompare(a.date)||(b.ts||0)-(a.ts||0);});
    var pages=Math.max(1,Math.ceil(rows.length/5));historyPage=Math.min(historyPage,pages-1);
    $('#historyContent').innerHTML='<div class="table-scroll"><table><thead><tr><th scope="col">训练</th><th scope="col">日期</th><th scope="col">状态</th><th scope="col">估算时长</th><th scope="col">估算消耗</th><th scope="col">训练容量</th></tr></thead><tbody>'+rows.slice(historyPage*5,historyPage*5+5).map(function(l){return '<tr><td><span class="table-name">'+icon('equipment')+esc(l.label||'训练')+'</span></td><td>'+esc(l.date)+'</td><td><span class="record-status">'+icon('check')+'已完成</span></td><td>'+(M.finite(l.durationMinutes)?metricText(l.durationMinutes)+' 分钟':'未记录')+'</td><td>'+(M.finite(l.calories)?metricText(l.calories)+' kcal':'未记录')+'</td><td>'+metricText(Number(l.volume)||0)+' kg</td></tr>';}).join('')+(!rows.length?'<tr><td colspan="6" class="table-empty">'+(historySearch?'没有匹配的训练记录。':'这个时间范围内暂无训练记录。')+'</td></tr>':'')+'</tbody></table></div><div class="table-pagination"><span>共 '+rows.length+' 条记录'+(dashboardDemo?' · 示例数据':'')+'</span><div><span>第 '+(historyPage+1)+' / '+pages+' 页</span><button class="btn btn-sm" id="historyPrev" '+(historyPage===0?'disabled':'')+' aria-label="上一页">←</button><button class="btn btn-sm" id="historyNext" '+(historyPage+1>=pages?'disabled':'')+' aria-label="下一页">→</button></div></div>';
    $('#historyPrev').onclick=function(){historyPage--;renderHistory(logs);};$('#historyNext').onclick=function(){historyPage++;renderHistory(logs);};
  }

  function quick(ic, t, view) {
    var descriptions = {profile:'身体数据与训练目标', equipment:'选择实际可用的器械', plan:'查看本周训练安排', train:'逐组记录，专注当下'};
    return '<a class="quick" href="#/' + view + '"><div class="ic">' + icon(view) + '</div><div class="quick-copy"><div class="t">' + t + '</div><span>' + descriptions[view] + '</span></div>' + icon('arrow') + '</a>';
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

    var goalOpts = Object.keys(DB.GOALS).map(function (k) { return [k, DB.GOALS[k].label]; });
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
      '<div class="card"><h2>训练档案</h2><p class="sub">这些信息决定你的计划方向。填写后可在「计划」页一键生成。</p>' +
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
      '<button type="submit" class="btn btn-primary" style="flex:1;min-width:160px">保存档案</button>' +
      (p.height ? '<button type="button" class="btn btn-danger" id="clearProfile">清空档案</button>' : '') +
      '</div>' +
      '<p class="hint" style="margin-top:10px;font-size:12px;color:var(--muted-2)">伤病限制用于过滤承压关节的动作；如不确定请选择「无」并在训练前咨询医生。</p>' +
      '</form></div>' +
      '<div class="card disclaimer-card"><h2>训练前须知</h2><p class="sub" style="margin:0">开始任何锻炼计划前，请咨询医生或专业教练；运动中如有胸痛、头晕、关节剧痛等不适，请立即停止。本应用不构成医疗建议。</p></div>';

    $$('.field', v).forEach(function (field) {
      var control = $('input, select', field), label = $('label', field);
      if (control && label) { control.id = 'profile-' + control.name; label.htmlFor = control.id; }
    });

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
      var height = parseFloat(f.elements.namedItem('height').value), weight = parseFloat(f.elements.namedItem('weight').value), age = parseFloat(f.elements.namedItem('age').value);
      if (!(height >= 100 && height <= 250)) { toast('身高需在 100-250 cm 之间'); return; }
      if (!(weight >= 30 && weight <= 250)) { toast('体重需在 30-250 kg 之间'); return; }
      if (!(age >= 10 && age <= 90)) { toast('年龄需在 10-90 岁之间'); return; }
      var injs = f._injuries || [];
      if (injs.indexOf('none') < 0 && injs.length === 0) { injs = ['none']; }
      var oldProfile=state.profile||{};
      state.profile = {
        height: height, weight: weight, age: age,
        gender: f.elements.namedItem('gender').value, goal: f.elements.namedItem('goal').value, experience: f.elements.namedItem('experience').value,
        frequency: parseInt(f.elements.namedItem('frequency').value, 10), duration: parseInt(f.elements.namedItem('duration').value, 10),
        injuries: injs, load: oldProfile.load || 'standard', split: oldProfile.split || 'auto',
        trainingDays: oldProfile.frequency === parseInt(f.elements.namedItem('frequency').value,10) ? oldProfile.trainingDays : undefined
      };
      saveState();
      if (!state.plan) {
        toast('档案已保存，接着勾选器械');
        go('equipment');
      } else {
        toast('档案已保存');
        go('dashboard');
      }
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
          '<div class="ic">' + icon(e.icon) + '</div><div class="nm">' + e.name + '</div></div>';
      }).join('');
    }

    var customList = state.custom.map(function (c, i) {
      return '<li><span>' + esc(c.name) + '</span><span class="chip muted tag">按 ' + esc(equipLabel(c.equivalent)) + ' 计</span>' +
        '<button class="del" data-delcustom="' + i + '" title="删除">✕</button></li>';
    }).join('');

    v.innerHTML =
      '<div class="card"><h2>器械库</h2><p class="sub">勾选你健身房实际可用的器械 —— 计划只会从这些器械中选动作。变更后请重新生成计划。</p>' +
      '<div class="equip-group-title">自重 · 始终可用</div>' +
      '<div class="equip-grid"><div class="equip-item on locked"><div class="ic">' + icon('bodyweight') + '</div><div class="nm">' + DB.BODYWEIGHT.name + '</div></div></div>' +
      '<div class="equip-group-title">力量器械</div>' +
      '<div class="equip-grid">' + grid('strength') + '</div>' +
      '<div class="equip-group-title">有氧器械</div>' +
      '<div class="equip-grid">' + grid('cardio') + '</div>' +
      '<div class="equip-group-title">辅助器材</div>' +
      '<div class="equip-grid">' + grid('aux') + '</div>' +
      '</div>' +

      '<div class="card"><h2>自定义器械</h2><p class="sub">健身房有特殊器械？添加后可按「等价类型」参与计划选动作。</p>' +
      '<div class="custom-form">' +
      '<input type="text" id="customName" placeholder="器械名称，如：坐式推胸器" maxlength="20">' +
      '<select id="customEq">' + DB.EQUIPMENT.map(function (e) { return '<option value="' + e.key + '">等价于 ' + e.name + '</option>'; }).join('') + '</select>' +
      '<button class="btn btn-primary btn-sm" id="addCustom">添加</button>' +
      '</div>' +
      (customList ? '<ul class="custom-list">' + customList + '</ul>' : '<p class="hint" style="margin-top:10px">暂无自定义器械</p>') +
      '</div>';

    /* 勾选/取消（立即保存） */
    $$('.equip-item[data-eq]', v).forEach(function (item) {
      item.setAttribute('aria-pressed', String(item.classList.contains('on')));
      function toggle() {
        var k = item.getAttribute('data-eq');
        var i = selKeys.indexOf(k);
        if (i >= 0) { selKeys.splice(i, 1); item.classList.remove('on'); }
        else { selKeys.push(k); item.classList.add('on'); }
        item.setAttribute('aria-pressed', String(item.classList.contains('on')));
        state.equipment = selKeys;
        saveState();
      }
      item.addEventListener('click', toggle);
      item.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });

    /* 自定义器械 */
    $('#customName').setAttribute('aria-label', '自定义器械名称');
    $('#customEq').setAttribute('aria-label', '等价器械类型');
    $('#addCustom').addEventListener('click', function () {
      var name = $('#customName').value.trim();
      if (!name) { toast('请输入器械名称'); return; }
      state.custom.push({ id: 'c' + Date.now(), name: name, equivalent: $('#customEq').value });
      saveState();
      renderEquipment();
      toast('已添加自定义器械');
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

  function confirmBodyweightOnly(onProceed) {
    var existing = document.getElementById('equipConfirmModal');
    if (existing) { existing.remove(); }
    var overlay = document.createElement('div');
    overlay.id = 'equipConfirmModal';
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'equipConfirmTitle');
    overlay.innerHTML =
      '<div class="modal">' +
      '<div class="modal-kicker">器械提示</div>' +
      '<h2 id="equipConfirmTitle">仅自重训练？</h2>' +
      '<div class="modal-body"><p>仅自重也可，但计划会偏单调，去勾选？</p>' +
      '<p class="modal-note">自重始终可用。勾选哑铃、器械等后，动作池会更丰富。</p></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">' +
      '<button type="button" class="btn" id="equipConfirmGo" style="flex:1;min-width:120px">去勾选器械</button>' +
      '<button type="button" class="btn btn-primary" id="equipConfirmOk" style="flex:1;min-width:120px">仍用自重生成</button>' +
      '</div></div>';
    document.body.appendChild(overlay);
    function close() { overlay.remove(); }
    $('#equipConfirmGo').addEventListener('click', function () { close(); go('equipment'); });
    $('#equipConfirmOk').addEventListener('click', function () { close(); onProceed(); });
  }


  function planSettings() {
    var p = state.profile, days = p.trainingDays || Engine.defaultDays(p.frequency);
    function options(list, value) { return list.map(function (x) { return '<option value="' + x[0] + '"' + (String(x[0]) === String(value) ? ' selected' : '') + '>' + x[1] + '</option>'; }).join(''); }
    return '<details class="card plan-settings"' + (!state.plan ? ' open' : '') + '><summary>定制我的计划 <span>目标 · 日程 · 训练量</span></summary><form id="planSettings">' +
      '<div class="plan-fields"><label>训练目标<select name="goal">' + options(Object.keys(DB.GOALS).map(function (k) { return [k, DB.GOALS[k].label]; }), p.goal) + '</select></label>' +
      '<label>运动水平<select name="experience">' + options(Object.keys(DB.EXPERIENCE).map(function (k) { return [k, DB.EXPERIENCE[k].label]; }), p.experience) + '</select></label>' +
      '<label>单次时间<select name="duration">' + options([30,45,60,75,90].map(function (n) { return [n,n + ' 分钟']; }), p.duration) + '</select></label>' +
      '<label>训练分化<select name="split">' + options([['auto','按水平与频率安排'],['fullbody','全身训练']], p.split || 'auto') + '</select></label>' +
      '<label>训练量<select name="load">' + options([['light','轻量 · 减少组数'],['standard','标准 · 稳步训练'],['volume','更多组数 · 有经验者']], p.load || 'standard') + '</select></label></div>' +
      '<p class="setting-label">哪几天方便训练？ <span>勾选几天，就安排每周几练</span></p><div class="schedule-picks">' + DB.WEEKDAYS_CN.map(function (d,i) { return '<label><input type="checkbox" name="days" value="' + i + '"' + (days.indexOf(i) >= 0 ? ' checked' : '') + '><span>' + d + '</span></label>'; }).join('') + '</div>' +
      '<p class="sub">训练量控制组数，不会自动提高重量。器械与伤病限制沿用你的档案；新手使用较少组数。</p>' +
      '<div class="plan-actions"><button class="btn btn-primary" type="submit" id="genPlan">' + (state.plan ? '应用设置并更新计划' : '生成我的计划') + '</button><button class="btn" type="button" data-go="equipment">调整器械</button></div></form></details>';
  }

  function recountDay(day) {
    day.totalSets = day.steps.reduce(function (n,s) { return n + (s.kind === 'exercise' ? s.sets : 0); }, 0);
    day.estMinutes = Math.ceil(Engine.estimateMinutes(day.steps));
  }

  function renderPlan() {
    var v = $('#view-plan');
    if (!state.profile) {
      v.innerHTML = '<div class="card"><h2>让计划适合你的生活</h2><p class="sub">先填写目标、运动水平与可用时间，再安排每周训练。</p><button class="btn btn-primary" data-go="profile">建立训练档案</button></div>';
      bindGo(v); return;
    }
    var plan = state.plan, html = '';
    if (!plan) {
      html += '<div class="card onboard-plan"><p><b>③ 生成计划</b>：可先去「器械」勾选你能用的器材；仅自重也可生成。展开下方设置后点「生成我的计划」。</p></div>';
    }
    html += planSettings();
    if (plan) {
      var p = plan.profile, weekSets = {}, total = 0;
      plan.days.forEach(function (d) { recountDay(d); total += d.totalSets; d.steps.forEach(function (s) { if (s.kind === 'exercise') { weekSets[s.muscleName] = (weekSets[s.muscleName] || 0) + s.sets; } }); });
      if (planDaySel == null) { planDaySel = todayPlanIndex(); }
      var day = plan.days.filter(function (d) { return d.index === planDaySel; })[0];
      html += '<section class="card plan-overview"><div class="plan-kicker">YOUR WEEK / 每周训练安排</div><h1>' + esc(DB.GOALS[plan.goal].label) + '，从每周 ' + plan.days.length + ' 练开始</h1>' +
        '<p class="sub">' + esc(DB.EXPERIENCE[p.experience].label) + ' · 每次预留 ' + p.duration + ' 分钟 · ' + total + ' 个正式训练组</p>' +
        '<div class="plan-reason">先热身，再完成主要力量动作与辅助动作，最后放松。按可用时间减少组数或动作，器械不足时不混入其他肌群凑数。</div>' +
        (plan.version !== 2 ? '<p class="warn-box">这是之前保存的计划。展开上方设置并更新，可使用新版安排。</p>' : '') +
        '<div class="week-plan">' + DB.WEEKDAYS_CN.map(function (name,i) { var d = plan.days.filter(function (x) { return x.index === i; })[0]; return '<button class="week-plan-day' + (i === planDaySel ? ' selected' : '') + (d ? '' : ' recovery') + '" data-day="' + i + '" aria-pressed="' + (i === planDaySel) + '"><span>' + name + '</span><strong>' + (d ? d.label : '休息') + '</strong><small>' + (d ? d.estMinutes + ' 分钟' : '恢复体力') + '</small></button>'; }).join('') + '</div>' +
        '<details class="weekly-volume"><summary>查看肌群训练量</summary><p class="sub">按动作的主要肌群统计，不重复计算辅助发力肌群。</p><div class="volume-chips">' + Object.keys(weekSets).map(function (k) { return '<span>' + esc(k) + ' <b>' + weekSets[k] + ' 组</b></span>'; }).join('') + '</div></details></section>';
      html += (plan.warnings || []).map(function (w) { return '<p class="warn-box">' + esc(w) + '</p>'; }).join('');
      if (!day) {
        html += '<section class="card rest-day"><div class="plan-kicker">RECOVERY / 休息日</div><h2>' + DB.WEEKDAYS_CN[planDaySel] + ' · 今天留给恢复</h2><p>不安排正式训练。根据身体状态休息，或做轻松散步与舒适范围内的活动。</p><p class="sub">不需要补打卡；下一次训练仍按日程继续。</p></section>';
      } else {
        html += '<section class="card"><div class="card-title-row"><h2>' + day.weekday + ' · ' + day.label + '</h2><span class="chip">约 ' + day.estMinutes + ' 分钟</span></div><p class="sub">' + esc(day.focus.join(' / ')) + ' · ' + day.totalSets + ' 组 · 点击动作下方可调整</p>' +
          (day.estMinutes > p.duration ? '<div class="warn-box">调整后的预计时长超出预留时间，可减少组数或动作。</div>' : '') +
          day.steps.map(function (s,i) {
            if (s.kind !== 'exercise') { return '<div class="plan-stage"><span>' + (s.kind === 'warmup' ? '准备' : s.kind === 'cardio' ? '有氧' : '放松') + '</span><div><strong>' + esc(s.name) + '</strong><p>' + s.minutes + ' 分钟 · ' + esc(s.note || '') + '</p></div></div>'; }
            var timed = s.repUnit === '秒' || /秒/.test(s.reps), preset = presetFor(s);
            return '<article class="exercise-plan"><div class="exercise-plan-head"><span class="exercise-number">' + String(i).padStart(2,'0') + '</span><div><h3>' + esc(s.name) + '</h3><p>' + esc(s.equipmentName) + ' · ' + esc(s.muscleName) + ' · ' + (s.type === 'compound' ? '主要动作' : '辅助动作') + '</p></div></div><div class="prescription"><strong>' + s.sets + '<small>组</small></strong><strong>' + esc(s.reps.replace(' 秒','')) + '<small>' + (timed ? '秒 / 组' : '次 / 组') + '</small></strong><strong>' + s.rest + '<small>秒休息</small></strong></div><p class="effort-note">' + esc(s.rir) + '</p>' +
              exerciseHistoryHtml(s) + '<details class="exercise-edit"><summary>调整动作参数 · 预设 ' + preset.weight + ' kg</summary><form data-edit-step="' + i + '"><div class="plan-fields"><label>组数<input name="sets" type="number" min="1" max="8" value="' + s.sets + '" required></label><label>' + (timed ? '每组秒数' : '每组次数') + '<input name="reps" type="number" min="1" max="' + (timed ? 600 : 100) + '" value="' + preset.reps + '" required></label><label>休息（秒）<input name="rest" type="number" min="0" max="600" value="' + s.rest + '" required></label><label>默认负重（kg）<input name="weight" type="number" min="0" max="500" step="0.5" value="' + preset.weight + '" required></label></div><p class="sub">重量是记录默认值，请按实际负重调整。哑铃按双手合计，自重不含体重。</p><button class="btn" type="submit">保存此动作</button></form></details></article>';
          }).join('') + '<button class="btn btn-primary btn-block" data-start="' + day.index + '">' + (state.session ? '继续进行中的训练' : '开始这一天的训练') + '</button></section>';
      }
      html += '<section class="card"><h2>下一次怎么进步？</h2><p class="sub">先稳定动作与次数，再考虑调整负重。训练页自动带入上次记录，也可以用加减按钮微调；不会擅自增加重量。</p><p class="sub">当前进行中的训练保留原安排。计划修改在下一次新训练中生效。</p></section>';
    }
    v.innerHTML = html;
    $('#planSettings').addEventListener('submit', function (e) {
      e.preventDefault(); var f=e.target, days=$$('input[name=days]:checked',f).map(function (x) { return Number(x.value); });
      if (!days.length) { toast('请至少选择一个训练日'); return; }
      if (state.plan && !confirm('更新计划会覆盖当前计划中的自定义动作参数，训练历史和进行中的训练会保留。继续吗？')) { return; }
      function applyAndGenerate() {
        Object.assign(state.profile,{goal:f.goal.value,experience:f.experience.value,duration:Number(f.duration.value),split:f.split.value,load:f.load.value,trainingDays:days,frequency:days.length});
        generatePlan(); renderPlan();
      }
      if (!hasNonBodyweightEquip()) {
        confirmBodyweightOnly(applyAndGenerate);
        return;
      }
      applyAndGenerate();
    });
    $$('[data-day]',v).forEach(function (b) { b.onclick=function () { planDaySel=Number(b.dataset.day);renderPlan(); }; });
    $$('[data-edit-step]',v).forEach(function (f) { f.onsubmit=function(e) {
      e.preventDefault(); var day=state.plan.days.filter(function(d){return d.index===planDaySel;})[0], s=day.steps[Number(f.dataset.editStep)];
      s.sets=Number(f.elements.sets.value); s.reps=f.elements.reps.value+(s.repUnit==='秒'||/秒/.test(s.reps)?' 秒':''); s.rest=Number(f.elements.rest.value); s.defaultWeight=Number(f.elements.weight.value); s.defaultReps=Number(f.elements.reps.value);
      state.presets=state.presets||{};state.presets[s.id]=Object.assign({},state.presets[s.id]||{},{weight:s.defaultWeight});state.presets[s.id][s.repUnit==='秒'||/秒/.test(s.reps)?'seconds':'reps']=s.defaultReps;
      recountDay(day);saveState();renderPlan();toast('动作参数已保存，下次新训练生效');
    }; });
    bindGo(v);bindStart(v);
  }

  function generatePlan() {
    if (!state.profile) { toast('请先填写训练档案'); go('profile'); return null; }
    var plan = Engine.generate(state.profile, state.equipment, state.custom);
    state.plan = plan;
    planDaySel = null;
    saveState();
    toast('一周计划已生成');
    return plan;
  }

  /* ============ 动作指导（Phase3 skeleton） ============ */
  function openGuide(exerciseId) {
    if (!exerciseId) { toast('暂无动作信息'); return; }
    location.hash = '#/guide/' + encodeURIComponent(exerciseId);
  }

  function guideBack() {
    if (state.session) { go('train'); return; }
    if (window.history.length > 1) { window.history.back(); }
    else { go('plan'); }
  }

  function renderGuide(exerciseId) {
    var v = $('#view-guide');
    if (!v) { return; }
    document.body.classList.remove('has-train-cta');

    var ex = null;
    if (DB.getExerciseById) { ex = DB.getExerciseById(exerciseId); }
    else if (DB.EXERCISES) {
      DB.EXERCISES.forEach(function (e) { if (e.id === exerciseId) { ex = e; } });
    }

    /* session unit fallback（热身/有氧等可能不在 EXERCISES） */
    var sessUnit = null;
    if (state.session && state.session.units) {
      state.session.units.forEach(function (u) {
        if (u.id === exerciseId) { sessUnit = u; }
      });
    }

    var name = (ex && ex.name) || (sessUnit && sessUnit.name) || (exerciseId ? String(exerciseId) : '未知动作');
    var muscleName = (ex && DB.MUSCLES[ex.muscle]) || (sessUnit && sessUnit.muscleName) || '';
    var cues = DB.getExerciseCues ? DB.getExerciseCues(ex || sessUnit || {}) : ['动作质量优先于重量', '全程控制节奏', '核心收紧', '有不适立即停止'];
    if (!cues || cues.length < 3) {
      cues = ['动作质量优先于重量', '全程控制节奏，避免猛甩', '核心收紧，关节对准发力方向', '有不适立即停止并调整'];
    }
    cues = cues.slice(0, 5);

    var media = DB.getExerciseMedia ? DB.getExerciseMedia(ex) : null;
    var mediaHtml = '';
    if (media && media.type === 'video') {
      mediaHtml =
        '<video class="guide-demo-media" id="guideMedia" loop muted playsinline controls preload="metadata" src="' + esc(media.src) + '" hidden></video>';
    } else if (media && (media.type === 'gif' || media.type === 'image')) {
      mediaHtml =
        '<img class="guide-demo-media" id="guideMedia" alt="' + esc(name) + ' 演示" src="' + esc(media.src) + '" hidden>';
    }

    var cuesHtml = cues.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('');

    v.innerHTML =
      '<div class="guide-page">' +
      '<div class="guide-topbar">' +
      '<button type="button" class="guide-back" id="guideBackBtn" aria-label="返回">' + icon('arrow') + '</button>' +
      '<div class="guide-title-wrap">' +
      '<p class="guide-kicker">动作指导' + (muscleName ? ' · ' + esc(muscleName) : '') + '</p>' +
      '<h1 class="guide-title">' + esc(name) + '</h1>' +
      '</div></div>' +
      '<div class="guide-demo-card">' +
      '<div class="guide-demo-stage" id="guideDemoStage">' +
      mediaHtml +
      '<div class="guide-demo-placeholder guide-demo-pulse" id="guidePlaceholder">' +
      icon('train') +
      '<p class="guide-demo-hint">演示素材稍后接入</p>' +
      '</div></div>' +
      '<div class="guide-controls">' +
      '<button type="button" class="guide-ctrl primary" id="guidePlay" aria-label="播放">播放</button>' +
      '<button type="button" class="guide-ctrl" id="guidePause" aria-label="暂停">暂停</button>' +
      '<button type="button" class="guide-ctrl" id="guideReplay" aria-label="重播">重播</button>' +
      '</div></div>' +
      '<div class="guide-cues"><h3>动作要点</h3><ol>' + cuesHtml + '</ol></div>' +
      '</div>' +
      '<div class="guide-return-bar">' +
      '<button type="button" class="btn-return-train" id="guideReturnTrain">回到训练</button>' +
      '</div>';

    /* back icon should point left — reuse arrow flipped via CSS class if needed */
    var backBtn = $('#guideBackBtn', v);
    if (backBtn) {
      backBtn.style.transform = 'scaleX(-1)';
      backBtn.addEventListener('click', guideBack);
    }
    $('#guideReturnTrain', v).addEventListener('click', function () { go('train'); });

    var stage = $('#guideDemoStage', v);
    var placeholder = $('#guidePlaceholder', v);
    var mediaEl = $('#guideMedia', v);
    var playing = false;

    function showPlaceholder() {
      if (mediaEl) { mediaEl.hidden = true; }
      if (placeholder) { placeholder.hidden = false; }
    }
    function showMedia() {
      if (placeholder) { placeholder.hidden = true; }
      if (mediaEl) { mediaEl.hidden = false; }
    }

    if (mediaEl) {
      mediaEl.addEventListener('error', function () { showPlaceholder(); mediaEl = null; });
      mediaEl.addEventListener('loadeddata', function () { showMedia(); });
      /* try reveal; if 404, error handler falls back */
      if (mediaEl.tagName === 'VIDEO') {
        try { mediaEl.load(); } catch (e) { showPlaceholder(); }
      } else {
        /* image: if already broken complete+naturalWidth 0 */
        if (mediaEl.complete && mediaEl.naturalWidth === 0) { showPlaceholder(); }
        else { showMedia(); }
      }
    }

    function setPlaying(on) {
      playing = !!on;
      if (stage) { stage.classList.toggle('is-playing', playing); }
      if (mediaEl && mediaEl.tagName === 'VIDEO') {
        try {
          if (playing) { mediaEl.play().catch(function () {}); }
          else { mediaEl.pause(); }
        } catch (e) { /* ignore */ }
      }
    }

    $('#guidePlay', v).addEventListener('click', function () { setPlaying(true); });
    $('#guidePause', v).addEventListener('click', function () { setPlaying(false); });
    $('#guideReplay', v).addEventListener('click', function () {
      if (mediaEl && mediaEl.tagName === 'VIDEO') {
        try { mediaEl.currentTime = 0; } catch (e) {}
        setPlaying(true);
      } else {
        setPlaying(false);
        if (stage) {
          stage.classList.remove('is-playing');
          void stage.offsetWidth;
          stage.classList.add('is-playing');
          playing = true;
        }
      }
    });
  }

  /* ============ 训练执行 ============ */
  function renderTrain() {
    var v = $('#view-train');
    if (!state.session) { document.body.classList.remove('has-train-cta'); }

    if (state.session) {
      renderSession(v);
      return;
    }
    if (!state.plan) {
      v.innerHTML = '<div class="card"><div class="empty"><div class="empty-icon"></div>' +
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
      '<div class="card train-ready"><h2>准备好开始训练</h2><p class="sub">重量与次数已预设，做完点一次即可记录；组间自动进入休息。历史重量会沿用，自重默认 0 kg，其他负重首次默认 5 kg（仅为记录初值）。请按实际负重调整，哑铃按双手合计。</p>' +
      '<div class="day-tabs">' + chips + '</div>' +
      '<button class="btn btn-primary btn-block" id="startDay">▶ 开始训练</button>' +
      '</div>' +
      '<div class="card disclaimer-card"><h2>训练安全提醒</h2><p class="sub" style="margin:0">量力而行，动作规范优先；不适立即停止并咨询医生。</p></div>';

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
    if (state.session) { toast('继续上次未完成的训练'); return; }
    var plan = state.plan;
    if (!plan) { return; }
    var day = null;
    plan.days.forEach(function (d) { if (d.index === dayIndex) { day = d; } });
    if (!day) { return; }

    var units = day.steps.map(function (s) {
      if (s.kind === 'exercise') {
        var sets = [];
        var preset = presetFor(s);
        for (var i = 0; i < s.sets; i++) { sets.push({ weight: preset.weight, reps: preset.reps, done: false }); }
        return {
          kind: 'exercise', id: s.id, name: s.name, equipment: s.equipment, muscle: s.muscle,
          muscleName: s.muscleName, equipmentName: s.equipmentName,
          setsTarget: s.sets, reps: s.reps, repUnit: s.repUnit || (/秒/.test(s.reps) ? '秒' : '次'), rest: s.rest, rir: s.rir, sets: sets
        };
      }
      return {
        kind: s.kind, id: s.id, name: s.name, equipment: s.equipment, equipmentName: s.equipmentName,
        minutes: s.minutes, note: s.note, sets: [{ weight: '', reps: '', done: false }], setsTarget: 1, reps: '—', rest: 0, rir: ''
      };
    });

    state.session = {
      planIndex: dayIndex, dayLabel: day.weekday, label: day.label, type: day.type,
      goal: plan.goal, createdAt: Date.now(), weightKg: state.profile ? state.profile.weight : null,
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
          return last.w == null ? '' : last.w;
        }
      }
    }
    return '';
  }

  function presetFor(unit) {
    var remembered = (state.presets || {})[unit.id] || {};
    var previous = lastWeightFor(unit.name);
    var weighted = ['barbell','dumbbell','machine','cable','smith','squat-rack','kettlebell'].indexOf(unit.equipment) >= 0;
    var weight = remembered.weight != null ? remembered.weight : unit.defaultWeight != null ? unit.defaultWeight : previous !== '' ? Number(previous) : weighted ? 5 : 0;
    var timed = unit.repUnit === '秒' || /秒/.test(unit.reps);
    var reps = remembered[timed ? 'seconds' : 'reps'] || unit.defaultReps || parseInt(unit.reps,10) || (timed ? 30 : 10);
    return {weight:Math.max(0,Number(weight)||0),reps:Math.max(1,Number(reps)||1)};
  }

  function exerciseHistoryHtml(unit) {
    var records=[];
    state.logs.slice().reverse().some(function(log){(log.units||[]).forEach(function(u){if((u.id===unit.id||u.name===unit.name)&&(u.sets||[]).length){records.push({date:log.date,sets:u.sets,repUnit:u.repUnit||'次'});}});return records.length>=3;});
    if(!records.length)return '<p class="exercise-history-empty">完成训练后，这里会显示此动作的最近记录。</p>';
    return '<details class="exercise-history"><summary>最近记录 · 上次 '+esc(records[0].date)+'</summary>'+records.slice(0,3).map(function(r){return '<div><b>'+esc(r.date)+'</b><span>'+r.sets.map(function(s){return (Number(s.w)||0)+' kg × '+(Number(s.r)||0)+' '+r.repUnit;}).join(' / ')+'</span></div>';}).join('')+'</details>';
  }

  function renderSession(v) {
    var sess = state.session;
    if (!sess) { document.body.classList.remove('has-train-cta'); renderTrain(); return; }
    document.body.classList.add('view-train');
    document.body.classList.remove('view-daily');
    document.body.classList.add('has-train-cta');
    var prog = sessionDoneSets(sess);
    var unit = sess.units[sess.cur];
    var pct = prog.total ? Math.round(prog.done / prog.total * 100) : 0;

    var unitHtml = '';
    var fixedBar = '';
    if (unit.kind === 'exercise') {
      var preset = presetFor(unit), repUnit = unit.repUnit || (/秒/.test(unit.reps) ? '秒' : '次');
      unit.sets.forEach(function(s){if(!s.done){if(s.weight===''||s.weight==null)s.weight=preset.weight;if(s.reps===''||s.reps==null)s.reps=preset.reps;}});
      saveState();
      var prevSets = prevSetsFor(unit);
      var activeIdx = unit.sets.findIndex(function (x) { return !x.done; });
      var rows = unit.sets.map(function (s, i) {
        var prevTxt = formatPrevCell(prevSets[i], repUnit);
        if (s.done) {
          var doneW = Number(s.weight) === 0 ? '自重' : ((s.weight === '' || s.weight == null) ? '—' : s.weight);
          return '<div class="hevy-row done" data-set="' + i + '">' +
            '<span class="set-no">' + (i + 1) + '</span>' +
            '<span class="prev-cell">' + esc(prevTxt) + '</span>' +
            '<span style="text-align:center;font-size:13px;font-weight:650">' + esc(String(doneW)) + '</span>' +
            '<span style="text-align:center;font-size:13px;font-weight:650">' + esc(String(s.reps == null ? '—' : s.reps)) + '</span>' +
            '<span class="hevy-check" aria-label="已完成">✓</span></div>';
        }
        var isActive = i === activeIdx;
        return '<div class="hevy-row' + (isActive ? ' current' : '') + '" data-set="' + i + '">' +
          '<span class="set-no">' + (i + 1) + '</span>' +
          '<span class="prev-cell">' + esc(prevTxt) + '</span>' +
          (isActive
            ? '<input aria-label="本组重量" type="number" min="0" max="500" step="0.5" data-w="' + i + '" value="' + s.weight + '">' +
              '<input aria-label="本组数量" type="number" min="1" max="' + (repUnit === '秒' ? 600 : 100) + '" step="1" data-r="' + i + '" value="' + s.reps + '">'
            : '<span style="text-align:center;font-size:13px;color:var(--muted-2)">' + esc(String(s.weight)) + '</span>' +
              '<span style="text-align:center;font-size:13px;color:var(--muted-2)">' + esc(String(s.reps)) + '</span>') +
          '<span class="hevy-check" aria-hidden="true">' + (isActive ? '○' : '—') + '</span></div>';
      }).join('');

      var steppers = '';
      if (activeIdx >= 0) {
        steppers =
          '<div class="hevy-steppers">' +
          '<label>负重 kg<div class="stepper"><button type="button" data-adjust="w" data-delta="-0.5" aria-label="减少重量">−</button><span class="stepper-mirror" aria-hidden="true"></span><button type="button" data-adjust="w" data-delta="0.5" aria-label="增加重量">＋</button></div></label>' +
          '<label>' + (repUnit === '秒' ? '持续秒数' : '完成次数') + '<div class="stepper"><button type="button" data-adjust="r" data-delta="-' + (repUnit === '秒' ? 5 : 1) + '" aria-label="减少数量">−</button><span class="stepper-mirror" aria-hidden="true"></span><button type="button" data-adjust="r" data-delta="' + (repUnit === '秒' ? 5 : 1) + '" aria-label="增加数量">＋</button></div></label>' +
          '</div>' +
          '<p class="prev" style="font-size:12px;color:var(--muted-2);margin:0 0 8px">目标 ' + esc(unit.reps) + (repUnit === '秒' ? '' : ' 次') + ' · 数值已预填，按实际微调</p>';
      }

      unitHtml =
        '<div class="hevy-head">' +
        '<div class="hevy-ex-title">' +
        '<div style="flex:1;min-width:0">' +
        '<h2>' + esc(unit.name) + '</h2>' +
        '<div class="hevy-meta">' +
        '<span class="chip">' + esc(unit.muscleName) + '</span>' +
        '<span class="chip muted">' + esc(unit.equipmentName) + '</span>' +
        '<span class="chip info">' + unit.setsTarget + ' 组 × ' + esc(unit.reps) + '</span>' +
        '<span class="chip muted">休息 ' + fmtRest(unit.rest) + '</span>' +
        '</div>' +
        '<div class="rir" style="font-size:12px;color:var(--muted-2);margin-top:8px">' + esc(unit.rir) + '</div>' +
        '<button type="button" class="hevy-guide-link" data-open-guide="' + esc(unit.id) + '" aria-label="查看动作要点与演示">要点 / 演示</button>' +
        '</div>' +
        '<button type="button" class="demo-placeholder demo-entry" data-open-guide="' + esc(unit.id) + '" title="动作演示与要点" aria-label="打开动作指导">' + icon('train') + '</button>' +
        '</div></div>' +
        '<div class="hevy-table" role="table" aria-label="本组记录">' +
        '<div class="hevy-cols" role="row"><span>组</span><span>上次</span><span>kg</span><span>' + (repUnit === '秒' ? '秒' : '次') + '</span><span>✓</span></div>' +
        rows + '</div>' +
        steppers +
        exerciseHistoryHtml(unit) +
        '<div id="altPanel" class="alt-panel hidden"><h4>🔄 同肌群替代动作（优先不同器械）</h4><div id="altList"></div></div>';

      fixedBar =
        '<div class="hevy-fixed-bar">' +
        '<button type="button" class="btn-complete" id="completeSetBtn"' + (activeIdx < 0 ? ' disabled' : '') + '>✓ 完成本组</button>' +
        '</div>';
    } else {
      unitHtml =
        '<div class="card" style="border-color:rgba(200,247,80,.35);text-align:center;padding:30px 18px">' +
        '<div class="demo-placeholder" style="margin:0 auto 14px" aria-hidden="true">' + icon(unit.kind === 'cardio' ? 'train' : 'bolt') + '</div>' +
        '<h2 style="justify-content:center;margin-bottom:6px">' + esc(unit.name) + '</h2>' +
        '<p style="color:var(--muted);font-size:14px;margin-bottom:6px">' + (unit.minutes || 5) + ' 分钟</p>' +
        '<p style="color:var(--muted-2);font-size:12.5px;max-width:420px;margin:0 auto 16px">' + esc(unit.note || '') + '</p>' +
        '</div>';
      fixedBar =
        '<div class="hevy-fixed-bar">' +
        '<button type="button" class="btn-complete" id="doneStep">✓ 完成本环节</button>' +
        '</div>';
    }

    v.innerHTML =
      '<div class="train-hevy">' +
      '<div class="train-progress"><div class="row1">' +
      '<span><b>' + sess.dayLabel + ' · ' + sess.label + '</b>　动作 ' + (sess.cur + 1) + '/' + sess.units.length + ' · ' + prog.done + '/' + prog.total + ' 组</span>' +
      '<span>' + pct + '%</span></div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div></div>' +
      '<div class="hevy-stage">' +
      unitHtml +
      '<div class="hevy-secondary">' +
      (sess.lastRecorded ? '<button class="btn btn-ghost btn-sm" id="undoSet">↶ 撤销上一组</button>' : '') +
      (unit.kind === 'exercise' ? '<button class="btn btn-ghost btn-sm" id="swapBtn">🔄 换替代动作</button>' : '') +
      '<button class="btn btn-ghost btn-sm" id="exitTrain">⏸ 退出（已保存）</button>' +
      '</div></div></div>' + fixedBar;

    /* 事件绑定 */
    $$('[data-open-guide]', v).forEach(function (btn) {
      btn.addEventListener('click', function () {
        openGuide(btn.getAttribute('data-open-guide'));
      });
    });
    if ($('#undoSet', v)) { $('#undoSet', v).onclick = undoLastSet; }
    if (unit.kind === 'exercise') {
      function persistDraft() {
        var si = unit.sets.findIndex(function (s) { return !s.done; }), w = $('[data-w]', v), r = $('[data-r]', v);
        if (!w || !r || !w.checkValidity() || !r.checkValidity() || w.value === '' || r.value === '') return;
        unit.sets[si].weight = Number(w.value); unit.sets[si].reps = Number(r.value); saveState();
      }
      function syncSteppers() {
        var w = $('[data-w]', v), r = $('[data-r]', v), mirrors = $$('.stepper-mirror', v);
        if (mirrors[0] && w) { mirrors[0].textContent = w.value; }
        if (mirrors[1] && r) { mirrors[1].textContent = r.value; }
      }
      $$('[data-w],[data-r]', v).forEach(function (input) { input.addEventListener('input', function () { persistDraft(); syncSteppers(); }); });
      $$('[data-adjust]', v).forEach(function (b) {
        b.onclick = function () {
          var input = $('[data-' + b.dataset.adjust + ']', v);
          if (!input) return;
          input.value = Math.min(Number(input.max), Math.max(Number(input.min), (Number(input.value) || 0) + Number(b.dataset.delta)));
          persistDraft();
          syncSteppers();
        };
      });
      syncSteppers();
      function completeActiveSet() {
        var si = unit.sets.findIndex(function (s) { return !s.done; });
        if (si < 0) { return; }
        var wEl = $('[data-w="' + si + '"]', v);
        var rEl = $('[data-r="' + si + '"]', v);
        if (!wEl || !rEl) { toast('请填写有效的重量和完成数量'); return; }
        var w = parseFloat(wEl.value);
        var r = parseInt(rEl.value, 10);
        if (!Number.isFinite(w) || w < 0 || w > 500 || !Number.isInteger(r) || r < 1 || r > (repUnit === '秒' ? 600 : 100)) { toast('请填写有效的重量和完成数量'); return; }
        if (!rEl.checkValidity() || !wEl.checkValidity()) { toast('请检查数量与重量'); return; }
        sess.lastRecorded = { cur: sess.cur, si: si };
        unit.sets[si].weight = isNaN(w) ? '' : w;
        unit.sets[si].reps = r;
        unit.sets[si].done = true;
        unit.sets.forEach(function (s) { if (!s.done) { s.weight = w; s.reps = r; } });
        state.presets = state.presets || {}; state.presets[unit.id] = Object.assign({}, state.presets[unit.id] || {}, { weight: w }); state.presets[unit.id][repUnit === '秒' ? 'seconds' : 'reps'] = r;
        saveState(); /* 立即落盘，不等动画 */
        flashJustDoneRow(v, si, function () {
          if (si + 1 < unit.sets.length) {
            startRest(unit.rest, function () { renderSession(v); }, {
              name: unit.name,
              setNo: si + 2,
              setTotal: unit.sets.length,
              weight: w,
              reps: r,
              repUnit: repUnit
            });
          } else {
            advanceAfterUnit(v);
          }
        });
      }
      var completeBtn = $('#completeSetBtn');
      if (completeBtn) { completeBtn.addEventListener('click', completeActiveSet); }
      $('#swapBtn').addEventListener('click', function () {
        var panel = $('#altPanel', v);
        panel.classList.toggle('hidden');
        if (!panel.classList.contains('hidden') && !$('#altList', v).children.length) {
          renderAlts(v);
        }
      });
    } else {
      $('#doneStep').addEventListener('click', function () {
        sess.lastRecorded = { cur: sess.cur, si: 0 };
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
      saveState(); /* 立即落盘，动画不挡写入 */
      transitionExercise(v, function () { renderSession(v); });
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
            sets.push(Object.assign({},prev,{exerciseId:prev.exerciseId||unit.id,exerciseName:prev.exerciseName||unit.name,equipment:prev.equipment||unit.equipment,muscle:prev.muscle||unit.muscle,repUnit:prev.repUnit||unit.repUnit||(/秒/.test(unit.reps)?'秒':'次')}));
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
        unit.repUnit = /^(plank|side-plank)$/.test(ex.id) ? '秒' : '次';
        unit.reps = unit.repUnit === '秒' ? '30-45 秒' : DB.GOALS[sess.goal].reps;
        unit.rir = '保留约 2-3 次余力，以动作稳定为先';
        saveState();
        toast('🔄 已换成「' + ex.name + '」，已完成的组数保留记录');
        transitionExercise(v, function () { renderSession(v); });
      });
    });
  }

  /* --- 休息倒计时 --- */
  function undoLastSet() {
    var sess=state.session;if(!sess||!sess.lastRecorded)return;
    stopRest();var last=sess.lastRecorded;sess.cur=last.cur;sess.units[last.cur].sets[last.si].done=false;
    delete sess.lastRecorded;saveState();renderSession($('#view-train'));toast('已撤销，可重新记录');
  }
  var restTimer = null;
  var restRaf = null;
  var restPausedLeftMs = 0;

  function startRest(seconds, onDone, nextInfo) {
    stopRest();
    if (!seconds || seconds <= 0) { onDone(); return; }
    var totalMs = seconds * 1000;
    var deadline = Date.now() + totalMs;
    var paused = false;
    var finished = false;
    var lastShownSec = -1;
    var reduce = prefersReducedMotion();
    nextInfo = nextInfo || null;

    /* 无论自然结束还是跳过，onDone 只回调一次 */
    function finish(fromNatural) {
      if (finished) { return; }
      finished = true;
      if (fromNatural) {
        beep(2);
        toast('休息结束，准备下一组');
      }
      stopRest();
      onDone();
    }

    function leftMsNow() {
      if (paused) { return restPausedLeftMs; }
      return Math.max(0, deadline - Date.now());
    }

    function paint() {
      var ring = $('#restRing');
      if (!ring) { return; }
      var leftMs = leftMsNow();
      /* 环：剩余弧连续减少（进度连续减） */
      var remainDeg = (leftMs / totalMs) * 360;
      if (reduce) {
        remainDeg = Math.round((Math.ceil(leftMs / 1000) / Math.max(1, totalMs / 1000)) * 360);
      }
      ring.style.background = 'conic-gradient(var(--accent) ' + remainDeg + 'deg, var(--card2) 0deg)';
      var leftSec = Math.max(0, Math.ceil(leftMs / 1000));
      if (leftSec !== lastShownSec) {
        lastShownSec = leftSec;
        var timeEl = $('#restTime');
        if (timeEl) {
          /* 整秒更新文案，无翻滚动画 */
          timeEl.innerHTML = fmtRest(leftSec) + ' <small>休息</small>';
        }
      }
    }
    function nextLabel() {
      if (!nextInfo || !nextInfo.name) { return ''; }
      var parts = ['下一组：' + nextInfo.name];
      if (nextInfo.setNo && nextInfo.setTotal) {
        parts.push('第 ' + nextInfo.setNo + '/' + nextInfo.setTotal + ' 组');
      }
      var hint = [];
      if (nextInfo.weight != null && nextInfo.weight !== '') {
        hint.push(Number(nextInfo.weight) === 0 ? '自重' : (nextInfo.weight + ' kg'));
      }
      if (nextInfo.reps != null && nextInfo.reps !== '') {
        hint.push(nextInfo.reps + ' ' + (nextInfo.repUnit || '次'));
      }
      if (hint.length) { parts.push(hint.join(' × ')); }
      return parts.join(' · ');
    }
    function render() {
      var overlay = document.createElement('div');
      overlay.className = 'rest-overlay' + (reduce ? '' : ' rest-overlay--enter');
      overlay.innerHTML =
        '<div class="rest-card">' +
        '<div class="rest-ring" id="restRing"><div class="rest-time" id="restTime"></div></div>' +
        '<div class="rest-lbl">组间休息 · 深呼吸，准备下一组</div>' +
        '<div class="rest-next" id="restNext"></div>' +
        '<p class="rest-keep-hint">请保持本页打开；切走后计时可能不准</p>' +
        '<div class="rest-btns">' +
        '<button class="btn btn-ghost" id="restPause">⏸ 暂停</button>' +
        '<button class="btn btn-primary" id="restSkip">跳过 →</button>' +
        '</div><button class="btn btn-ghost" id="restUndo">↶ 刚才点错了，撤销本组</button></div>';
      document.body.appendChild(overlay);
      var nextEl = $('#restNext');
      if (nextEl) { nextEl.textContent = nextLabel(); }
      $('#restPause').addEventListener('click', function () {
        if (!paused) {
          restPausedLeftMs = leftMsNow();
          paused = true;
        } else {
          deadline = Date.now() + restPausedLeftMs;
          paused = false;
        }
        this.textContent = paused ? '▶ 继续' : '⏸ 暂停';
        paint();
      });
      $('#restSkip').addEventListener('click', function () {
        finish(false);
      });
      $('#restUndo').addEventListener('click', undoLastSet);
      paint();
    }

    render();
    if (reduce) {
      restTimer = setInterval(function () {
        if (paused) { return; }
        paint();
        if (leftMsNow() <= 0) {
          clearInterval(restTimer);
          restTimer = null;
          finish(true);
        }
      }, 250);
    } else {
      function tick() {
        if (finished) { return; }
        paint();
        if (!paused && leftMsNow() <= 0) {
          finish(true);
          return;
        }
        restRaf = requestAnimationFrame(tick);
      }
      restRaf = requestAnimationFrame(tick);
    }
  }

  function stopRest() {
    if (restTimer) { clearInterval(restTimer); restTimer = null; }
    if (restRaf) { cancelAnimationFrame(restRaf); restRaf = null; }
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
    var prevBestVol = 0;
    state.logs.forEach(function (l) {
      var lv = Number(l.volume) || 0;
      if (lv > prevBestVol) { prevBestVol = lv; }
    });

    sess.units.forEach(function (u) {
      if (u.kind === 'exercise') {
        var groups={};
        u.sets.filter(function (s) { return s.done; }).forEach(function (s) {
          var w = parseFloat(s.weight) || 0;
          var r = parseInt(s.reps, 10) || 0;
          var repUnit=s.repUnit||u.repUnit||(/秒/.test(u.reps)?'秒':'次'),id=s.exerciseId||u.id;
          if (repUnit !== '秒') { volume += w * r; }
          if(!groups[id])groups[id]={id:id,name:s.exerciseName||u.name,equipment:s.equipment||u.equipment,muscle:s.muscle||u.muscle,repUnit:repUnit,sets:[]};
          groups[id].sets.push({w:s.weight,r:s.reps});
        });
        Object.keys(groups).forEach(function(id){units.push(groups[id]);});
      } else if (u.kind === 'cardio' && u.sets.some(function(s){ return s.done; })) {
        cardioMin += (u.minutes || 0);
      }
    });

    var isPR = volume > 0 && volume > prevBestVol;
    var estimate = window.FitnessMetrics.estimate(sess);
    state.logs.push({
      date: dateKey(), dayLabel: sess.dayLabel, label: sess.label, goal: sess.goal,
      durationMinutes: estimate.durationMinutes, calories: estimate.calories, weightKg: estimate.weightKg, estimateVersion: estimate.estimateVersion, strengthSets: estimate.strengthSets,
      units: units, cardioMin: cardioMin, totalSets: prog.done, volume: volume, ts: Date.now()
    });
    state.session = null;
    saveState(); /* 立即落盘，动画不挡写入 */
    document.body.classList.remove('has-train-cta');

    var listHtml = units.map(function (u) {
      var txt = u.sets.length
        ? u.sets.map(function (s) { return (s.w ? s.w + 'kg × ' : '') + (s.r || '—') + u.repUnit; }).join(' / ')
        : '未记录';
      return '<li><span>' + esc(u.name) + '</span><span class="r">' + txt + '</span></li>';
    }).join('');

    function showSummary() {
      var prClass = isPR ? ' finish-hero--pr' : '';
      var enterClass = prefersReducedMotion() ? '' : ' finish-hero--enter';
      v.innerHTML =
        '<div class="card finish-hero' + enterClass + prClass + '">' +
        '<div class="big"></div>' +
        '<h2>训练完成！</h2>' +
        (isPR ? '<span class="finish-pr-badge">个人容量新纪录</span>' : '') +
        '<p style="color:var(--muted);font-size:14px">' + sess.dayLabel + ' · ' + sess.label + ' · 恭喜你坚持完成了今天的计划</p>' +
        '<p class="finish-energy">估算消耗 <strong>' + (estimate.calories == null ? '—' : estimate.calories + ' kcal') + '</strong> · 估算时长 ' + Math.round(estimate.durationMinutes) + ' 分钟</p>' +
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
      if (isPR) {
        toast('新纪录！训练容量 ' + volume.toLocaleString() + ' kg');
      }
    }

    if (prefersReducedMotion()) {
      showSummary();
      return;
    }
    /* 环闭合 → 总结 600–900ms；仅破纪录轻庆祝（徽章+toast，无彩带） */
    v.innerHTML =
      '<div class="finish-close" aria-live="polite">' +
      '<div class="finish-close-ring" aria-hidden="true"></div>' +
      '<p>训练完成</p></div>';
    setTimeout(showSummary, 720);
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    renderNavs();
    $('#sidebarToggle').addEventListener('click', function(){var collapsed = document.body.classList.toggle('sidebar-collapsed');this.setAttribute('aria-expanded', String(!collapsed));});
    /* themeToggle 已移除：Phase1 后日常固定浅色壳、训练页 view-train 自动深色，避免假开关 */
    try { document.documentElement.dataset.theme = 'light'; localStorage.setItem('afd_theme', 'light'); } catch (e) {}
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
