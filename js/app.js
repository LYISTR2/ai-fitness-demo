/* ============================================================
   炼炼 · AI 健身房训练助手 — app.js
   状态管理 / 路由 / 五个视图 / 训练执行模式 / 休息倒计时
   数据全部保存在 localStorage
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
      plan: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/>',
      train: '<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>',
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
    { id: 'dashboard', label: '训练概览', icon: '' },
    { id: 'profile', label: '档案', icon: '' },
    { id: 'equipment', label: '器械', icon: '' },
    { id: 'plan', label: '计划', icon: '' },
    { id: 'train', label: '训练', icon: '' }
  ];
  var VIEW_TITLES = { dashboard: '训练概览', profile: '训练档案', equipment: '器械库', plan: '一周计划', train: '训练执行' };

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

  function route() {
    var h = (location.hash || '#/dashboard').replace('#/', '');
    var view = NAVS.some(function (n) { return n.id === h; }) ? h : 'dashboard';
    $$('.view').forEach(function (v) { v.classList.remove('active'); });
    $$('[data-nav]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === view);
      if (a.getAttribute('data-nav') === view) { a.setAttribute('aria-current', 'page'); } else { a.removeAttribute('aria-current'); }
    });
    var el = $('#view-' + view);
    el.classList.add('active');
    document.title = VIEW_TITLES[view] + ' · 炼炼 AI 健身房训练助手';
    $('#pageLocation').textContent = VIEW_TITLES[view];
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
  var dashboardRange = 30, dashboardDemo = false, dashboardMetric = 'calories', historySearch = '', historyPage = 0;
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
    v.innerHTML='<div class="dash-heading"><div><h1>训练概览</h1><p>'+fmtDate()+' · 每一次训练，都有迹可循。</p></div><div class="dash-actions"><button class="btn btn-ghost" id="demoToggle" aria-pressed="'+dashboardDemo+'">'+(dashboardDemo?'返回我的数据':'查看示例')+'</button><button class="btn btn-primary" data-go="'+(state.profile?'train':'profile')+'">'+icon('train')+(state.profile?'开始训练':'创建训练档案')+'</button></div></div>'+
      (dashboardDemo?'<div class="demo-banner" role="status">'+icon('shield')+'<span><b>示例预览</b>　所有图表和记录均为模拟数据，不会保存到你的档案。</span></div>':'')+
      '<div class="metrics-grid">'+
      metricCard('估算热量消耗',selected.length&&!known.length?'—':metricText(calories),'kcal','train',missing?'有 '+missing+' 次训练缺少估算数据':'近 '+dashboardRange+' 天的训练消耗')+
      metricCard('估算训练时长',selected.length&&!timed.length?'—':metricText(minutes),'分钟','clock','近 '+dashboardRange+' 天 · 已完成环节')+
      metricCard('完成训练',metricText(selected.length),'次','check',days+' 个活跃训练日')+
      metricCard('累计训练容量',metricText(volume),'kg','equipment','记录重量 × 次数之和')+'</div>'+
      '<section class="card chart-card" aria-labelledby="chartTitle"><div class="chart-header"><div><h2 id="chartTitle">训练消耗趋势</h2><p class="sub">按天汇总，查看最近 '+dashboardRange+' 天的训练表现</p></div><div class="range-switch" role="group" aria-label="统计时间范围">'+[90,30,7].map(function(n){return '<button data-range="'+n+'" aria-pressed="'+(dashboardRange===n)+'" class="'+(dashboardRange===n?'on':'')+'">近 '+n+' 天</button>';}).join('')+'</div></div><div class="chart-toolbar"><label class="metric-select">展示指标 <select id="chartMetric"><option value="calories"'+(dashboardMetric==='calories'?' selected':'')+'>估算消耗 · kcal</option><option value="durationMinutes"'+(dashboardMetric==='durationMinutes'?' selected':'')+'>估算时长 · 分钟</option><option value="volume"'+(dashboardMetric==='volume'?' selected':'')+'>训练容量 · kg</option></select></label><span class="chart-legend"><i></i>'+(dashboardDemo?'示例训练数据':'已完成的训练')+'</span></div>'+renderTrend(points,selected.length,missing)+
      '<details class="estimate-note"><summary>这些数据如何计算？</summary><p>热量为粗略总能耗估算（包含静息消耗），不是手表或传感器测量。使用训练开始时的体重 × MET × 估算分钟 ÷ 60；力量训练采用 3.5 MET，有氧统一假设 5 MET，热身与拉伸假设 2.3 MET。力量时长按每次动作 3 秒及已完成组之间的计划休息估算，其他环节采用计划时长。仅统计标记完成的内容，实际强度和休息会造成差异。旧记录不补算，缺失日以虚线标记并中断曲线，累计值仅合计已知部分。没有训练记录的日期显示为 0。</p><a href="https://pacompendium.com/conditioning-exercise/" target="_blank" rel="noopener">MET 参考：2024 身体活动汇编 ↗</a></details></section>'+
      '<div class="fitness-lower"><section class="card week-card"><div class="card-title-row"><h2>本周训练</h2><span class="chip muted">'+(dashboardDemo?'示例':(state.profile?'每周 '+state.profile.frequency+' 练':'尚未设置目标'))+'</span></div>'+renderWeek(logs)+'<div class="next-workout"><div><span>'+(tn&&tn.isToday?'今日计划':'下一步')+'</span><h3>'+(dashboardDemo?'安排好节奏，持续训练':tn?esc(tn.day.label):state.profile?'生成你的训练计划':'建立你的训练档案')+'</h3><p>'+(dashboardDemo?'可切回我的数据，开始记录真实训练。':tn?esc(tn.day.weekday)+' · '+tn.day.totalSets+' 组 · 约 '+tn.day.estMinutes+' 分钟':'根据目标与器械，安排适合你的训练。')+'</p></div><button class="btn" data-go="'+(state.profile?'plan':'profile')+'">'+icon('arrow')+'<span>查看</span></button></div></section><section class="card habits-card"><h2>训练摘要</h2><p class="sub">近 '+dashboardRange+' 天</p><div class="summary-metric"><span>单次平均估算消耗</span><strong>'+(known.length?metricText(calories/known.length)+' kcal':'—')+'</strong></div><div class="summary-metric"><span>单次平均估算时长</span><strong>'+(timed.length?metricText(minutes/timed.length)+' 分钟':'—')+'</strong></div><div class="summary-metric"><span>热量数据完整度</span><strong>'+known.length+' / '+selected.length+' 次</strong></div></section></div>'+
      '<section class="card history-card" aria-labelledby="historyTitle"><div class="chart-header"><div><h2 id="historyTitle">训练记录 <span class="chip muted">'+selected.length+'</span></h2><p class="sub">与上方时间范围同步</p></div><label class="history-search"><span class="sr-only">搜索训练名称或日期</span><input id="historySearch" type="search" placeholder="搜索训练名称或日期…" value="'+esc(historySearch)+'"></label></div><div id="historyContent"></div></section>';
    bindGo(v);
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
      state.profile = {
        height: height, weight: weight, age: age,
        gender: f.elements.namedItem('gender').value, goal: f.elements.namedItem('goal').value, experience: f.elements.namedItem('experience').value,
        frequency: parseInt(f.elements.namedItem('frequency').value, 10), duration: parseInt(f.elements.namedItem('duration').value, 10),
        injuries: injs
      };
      saveState();
      toast('档案已保存');
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
          '<div class="ic">' + icon(e.group === 'cardio' ? 'train' : 'equipment') + '</div><div class="nm">' + e.name + '</div></div>';
      }).join('');
    }

    var customList = state.custom.map(function (c, i) {
      return '<li><span>' + esc(c.name) + '</span><span class="chip muted tag">按 ' + esc(equipLabel(c.equivalent)) + ' 计</span>' +
        '<button class="del" data-delcustom="' + i + '" title="删除">✕</button></li>';
    }).join('');

    v.innerHTML =
      '<div class="card"><h2>器械库</h2><p class="sub">勾选你健身房实际可用的器械 —— 计划只会从这些器械中选动作。变更后请重新生成计划。</p>' +
      '<div class="equip-group-title">自重 · 始终可用</div>' +
      '<div class="equip-grid"><div class="equip-item on locked"><div class="ic">' + icon('train') + '</div><div class="nm">' + DB.BODYWEIGHT.name + '</div></div></div>' +
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

  function renderPlan() {
    var v = $('#view-plan');
    if (!state.profile) {
      v.innerHTML = '<div class="card"><div class="empty"><div class="empty-icon"></div>' +
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
        equipWarn = '<div class="warn-box">当前未勾选任何器械，将按“仅自重”训练兜底。建议先在「器械」页勾选实际可用器械（如哑铃、固定器械、绳索、杠铃等），再生成计划。</div>';
      } else if (state.equipment.length === 0) {
        equipWarn = '<div class="warn-box">当前仅勾选了自定义器械，将按“仅自重 + 自定义器械”生成计划。建议同时勾选实际可用的标准器械。</div>';
      }
      v.innerHTML =
        '<div class="card"><h2>一周训练计划</h2><p class="sub">规则引擎会根据你的档案、目标、频率、时长与可用器械，确定性地生成 7 天一周的排期 —— 同样的配置永远得到同样的计划。</p>' +
        equipWarn +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        '<button class="btn btn-primary" id="genPlan">生成一周计划</button>' +
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
          '<div class="body"><div class="name">' + esc(s.name) + '</div>' +
          '<div class="meta"><span class="chip warn">有氧燃脂</span><span class="chip muted">' + esc(s.equipmentName) + '</span>' +
          '<span class="chip info">' + s.minutes + ' 分钟</span></div>' +
          '<div class="rir">' + esc(s.note) + '</div></div></div>';
      }
      return '<div class="step-card ' + s.kind + '">' +
        '<div class="idx">' + (s.kind === 'warmup' ? '热' : '伸') + '</div>' +
        '<div class="body"><div class="name">' + (s.kind === 'warmup' ? '' : '') + esc(s.name) + '</div>' +
        '<div class="meta"><span class="chip info">' + s.minutes + ' 分钟</span></div>' +
        '<div class="rir">' + esc(s.note) + '</div></div></div>';
    }).join('');

    var warns = plan.warnings.map(function (w) { return '<div class="warn-box">' + esc(w) + '</div>'; }).join('');

    v.innerHTML =
      '<div class="card"><div class="card-title-row">' +
      '<h2>一周训练计划</h2>' +
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
    toast('一周计划已生成');
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
      '<div class="card"><h2>训练执行</h2><p class="sub">选择训练日，进入逐组执行模式：记录重量/次数，组间自动休息倒计时。</p>' +
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
      var icon = unit.kind === 'warmup' ? '' : (unit.kind === 'cardio' ? '' : '');
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
      } else if (u.kind === 'cardio' && u.sets.some(function(s){ return s.done; })) {
        cardioMin += (u.minutes || 0);
      }
    });

    var estimate = window.FitnessMetrics.estimate(sess);
    state.logs.push({
      date: dateKey(), dayLabel: sess.dayLabel, label: sess.label, goal: sess.goal,
      durationMinutes: estimate.durationMinutes, calories: estimate.calories, weightKg: estimate.weightKg, estimateVersion: estimate.estimateVersion, strengthSets: estimate.strengthSets,
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
      '<div class="big"></div>' +
      '<h2>训练完成！</h2>' +
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
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    renderNavs();
    $('#sidebarToggle').addEventListener('click', function(){var collapsed = document.body.classList.toggle('sidebar-collapsed');this.setAttribute('aria-expanded', String(!collapsed));});
    var themeButton = $('#themeToggle');
    function themeLabel(){themeButton.textContent = document.documentElement.dataset.theme === 'light' ? '切换深色' : '切换浅色';}
    themeLabel();
    themeButton.addEventListener('click', function(){var next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';document.documentElement.dataset.theme = next;try{localStorage.setItem('afd_theme',next);}catch(e){}themeLabel();});
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
