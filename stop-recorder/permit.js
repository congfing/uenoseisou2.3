(()=>{
 'use strict';
 const KEY='uenoseisou_permit_route_selection_v1';
 function checked(value){
  if(!value||value.version!==1||!Array.isArray(value.properties)||value.properties.length>10000)return null;
  const keys=new Set();
  for(const p of value.properties){
   if(!p||typeof p.key!=='string'||keys.has(p.key)||typeof p.name!=='string'||typeof p.staff!=='string'||typeof p.day!=='string'||(p.order!==null&&(!Number.isInteger(p.order)||p.order<1||p.order>99999)))return null;
   keys.add(p.key);
  }
  return value;
 }
 window.StopPermit={create(api){
  const $=id=>document.getElementById(id);
  let latest=null,busy=false,checksSig=null,permitClosed=false;const checks=new Set();const assignedSeq=new Map();
  try{permitClosed=localStorage.getItem('stop-recorder-permit-closed')==='1';}catch(error){}
  function applyPermitClosed(){document.body.classList.toggle('permit-closed',permitClosed);const b=$('permitToggle');if(b){b.textContent=permitClosed?'開く':'閉じる';b.setAttribute('aria-expanded',String(!permitClosed));}}
  function fixedNumbers(ctx){const map=new Map();const s=api.session();if(s&&ctx)for(const p of ctx.properties){const stop=s.stops.find(q=>q.propertyKey===p.key);if(stop)map.set(p.key,stop.order);}return map;}
  function initSelection(ctx){if(!ctx?.properties?.length)return;const sig=(api.session()?.id||'')+'|'+(ctx.filename||'')+'|'+(ctx.staff||[]).join(',')+'|'+(ctx.days||[]).join(',');if(sig!==checksSig){checksSig=sig;assignedSeq.clear();checks.clear();for(const key of fixedNumbers(ctx).keys())checks.add(key);return;}const keys=new Set(ctx.properties.map(p=>p.key));for(const key of[...checks])if(!keys.has(key))checks.delete(key);for(const key of[...assignedSeq.keys()])if(!keys.has(key))assignedSeq.delete(key);}
  function effNumber(p,fixed){return fixed.get(p.key)??assignedSeq.get(p.key)??null;}
  function nextNumber(fixed){let m=0;for(const n of fixed.values())m=Math.max(m,n);for(const n of assignedSeq.values())m=Math.max(m,n);return m+1;}
  function compactSeq(fixed){const base=Math.max(0,...fixed.values());const keys=[...assignedSeq.entries()].sort((a,b)=>a[1]-b[1]).map(e=>e[0]);keys.forEach((k,i)=>assignedSeq.set(k,base+i+1));}
  const active=()=>api.mode()==='permit';
  function read(){try{latest=checked(JSON.parse(localStorage.getItem(KEY)||'null'));}catch(error){latest=null;}}
  const context=()=>checked(api.session()?.permitContext)||latest;
  function render(){
   $('commissionMode').setAttribute('aria-pressed',String(api.mode()==='commission'));$('permitMode').setAttribute('aria-pressed',String(active()));$('travelMode').setAttribute('aria-pressed',String(api.mode()==='travel'));
   for(const id of ['commissionMode','permitMode','travelMode'])$(id).disabled=false;
   document.querySelector('h1').textContent=api.mode()==='travel'?'移動記録（テスト）':'停車地点記録（テスト）';document.title=document.querySelector('h1').textContent;
   $('openPermitPicker').hidden=!active();document.querySelector('.identity').classList.toggle('permit-identity',active());
   $('permitPanel').hidden=!active();if(!active())return;
   const s=api.session(),ctx=context(),selected=s?.stops.find(p=>p.id===api.selected());
   $('permitSelection').textContent=selected?`選択地点 ${label(selected)}：${selected.name||'名称未設定'}`:`地点 ${s?.stops.length||0}件`;
   if(ctx?.properties.length)initSelection(ctx);
   const total=ctx?.properties.length||0,checkedCount=total?ctx.properties.filter(p=>checks.has(p.key)).length:0,checkAll=$('permitCheckAll');
   checkAll.checked=total>0&&checkedCount===total;checkAll.indeterminate=checkedCount>0&&checkedCount<total;checkAll.disabled=!s||!total;
   $('syncPermit').disabled=!s||!total||checkedCount===0;
   const canAdd=!!s&&!!ctx?.active&&total>0;if($('permitAddProperty'))$('permitAddProperty').disabled=!canAdd;if($('permitNewName'))$('permitNewName').disabled=!canAdd;
   $('permitScope').textContent=ctx?`${(ctx.staff||[]).join('・')} ／ ${(ctx.days||[]).join('・')}　${ctx.properties.length}件`:'物件表の選択データなし';
   $('permitProperties').replaceChildren();
   if(!ctx?.active||!ctx.properties.length){$('permitEmpty').hidden=false;$('permitEmpty').textContent='物件表の「担当者、曜日を選択」で対象を選択してください。';return;}
   $('permitEmpty').hidden=true;
   const stops=s?.stops||[],assigned=new Map(stops.filter(p=>p.propertyKey).map(p=>[p.propertyKey,p]));
   const fixed=fixedNumbers(ctx),next=nextNumber(fixed);
   const rows=ctx.properties.map(p=>({p,num:effNumber(p,fixed)})).sort((a,b)=>{const an=a.num??Infinity,bn=b.num??Infinity;if(an!==bn)return an-bn;return ctx.properties.indexOf(a.p)-ctx.properties.indexOf(b.p);});
   for(const {p,num} of rows){
    const match=assigned.get(p.key),synced=!!(match&&num!==null&&match.order===num&&match.routeOrder===num&&match.name===p.name);
    const row=document.createElement('div');row.className='permit-property'+(synced?' linked':'');row.dataset.key=p.key;
    const check=document.createElement('input');check.className='permit-check';check.type='checkbox';check.checked=checks.has(p.key);check.disabled=!s;check.setAttribute('aria-label',`${p.name}を同期対象にする`);check.onchange=()=>{const f=fixedNumbers(context());if(check.checked){checks.add(p.key);if(!f.has(p.key)&&!assignedSeq.has(p.key))assignedSeq.set(p.key,nextNumber(f));}else{checks.delete(p.key);if(assignedSeq.has(p.key)){assignedSeq.delete(p.key);compactSeq(f);}}render();};
    const badge=document.createElement('span');badge.className='permit-order-badge'+(num===null?' tentative':'');badge.textContent=String(num??next);badge.setAttribute('aria-label',num===null?`次にチェックすると ${next} 番`:`${num} 番`);
    const body=document.createElement('span'),name=document.createElement('span'),meta=document.createElement('small');name.textContent=p.name;meta.textContent=`${p.staff} ${p.day}${synced?' ／ 同期済み':''}`;body.append(name,meta);row.append(check,badge,body);$('permitProperties').append(row);
   }
  }
  async function sync(){
   if(busy)return;
   const s=api.session(),ctx=context();
   if(!s||!ctx?.active||!ctx.properties.length){api.notify('先に地図の記録と担当者・曜日の物件リストを選択してください。');return;}
   initSelection(ctx);const fixed=fixedNumbers(ctx);const targets=ctx.properties.filter(p=>checks.has(p.key)).map(p=>({...p,order:effNumber(p,fixed)})),skipped=ctx.properties.length-targets.length;
   if(!targets.length){api.notify('チェックされた物件がありません。同期する物件にチェックを入れてください。');return;}
   const numbers=new Set(),points=new Map(s.stops.map(p=>[p.order,p])),problems=[];
   for(const p of targets){
    if(!Number.isInteger(p.order)||p.order<1){problems.push(`${p.name}：番号が未設定`);continue;}
    if(numbers.has(p.order))problems.push(`収集順 ${p.order} が重複`);numbers.add(p.order);
    if(!points.has(p.order))problems.push(`${p.name}：地点 ${p.order} がない`);
   }
   if(problems.length){api.notify('同期しませんでした。'+problems.slice(0,8).join('／')+(problems.length>8?` ほか${problems.length-8}件`:''));return;}
   busy=true;
   try{
    const extra=s.stops.length-targets.length;
    if(!await api.ask(`${targets.length}件の物件名を、チェックした番号の地点に同期しますか？\n地点の番号・位置は変更しません。以前の対応付けは置き換えます。${skipped>0?`\nチェックのない${skipped}件は同期しません。`:''}${extra>0?`\n対象外の${extra}地点は削除せず残します。`:''}`))return;
    const before=JSON.stringify(s);
    s.permitSyncBackup={at:Date.now(),stops:JSON.parse(JSON.stringify(s.stops))};
    const holders=new Map(s.stops.filter(p=>p.propertyKey).map(p=>[p.propertyKey,p]));
    for(const property of targets){
     const point=points.get(property.order),holder=holders.get(property.key);
     if(holder&&holder!==point){holder.name=holder.previousName||'';delete holder.previousName;delete holder.propertyKey;delete holder.propertyRegistration;delete holder.propertyStaff;delete holder.propertyDay;delete holder.routeOrder;delete holder.collectionCode;holders.delete(property.key);}
     if(point.propertyKey&&point.propertyKey!==property.key)holders.delete(point.propertyKey);
     if(!point.propertyKey||point.previousName===undefined)point.previousName=point.name;
     Object.assign(point,{propertyKey:property.key,propertyRegistration:property.registration,propertyStaff:property.staff,propertyDay:property.day,routeOrder:property.order,collectionCode:`${property.staff}${property.order}`,name:property.name,editedAt:Date.now()});
    }
    s.permitContext=JSON.parse(JSON.stringify(ctx));s.permitSyncedAt=Date.now();
    if(!api.save()){const restored=JSON.parse(before);for(const key of Object.keys(s))delete s[key];Object.assign(s,restored);api.render();return;}
    for(const t of targets)assignedSeq.delete(t.key);
    api.render();api.notify(`${targets.length}件を同期しました。${skipped>0?`チェックのない${skipped}件は同期していません。`:''}`);
   }finally{busy=false;}
  }
  function label(point){return String(point.order);}
  $('syncPermit').onclick=sync;
  let manualSeq=0;
  if($('permitAddProperty'))$('permitAddProperty').onclick=()=>{
   const s=api.session(),ctx=context(),name=($('permitNewName').value||'').trim();
   if(!s||!ctx?.active){api.notify('先に担当者・曜日の物件リストを選択してください。');return;}
   if(!name){api.notify('追加する物件名を入力してください。');return;}
   const old=s.permitContext,base=JSON.parse(JSON.stringify(ctx)),key='manual:'+Date.now().toString(36)+(manualSeq++);
   base.properties.push({key,name,registration:'',district:'',staff:(ctx.staff||[])[0]||'',day:(ctx.days||[])[0]||'',order:null,index:base.properties.length});
   s.permitContext=base;
   if(!api.save()){s.permitContext=old;api.render();return;}
   $('permitNewName').value='';api.render();api.notify(`物件「${name}」を追加しました。チェックを入れると番号が付きます。`);
  };
  if($('permitToggle'))$('permitToggle').onclick=()=>{permitClosed=!permitClosed;try{localStorage.setItem('stop-recorder-permit-closed',permitClosed?'1':'0');}catch(error){}applyPermitClosed();};
  applyPermitClosed();
  $('permitCheckAll').onchange=()=>{const c=context();if(!c?.properties?.length)return;initSelection(c);const f=fixedNumbers(c);if($('permitCheckAll').checked){for(const p of c.properties){checks.add(p.key);if(!f.has(p.key)&&!assignedSeq.has(p.key))assignedSeq.set(p.key,nextNumber(f));}}else{checks.clear();assignedSeq.clear();}render();};
  async function chooseMode(mode){if(mode==='permit')read();if(await api.setMode(mode)===false)return;api.refreshFileName();api.render();}
  $('commissionMode').onclick=()=>chooseMode('commission');
  $('permitMode').onclick=()=>chooseMode('permit');
  $('travelMode').onclick=()=>chooseMode('travel');
  $('openPermitPicker').onclick=()=>{
   const table=decodeURIComponent(location.pathname).includes('/停車地点記録/')?'../uenoseisou2.3/index_2-4_colview.html':'../index_2-4_colview.html';
   $('permitPickerFrame').src=table+'?permitPicker=1&t='+Date.now();$('permitPickerDialog').showModal();
  };
  $('permitPickerDialog').addEventListener('close',()=>{$('permitPickerFrame').src='about:blank';});
  window.addEventListener('message',async event=>{
   const sameOrigin=location.protocol==='file:'?event.origin==='null':event.origin===location.origin;
   if(event.source!==$('permitPickerFrame').contentWindow||!sameOrigin)return;
   if(event.data?.type==='permit-route-picker-cancel'){$('permitPickerDialog').close();return;}
   if(event.data?.type!=='permit-route-picked')return;
   const ctx=checked(event.data.snapshot);if(!ctx?.active)return;
   $('permitPickerDialog').close();
   const s=api.session();if(s?.permitContext&&!await api.ask('選択した担当者・曜日の物件リストに変更しますか？登録済み地点は削除しません。'))return;
   latest=ctx;if(s){const old=s.permitContext;s.permitContext=JSON.parse(JSON.stringify(ctx));if(!api.save()){s.permitContext=old;render();return;}}
   api.refreshFileName();render();api.notify('選択した担当者・曜日の物件を読み込みました。');
  });
  window.addEventListener('storage',event=>{if(event.key===KEY){read();render();}});
  window.addEventListener('focus',()=>{read();render();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){read();render();}});
  const area=document.querySelector('.list-area');area.insertBefore($('permitPanel'),area.firstChild);
  read();return {render,active,label,selection:context};
 }};
})();
