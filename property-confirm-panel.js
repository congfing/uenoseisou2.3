(() => {
 const dialog=document.createElement('dialog');dialog.id='propertyConfirmation';dialog.style.cssText='width:340px;max-width:calc(100% - 32px);padding:20px;border:1px solid #999;border-radius:6px;background:white;color:black;';
 const message=document.createElement('p'),actions=document.createElement('div');message.style.cssText='white-space:pre-wrap;margin:0 0 20px;font-size:16px;';actions.style.cssText='display:flex;justify-content:flex-end;gap:20px;';
 const cancel=document.createElement('button'),ok=document.createElement('button');cancel.textContent='キャンセル';ok.textContent='OK';
 for(const button of [cancel,ok]){button.type='button';button.style.cssText='padding:10px 18px;min-height:44px;background:white;color:black;border:1px solid #999;border-radius:4px;font-size:16px;';}
 actions.append(cancel,ok);dialog.append(message,actions);document.body.append(dialog);
 let queue=Promise.resolve();
 window.propertyConfirm=text=>{const next=queue.then(()=>new Promise(resolve=>{message.textContent=text;let complete=false;const finish=value=>{if(complete)return;complete=true;dialog.close();resolve(value);};cancel.onclick=()=>finish(false);ok.onclick=()=>finish(true);dialog.oncancel=event=>{event.preventDefault();finish(false);};dialog.showModal();cancel.focus();}));queue=next.catch(()=>{});return next;};
 const guarded=new Set(['assignmentStaffAdd','newRecordSubmit','propertyHide','propertyClearFields','collectionOrderUndo','collectionOrderReset','collectionOrderInitialize','collectionOrderSave','collectionOrderSaveExit','collectionOrderCommit','sdlgOverwrite','sdlgSaveAs','pteSave','pteExcel','pteUndo','pteCellApply']);
 let replay=null;
 document.addEventListener('click',async event=>{const button=event.target.closest('button');if(!button||button.disabled||button===replay||!guarded.has(button.id))return;event.preventDefault();event.stopImmediatePropagation();if(await propertyConfirm(`「${button.textContent.trim()}」を実行しますか？`)){if(!button.isConnected||button.disabled)return;replay=button;try{button.click();}finally{replay=null;}}},true);
})();
