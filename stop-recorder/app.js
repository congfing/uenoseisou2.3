(()=>{
 'use strict';
 const $=id=>document.getElementById(id),KEY='stop-recorder-v1';
 const defaults={seconds:60,radius:30,accuracy:50};
 let data={version:1,settings:{...defaults},sessions:[]},storageOK=true;
 try{const stored=localStorage.getItem(KEY);if(stored)data=validate(JSON.parse(stored));}catch(e){storageOK=false;notify('保存データを読み込めません。元のデータを上書きせず、ファイル読み込みから復旧してください。');}
 let currentId=data.sessions.at(-1)?.id||null,state='idle',watch=null,detector=null,wake=null,selectedId=null,editId=null,lastPosition=null,lastPersist=0,token=0,map=null,markers=null,currentDot=null,storageWarned=false,pendingMapPoint=null;
 const id=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);
 const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const session=()=>data.sessions.find(s=>s.id===currentId);
 const ordered=()=>[...(session()?.stops||[])].sort((a,b)=>a.order-b.order||a.arrival-b.arrival);
 function makeSequential(s){[...s.stops].sort((a,b)=>a.order-b.order||a.arrival-b.arrival).forEach((p,i)=>p.order=i+1);}
 const time=t=>new Date(t).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
 const duration=ms=>{const n=Math.max(0,Math.floor(ms/1000));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
 function notify(text){$('message').hidden=!text;$('message').textContent=text;}
 function validate(d){
  if(!d||d.version!==1||!Array.isArray(d.sessions)||d.sessions.length>1000)throw Error('ファイル形式が違います');
  const settings=d.settings||{};
  if(!Number.isInteger(settings.seconds)||settings.seconds<5||settings.seconds>1800||!Number.isFinite(settings.radius)||settings.radius<10||settings.radius>200||!Number.isFinite(settings.accuracy)||settings.accuracy<5||settings.accuracy>200)throw Error('設定値が範囲外です');
  const ids=new Set();
  for(const s of d.sessions){
   if(typeof s.id!=='string'||ids.has(s.id)||!/^\d{4}-\d{2}-\d{2}$/.test(s.date)||typeof s.person!=='string'||!Array.isArray(s.stops)||s.stops.length>50000)throw Error('記録の形式が違います');ids.add(s.id);
   const stops=new Set(),orders=new Set();
   for(const p of s.stops){if(typeof p.id!=='string'||stops.has(p.id)||!Number.isInteger(p.order)||p.order<1||p.order>99999||orders.has(p.order)||!Number.isFinite(p.lat)||Math.abs(p.lat)>90||!Number.isFinite(p.lng)||Math.abs(p.lng)>180||!Number.isFinite(p.arrival)||!Number.isFinite(p.last)||p.last<p.arrival||typeof p.name!=='string'||!Number.isFinite(p.accuracy)||p.accuracy<0)throw Error('地点の形式が違います');if(p.departure!==null&&(!Number.isFinite(p.departure)||p.departure<p.arrival))throw Error('終了日時が不正です');stops.add(p.id);orders.add(p.order);}
  }return d;
 }
 function persist(){
  if(!storageOK)return false;
  try{localStorage.setItem(KEY,JSON.stringify(data));$('savedState').textContent='端末に保存済み';lastPersist=Date.now();return true;}
  catch(e){$('savedState').textContent='保存失敗';if(state==='running')pause(false);if(!storageWarned){storageWarned=true;notify('端末への保存に失敗しました。ファイル保存で記録を退避してください。');}return false;}
 }
 let pendingConfirm=false;
 function ask(text){if(pendingConfirm)return Promise.resolve(false);pendingConfirm=true;return new Promise(resolve=>{$('confirmText').textContent=text;const d=$('confirmDialog');const finish=v=>{pendingConfirm=false;d.close();resolve(v);};$('confirmCancel').onclick=()=>finish(false);$('confirmOK').onclick=()=>finish(true);d.oncancel=e=>{e.preventDefault();finish(false);};d.showModal();});}
 function updateControls(){
  $('start').textContent=state==='paused'?'再開':'開始';$('start').disabled=state==='running'||!storageOK;
  $('pause').disabled=state!=='running';$('finish').disabled=state!=='running'&&state!=='paused';
  $('manual').disabled=state!=='running';$('resume').disabled=!session()||state==='running'||state==='paused';
  $('sessionSelect').disabled=state==='running'||state==='paused';$('person').disabled=$('date').disabled=state==='running'||state==='paused';
  $('loadFile').disabled=state==='running'||state==='paused';$('settingsButton').disabled=state==='running';
  $('status').textContent={idle:'待機中',running:'記録中',paused:'一時停止',finished:'終了'}[state];$('status').classList.toggle('running',state==='running');
  $('threshold').textContent='判定 '+duration(data.settings.seconds*1000);
  $('renumber').disabled=$('deleteSession').disabled=!session()||state==='running'||state==='paused';
 }
 function renderSessions(){
  $('sessionSelect').replaceChildren();
  if(!data.sessions.length)$('sessionSelect').append(new Option('新しい記録',''));
  [...data.sessions].reverse().forEach(s=>$('sessionSelect').append(new Option(`${s.date}　${s.person||'担当者未設定'}　${s.stops.length}地点`,s.id)));
  $('sessionSelect').value=currentId||'';
 }
 function render(){
  renderSessions();updateControls();const s=session();$('count').textContent=`${s?.stops.length||0} 地点`;$('recordDate').textContent=s?.date||'';
  const list=$('list');list.replaceChildren();
  if(!s?.stops.length){const p=document.createElement('p');p.className='empty';p.textContent='記録地点はありません';list.append(p);}
  for(const stop of ordered()){
   const row=document.createElement('article');row.className='stop'+(selectedId===stop.id?' selected':'');row.dataset.id=stop.id;
   const n=document.createElement('button');n.className='number';n.textContent=stop.order;n.title='地点の操作';n.onclick=()=>pointActions(stop.id);
   const body=document.createElement('div'),title=document.createElement('div'),meta=document.createElement('div');title.className='stop-title';title.textContent=stop.name||'名称未設定';meta.className='stop-meta';
   meta.textContent=stop.source==='map'?`地図から追加（停車時刻・GPS精度は未取得）\n${stop.lat.toFixed(6)}, ${stop.lng.toFixed(6)}`:`${time(stop.arrival)} ～ ${stop.departure?time(stop.departure):time(stop.last)}　停車 ${duration(stop.last-stop.arrival)}\n${stop.lat.toFixed(6)}, ${stop.lng.toFixed(6)}　誤差 ${Math.round(stop.accuracy)}m`;meta.style.whiteSpace='pre-line';body.append(title,meta);
   const actions=document.createElement('div');actions.className='stop-actions';
   const edit=document.createElement('button');edit.textContent='編集';edit.disabled=state==='running';edit.onclick=()=>openEdit(stop.id);
   const del=document.createElement('button');del.textContent='削除';del.className='danger';del.onclick=()=>deletePoint(stop.id);actions.append(edit,del);row.append(n,body,actions);list.append(row);
  }drawMap();
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
 function drawMap(){if(!map)return;markers.clearLayers();const points=ordered();if(points.length>1)L.polyline(points.map(p=>[p.lat,p.lng]),{color:'#6d7d76',weight:2,dashArray:'5 5'}).addTo(markers);
  for(const p of points){const div=document.createElement('div');div.textContent=String(p.order);const icon=L.divIcon({className:'pin'+(p.id===selectedId?' active':''),html:div,iconSize:[33,33],iconAnchor:[16,16]});L.marker([p.lat,p.lng],{icon,bubblingMouseEvents:false}).on('click',()=>pointActions(p.id)).addTo(markers);}
 }
 function fit(){if(!map)return;const points=ordered();if(points.length)map.fitBounds(L.latLngBounds(points.map(p=>[p.lat,p.lng])),{padding:[35,35],maxZoom:17});}
 function focusStop(id){const p=session()?.stops.find(p=>p.id===id);if(!p)return;selectedId=id;render();if(map)map.setView([p.lat,p.lng],17);$('list').querySelector(`[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({behavior:'smooth',block:'nearest'});}
 function pointActions(id){const p=session()?.stops.find(p=>p.id===id);if(!p)return;focusStop(id);$('pointTitle').textContent=`地点 ${p.order}　${p.name||'名称未設定'}`;$('pointDialog').showModal();}
 async function deletePoint(id){const s=session(),p=s?.stops.find(p=>p.id===id);if(!p)return;if(!await ask(`地点 ${p.order}「${p.name||'名称未設定'}」を削除しますか？\n後ろの番号は自動で詰めます。`))return;s.stops=s.stops.filter(p=>p.id!==id);makeSequential(s);if(selectedId===id)selectedId=null;if(detector?.candidate?.record?.id===id)detector.reset(lastPosition);persist();render();}
 $('pointDelete').onclick=()=>{const id=selectedId;$('pointDialog').close();deletePoint(id);};
 $('pointName').onclick=()=>{const p=session()?.stops.find(p=>p.id===selectedId);$('pointDialog').close();if(!p)return;$('nameForm').elements.name.value=p.name;$('nameDialog').showModal();$('nameForm').elements.name.focus();};
 $('nameForm').onsubmit=e=>{e.preventDefault();const p=session()?.stops.find(p=>p.id===selectedId);if(p){p.name=e.target.elements.name.value.trim();p.editedAt=Date.now();persist();}$('nameDialog').close();render();};
 function closeWatch(){token++;if(watch!==null){navigator.geolocation.clearWatch(watch);watch=null;}if(wake){wake.release().catch(()=>{});wake=null;}}
 function pause(save=true){if(state!=='running')return;state='paused';const c=detector?.candidate;const last=c?.saved?{lat:c.best.lat,lng:c.best.lng}:lastPosition;detector?.close(Date.now());detector?.reset(last);closeWatch();if(save)persist();render();}
 async function start(){
  if(!navigator.geolocation){notify('このブラウザーでは位置情報を取得できません。');return;}
  if(!window.isSecureContext){notify('位置情報はHTTPSまたはこのPCのlocalhostで開いてください。');return;}
  if(!storageOK)return;
  if(state!=='paused'){
   const date=$('date').value;if(!date){notify('日付を入力してください。');return;}
   const s={id:id(),date,person:$('person').value.trim(),started:Date.now(),ended:null,stops:[]};data.sessions.push(s);currentId=s.id;selectedId=null;
   detector=new StopRecorderCore.StopDetector(data.settings,point=>{const s=session(),record={...point,id:id(),order:Math.max(0,...s.stops.map(p=>p.order))+1,name:''};s.stops.push(record);persist();render();return record;},candidateUpdate);
  }
  if(!detector){detector=new StopRecorderCore.StopDetector(data.settings,point=>{const s=session(),record={...point,id:id(),order:Math.max(0,...s.stops.map(p=>p.order))+1,name:''};s.stops.push(record);persist();render();return record;},candidateUpdate);const latest=session()?.stops.at(-1);if(latest)detector.reset({lat:latest.lat,lng:latest.lng});}
  state='running';notify('');if(!persist()){state='paused';render();return;}render();const generation=++token;
  watch=navigator.geolocation.watchPosition(position=>{if(generation!==token||state!=='running')return;const p={lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy,time:position.timestamp};if(Date.now()-p.time>30000){$('gps').textContent='GPS 更新待ち';return;}lastPosition=p;
   $('gps').textContent=`GPS ±${Math.round(p.accuracy)}m`;
   const result=detector.feed(p);$('status').textContent=result;
   if(map){if(!currentDot){currentDot=L.circleMarker([p.lat,p.lng],{radius:6,color:'#fff',weight:2,fillColor:'#237cad',fillOpacity:1}).addTo(map);if(!session().stops.length)map.setView([p.lat,p.lng],16);}else currentDot.setLatLng([p.lat,p.lng]);}
  },error=>{if(generation!==token)return;pause();notify(({1:'位置情報の利用が許可されていません。端末の設定を確認してください。',2:'現在地を取得できません。一時停止しました。',3:'位置情報の取得がタイムアウトしました。再開してください。'})[error.code]||'GPSエラーで一時停止しました。');},{enableHighAccuracy:true,maximumAge:0,timeout:20000});
  try{if(navigator.wakeLock){const lock=await navigator.wakeLock.request('screen');if(generation!==token)await lock.release();else wake=lock;}}catch(e){}
 }
 function candidateUpdate(c){$('candidate').textContent='停車時間 '+duration(c?c.last-c.arrival:0);$('progressBar').style.width=Math.min(100,c?(c.last-c.arrival)/(data.settings.seconds*10):0)+'%';if(Date.now()-lastPersist>3000)persist();}
 $('start').onclick=start;$('pause').onclick=()=>pause();$('finish').onclick=async()=>{if(!await ask('記録を終了して保存しますか？'))return;if(state==='running')pause();if(!session())return;session().ended=Date.now();state='finished';detector=null;persist();render();fit();};
 $('resume').onclick=async()=>{const s=session();if(!s||state==='running')return;if(!await ask(`${s.date} ${s.person} の記録に続けて追加しますか？`))return;s.ended=null;state='paused';detector=null;lastPosition=null;persist();await start();};
 $('manual').onclick=()=>{if(state!=='running'||!detector)return;const p=lastPosition;if(!p||Date.now()-p.time>15000){notify('新しい現在地を取得してから手動登録してください。');return;}if(p.accuracy>data.settings.accuracy){notify('GPS誤差が設定値を超えています。精度が安定してから登録してください。');return;}const record=detector.registerNow(p);if(!record){notify('この停車地点は登録済みです。移動後に次の地点を登録できます。');return;}persist();render();notify(`地点 ${record.order} を手動登録しました。`);};
 $('sessionSelect').onchange=()=>{currentId=$('sessionSelect').value;selectedId=null;detector=null;lastPosition=null;state=session()?.ended?'finished':'idle';$('person').value=session()?.person||'';$('date').value=session()?.date||today();render();fit();};
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='running'){pause();notify('画面が非表示になったため一時停止しました。記録を続けるには再開してください。');}});
 setInterval(()=>{if(state!=='running'||window===window.parent)return;try{if(window.frameElement&&!window.frameElement.getClientRects().length){pause();notify('起動画面に戻ったため一時停止しました。');}}catch(e){}},1000);
 window.addEventListener('pagehide',()=>{if(state==='running')pause();});
 $('settingsButton').onclick=()=>{for(const k of Object.keys(defaults))$('settingsForm').elements[k].value=data.settings[k];$('settingsDialog').showModal();};
 $('settingsForm').onsubmit=e=>{e.preventDefault();const f=e.target;data.settings={seconds:Number(f.elements.seconds.value),radius:Number(f.elements.radius.value),accuracy:Number(f.elements.accuracy.value)};if(detector){detector.settings=data.settings;detector.reset(lastPosition);}persist();$('settingsDialog').close();updateControls();};
 function openEdit(id){const p=session().stops.find(p=>p.id===id);if(!p)return;editId=id;$('editForm').elements.order.max=session().stops.length;for(const k of ['order','name','lat','lng'])$('editForm').elements[k].value=p[k];$('editDialog').showModal();}
 $('editForm').onsubmit=e=>{e.preventDefault();const f=e.target,p=session()?.stops.find(p=>p.id===editId);if(!p)return;const next=Number(f.elements.order.value),old=p.order;const collision=session().stops.some(q=>q.id!==p.id&&q.order===next);
  if(collision)session().stops.forEach(q=>{if(q.id===p.id)return;if(next<old&&q.order>=next&&q.order<old)q.order++;else if(next>old&&q.order>old&&q.order<=next)q.order--;});
  p.order=next;makeSequential(session());p.name=f.elements.name.value.trim();p.lat=Number(f.elements.lat.value);p.lng=Number(f.elements.lng.value);p.editedAt=Date.now();selectedId=p.id;if(detector)detector.reset(lastPosition);persist();$('editDialog').close();render();};
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
 $('renumber').onclick=async()=>{if(!await ask('表示順のまま、1から連続した番号に整えますか？'))return;ordered().forEach((p,i)=>p.order=i+1);persist();render();};
 $('deleteSession').onclick=async()=>{if(!await ask('この記録と含まれる地点をすべて削除しますか？ファイル保存したデータは残ります。'))return;data.sessions=data.sessions.filter(s=>s.id!==currentId);currentId=data.sessions.at(-1)?.id||null;selectedId=null;state='idle';persist();render();};
 $('saveFile').onclick=()=>{const content=JSON.stringify(data,null,2),url=URL.createObjectURL(new Blob([content],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`停車地点記録_${today()}_${new Date().toTimeString().slice(0,8).replaceAll(':','')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);};
 $('loadFile').onclick=()=>$('fileInput').click();$('fileInput').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>20000000){notify('読み込めるファイルは20MBまでです。');return;}try{const imported=validate(JSON.parse(await file.text()));if(!await ask('ファイルの記録を追加しますか？同じIDの記録は上書きせず、そのまま残します。'))return;const ids=new Set(data.sessions.map(s=>s.id));let count=0;for(const s of imported.sessions)if(!ids.has(s.id)){makeSequential(s);data.sessions.push(s);count++;}if(!storageOK){data=imported;storageOK=true;}currentId=data.sessions.at(-1)?.id||null;state='idle';persist();render();fit();notify(`${count}件の記録を読み込みました。`);}catch(e){notify('ファイルを読み込めません：'+e.message);}};
 $('fit').onclick=fit;$('locate').onclick=()=>{if(lastPosition&&map)map.setView([lastPosition.lat,lastPosition.lng],17);else notify('現在地は開始後に取得します。');};
 $('date').value=session()?.date||today();$('person').value=session()?.person||'';if(session()){state=session().ended?'finished':'paused';if(state==='paused')notify('保存した記録を復元しました。再開するまでは位置を取得しません。');}
 if(storageOK){let changed=false;for(const s of data.sessions){const before=s.stops.map(p=>p.order).join(',');makeSequential(s);if(before!==s.stops.map(p=>p.order).join(','))changed=true;}if(changed)persist();}
 initMap();render();fit();
})();
