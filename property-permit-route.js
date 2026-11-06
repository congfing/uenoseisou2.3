(()=>{
 'use strict';
 const key='uenoseisou_permit_route_selection_v1';
 let previous='';
 function publish(){
  try{
   if(typeof assignmentFilter==='undefined'||typeof dataArray==='undefined'||!dataArray.length)return;
   const column=names=>headers.findIndex(h=>names.includes(String(h||'').trim()));
   const nameCol=column(['契約物件','物件名','名前']),regCol=column(['登録番号']),districtCol=column(['地区','地区名']);
   if(nameCol<0)return;
   const staff=[...assignmentFilter.staff],days=[...assignmentFilter.days],properties=[];
   if(assignmentFilter.active)for(const [index,row] of dataArray.entries())for(const day of days){
    const dayCol=column([day]);if(dayCol<0)continue;
    const value=String(row[dayCol]||'').trim().replaceAll('－','-');
    const member=staff.find(prefix=>value.startsWith(prefix));if(!member)continue;
    const name=String(row[nameCol]||'').trim();if(!name)continue;
    const registration=regCol<0?'':String(row[regCol]||'').trim();
    const district=districtCol<0?'':String(row[districtCol]||'').trim();
    const rowKey=assignmentRowKey(row,member,day),suffix=value.slice(member.length).match(/^\s*(\d+)/);
    const saved=normalizedCollectionOrder(committedCollectionOrders[rowKey]);
    const order=saved??(suffix?normalizedCollectionOrder(suffix[1]):null);
    properties.push({key:JSON.stringify([member,day,registration||district+'|'+name]),name,registration,district,staff:member,day,order,index});
   }
   properties.sort((a,b)=>staff.indexOf(a.staff)-staff.indexOf(b.staff)||days.indexOf(a.day)-days.indexOf(b.day)||(a.order??Infinity)-(b.order??Infinity)||a.index-b.index);
   const snapshot={version:1,active:!!assignmentFilter.active,filename:currentFilename,sheet:currentSheetName,staff,days,properties};
   const encoded=JSON.stringify(snapshot);if(encoded===previous)return;
   localStorage.setItem(key,encoded);previous=encoded;
   window.dispatchEvent(new CustomEvent('permit-route-selection-updated'));
  }catch(error){/* The property table remains usable when device storage is full. */}
 }
 document.addEventListener('click',()=>setTimeout(publish,0));
 window.addEventListener('pagehide',publish);
 setInterval(publish,1500);
 publish();
})();
