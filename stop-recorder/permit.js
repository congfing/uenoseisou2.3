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
  let latest=null,busy=false;
  const active=()=>api.mode()==='permit';
  function read(){try{latest=checked(JSON.parse(localStorage.getItem(KEY)||'null'));}catch(error){latest=null;}}
  const context=()=>checked(api.session()?.permitContext)||latest;
  function render(){
   $('commissionMode').setAttribute('aria-pressed',String(!active()));$('permitMode').setAttribute('aria-pressed',String(active()));
   $('permitPanel').hidden=!active();if(!active())return;
   const s=api.session(),ctx=context(),selected=s?.stops.find(p=>p.id===api.selected());
   $('permitSelection').textContent=selected?`選択地点 ${label(selected)}：${selected.name||'名称未設定'}`:'地図の地点を選択';
   $('permitScope').textContent=ctx?`${(ctx.staff||[]).join('・')} ／ ${(ctx.days||[]).join('・')}　${ctx.properties.length}件`:'物件表の選択データなし';
   $('permitProperties').replaceChildren();
   if(!ctx?.active||!ctx.properties.length){$('permitEmpty').hidden=false;$('permitEmpty').textContent='物件表の「担当者、曜日を選択」で対象を選択してください。';return;}
   $('permitEmpty').hidden=true;
   const stops=s?.stops||[],assigned=new Map(stops.filter(p=>p.propertyKey).map(p=>[p.propertyKey,p]));
   for(const p of ctx.properties){
    const match=assigned.get(p.key),group=stops.filter(q=>q.propertyStaff===p.staff&&q.propertyDay===p.day&&q.propertyKey);
    const next=Math.max(0,...group.map(q=>q.routeOrder||0))+1,number=match?.routeOrder??p.order??next;
    const button=document.createElement('button');button.type='button';button.className='permit-property'+(match?' linked':'');button.dataset.key=p.key;button.setAttribute('aria-pressed',String(!!match));
    const badge=document.createElement('span');badge.className='permit-number';badge.textContent=number;
    const body=document.createElement('span'),name=document.createElement('span'),meta=document.createElement('small');name.textContent=p.name;meta.textContent=`${p.staff} ${p.day}${match?' ／ 登録済み':''}`;body.append(name,meta);button.append(badge,body);
    button.onclick=()=>assign(p,number,ctx);$('permitProperties').append(button);
   }
  }
  async function assign(property,number,ctx){
   if(busy)return;
   const s=api.session(),point=s?.stops.find(p=>p.id===api.selected());
   if(!s||!point){api.notify('先に地図または地点一覧の番号を選択してください。');return;}
   const other=s.stops.find(p=>p.id!==point.id&&p.propertyKey===property.key);
   busy=true;
   try{
    if((other||point.propertyKey)&&!await api.ask(`地点 ${label(point)} を「${property.name}」（収集順 ${number}）に変更しますか？${other?'\n以前の地点との対応付けは解除し、地点自体は残します。':''}`))return;
    const before=JSON.stringify(s);
    if(other){delete other.propertyKey;delete other.propertyStaff;delete other.propertyDay;delete other.propertyRegistration;delete other.routeOrder;other.name=other.previousName||'';delete other.previousName;}
    if(!point.propertyKey)point.previousName=point.name;
    Object.assign(point,{propertyKey:property.key,propertyRegistration:property.registration,propertyStaff:property.staff,propertyDay:property.day,routeOrder:number,name:property.name,editedAt:Date.now()});
    if(!s.permitContext)s.permitContext=JSON.parse(JSON.stringify(ctx));
    if(!api.save()){Object.assign(s,JSON.parse(before));api.render();return;}
    api.render();api.notify(`収集順 ${number}「${property.name}」を地点に登録しました。`);
   }finally{busy=false;}
  }
  function label(point){return active()&&Number.isInteger(point.routeOrder)?String(point.routeOrder):String(point.order);}
  $('commissionMode').onclick=()=>{api.setMode('commission');api.render();};
  $('permitMode').onclick=()=>{read();api.setMode('permit');api.render();};
  $('refreshPermit').onclick=async()=>{
   read();if(!latest?.active){api.notify('物件表で担当者と曜日を選択してから、再度読み込んでください。');return;}
   const s=api.session();if(s?.permitContext&&!await api.ask('物件表の現在の選択でリストを更新しますか？登録済み地点の名前と収集順は残ります。'))return;
   if(s){const old=s.permitContext;s.permitContext=JSON.parse(JSON.stringify(latest));if(!api.save()){s.permitContext=old;render();return;}}render();
  };
  window.addEventListener('storage',event=>{if(event.key===KEY){read();render();}});
  window.addEventListener('focus',()=>{read();render();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){read();render();}});
  const area=document.querySelector('.list-area');area.insertBefore($('permitPanel'),area.firstChild);
  read();return {render,active,label};
 }};
})();
