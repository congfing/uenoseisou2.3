(() => {
  const style=document.createElement('style');
  style.textContent=`
    #propertyTableEditor {position:fixed;inset:0;width:100%;height:var(--pte-height,100dvh);max-width:none;max-height:none;margin:0;padding:0;border:0;background:#fff;color:#000;}
    #propertyTableEditor[open] {display:flex;flex-direction:column;}
    #propertyTableEditor .pte-toolbar {display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:10px;border-bottom:1px solid #000;flex-shrink:0;background:#fff;}
    #propertyTableEditor h2 {margin:0;flex:1;min-width:0;font-size:18px;font-weight:400;white-space:nowrap;}
    #propertyTableEditor .pte-heading {display:flex;align-items:center;gap:12px;width:100%;}
    #pteControls {display:flex;flex-wrap:wrap;gap:10px;align-items:center;width:100%;}
    #pteControls[hidden] {display:none;}
    #btnPropertyTableEditor {font-weight:700;}
    #propertyTableEditor,#propertyTableEditor *,#propertyCellEditor,#propertyCellEditor * {font-weight:400 !important;}
    #propertyTableEditor button,#propertyCellEditor button {background:#fff;color:#000;border:1px solid #000;border-radius:4px;padding:8px 12px;min-height:42px;font:inherit;}
    #pteSearch {width:180px;max-width:100%;padding:8px;border:1px solid #000;font:inherit;}
    #propertyTableEditor .pte-filter {max-width:180px;min-height:42px;padding:6px;border:1px solid #000;background:#fff;color:#000;font:inherit;}
    #pteGrid th button {border:0 !important;border-radius:0 !important;box-shadow:none !important;outline:0;background:transparent;width:100%;min-height:44px;padding:8px;text-align:left;white-space:nowrap;}
    #pteGrid {flex:1;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y pinch-zoom;}
    #pteGrid table {border-collapse:separate;border-spacing:0;width:max-content;min-width:100%;font-size:14px;}
    #pteGrid table {border:1px solid #999;}
    #pteGrid th,#pteGrid td {border:0 !important;border-right:1px solid #999 !important;border-bottom:1px solid #999 !important;padding:0;min-width:110px;background:#fff;}
    #pteGrid tr>:last-child {border-right:0 !important;}
    #pteGrid tbody tr:last-child td {border-bottom:0 !important;}
    #pteGrid th {position:sticky;top:0;z-index:2;padding:0;background:#eee;white-space:nowrap;font-weight:400;}
    #pteGrid td.pte-name {position:sticky;left:0;z-index:1;min-width:190px;max-width:230px;}
    #pteGrid td button {width:100%;min-height:44px;border:0 !important;border-radius:0;box-shadow:none !important;outline:0;padding:8px;text-align:left;font-size:14px;font-weight:400;white-space:normal;overflow-wrap:anywhere;}
    #pteGrid td.pte-changed button {text-decoration:underline;text-underline-offset:3px;}
    #propertyCellEditor {width:340px;max-width:calc(100vw - 32px);padding:16px;border:1px solid #000;border-radius:6px;background:#fff;color:#000;}
    #propertyCellEditor label {display:block;margin-bottom:8px;font-weight:600;}
    #propertyCellEditor select,#propertyCellEditor input {display:block;width:100%;min-height:44px;font:inherit;margin:10px 0;padding:8px;box-sizing:border-box;}
    #propertyCellEditor input[hidden] {display:none;}
    #propertyCellEditor .pte-cell-actions {display:flex;justify-content:flex-end;gap:12px;}
  `;
  document.head.append(style);
  const editor=document.createElement('dialog');editor.id='propertyTableEditor';editor.setAttribute('aria-label','編集用物件表');
  editor.innerHTML='<div class="pte-toolbar"><h2>編集用物件表</h2><input id="pteSearch" aria-label="物件検索" placeholder="物件検索"><select class="pte-filter" id="pteFilterColumn" aria-label="絞り込む列"></select><select class="pte-filter" id="pteFilterValue" aria-label="絞り込む値"></select><button type="button" id="pteFilterClear">絞り込み解除</button><span id="pteCount"></span><button id="pteSave" type="button">保存して適用</button><button id="pteExcel" type="button">エクセル保存</button><button id="pteClose" type="button">閉じる</button></div><div id="pteGrid"></div>';
  document.body.append(editor);
  function fitEditorToViewport(){
    const zoom=parseFloat(getComputedStyle(document.documentElement).zoom)||1;
    editor.style.setProperty('--pte-height',`${window.innerHeight/zoom}px`);
  }
  window.addEventListener('resize',fitEditorToViewport);
  window.visualViewport?.addEventListener('resize',fitEditorToViewport);
  const cellDialog=document.createElement('dialog');cellDialog.id='propertyCellEditor';
  cellDialog.innerHTML='<label id="pteCellLabel" for="pteChoices"></label><select id="pteChoices"></select><input id="pteCustom" aria-label="直接入力"><div class="pte-cell-actions"><button type="button" id="pteCellCancel">キャンセル</button><button type="button" id="pteCellApply">変更</button></div>';
  document.body.append(cellDialog);
  const grid=editor.querySelector('#pteGrid'),search=editor.querySelector('#pteSearch');
  const choices=cellDialog.querySelector('select'),custom=cellDialog.querySelector('input');
  const filterColumn=editor.querySelector('#pteFilterColumn'),filterValue=editor.querySelector('#pteFilterValue');
  const districtFilter=document.createElement('select'),industryFilter=document.createElement('select');
  districtFilter.className=industryFilter.className='pte-filter';
  districtFilter.id='pteDistrictFilter';industryFilter.id='pteIndustryFilter';
  districtFilter.setAttribute('aria-label','地区で絞り込み');industryFilter.setAttribute('aria-label','業種で絞り込み');
  filterColumn.before(districtFilter,industryFilter);
  const toolbar=editor.querySelector('.pte-toolbar'),title=toolbar.querySelector('h2');
  const undo=document.createElement('button');undo.type='button';undo.id='pteUndo';undo.textContent='一つ戻す';undo.disabled=true;
  editor.querySelector('#pteSave').before(undo);
  const add=document.createElement('button');add.type='button';add.id='pteNewRecord';add.textContent='新規登録';undo.before(add);
  add.onclick=()=>{
    const registrationCol=findHeaderIndex(['登録番号']),orderCol=findHeaderIndex(['整理番号']);
    if(registrationCol<0){alert('登録番号の列がありません。');return;}
    const registeredRows=[...rows,...hiddenPropertyRecords.filter(record=>record.sourceSheet===sheet).map(record=>record.row)];
    const registration=String(Math.max(0,...registeredRows.map(row=>Number(row[registrationCol])||0))+1);
    if(!confirm(`登録番号 ${registration} の空の物件行を用意しますか？`))return;
    undoStack.push(rows.map(row=>[...row]));
    const row=headers.map(()=>'');row[registrationCol]=String(Number(registration));
    rows.push(row);search.value='';filterColumn.value='';districtFilter.value='';industryFilter.value='';
    sortColumn=orderCol;sortDirection=1;refreshMainFilters();refreshFilterValues();render();
    grid.scrollTop=grid.scrollHeight;
  };
  let undoStack=[];
  undo.onclick=()=>{
    if(!undoStack.length)return;
    rows=undoStack.pop();refreshMainFilters();refreshFilterValues();render();
  };
  const controls=document.createElement('div');controls.id='pteControls';
  Array.from(toolbar.children).filter(element=>element!==title).forEach(element=>controls.append(element));
  const heading=document.createElement('div');heading.className='pte-heading';
  const toggle=document.createElement('button');toggle.type='button';toggle.setAttribute('aria-controls',controls.id);
  heading.append(title,toggle);toolbar.replaceChildren(heading,controls);
  function setControlsCollapsed(collapsed){
    controls.hidden=collapsed;toggle.textContent=collapsed?'▼ 操作パネルを表示':'▲ 操作パネルを隠す';
    toggle.setAttribute('aria-expanded',String(!collapsed));
    try{localStorage.setItem('colview_editor_controls_collapsed',collapsed?'1':'0');}catch(e){}
  }
  let initiallyCollapsed=false;
  try{initiallyCollapsed=localStorage.getItem('colview_editor_controls_collapsed')==='1';}catch(e){}
  setControlsCollapsed(initiallyCollapsed);
  toggle.onclick=()=>setControlsCollapsed(!controls.hidden);
  function refreshMainFilters(){
    [[districtFilter,['地区','地区名'],'すべての地区'],[industryFilter,['業種'],'すべての業種']].forEach(([select,names,label])=>{
      const previous=select.value,c=findHeaderIndex(names);
      select.replaceChildren(new Option(label,''));
      if(c>=0)Array.from(new Set(rows.map(row=>valueAt(row,c)).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'ja')).forEach(v=>select.append(new Option(v,v)));
      select.value=Array.from(select.options).some(o=>o.value===previous)?previous:'';
    });
  }
  let sortColumn=-1,sortDirection=1;
  function refreshFilterValues(){
    const previous=filterValue.value;filterValue.replaceChildren(new Option('すべて','__all__'));
    if(filterColumn.value!==''){
      const c=Number(filterColumn.value);
      const values=Array.from(new Set(rows.map(row=>valueAt(row,c)))).sort((a,b)=>a.localeCompare(b,'ja',{numeric:true}));
      values.forEach(v=>filterValue.append(new Option(v||'未選択',`value:${v}`)));
      if(/^[月火水木金土日]曜日$/.test(text(headers[c])))ASSIGNMENT_STAFF.forEach(v=>filterValue.append(new Option(`担当 ${v}`,`prefix:${v}`)));
    }
    if(Array.from(filterValue.options).some(o=>o.value===previous))filterValue.value=previous;
  }
  let rows=[],original=[],source='',sheet='',activeCell=null;
  const text=v=>String(v??'');
  const valueAt=(row,c)=>text(row?.[c]);
  function changeCount(){return rows.reduce((sum,row,r)=>sum+headers.reduce((n,_,c)=>n+(valueAt(row,c)!==valueAt(original[r],c)),0),0);}
  function render(){
    undo.disabled=!undoStack.length;
    const table=document.createElement('table'),head=document.createElement('thead'),hr=document.createElement('tr');
    headers.forEach((h,c)=>{
      const th=document.createElement('th'),button=document.createElement('button');button.type='button';
      button.textContent=text(h)+(sortColumn===c?(sortDirection===1?' ▲':' ▼'):'');
      th.setAttribute('aria-sort',sortColumn===c?(sortDirection===1?'ascending':'descending'):'none');
      button.onclick=()=>{sortDirection=sortColumn===c?-sortDirection:1;sortColumn=c;render();};th.append(button);hr.append(th);
    });head.append(hr);table.append(head);
    const body=document.createElement('tbody');
    const propertyCol=findHeaderIndex(['契約物件','物件名','名前']);
    const visible=rows.map((row,r)=>({row,r})).filter(({row})=>{
      if(districtFilter.value&&valueAt(row,findHeaderIndex(['地区','地区名']))!==districtFilter.value)return false;
      if(industryFilter.value&&valueAt(row,findHeaderIndex(['業種']))!==industryFilter.value)return false;
      if(search.value&&!row.some(v=>text(v).toLocaleLowerCase().includes(search.value.toLocaleLowerCase())))return false;
      if(filterColumn.value!==''&&filterValue.value!=='__all__'){
        const value=valueAt(row,Number(filterColumn.value));
        return filterValue.value.startsWith('prefix:')?value.startsWith(filterValue.value.slice(7)):value===filterValue.value.slice(6);
      }
      return true;
    });
    if(sortColumn>=0)visible.sort((a,b)=>{
      const av=valueAt(a.row,sortColumn),bv=valueAt(b.row,sortColumn);
      if(!av||!bv)return !av&&!bv?a.r-b.r:!av?1:-1;
      return av.localeCompare(bv,'ja',{numeric:true})*sortDirection||a.r-b.r;
    });
    visible.forEach(({row,r})=>{
      const tr=document.createElement('tr');
      const districtCol=findHeaderIndex(['地区','地区名']);
      const background=districtBackground(districtCol>=0?valueAt(row,districtCol).trim():'');
      headers.forEach((_,c)=>{
        const td=document.createElement('td');
        td.style.setProperty('background-color',background,'important');
        if(c===propertyCol)td.classList.add('pte-name');
        if(valueAt(row,c)!==valueAt(original[r],c))td.classList.add('pte-changed');
        const button=document.createElement('button');button.type='button';button.textContent=valueAt(row,c)||'—';
        button.style.setProperty('background-color',background,'important');
        button.setAttribute('aria-label',`${valueAt(row,propertyCol)} ${headers[c]} ${valueAt(row,c)||'未選択'}`);
        button.onclick=()=>openCell(r,c);td.append(button);tr.append(td);
      });body.append(tr);
    });table.append(body);grid.replaceChildren(table);
    editor.querySelector('#pteCount').textContent=`表示 ${visible.length}/${rows.length}件　変更 ${changeCount()}セル`;
  }
  function openCell(r,c){
    activeCell={r,c};choices.replaceChildren();
    const values=new Set(['',valueAt(rows[r],c),...rows.map(row=>valueAt(row,c))]);
    if(/^[月火水木金土日]曜日$/.test(text(headers[c])))ASSIGNMENT_STAFF.forEach(v=>values.add(v));
    for(const value of values){const option=document.createElement('option');option.value=value;option.textContent=value||'未選択';choices.append(option);}
    const other=document.createElement('option');other.value='__pte_custom__';other.textContent='直接入力';choices.append(other);
    choices.value=valueAt(rows[r],c);custom.value=choices.value;custom.hidden=true;
    cellDialog.querySelector('label').textContent=`${headers[c]}：${valueAt(rows[r],findHeaderIndex(['契約物件','物件名','名前']))}`;
    cellDialog.showModal();
  }
  choices.onchange=()=>{custom.hidden=choices.value!=='__pte_custom__';if(!custom.hidden){custom.value='';custom.focus();}};
  cellDialog.querySelector('#pteCellCancel').onclick=()=>cellDialog.close();
  cellDialog.querySelector('#pteCellApply').onclick=()=>{
    const {r,c}=activeCell;const next=choices.value==='__pte_custom__'?custom.value.trim():choices.value;
    const orderCol=findHeaderIndex(['整理番号']),registrationCol=findHeaderIndex(['登録番号']);
    if(c===registrationCol&&(!next||rows.some((row,i)=>i!==r&&valueAt(row,c)===next))){alert('登録番号は空欄・重複にできません。');return;}
    if(c===orderCol){
      const old=Number(rows[r][c]),order=Number(next);
      const hasOldOrder=Number.isInteger(old)&&old>0;
      const maxOrder=Math.max(0,...rows.map(row=>Number(row[c])||0))+(hasOldOrder?0:1);
      if(!Number.isInteger(order)||order<1||order>maxOrder){alert('現在の整理番号の範囲内で指定してください。');return;}
      if(valueAt(rows[r],c)!==next)undoStack.push(rows.map(row=>[...row]));
      rows.forEach((row,i)=>{if(i===r)return;const n=Number(row[c]);if(!hasOldOrder&&n>=order)row[c]=text(n+1);else if(hasOldOrder&&order<old&&n>=order&&n<old)row[c]=text(n+1);else if(hasOldOrder&&order>old&&n>old&&n<=order)row[c]=text(n-1);});
    }
    else if(valueAt(rows[r],c)!==next)undoStack.push(rows.map(row=>[...row]));
    rows[r][c]=next;cellDialog.close();const top=grid.scrollTop,left=grid.scrollLeft;refreshMainFilters();refreshFilterValues();render();grid.scrollTop=top;grid.scrollLeft=left;
  };
  function closeEditor(){if(changeCount()&&!confirm('未保存の変更を破棄しますか？'))return;editor.close();}
  editor.querySelector('#pteClose').onclick=closeEditor;
  editor.addEventListener('cancel',event=>{event.preventDefault();closeEditor();});
  search.oninput=render;
  filterColumn.onchange=()=>{filterValue.value='__all__';refreshFilterValues();render();};
  filterValue.onchange=render;
  districtFilter.onchange=industryFilter.onchange=render;
  editor.querySelector('#pteFilterClear').onclick=()=>{search.value='';filterColumn.value='';districtFilter.value='';industryFilter.value='';sortColumn=findHeaderIndex(['整理番号']);sortDirection=1;refreshFilterValues();render();};
  function applyEditor(closeAfter=true){
    if(source!==currentFilename||sheet!==currentSheetName){alert('読込み中の物件表が変わりました。開き直してください。');return false;}
    if(JSON.stringify(dataArray)!==JSON.stringify(original)){alert('編集中に元の表が更新されました。変更を破棄して開き直してください。');return false;}
    const count=changeCount();
    const orderCol=findHeaderIndex(['整理番号']);
    rows.forEach((row,r)=>{
      if(r>=original.length){recordPropertyChange('register',row);return;}
      headers.forEach((h,c)=>{
        if(valueAt(row,c)!==valueAt(original[r],c))rememberExistingPropertyChange(row,{index:c,header:text(h),before:valueAt(original[r],c),after:valueAt(row,c)});
      });
    });
    dataArray=rows.map(row=>[...row]);
    if(orderCol>=0)dataArray.sort((a,b)=>(Number(a[orderCol])||Number.MAX_SAFE_INTEGER)-(Number(b[orderCol])||Number.MAX_SAFE_INTEGER));
    sortColumn=orderCol;sortDirection=1;
    propertyEditorApplied=true;syncCurrentSheetToWorkbook();saveState();renderTable();
    const saved=loadSavedState();
    if(!saved?.editedPropertyTable||JSON.stringify(saved.editedPropertyTable.rows)!==JSON.stringify(dataArray)){
      alert('画面には適用しましたが、端末への保存に失敗しました。エクセル保存で退避してください。');
      if(closeAfter)return false;
    }
    original=dataArray.map(row=>[...row]);rows=dataArray.map(row=>[...row]);
    undoStack=[];
    if(closeAfter)editor.close();else render();
    showToast(`${count}セルを保存して適用しました`);
    return true;
  }
  editor.querySelector('#pteSave').onclick=()=>applyEditor();
  editor.querySelector('#pteExcel').onclick=()=>{
    if(!applyEditor(false))return;
    try{
      doSaveExcel(makeTimestampedName(currentFilename||'物件表.xlsx'));
      source=currentFilename;
    }catch(error){alert(`エクセル保存に失敗しました：${error.message}`);}
  };
  document.getElementById('btnPropertyTableEditor').onclick=()=>{
    if(!workbook||!hasPropertyTableHeaders()){showToast('物件表を読み込んでください');return;}
    source=currentFilename;sheet=currentSheetName;original=dataArray.map(row=>[...row]);rows=dataArray.map(row=>[...row]);search.value='';sortColumn=-1;sortDirection=1;
    undoStack=[];
    filterColumn.replaceChildren(new Option('絞り込む列',''));
    headers.forEach((h,c)=>filterColumn.append(new Option(text(h),text(c))));
    districtFilter.value='';industryFilter.value='';refreshMainFilters();refreshFilterValues();render();fitEditorToViewport();editor.showModal();
  };
})();
