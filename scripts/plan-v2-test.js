const assert=require('assert'),Engine=require('../js/plan'),DB=require('../js/exercises');
const p={goal:'muscle',experience:'novice',frequency:3,duration:30,injuries:['none'],trainingDays:[1,3,6],split:'auto'};
const eq=['dumbbell','machine','mat','bike'];
const plan=Engine.generate(p,eq,[]);
assert.deepEqual(plan.days.map(d=>d.index),[1,3,6]);
assert(plan.days.every(d=>d.type==='fullbody'));
p.goal='strength';assert.equal(plan.profile.goal,'muscle','plan is a snapshot');
for(const experience of Object.keys(DB.EXPERIENCE))for(const goal of Object.keys(DB.GOALS))for(const duration of [30,45,60,90])for(const frequency of [1,3,7]){
 const plan=Engine.generate({...p,experience,goal,duration,frequency},eq,[]);
 for(const d of plan.days){
  assert(Engine.estimateMinutes(d.steps)<=duration,`${experience}/${goal}/${duration}: actual estimate must fit`);
  assert.equal(d.estMinutes,Math.ceil(Engine.estimateMinutes(d.steps)));
  for(const s of d.steps.filter(s=>s.kind==='exercise')){
   assert(s.equipment==='bodyweight'||eq.includes(s.equipment));
   assert(Object.keys(DB.DAYTYPE[d.type].focus).includes(s.muscle),'no unrelated filler');
   if(s.id==='plank'||s.id==='side-plank')assert.equal(s.repUnit,'秒');
  }
 }
}
const noMat=Engine.generate({...p,frequency:7,trainingDays:undefined},['machine'],[]);
assert(noMat.days.every(d=>d.steps.every(s=>s.equipment!=='mat')));
const standard=Engine.generate({...p,goal:'muscle',experience:'intermediate',duration:90,load:'standard'},eq,[]);
const light=Engine.generate({...p,goal:'muscle',experience:'intermediate',duration:90,load:'light'},eq,[]);
assert(light.days.reduce((n,d)=>n+d.totalSets,0)<standard.days.reduce((n,d)=>n+d.totalSets,0));
console.log('PASS: custom schedule, novice split, immutable snapshot, 192 goal/experience/time/frequency combinations, focus/equipment filters, real time budget, training load');
