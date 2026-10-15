(() => {
  const exempt=new Set(['toolbar-toggle','backBtn','pteClose','pteCellCancel','assignmentCancel','newRecordCancel','newRecordClose','sdlgCancel','filterPopupClose','geoHistoryClose']);
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button||button.disabled||exempt.has(button.id))return;
    if(button.dataset.ownConfirmation==='true')return;
    if(button.getAttribute('onclick')?.includes('removeSelectedPropertyHistory'))return;
    if(button.closest('#pteGrid'))return;
    const settings=button.closest('#toolbar-inner,#collectionOrderActions,#pteControls,#propertyCellEditor,#assignmentDialog,#newRecordDialog,#filterPopup,#hist-panel,#saveDialog');
    const rowAction=button.closest('tbody')&&!/計量/.test(button.textContent);
    if(!settings&&!rowAction)return;
    const label=button.textContent.trim();
    if(/閉じる|キャンセル/.test(label)||!label)return;
    if(!confirm(`「${label}」を実行しますか？`)){
      event.preventDefault();event.stopImmediatePropagation();
    }
  },true);
  document.addEventListener('change',event=>{
    const input=event.target;
    if(!input.matches('input[type="checkbox"][data-col]'))return;
    const name=input.closest('label')?.textContent.trim()||'列';
    if(!confirm(`「${name}」を${input.checked?'表示':'非表示'}にしますか？`)){
      input.checked=!input.checked;event.stopImmediatePropagation();
    }
  },true);
})();
