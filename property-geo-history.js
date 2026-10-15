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
 #geoHistoryList .geo-history-detail {font-size:13px;line-height:1.6;overflow-wrap:anywhere;}
 `;document.head.append(style);
 const dialog=document.createElement('dialog');dialog.id='geoPointHistory';dialog.setAttribute('aria-label','地点履歴');
 dialog.innerHTML='<div class="geo-history-tools"><h2>地点履歴</h2><button type="button" id="geoHistoryClose">閉じる</button></div><div class="geo-history-tools"><select id="geoHistoryDate" aria-label="登録日"></select><label><input type="checkbox" id="geoHistoryAll">表示分を全選択</label><span id="geoHistoryCount"></span></div><div id="geoHistoryList"></div><div class="geo-history-tools"><button type="button" id="geoHistorySend">選択してメール送信</button></div>';
 document.body.append(dialog);
 const dateSelect=dialog.querySelector('#geoHistoryDate'),all=dialog.querySelector('#geoHistoryAll'),list=dialog.querySelector('#geoHistoryList');
 let entries=[],selected=new Set();
 const dateOf=item=>String(item.geo.at||'').slice(0,10)||'日時不明';
 const shown=()=>entries.filter(item=>!dateSelect.value||dateOf(item)===dateSelect.value);
 function updateCount(){
   const visible=shown();all.checked=visible.length>0&&visible.every(item=>selected.has(item.name));
   all.indeterminate=!all.checked&&visible.some(item=>selected.has(item.name));
   dialog.querySelector('#geoHistoryCount').textContent=`選択 ${selected.size} / 全 ${entries.length}件`;
 }
 function render(){
   list.replaceChildren();
   for(const item of shown()){
     const label=document.createElement('label'),check=document.createElement('input'),body=document.createElement('div');check.type='checkbox';check.checked=selected.has(item.name);check.value=item.name;
     check.onchange=()=>{if(check.checked)selected.add(item.name);else selected.delete(item.name);updateCount();};
     const title=document.createElement('div');title.textContent=item.name;
     const details=document.createElement('div');details.className='geo-history-detail';
     const route=item.staff?`${item.staff}${item.order??''} / ${item.day}　`:'';
     details.textContent=`登録日時：${item.geo.at||'不明'}\n${route}${item.geo.lat}, ${item.geo.lng}　誤差約${item.geo.acc??'不明'}m`;details.style.whiteSpace='pre-line';
     body.append(title,details);label.append(check,body);list.append(label);
   }
   if(!shown().length)list.textContent='登録済みの地点はありません。';updateCount();
 }
 window.openGeoPointHistory=()=>{
   entries=getGeoHistoryEntries();selected=new Set();dateSelect.replaceChildren(new Option('すべての登録日',''));
   Array.from(new Set(entries.map(dateOf))).sort().reverse().forEach(date=>dateSelect.append(new Option(date,date)));
   render();fit();dialog.showModal();
 };
 function fit(){const zoom=parseFloat(getComputedStyle(document.documentElement).zoom)||1;dialog.style.setProperty('--geo-history-height',`${innerHeight*.85/zoom}px`);}
 window.addEventListener('resize',fit);
 dateSelect.onchange=render;
 all.onchange=()=>{shown().forEach(item=>{if(all.checked)selected.add(item.name);else selected.delete(item.name);});render();};
 dialog.querySelector('#geoHistoryClose').onclick=()=>dialog.close();
 dialog.querySelector('#geoHistorySend').onclick=()=>{if(!selected.size){alert('送信する地点にチェックしてください。');return;}sendGeoPointsMail(Array.from(selected));};
})();
