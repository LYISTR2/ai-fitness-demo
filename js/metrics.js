/* Completed-work estimates. No sensor readings; historical records stay unknown. */
(function(root){
  'use strict';
  function finite(v){return typeof v==='number' && Number.isFinite(v) && v>=0;}
  function estimate(session){
    var minutes=0,metMinutes=0,strengthSets=0;
    (session.units||[]).forEach(function(u){
      var done=(u.sets||[]).filter(function(s){return s.done;});
      if(!done.length)return;
      var m=0,met=2.3;
      if(u.kind==='exercise'){
        strengthSets+=done.length;
        // 3 seconds per recorded rep; use lower prescribed target only if reps absent.
        done.forEach(function(s){var r=parseFloat(s.reps);if(!Number.isFinite(r)||r<0)r=parseFloat(u.reps)||8;m+=r*3/60;});
        m+=Math.max(0,done.length-1)*(Number(u.rest)||0)/60;
        met=3.5;
      }else{m=Math.max(0,Number(u.minutes)||0);met=u.kind==='cardio'?5:2.3;}
      minutes+=m;metMinutes+=m*met;
    });
    var weight=Number(session.weightKg),canEstimate=weight>=30 && weight<=250;
    return {durationMinutes:Math.round(minutes*10)/10,calories:canEstimate?Math.round(metMinutes*weight/60):null,strengthSets:strengthSets,weightKg:canEstimate?weight:null,estimateVersion:1};
  }
  function dateKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function series(logs,days,now){
    var rows=[],map={};
    for(var i=days-1;i>=0;i--){var d=new Date(now);d.setDate(d.getDate()-i);var key=dateKey(d);var row={date:key,calories:0,durationMinutes:0,volume:0,sessions:0,missing:0,missingDuration:0};rows.push(row);map[key]=row;}
    logs.forEach(function(l){var r=map[l.date];if(!r)return;r.sessions++;if(finite(l.calories))r.calories+=l.calories;else r.missing++;if(finite(l.durationMinutes))r.durationMinutes+=l.durationMinutes;else r.missingDuration++;if(finite(l.volume))r.volume+=l.volume;});
    return rows;
  }
  var api={estimate:estimate,series:series,dateKey:dateKey,finite:finite};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FitnessMetrics=api;
})(typeof window!=='undefined'?window:globalThis);
