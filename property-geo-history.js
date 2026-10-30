(() => {
 const style=document.createElement('style');
 style.textContent=`
 #geoPointHistory {width:min(700px,calc(100% - 24px));height:var(--geo-history-height,85dvh);max-height:none;padding:0;border:1px solid #999;background:#fff;color:#000;}
 #geoPointHistory[open] {display:flex;flex-direction:column;}
 #geoPointHistory .geo-history-tools {padding:12px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;border-bottom:1px solid #aaa;flex-shrink:0;}
 #geoPointHistory h2 {margin:0;flex:1;font-size:18px;}
 #geoPointHistory button,#geoPointHistory select {padding:8px 12px;min-height:42px;border:1px solid #000;border-radius:4px;font:inherit;background:#fff;color:#000;}
 #geoHistoryList {flex:1;min-height:0;overflow:auto;touch-action:pan-x pan-y pinch-zoom;-webkit-overflow-scrolling:touch;}
 #geoHistoryList label {display:flex;align-items:flex-start;gap:12px;padding:14px;border-bottom:1px solid #ccc;}
 #geoHistoryList input {width:22px;height:22px;flex-shrink:0;}
 #geoHistoryList summary {padding:10px 14px;cursor:pointer;font-size:14px;}
 #geoHistoryList details {border-bottom:1px solid #aaa;}
 #geoHistoryList .geo-history-detail {font-size:13px;line-height:1.6;overflow-wrap:anywhere;}
 `;document.head.append(style);
 const dialog=document.createElement('dialog');dialog.id='geoPointHistory';dialog.setAttribute('aria-label','地点履歴');
 dialog.innerHTML='<div class="geo-history-tools"><h2>地点履歴</h2><button type="button" id="geoHistoryClose">閉じる</button></div><div class="geo-history-tools"><select id="geoHistoryDate" aria-label="登録日"></select><button type="button" id="geoHistoryShowSent" aria-pressed="false">送信済みを表示</button><label><input type="checkbox" id="geoHistoryAll">表示分を全選択</label><span id="geoHistoryCount"></span></div><div id="geoHistoryList"></div><div class="geo-history-tools"><button type="button" id="geoHistorySend">選択してメール送信</button><button type="button" id="geoHistoryMarkSent">送信済みにする</button><button type="button" id="geoHistoryDelete">履歴を削除</button></div>';
 document.body.append(dialog);
 const dateSelect=dialog.querySelector('#geoHistoryDate'),all=dialog.querySelector('#geoHistoryAll'),list=dialog.querySelector('#geoHistoryList');
 let entries=[],selected=new Set(),showSent=false;
 const stateKey='property_geo_history_state_v1';
 let state={};
 try {const saved=JSON.parse(localStorage.getItem(stateKey)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))state=saved;}catch(e){}
 const keyOf=item=>JSON.stringify([item.name,item.geo.at,item.geo.lat,item.geo.lng]);
 const statusOf=item=>state[keyOf(item)]||{};
 function persist(next){
   try{localStorage.setItem(stateKey,JSON.stringify(next));state=next;return true;}
   catch(e){alert('履歴の状態を保存できませんでした。端末の保存容量や設定を確認してください。');return false;}
 }
 function refreshEntries(){entries=getGeoHistoryEntries().filter(item=>!statusOf(item).deleted);}
 function selectedEntries(){return entries.filter(item=>selected.has(item.name));}
 const dateOf=item=>String(item.geo.at||'').slice(0,10)||'日時不明';
 const shown=()=>entries.filter(item=>(showSent||!statusOf(item).sentAt)&&(!dateSelect.value||dateOf(item)===dateSelect.value));
 function updateCount(){
   const visible=shown();all.checked=visible.length>0&&visible.every(item=>selected.has(item.name));
   all.indeterminate=!all.checked&&visible.some(item=>selected.has(item.name));
   dialog.querySelector('#geoHistoryCount').textContent=`選択 ${selected.size} / 全 ${entries.length}件`;
 }
 function render(){
   list.replaceChildren();
   const visible=shown();
   for(const date of Array.from(new Set(visible.map(dateOf))).sort().reverse()){
     const group=visible.filter(item=>dateOf(item)===date);
     const section=document.createElement('section'),heading=document.createElement('label'),dayCheck=document.createElement('input'),text=document.createElement('span');
     dayCheck.type='checkbox';dayCheck.checked=group.every(item=>selected.has(item.name));
     dayCheck.indeterminate=!dayCheck.checked&&group.some(item=>selected.has(item.name));
     text.textContent=`${date}　${group.length}件`;
     dayCheck.onchange=()=>{group.forEach(item=>{if(dayCheck.checked)selected.add(item.name);else selected.delete(item.name);});render();};
     heading.append(dayCheck,text);section.append(heading);
     const detailsGroup=document.createElement('details'),summary=document.createElement('summary');summary.textContent='物件を確認・個別選択';detailsGroup.append(summary);
   for(const item of group){
     const label=document.createElement('label'),check=document.createElement('input'),body=document.createElement('div');check.type='checkbox';check.checked=selected.has(item.name);check.value=item.name;
     check.onchange=()=>{if(check.checked)selected.add(item.name);else selected.delete(item.name);dayCheck.checked=group.every(entry=>selected.has(entry.name));dayCheck.indeterminate=!dayCheck.checked&&group.some(entry=>selected.has(entry.name));updateCount();};
     const title=document.createElement('div');title.textContent=item.name;
     const status=document.createElement('div'),sentAt=statusOf(item).sentAt;
     status.textContent=sentAt?'送信済み：'+new Date(sentAt).toLocaleString('ja-JP'):'未送信';
     status.style.fontWeight='bold';
     const details=document.createElement('div');details.className='geo-history-detail';
     const route=item.staff?`${item.staff}${item.order??''} / ${item.day}　`:'';
     details.textContent=`登録日時：${item.geo.at||'不明'}\n${route}${item.geo.lat}, ${item.geo.lng}　誤差約${item.geo.acc??'不明'}m`;details.style.whiteSpace='pre-line';
     body.append(title,status,details);label.append(check,body);detailsGroup.append(label);
   }
     section.append(detailsGroup);list.append(section);
   }
   if(!shown().length)list.textContent=showSent?'地点履歴はありません。':'未送信の地点履歴はありません。';updateCount();
 }
 window.openGeoPointHistory=()=>{
   refreshEntries();selected=new Set();dateSelect.replaceChildren(new Option('すべての登録日',''));
   Array.from(new Set(entries.map(dateOf))).sort().reverse().forEach(date=>dateSelect.append(new Option(date,date)));
   render();fit();dialog.showModal();
 };
 function fit(){const zoom=parseFloat(getComputedStyle(document.documentElement).zoom)||1;dialog.style.setProperty('--geo-history-height',`${innerHeight*.85/zoom}px`);}
 window.addEventListener('resize',fit);
 dateSelect.onchange=()=>{selected.clear();render();};
 dialog.querySelector('#geoHistoryShowSent').onclick=event=>{
   showSent=!showSent;selected.clear();event.currentTarget.textContent=showSent?'送信済みを隠す':'送信済みを表示';event.currentTarget.setAttribute('aria-pressed',String(showSent));render();
 };
 dialog.querySelector('#geoHistoryMarkSent').onclick=async()=>{
   const items=selectedEntries();if(!items.length){alert('送信済みにする地点を選択してください。');return;}
   if(!await propertyConfirm('選択した'+items.length+'件のメールを送信しましたか？送信済みとして記録します。'))return;
   const next={...state},now=Date.now();items.forEach(item=>{next[keyOf(item)]={...statusOf(item),sentAt:statusOf(item).sentAt||now};});
   if(persist(next)){selected.clear();render();}
 };
 dialog.querySelector('#geoHistoryDelete').onclick=async()=>{
   const items=selectedEntries();if(!items.length){alert('削除する地点履歴を選択してください。');return;}
   if(!await propertyConfirm('選択した'+items.length+'件の履歴を削除しますか？履歴は元に戻せません。登録済みの座標は残ります。'))return;
   const next={...state};items.forEach(item=>{next[keyOf(item)]={...statusOf(item),deleted:true};});
   if(persist(next)){selected.clear();refreshEntries();render();}
 };
 all.onchange=()=>{shown().forEach(item=>{if(all.checked)selected.add(item.name);else selected.delete(item.name);});render();};
 dialog.querySelector('#geoHistoryClose').onclick=()=>dialog.close();
 dialog.querySelector('#geoHistorySend').onclick=()=>{if(!selected.size){alert('送信する地点にチェックしてください。');return;}sendGeoPointsMail(Array.from(selected));};
})();
