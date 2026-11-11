(()=>{
 'use strict';
 const GIT_URL='https://congfing.github.io/uenoseisou2.3/stop-recorder/index.html';
 const LOCAL_URL='http://localhost:9300/stop-recorder/index.html?edition=local';
 const gitVersion=location.hostname==='congfing.github.io'&&location.pathname.startsWith('/uenoseisou2.3/');
 const query=new URLSearchParams(location.search);if(!gitVersion&&query.get('edition')!=='local'&&query.get('embedded')!=='1'){window.top.location.replace(GIT_URL);return;}
 const $=id=>document.getElementById(id),KEY='stop-recorder-v1';
 const defaults={seconds:60,radius:10,accuracy:5,moveMinutes:1,locateSeconds:0,endTime:''};
 let permit=null;
 let fileNameOverride=null;
 let countingFrom=null;
 let data={version:1,settings:{...defaults},sessions:[]},storageOK=true;
 try{const stored=localStorage.getItem(KEY);if(stored)data=validate(JSON.parse(stored));}catch(e){storageOK=false;notify('保存データを読み込めません。元のデータを上書きせず、ファイル読み込みから復旧してください。');}
 let currentId=Object.hasOwn(data,'activeSessionId')?(data.sessions.some(s=>s.id===data.activeSessionId)?data.activeSessionId:null):data.sessions.at(-1)?.id||null,state='idle',watch=null,detector=null,wake=null,selectedId=null,editId=null,lastPosition=null,lastPersist=0,token=0,map=null,markers=null,currentDot=null,storageWarned=false,pendingMapPoint=null;
 if(currentId&&typeof data.activeFileName==='string')fileNameOverride=data.activeFileName;
 const id=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);
 const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const mobile=()=>/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 let viewedDay=data.lastViewedDay||data.sessions.find(s=>s.id===currentId)?.date||today();
 const session=()=>data.sessions.find(s=>s.id===currentId);
 const travelView=()=>data.viewMode==='travel';
 const travelSession=()=>session()?.kind==='travel';
 const purposeName=()=>({commission:'委託用',permit:'許可物件用',travel:'移動記録用'}[data.viewMode]||'委託用');
 const travelInterval=s=>(s?.travelMinutes||data.settings.moveMinutes)*60000;
 const dated=d=>d?`${d}（${'日月火水木金土'[new Date(d+'T12:00:00').getDay()]}）`:'';
 const ordered=()=>[...(session()?.stops||[])].sort((a,b)=>a.order-b.order||a.arrival-b.arrival);
 function makeSequential(s){[...s.stops].sort((a,b)=>a.order-b.order||a.arrival-b.arrival).forEach((p,i)=>p.order=i+1);}
 const time=t=>new Date(t).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
 const duration=ms=>{const n=Math.max(0,Math.floor(ms/1000));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
 const totalClock=seconds=>[Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
 const validInstant=n=>Number.isFinite(n)&&Number.isFinite(new Date(n).getTime());
 function ensureElapsed(s){
  if(!Number.isFinite(s.activeElapsedMs)||s.activeElapsedMs<0){
   const legacy=Number.isFinite(s.elapsedSeconds)&&s.elapsedSeconds>=0;
   s.activeElapsedMs=legacy?s.elapsedSeconds*1000:0;s.elapsedTiming=legacy?'legacy-baseline-plus-active':'active';
  }
 }
 function commitElapsed(stop=false){
  const s=session(),now=Date.now();
  if(s&&countingFrom!==null){ensureElapsed(s);s.activeElapsedMs+=Math.max(0,now-countingFrom);}
  if(countingFrom!==null)countingFrom=stop?null:now;
 }
 function captureTiming(s,now=Date.now()){
  if(!s)return null;ensureElapsed(s);
  const running=s===session()&&state==='running'&&countingFrom!==null?Math.max(0,now-countingFrom):0;
  s.elapsedSeconds=Math.floor((s.activeElapsedMs+running)/1000);s.elapsedText=totalClock(s.elapsedSeconds);
  s.startedAt=validInstant(s.started)?new Date(s.started).toISOString():null;s.endedAt=validInstant(s.ended)?new Date(s.ended).toISOString():null;
  return s.elapsedText;
 }
 function refreshTotalTime(){$('totalElapsed').textContent='経過時間 '+(captureTiming(session())||'00:00:00');}
 function activeTimeMs(s){ensureElapsed(s);return s.activeElapsedMs+(s===session()&&state==='running'&&countingFrom!==null?Math.max(0,Date.now()-countingFrom):0);}
 function addTravelPoint(manual=false){
  const s=session(),p=lastPosition,now=Date.now();if(!s||s.kind!=='travel'||state!=='running')return false;
  const elapsed=activeTimeMs(s),interval=travelInterval(s),due=Number.isFinite(s.nextTravelAtMs)?s.nextTravelAtMs:interval;
  if(!manual&&elapsed<due)return false;
  if(!p||!validInstant(p.time)||now-p.time>15000||now<p.time){if(manual)notify('新しい現在地を取得してから手動登録してください。');return false;}
  if(!Number.isFinite(p.lat)||Math.abs(p.lat)>90||!Number.isFinite(p.lng)||Math.abs(p.lng)>180||!Number.isFinite(p.accuracy)||p.accuracy<0||p.accuracy>data.settings.accuracy){if(manual)notify('GPS精度が設定以内になるまでお待ちください。');return false;}
  if(s.stops.some(q=>q.source==='travel'&&q.arrival===p.time)){if(manual)notify('この測位は登録済みです。次の測位を待ってください。');return false;}
  const record={id:id(),order:Math.max(0,...s.stops.map(q=>q.order))+1,name:'',lat:p.lat,lng:p.lng,accuracy:p.accuracy,arrival:p.time,last:p.time,departure:p.time,source:'travel',manual,recordedAt:now,recordedElapsedMs:elapsed};
  if(!manual){record.scheduledElapsedMs=due;record.skippedIntervals=Math.max(0,Math.floor((elapsed-due)/interval));s.nextTravelAtMs=(Math.floor(elapsed/interval)+1)*interval;}
  s.stops.push(record);persist();render();return true;
 }
 function tickTravel(){
  if(!travelView())return;
  renderTravelProgress();
  if(state==='running'){addTravelPoint();if(Date.now()-lastPersist>3000)persist();}
 }
 async function switchRecordingMode(mode){
  if(!storageOK){notify('保存データを復旧してから用途を切り替えてください。');return false;}
  if(mode===(data.viewMode||'commission'))return true;
  if(state==='running'||state==='paused'){
   if(!await ask('現在の記録を保存して用途を切り替えますか？\n記録中の場合は一時停止します。地点や経過時間は残り、元の用途に戻って再開できます。'))return false;
   if(state==='running')pause();
   if(!persist())return false;
  }
  const previous={mode:data.viewMode,currentId,state,detector,lastPosition,selectedId,pendingMapPoint,fileNameOverride};
  const destination=mode==='travel'?'travel':'stop',current=session()?.kind||(data.viewMode==='travel'?'travel':'stop');
  data.viewMode=mode;
  if(current!==destination){
   closeWatch();countingFrom=null;detector=null;lastPosition=null;selectedId=null;pendingMapPoint=null;
   const next=[...data.sessions].reverse().find(s=>(s.kind||'stop')===destination&&!s.backupOf);
   currentId=next?.id||null;state=next?(next.ended?'finished':'paused'):'idle';fileNameOverride=null;
   if(next){$('person').value=next.person;$('date').value=next.date;}
   if(currentDot){currentDot.remove();currentDot=null;}if(markers)markers.clearLayers();
   if(!next&&map)map.setView([34.768,136.132],12);
   $('candidate').textContent='停車時間 0:00';$('progressBar').style.width='0%';$('gps').textContent='GPS 未取得';
  }
  if(!persist()){data.viewMode=previous.mode;({currentId,state,detector,lastPosition,selectedId,pendingMapPoint,fileNameOverride}=previous);render();return false;}
  setTimeout(()=>{map?.invalidateSize();fit();},0);return true;
 }
 function notify(text){$('message').hidden=!text;$('message').textContent=text;}
 $('message').onclick=()=>notify('');
 function validate(d){
  if(!d||d.version!==1||!Array.isArray(d.sessions)||d.sessions.length>1000)throw Error('ファイル形式が違います');
  const settings=d.settings||{};
  if(!Number.isInteger(settings.seconds)||settings.seconds<5||settings.seconds>1800||!Number.isFinite(settings.radius)||settings.radius<10||settings.radius>200||!Number.isFinite(settings.accuracy)||settings.accuracy<5||settings.accuracy>200)throw Error('設定値が範囲外です');
  if(settings.moveMinutes===undefined)settings.moveMinutes=defaults.moveMinutes;
  if(!Number.isInteger(settings.moveMinutes)||settings.moveMinutes<1||settings.moveMinutes>1440)throw Error('移動記録の間隔は1～1440分にしてください');
  if(settings.locateSeconds===undefined)settings.locateSeconds=defaults.locateSeconds;
  if(!Number.isInteger(settings.locateSeconds)||!(settings.locateSeconds===0||(settings.locateSeconds>=2&&settings.locateSeconds<=30)))settings.locateSeconds=defaults.locateSeconds;
  if(settings.endTime===undefined)settings.endTime=defaults.endTime;
  if(typeof settings.endTime!=='string'||(settings.endTime!==''&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.endTime)))settings.endTime=defaults.endTime;
  const ids=new Set();
  for(const s of d.sessions){
   if(typeof s.id!=='string'||ids.has(s.id)||!/^\d{4}-\d{2}-\d{2}$/.test(s.date)||typeof s.person!=='string'||!Array.isArray(s.stops)||s.stops.length>50000)throw Error('記録の形式が違います');ids.add(s.id);
   if(s.kind!==undefined&&!['stop','travel'].includes(s.kind))throw Error('記録の種類が不正です');
   if(s.travelMinutes!==undefined&&(!Number.isInteger(s.travelMinutes)||s.travelMinutes<1||s.travelMinutes>1440))throw Error('記録間隔が不正です');
   if(s.nextTravelAtMs!==undefined&&(!Number.isFinite(s.nextTravelAtMs)||s.nextTravelAtMs<1))throw Error('次の記録時刻が不正です');
   const stops=new Set(),orders=new Set();
   for(const p of s.stops){if(typeof p.id!=='string'||stops.has(p.id)||!Number.isInteger(p.order)||p.order<1||p.order>99999||orders.has(p.order)||!Number.isFinite(p.lat)||Math.abs(p.lat)>90||!Number.isFinite(p.lng)||Math.abs(p.lng)>180||!Number.isFinite(p.arrival)||!Number.isFinite(p.last)||p.last<p.arrival||typeof p.name!=='string'||!Number.isFinite(p.accuracy)||p.accuracy<0)throw Error('地点の形式が違います');if(p.departure!==null&&(!Number.isFinite(p.departure)||p.departure<p.arrival))throw Error('終了日時が不正です');stops.add(p.id);orders.add(p.order);}
  }return d;
 }
 function persist(){
  if(!storageOK)return false;
  commitElapsed();
  data.activeSessionId=currentId;data.activeFileName=fileNameOverride||session()?.sourceFile||null;data.lastViewedDay=today();
  refreshTotalTime();
  try{localStorage.setItem(KEY,JSON.stringify(data));lastPersist=Date.now();return true;}
  catch(e){if(state==='running')pause(false);if(!storageWarned){storageWarned=true;notify('端末への保存に失敗しました。ファイル保存で記録を退避してください。');}return false;}
 }
 let pendingConfirm=false;
 function ask(text){if(pendingConfirm)return Promise.resolve(false);pendingConfirm=true;return new Promise(resolve=>{$('confirmText').textContent=text;const d=$('confirmDialog');const finish=v=>{pendingConfirm=false;d.close();resolve(v);};$('confirmCancel').onclick=()=>finish(false);$('confirmOK').onclick=()=>finish(true);d.oncancel=e=>{e.preventDefault();finish(false);};d.showModal();});}
 $('environmentLabel').textContent=gitVersion?'Git版':'Local版';
 $('switchEnvironment').textContent=gitVersion?'Local版を開く':'Git版を開く';
 $('switchEnvironment').onclick=async()=>{
  const destination=gitVersion?'Local版':'Git版';
  if(!await ask(`${destination}へ切り替えますか？\nGit版とLocal版の保存データは別管理です。記録を移す場合は、先にTXT保存して切り替え先で読み込んでください。${gitVersion?'\nLocal版には、このPCの9300番サーバーの起動が必要です。':''}`))return;
  if(state==='running')pause();
  if(!persist()){notify('保存できないため切り替えません。TXT保存で記録を退避してください。');return;}
  const target=gitVersion?LOCAL_URL:GIT_URL;
  window.top.location.assign(target);
 };
 function updateControls(){
  $('start').textContent=state==='paused'?'再開':'開始';$('start').disabled=state==='running'||!storageOK;
  $('pause').disabled=state!=='running';$('finish').disabled=state!=='running'&&state!=='paused';
  $('manual').disabled=state!=='running';$('blackout').disabled=state!=='running';$('resume').disabled=!session()||state==='running'||state==='paused';
  $('resetRecording').disabled=state==='running'||!storageOK;
  $('person').disabled=$('date').disabled=state==='running';
  $('loadFile').disabled=state==='running';$('settingsButton').disabled=state==='running';
  $('status').textContent={idle:'待機中',running:'記録中',paused:'一時停止',finished:'終了'}[state];$('status').classList.toggle('running',state==='running');
  $('threshold').textContent=travelView()?`記録間隔 ${session()?.travelMinutes||data.settings.moveMinutes}分`:'判定 '+duration(data.settings.seconds*1000);
  $('renumber').disabled=$('fillAddresses').disabled=$('deleteSession').disabled=!session()||state==='running'||state==='paused';
  updateLocateTimer();
 }
 function locateNow(){if(lastPosition&&map){map.setView([lastPosition.lat,lastPosition.lng],17);return true;}return false;}
 let locateTimer=null,locateTimerSec=0,blackout=false;
 function stopLocateTimer(){if(locateTimer!==null){clearInterval(locateTimer);locateTimer=null;locateTimerSec=0;}}
 function updateLocateTimer(){
  const sec=data.settings.locateSeconds||0;
  const want=state==='running'&&sec>=2&&!blackout;
  if(want&&(locateTimer===null||locateTimerSec!==sec)){stopLocateTimer();locateTimerSec=sec;locateTimer=setInterval(()=>{if(state==='running')locateNow();},sec*1000);}
  else if(!want)stopLocateTimer();
 }
 function renderSessions(){
  updateFileName();
 }
 function render(){
  refreshTotalTime();
  renderSessions();updateControls();const s=session();$('count').textContent=`${s?.stops.length||0} 地点`;$('recordDate').textContent=dated(s?.date);$('dateWeekday').textContent=dated($('date').value).slice(10);
  const list=$('list');list.replaceChildren();
  if(!s?.stops.length){const p=document.createElement('p');p.className='empty';p.textContent='記録地点はありません';list.append(p);}
  for(const stop of ordered()){
   const row=document.createElement('article');row.className='stop'+(selectedId===stop.id?' selected':'');row.dataset.id=stop.id;
   const n=document.createElement('button');n.className='number';n.textContent=permit?.label(stop)||stop.order;n.title='地点の操作';n.onclick=()=>pointActions(stop.id);
   const body=document.createElement('div'),title=document.createElement('div'),meta=document.createElement('div');title.className='stop-title';title.textContent=stop.name||'名称未設定';meta.className='stop-meta';
   meta.textContent=stop.source==='map'?`地図から追加（停車時刻・GPS精度は未取得）\n${stop.lat.toFixed(6)}, ${stop.lng.toFixed(6)}`:stop.source==='travel'?`記録時刻 ${time(stop.arrival)}${stop.manual?'（手動）':''}\n${stop.lat.toFixed(6)}, ${stop.lng.toFixed(6)}　誤差 ${Math.round(stop.accuracy)}m`:`${time(stop.arrival)} ～ ${stop.departure?time(stop.departure):time(stop.last)}　停車 ${duration(stop.last-stop.arrival)}\n${stop.lat.toFixed(6)}, ${stop.lng.toFixed(6)}　誤差 ${Math.round(stop.accuracy)}m`;meta.style.whiteSpace='pre-line';body.append(title,meta);
   const actions=document.createElement('div');actions.className='stop-actions';
   const edit=document.createElement('button');edit.textContent='編集';edit.onclick=()=>openEdit(stop.id);
   const del=document.createElement('button');del.textContent='削除';del.className='danger';del.onclick=()=>deletePoint(stop.id);actions.append(edit,del);row.append(n,body,actions);list.append(row);
  }drawMap();permit?.render();if(travelView())renderTravelProgress();
 }
 function renderTravelProgress(){
  const s=session(),interval=travelInterval(s),elapsed=s?.kind==='travel'?activeTimeMs(s):0,due=Number.isFinite(s?.nextTravelAtMs)?s.nextTravelAtMs:interval,remaining=Math.max(0,due-elapsed);
  $('candidate').textContent=state==='finished'?'移動記録終了':`次の記録まで ${duration(remaining)}`;
  $('progressBar').style.width=Math.min(100,Math.max(0,(1-remaining/interval)*100))+'%';
 }
 function initMap(){
  if(!window.L){$('mapError').hidden=false;return;}
  map=L.map('map').setView([34.768,136.132],12);const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);let failures=0;tiles.on('tileerror',()=>{if(++failures>3){$('mapError').hidden=false;}});tiles.on('load',()=>{if(!failures)$('mapError').hidden=true;});markers=L.layerGroup().addTo(map);
  map.on('click',event=>openMapAdd(event.latlng));
 }
 function openMapAdd(latlng){
  if(!storageOK){notify('保存データを復旧してから地点を追加してください。');return;}
  const s=session();if(!s){notify('先に記録を開始するか、追加する履歴を選択してください。');return;}
  if(!Number.isFinite(latlng.lat)||!Number.isFinite(latlng.lng)||Math.abs(latlng.lat)>90)return;
  pendingMapPoint={sessionId:s.id,lat:latlng.lat,lng:((latlng.lng+180)%360+360)%360-180};
  const f=$('mapAddForm'),next=s.stops.length+1;f.elements.order.max=next;f.elements.order.value=next;f.elements.name.value='';
  $('mapAddCoordinates').textContent=`緯度 ${pendingMapPoint.lat.toFixed(6)} / 経度 ${pendingMapPoint.lng.toFixed(6)}`;
  $('mapAddDialog').showModal();
 }
 $('mapAddDialog').addEventListener('close',()=>{pendingMapPoint=null;});
 $('mapAddForm').onsubmit=e=>{
  e.preventDefault();const point=pendingMapPoint,s=session(),f=e.target;
  if(!point||!s||s.id!==point.sessionId||!storageOK)return;
  const order=Number(f.elements.order.value);
  if(!Number.isInteger(order)||order<1||order>s.stops.length+1){notify('追加できる地点番号を入力してください。');return;}
  const previous=s.stops.map(p=>[p,p.order]),now=Date.now();
  const record={id:id(),order,name:f.elements.name.value.trim(),lat:point.lat,lng:point.lng,accuracy:0,arrival:now,last:now,departure:now,source:'map',editedAt:now};
  s.stops.forEach(p=>{if(p.order>=order)p.order++;});s.stops.push(record);
  if(!persist()){s.stops=s.stops.filter(p=>p!==record);previous.forEach(([p,order])=>p.order=order);render();return;}
  selectedId=record.id;$('mapAddDialog').close();render();notify(`地点 ${record.order} を地図から登録しました。`);
 };
 function drawMap(){if(!map||blackout)return;markers.clearLayers();const points=ordered();if(points.length>1)L.polyline(points.map(p=>[p.lat,p.lng]),{color:'#6d7d76',weight:2,dashArray:'5 5'}).addTo(markers);
  for(const p of points){const div=document.createElement('div');div.textContent=permit?.label(p)||String(p.order);const icon=L.divIcon({className:'pin'+(p.id===selectedId?' active':''),html:div,iconSize:[33,33],iconAnchor:[16,16]});L.marker([p.lat,p.lng],{icon,bubblingMouseEvents:false}).on('click',()=>pointActions(p.id)).addTo(markers);}
 }
 function fit(){if(!map)return;const points=ordered();if(points.length)map.fitBounds(L.latLngBounds(points.map(p=>[p.lat,p.lng])),{padding:[35,35],maxZoom:17});}
 function focusStop(id){const p=session()?.stops.find(p=>p.id===id);if(!p)return;selectedId=id;render();if(map)map.setView([p.lat,p.lng],17);$('list').querySelector(`[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest'});}
 function pointActions(id){const p=session()?.stops.find(p=>p.id===id);if(!p)return;focusStop(id);$('pointTitle').textContent=`地点 ${p.order}　${p.name||'名称未設定'}`;$('pointDialog').showModal();}
 async function deletePoint(id){const s=session(),p=s?.stops.find(p=>p.id===id);if(!p)return;if(!await ask(`地点 ${p.order}「${p.name||'名称未設定'}」を削除しますか？\n後ろの番号は自動で詰めます。`))return;s.stops=s.stops.filter(p=>p.id!==id);makeSequential(s);if(selectedId===id)selectedId=null;if(detector?.candidate?.record?.id===id)detector.reset(lastPosition);persist();render();}
 $('pointDelete').onclick=()=>{const id=selectedId;$('pointDialog').close();deletePoint(id);};
 $('pointName').onclick=()=>{const p=session()?.stops.find(p=>p.id===selectedId);$('pointDialog').close();if(!p)return;$('nameForm').elements.name.value=p.name;$('nameDialog').showModal();$('nameForm').elements.name.focus();};
 $('nameForm').onsubmit=e=>{e.preventDefault();const p=session()?.stops.find(p=>p.id===selectedId);if(p){p.name=e.target.elements.name.value.trim();p.editedAt=Date.now();persist();}$('nameDialog').close();render();};
 function closeWatch(){token++;if(watch!==null){navigator.geolocation.clearWatch(watch);watch=null;}if(wake){wake.release().catch(()=>{});wake=null;}}
 function pause(save=true){if(state!=='running')return;commitElapsed(true);state='paused';const c=detector?.candidate;const last=c?.saved?{lat:c.best.lat,lng:c.best.lng}:lastPosition;detector?.close(Date.now());detector?.reset(last);closeWatch();if(save)persist();render();}
 async function start(){
  if(state==='running')return;
  if(resetForNewDay())return;
  if(!navigator.geolocation){notify('このブラウザーでは位置情報を取得できません。');return;}
  if(!window.isSecureContext){notify('位置情報はHTTPSまたはこのPCのlocalhostで開いてください。');return;}
  if(!storageOK)return;
  if(state!=='paused'){
   const date=$('date').value;if(!date){notify('日付を入力してください。');return;}
   closeWatch();lastPosition=null;
   if(currentDot){currentDot.remove();currentDot=null;}
   if(markers)markers.clearLayers();
   if(map)map.setView([34.768,136.132],12);
   $('gps').textContent='GPS 更新待ち';$('candidate').textContent='停車時間 0:00';$('progressBar').style.width='0%';
   const s={id:id(),date,person:$('person').value.trim(),started:Date.now(),ended:null,activeElapsedMs:0,elapsedTiming:'active',kind:travelView()?'travel':'stop',recordType:travelView()?'移動記録':'停車地点記録',stops:[]};if(s.kind==='travel'){s.travelMinutes=data.settings.moveMinutes;s.nextTravelAtMs=travelInterval(s);}data.sessions.push(s);currentId=s.id;selectedId=null;fileNameOverride=null;
   if(!travelSession())detector=new StopRecorderCore.StopDetector(data.settings,point=>{const s=session(),record={...point,id:id(),order:Math.max(0,...s.stops.map(p=>p.order))+1,name:''};s.stops.push(record);persist();render();return record;},candidateUpdate);else detector=null;
  }
  if(state==='paused'&&session())session().ended=null;
  if(!detector&&!travelSession()){detector=new StopRecorderCore.StopDetector(data.settings,point=>{const s=session(),record={...point,id:id(),order:Math.max(0,...s.stops.map(p=>p.order))+1,name:''};s.stops.push(record);persist();render();return record;},candidateUpdate);const latest=session()?.stops.at(-1);if(latest)detector.reset({lat:latest.lat,lng:latest.lng});}
  state='running';countingFrom=Date.now();notify('');if(!persist()){commitElapsed(true);state='paused';render();return;}render();const generation=++token;
  watch=navigator.geolocation.watchPosition(position=>{if(generation!==token||state!=='running'||resetForNewDay())return;const p={lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy,time:position.timestamp};if(Date.now()-p.time>30000){$('gps').textContent='GPS 更新待ち';return;}lastPosition=p;
   $('gps').textContent=`GPS ±${Math.round(p.accuracy)}m`;
   if(travelSession()){tickTravel();$('status').textContent='移動記録中';}else $('status').textContent=detector.feed(p);
   if(map){if(!currentDot){currentDot=L.circleMarker([p.lat,p.lng],{radius:6,color:'#fff',weight:2,fillColor:'#237cad',fillOpacity:1}).addTo(map);if(!session().stops.length)map.setView([p.lat,p.lng],16);}else currentDot.setLatLng([p.lat,p.lng]);}
  },error=>{if(generation!==token)return;pause();notify(({1:'位置情報の利用が許可されていません。端末の設定を確認してください。',2:'現在地を取得できません。一時停止しました。',3:'位置情報の取得がタイムアウトしました。再開してください。'})[error.code]||'GPSエラーで一時停止しました。');},{enableHighAccuracy:true,maximumAge:0,timeout:20000});
  try{if(navigator.wakeLock){const lock=await navigator.wakeLock.request('screen');if(generation!==token)await lock.release();else wake=lock;}}catch(e){}
 }
 function candidateUpdate(c){$('candidate').textContent='停車時間 '+duration(c?c.last-c.arrival:0);$('progressBar').style.width=Math.min(100,c?(c.last-c.arrival)/(data.settings.seconds*10):0)+'%';if(Date.now()-lastPersist>3000)persist();}
 $('start').onclick=start;$('pause').onclick=()=>pause();$('finish').onclick=async()=>{if(!await ask('記録を終了して保存しますか？'))return;if(state==='running')pause();if(!session())return;session().ended=Date.now();state='finished';detector=null;persist();render();fit();};
 $('resetRecording').onclick=async()=>{
  if(state==='running'||!storageOK)return;
  viewedDay=today();
  if(!await ask('表示中の記録を端末内から削除し、地図・地点一覧・経過時間をリセットしますか？\nこの記録の削除は元に戻せません。ほかの履歴と保存済みTXTは残します。担当者は空に戻し、日付は本日に戻します。記録設定は変更しません。'))return;
  if(!persist())return;
  const previous={currentId,selectedId,detector,lastPosition,pendingMapPoint,fileNameOverride,state},previousSessions=data.sessions;
  data.sessions=data.sessions.filter(s=>s.id!==currentId);
  closeWatch();currentId=null;selectedId=null;detector=null;lastPosition=null;pendingMapPoint=null;fileNameOverride=null;state='idle';
  if(!persist()){data.sessions=previousSessions;({currentId,selectedId,detector,lastPosition,pendingMapPoint,fileNameOverride,state}=previous);render();return;}
  if(currentDot){currentDot.remove();currentDot=null;}if(markers)markers.clearLayers();if(map)map.setView([34.768,136.132],12);
  $('person').value='';$('date').value=today();viewedDay=today();
  $('gps').textContent='GPS 未取得';$('candidate').textContent='停車時間 0:00';$('progressBar').style.width='0%';
  render();notify('表示中の記録を削除し、新規開始できる状態にリセットしました。');
 };
 $('resume').onclick=async()=>{const s=session();if(!s||state==='running')return;if(!await ask(`${s.date} ${s.person} の記録に続けて追加しますか？`))return;s.ended=null;state='paused';detector=null;lastPosition=null;persist();await start();};
 $('manual').onclick=()=>{if(state!=='running')return;if(travelSession()){if(addTravelPoint(true))notify('現在地を手動で記録しました。');return;}if(!detector)return;const p=lastPosition;if(!p||Date.now()-p.time>15000){notify('新しい現在地を取得してから手動登録してください。');return;}if(p.accuracy>data.settings.accuracy){notify('GPS誤差が設定値を超えています。精度が安定してから登録してください。');return;}const record=detector.registerNow(p);if(!record){notify('この停車地点は登録済みです。移動後に次の地点を登録できます。');return;}persist();render();notify(`地点 ${record.order} を手動登録しました。`);};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){resetForNewDay();return;}if(state==='running'){pause();notify('画面が非表示になったため一時停止しました。記録を続けるには再開してください。');}});
 setInterval(()=>{if(state!=='running'||window===window.parent)return;try{if(window.frameElement&&!window.frameElement.getClientRects().length){pause();notify('起動画面に戻ったため一時停止しました。');}}catch(e){}},1000);
 window.addEventListener('pagehide',()=>{if(state==='running')pause();else persist();});
 window.addEventListener('focus',resetForNewDay);setInterval(resetForNewDay,1000);
 setInterval(refreshTotalTime,1000);
 function autoFinish(){if(state==='running')pause();const s=session();if(!s)return;s.ended=Date.now();state='finished';detector=null;persist();render();fit();notify('設定した終了時刻になったため、記録を自動で終了しました。');}
 function checkEndTime(){if(state!=='running'&&state!=='paused')return;const et=data.settings.endTime;if(!et)return;const s=session();if(!s?.started)return;const[H,M]=et.split(':').map(Number);const target=new Date(s.started);target.setHours(H,M,0,0);if(target.getTime()<=s.started)target.setDate(target.getDate()+1);if(Date.now()>=target.getTime())autoFinish();}
 setInterval(checkEndTime,1000);
 setInterval(tickTravel,1000);
 $('settingsButton').onclick=()=>{for(const k of Object.keys(defaults))$('settingsForm').elements[k].value=data.settings[k];$('stopSecondsSetting').hidden=$('stopRadiusSetting').hidden=travelView();$('travelIntervalSetting').hidden=!travelView();$('settingsDialog').showModal();};
 $('settingsForm').onsubmit=e=>{e.preventDefault();const f=e.target;const lv=Number(f.elements.locateSeconds.value);data.settings={seconds:Number(f.elements.seconds.value),radius:Number(f.elements.radius.value),accuracy:Number(f.elements.accuracy.value),moveMinutes:Number(f.elements.moveMinutes.value),locateSeconds:(Number.isInteger(lv)&&(lv===0||(lv>=2&&lv<=30)))?lv:0,endTime:String(f.elements.endTime.value||'')};if(travelSession()&&state==='paused'&&session().travelMinutes!==data.settings.moveMinutes){session().travelMinutes=data.settings.moveMinutes;const interval=travelInterval(session());session().nextTravelAtMs=(Math.floor(activeTimeMs(session())/interval)+1)*interval;}if(detector){detector.settings=data.settings;detector.reset(lastPosition);}persist();$('settingsDialog').close();updateControls();tickTravel();};
 function openEdit(id){const p=session().stops.find(p=>p.id===id);if(!p)return;editId=id;$('editForm').elements.order.max=session().stops.length;for(const k of ['order','name','lat','lng'])$('editForm').elements[k].value=p[k];$('editDialog').showModal();}
 $('editForm').onsubmit=e=>{e.preventDefault();const f=e.target,p=session()?.stops.find(p=>p.id===editId);if(!p)return;const next=Number(f.elements.order.value),old=p.order;const collision=session().stops.some(q=>q.id!==p.id&&q.order===next);
  if(collision)session().stops.forEach(q=>{if(q.id===p.id)return;if(next<old&&q.order>=next&&q.order<old)q.order++;else if(next>old&&q.order>old&&q.order<=next)q.order--;});
  p.order=next;makeSequential(session());p.name=f.elements.name.value.trim();p.lat=Number(f.elements.lat.value);p.lng=Number(f.elements.lng.value);p.editedAt=Date.now();selectedId=p.id;if(detector)detector.reset(lastPosition);persist();$('editDialog').close();render();};
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
 function formatAddress(j){const a=j.address||{};const parts=[];const push=v=>{if(v&&!parts.includes(v))parts.push(v);};push(a.province);push(a.state);push(a.city);push(a.town);push(a.village);push(a.suburb);push(a.quarter);push(a.neighbourhood);if(parts.length<3)push(a.road);let name=parts.join('');if(a.house_number&&parts.length>=2)name+=a.house_number;if(name.length<4){const head=String(j.display_name||'').split(',').map(s=>s.trim()).filter(s=>s&&s!=='日本'&&!/^\d{3}-\d{4}$/.test(s)).slice(0,3).reverse().join('');if(head)name=head;}return name;}
 async function lookupAddress(lat,lng){const res=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=ja`);if(!res.ok)throw new Error('住所検索エラー');return formatAddress(await res.json());}
 let geocoding=false;
 async function fillAddresses(){const s=session();if(!s||geocoding)return;const targets=ordered().filter(p=>!p.name&&!p.propertyKey&&Number.isFinite(p.lat)&&Number.isFinite(p.lng));if(!targets.length){notify('住所を入れる地点がありません。名称が未設定の地点が対象です。');return;}if(!await ask(`${targets.length}件の地点について、座標から住所を調べて名称に入れますか？\n1件ずつ問い合わせるため時間がかかります（目安は1件あたり約1秒です）。\n名称が入力済みの地点と、許可物件の地点は対象外です。`))return;geocoding=true;const btn=$('fillAddresses'),original=btn.textContent;btn.disabled=true;let done=0,failed=0;try{for(const p of targets){btn.textContent=`住所検索中 ${done+failed+1}/${targets.length}`;try{const name=await lookupAddress(p.lat,p.lng);if(name){p.name=name;p.editedAt=Date.now();done++;}else failed++;}catch(error){failed++;}if(done+failed<targets.length)await new Promise(r=>setTimeout(r,1100));}}finally{geocoding=false;btn.textContent=original;btn.disabled=false;persist();render();notify(failed?`${done}件に住所を入れました。${failed}件は住所が分かりませんでした。`:`${done}件に住所を入れました。`);}}
 $('fillAddresses').onclick=fillAddresses;
 $('renumber').onclick=async()=>{if(!await ask('表示順のまま、1から連続した番号に整えますか？'))return;ordered().forEach((p,i)=>p.order=i+1);persist();render();};
 $('deleteSession').onclick=async()=>{if(!await ask('この記録と含まれる地点をすべて削除しますか？ファイル保存したデータは残ります。'))return;data.sessions=data.sessions.filter(s=>s.id!==currentId);currentId=data.sessions.at(-1)?.id||null;selectedId=null;state='idle';persist();render();};
 function newFileName(withTimes=true){
  const person=($('person').value.trim()||'担当者未設定').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,60);
  const date=$('date').value||session()?.date||today();
  const ctx=permit?.active()?permit.selection():null;
  const scope=ctx?.active?'_'+[...(ctx.staff||[]),...(ctx.days||[])].join('_').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_'):'';
  const prefix=purposeName();
  const base=`${prefix}_${person}${scope}_${dated(date)}`;
  if(!withTimes)return base;
  const s=session();if(!s||!validInstant(s.started))return `${base}_未開始.txt`;
  const clock=t=>new Date(t).toTimeString().slice(0,8).replaceAll(':','');
  const day=t=>{const d=new Date(t);return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;};
  const end=validInstant(s.ended)?(day(s.started)===day(s.ended)?clock(s.ended):`${day(s.ended)}-${clock(s.ended)}`):'未定';
  return `${base}_開始${clock(s.started)}_終了${end}.txt`;
 }
 function updateFileName(){
  if(!fileNameOverride&&!session()?.sourceFile)fileNameOverride=newFileName(false);
  $('selectTxtName').textContent=fileNameOverride||session()?.sourceFile;
 }
 function recordExport(){
  const now=new Date();
  const name=newFileName();fileNameOverride=name;updateFileName();
  persist();
  const exported=JSON.parse(JSON.stringify(data));
  for(const s of exported.sessions){
   s.recordType=s.kind==='travel'?'移動記録':'停車地点記録';
   if(Number.isFinite(s.ended))captureTiming(s,now.getTime());
   for(const p of s.permitContext?.properties||[]){if(typeof p.staff==='string'&&Number.isInteger(p.order)&&p.order>0)p.collectionCode=`${p.staff}${p.order}`;else delete p.collectionCode;}
   for(const p of s.stops){if(p.propertyKey&&typeof p.propertyStaff==='string'&&Number.isInteger(p.routeOrder)&&p.routeOrder>0)p.collectionCode=`${p.propertyStaff}${p.routeOrder}`;else delete p.collectionCode;}
  }
  return {name,content:JSON.stringify({...exported,activeSessionId:currentId,exportedAt:now.toISOString()},null,2)};
 }
 function downloadRecord(record=recordExport()){
  fileNameOverride=record.name;updateFileName();
  const url=URL.createObjectURL(new Blob([record.content],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');
  a.href=url;a.download=record.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  notify('記録ファイルのダウンロードを開始しました。保存先はブラウザーで確認してください。');
 }
 $('downloadRecord').onclick=()=>downloadRecord();
 function mailTo(){try{const list=JSON.parse(localStorage.getItem('keiryo_mail_list')||'null');const addrs=Array.isArray(list)?list.filter(m=>m&&m.addr&&m.enabled).map(m=>m.addr):[];return addrs.length?addrs.join(','):'annsyuu38@gmail.com';}catch(e){return 'annsyuu38@gmail.com';}}
 async function shareRecord(email=false){
  const button=$(email?'emailFile':'saveFile');if(button.disabled)return;
  try{
   const record=recordExport();let file=null;
   if(typeof File!=='undefined'&&navigator.share&&navigator.canShare){
    for(const type of ['text/plain']){
     const candidate=new File([record.content],record.name,{type});
     if(navigator.canShare({files:[candidate]})){file=candidate;break;}
    }
   }
   if(email&&!mobile()){
    downloadRecord(record);
    const s=session(),subject=`停車地点記録 ${s?.date||today()}${s?.person?`（${s.person}）`:''}`;
    notify('メールを作成します（宛先・件名は自動）。ダウンロードしたTXTファイルを添付してください。');
    location.href=`mailto:${mailTo()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(record.name+' をダウンロードしました。メールに添付して送信してください。')}`;
    return;
   }
   if(!file){downloadRecord();notify(email?'添付共有に対応していないため、テキストファイルを保存します。メールに保存したファイルを添付してください。':'共有保存に対応していないため、ファイルをダウンロードします。iPhoneの「ファイル」で保存先を確認してください。');return;}
   button.disabled=true;
   notify(email?'共有画面でメールアプリを選び、宛先を指定して送信してください。全記録の位置情報を含みます。':'「“ファイル”に保存」を選び、「停車地点記録」フォルダに保存してください。全記録を1つのファイルにまとめています。');
   await navigator.share(email?{files:[file],title:`${purposeName()} ${dated(session()?.date||today())} ${session()?.person||''}`}:{files:[file]});
  }catch(error){
   if(error.name==='AbortError'){notify('保存操作を取り消しました。端末内の記録は残っています。');return;}
   $('downloadRecord').hidden=false;
   notify('共有画面を開けませんでした。「ダウンロード保存」から記録を保存できます。');
  }finally{button.disabled=false;}
 }
 $('saveFile').onclick=()=>{
  if(mobile()){shareRecord();return;}
  $('saveName').value=recordExport().name;$('saveNameDialog').showModal();
 };
 $('saveTop').onclick=()=>$('saveFile').click();
 $('saveNameForm').onsubmit=async event=>{
  event.preventDefault();
  let name=$('saveName').value.trim();
  if(!name||/[\\/:*?"<>|\x00-\x1f]/.test(name)){notify('ファイル名を入力してください。記号 \\ / : * ? " < > | は使えません。');return;}
  if(!/\.txt$/i.test(name))name+='.txt';
  const record=recordExport();record.name=name;$('saveNameDialog').close();
  if(typeof window.showSaveFilePicker!=='function'){
   downloadRecord(record);return;
  }
  try{
   const handle=await window.showSaveFilePicker({suggestedName:record.name,types:[{description:'停車地点記録テキスト',accept:{'text/plain':['.txt']}}]});
   const writer=await handle.createWritable();
   try{await writer.write(record.content);await writer.close();}catch(error){try{await writer.abort();}catch(e){}throw error;}
   fileNameOverride=handle.name;updateFileName();notify(`「${handle.name}」に保存しました。`);
  }catch(error){notify(error.name==='AbortError'?'保存をキャンセルしました。端末内の記録は残っています。':'保存できませんでした。'+error.message);}
 };
 $('emailFile').onclick=()=>shareRecord(true);
 $('selectTxtName').onclick=()=>{
  if(state==='running'){notify('一時停止してからTXTファイルを選択してください。');return;}
  $('fileInput').click();
 };
 $('closeApp').onclick=async()=>{
  if(!await ask('記録を端末に保存して終了しますか？TXTファイルが必要な場合は、先に「TXT保存」をしてください。'))return;
  if(state==='running')pause();
  if(session()&&!session().ended)session().ended=Date.now();
  state='finished';detector=null;closeWatch();
  if(!persist()){notify('保存できないため終了しません。「TXT保存」で記録を退避してください。');return;}
  render();
  if(window.parent!==window){window.parent.postMessage({type:'closeSoftware'},location.origin==='null'?'*':location.origin);return;}
  window.close();notify('記録を保存して終了しました。このタブを閉じてください。');
 };
 $('pasteMail').onclick=()=>{$('pasteText').value='';$('pasteDialog').showModal();};
 $('pasteForm').onsubmit=async e=>{e.preventDefault();if(state==='running'||state==='paused'){notify('記録を終了してから読み込んでください。');return;}try{
  const text=$('pasteText').value;if(text.length>20000000)throw Error('本文が大きすぎます');
  const begin='---STOP-RECORDER-DATA---',end='---END-STOP-RECORDER-DATA---',start=text.indexOf(begin),finish=text.indexOf(end,start+begin.length);
  if(start<0||finish<0)throw Error('復元用データを含む本文を貼り付けてください');
  const imported=validate(JSON.parse(text.slice(start+begin.length,finish).trim()));
  if(!storageOK)throw Error('既存データを読み込めないため、先にファイルから復旧してください');
  if(!await ask('メールの記録を追加しますか？既存の同じ記録は上書きしません。'))return;
  const ids=new Set(data.sessions.map(s=>s.id));let count=0;for(const s of imported.sessions){if(ids.has(s.id))continue;makeSequential(s);data.sessions.push(s);ids.add(s.id);count++;currentId=s.id;}
  state=session()?.ended?'finished':'idle';persist();$('pasteDialog').close();$('person').value=session()?.person||'';$('date').value=session()?.date||today();render();fit();notify(`${count}件追加しました。同じIDの記録は変更していません。`);
 }catch(error){notify('読み込めません：'+error.message);}};
 $('loadFile').onclick=()=>$('fileInput').click();
 $('fileInput').onchange=e=>{const file=e.target.files[0];e.target.value='';if(file)importTxtFile(file);};
 async function importTxtFile(file){
  if(state==='running'){notify('現在の記録を一時停止してからTXTを選択してください。');return;}
  if(file.size>20000000){notify('読み込めるファイルは20MBまでです。');return;}
  try{
   const imported=validate(JSON.parse(await file.text()));
   if(!imported.sessions.length)throw Error('記録が入っていません');
   if(!await ask('選択したTXTの内容を開きますか？同じIDの端末記録に違いがあれば、変更前を別の履歴として残してから読み込みます。元のTXTファイルは変更しません。'))return;
   const next=storageOK?JSON.parse(JSON.stringify(data)):imported;
   const comparable=s=>JSON.stringify({...s,sourceFile:undefined});
   if(storageOK)for(const incoming of imported.sessions){
    const index=next.sessions.findIndex(s=>s.id===incoming.id);
    if(index>=0){
     if(comparable(next.sessions[index])!==comparable(incoming)){
      const backup={...next.sessions[index],id:id(),backupOf:incoming.id,backupAt:Date.now()};
      next.sessions.push(backup);next.sessions[index]=incoming;
     }
    }else next.sessions.push(incoming);
   }
   if(next.sessions.length>1000)throw Error('保存記録が上限の1000件を超えます。先にTXTで退避して記録を整理してください');
   const active=imported.sessions.find(s=>s.id===imported.activeSessionId)||imported.sessions.at(-1);
   const old={data,currentId,storageOK,fileNameOverride};data=next;currentId=active.id;storageOK=true;fileNameOverride=null;
   const selected=session();selected.sourceFile=file.name;makeSequential(selected);
   if(selected.kind==='travel')data.viewMode='travel';else if(['permit','commission'].includes(imported.viewMode))data.viewMode=imported.viewMode;else if(data.viewMode==='travel')data.viewMode='commission';
   if(!persist()){data=old.data;currentId=old.currentId;storageOK=old.storageOK;fileNameOverride=old.fileNameOverride;render();return;}
   closeWatch();detector=null;lastPosition=null;selectedId=null;fileNameOverride=null;
   if(currentDot){currentDot.remove();currentDot=null;}
   $('person').value=selected.person;$('date').value=selected.date;
   state=selected.ended?'finished':'paused';render();fit();
   notify(selected.ended?'TXTを開きました。保存名に開始・終了時刻を入れます。':'途中のTXTを開きました。「再開」で続けて記録できます。保存名に開始・終了時刻を入れます。');
  }catch(error){notify('ファイルを読み込めません：'+error.message);}
 }
 const publishedTxtFiles=['完成版_許可物件用_西山_N-_火曜日_2026-11-10（火）_開始083446_終了143130.txt','住所入り_委託用_西山_南_2026-11-09（月）_開始083951_終了114533.txt','停車地点記録_西山　南_2026-11-09（月）_開始083951_終了114533.txt'];
 $('loadPublished').onclick=()=>{
  const list=$('publishedList');list.replaceChildren();
  for(const name of publishedTxtFiles){const b=document.createElement('button');b.type='button';b.textContent=name;b.onclick=async()=>{$('publishedDialog').close();try{const res=await fetch('../'+encodeURIComponent(name),{cache:'no-store'});if(!res.ok)throw new Error('HTTP '+res.status);const blob=await res.blob();importTxtFile(new File([blob],name,{type:'text/plain'}));}catch(error){notify('GitのTXTを読み込めません：'+error.message);}};list.append(b);}
  $('publishedDialog').showModal();
 };
 $('fit').onclick=fit;$('locate').onclick=()=>{if(!locateNow())notify('現在地は開始後に取得します。');};
 $('blackout').onclick=()=>{blackout=true;$('blackoutScreen').hidden=false;stopLocateTimer();};
 $('blackoutScreen').onclick=()=>{blackout=false;$('blackoutScreen').hidden=true;render();};
 if($('panelToggle')){
  let panelClosed=false;
  try{panelClosed=localStorage.getItem('stop-recorder-panel-closed')==='1';}catch(e){}
  const applyPanel=()=>{document.body.classList.toggle('panel-closed',panelClosed);$('panelToggle').textContent=panelClosed?'操作パネルを開く':'操作パネルを閉じる';$('panelToggle').setAttribute('aria-expanded',String(!panelClosed));if(map)setTimeout(()=>map.invalidateSize(),60);};
  $('panelToggle').onclick=()=>{panelClosed=!panelClosed;try{localStorage.setItem('stop-recorder-panel-closed',panelClosed?'1':'0');}catch(e){}applyPanel();};
  if($('panelClose'))$('panelClose').onclick=async()=>{if(state==='running'&&!await ask('記録中です。閉じると一時停止します。再度開くと続きを記録できます。閉じますか？'))return;const launcher=new URL('../index.html',location.href).href;if(window.self!==window.top){try{window.parent.postMessage('closeSoftware','*');}catch(e){}setTimeout(()=>{if(!document.hidden){try{window.top.location.href=launcher;}catch(e){}}},400);}else location.href=launcher;};
  applyPanel();
 }
 function identityChanged(){if(state==='paused'){state='idle';detector=null;lastPosition=null;updateControls();}fileNameOverride=newFileName(false);updateFileName();}
 $('date').onchange=()=>{$('dateWeekday').textContent=dated($('date').value).slice(10);identityChanged();};
 $('person').oninput=identityChanged;
 function resetForNewDay(){
  if(!mobile()||viewedDay===today())return false;
  viewedDay=today();if(state==='running')pause();else closeWatch();
  if(pendingConfirm)$('confirmCancel').click();document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  currentId=null;selectedId=null;detector=null;lastPosition=null;pendingMapPoint=null;fileNameOverride=null;state='idle';
  if(currentDot){currentDot.remove();currentDot=null;}if(markers)markers.clearLayers();if(map)map.setView([34.768,136.132],12);
  $('date').value=today();$('gps').textContent='GPS 未取得';$('candidate').textContent='停車時間 0:00';$('progressBar').style.width='0%';
  persist();render();notify('日付が変わったため、新しい記録画面にしました。前の記録は端末内に残っています。');return true;
 }
 $('date').value=session()?.date||today();$('person').value=session()?.person||'';
 if(!resetForNewDay()&&session()){state=mobile()||!session().ended?'paused':'finished';notify(state==='paused'?'閉じる前の記録を復元しました。「再開」で同じ記録に続けて記録できます。':'閉じる前の記録を復元しました。');}
 if(storageOK){let changed=false;for(const s of data.sessions){const before=s.stops.map(p=>p.order).join(',');makeSequential(s);if(before!==s.stops.map(p=>p.order).join(','))changed=true;}if(changed)persist();}
 if(session()?.kind==='travel')data.viewMode='travel';else if(session()&&data.viewMode==='travel')data.viewMode='commission';
 permit=StopPermit.create({mode:()=>data.viewMode||'commission',setMode:switchRecordingMode,session,selected:()=>selectedId,recording:()=>state==='running'||state==='paused',refreshFileName:()=>{fileNameOverride=newFileName(false);updateFileName();},save:persist,render,ask,notify,focus:focusStop});
 initMap();render();fit();
})();
