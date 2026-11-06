(function(root){
 'use strict';
 function distance(a,b){const rad=Math.PI/180,dlat=(b.lat-a.lat)*rad,dlng=(b.lng-a.lng)*rad;const h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlng/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
 class StopDetector{
  constructor(settings,onStop,onUpdate){this.settings=settings;this.onStop=onStop;this.onUpdate=onUpdate;this.reset();}
  reset(suppress=null){this.candidate=null;this.lastTime=null;this.suppress=suppress;}
  feed(p){
   if(!Number.isFinite(p.time)||!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||p.accuracy>this.settings.accuracy)return '精度待ち';
   if(this.lastTime!==null&&p.time<=this.lastTime)return '更新待ち';
   const gap=this.lastTime!==null&&p.time-this.lastTime>30000;this.lastTime=p.time;
   if(gap){if(this.candidate?.saved&&this.candidate.record)this.candidate.record.departure=this.candidate.last;this.candidate=null;this.onUpdate(null);}
   if(this.suppress){if(distance(this.suppress,p)<=this.settings.radius*1.5)return '移動待ち';this.suppress=null;}
   let c=this.candidate;
   if(c&&distance(c.anchor,p)>this.settings.radius*(c.saved?1.5:1)){
    if(c.saved&&c.record)c.record.departure=c.last;
    this.onUpdate(null);this.candidate=null;c=null;
   }
   if(!c){c={anchor:{...p},best:{...p},arrival:p.time,last:p.time,samples:0,saved:false};this.candidate=c;}
   c.samples++;c.last=p.time;if(p.accuracy<c.best.accuracy)c.best={...p};
   if(!c.saved&&c.samples>=3&&c.last-c.arrival>=this.settings.seconds*1000){
    c.saved=true;c.record=this.onStop({lat:c.best.lat,lng:c.best.lng,accuracy:c.best.accuracy,arrival:c.arrival,last:c.last,departure:null});
   }
   if(c.saved&&c.record){c.record.last=c.last;c.record.departure=null;}
   this.onUpdate(c);
   return c.saved?'停車記録済み':'停車判定中';
  }
  close(time){const c=this.candidate;if(c?.saved&&c.record)c.record.departure=Math.min(time,c.last);this.candidate=null;this.onUpdate(null);}
  registerNow(p){
   if(p.accuracy>this.settings.accuracy)return null;
   if(this.suppress&&distance(this.suppress,p)<=this.settings.radius*1.5)return null;
   let c=this.candidate;if(c?.saved)return null;
   if(!c){c={anchor:{...p},best:{...p},arrival:p.time,last:p.time,samples:1,saved:false};this.candidate=c;}
   c.saved=true;c.record=this.onStop({lat:c.best.lat,lng:c.best.lng,accuracy:c.best.accuracy,arrival:c.arrival,last:c.last,departure:null,manual:true});this.onUpdate(c);return c.record;
  }
 }
 const api={distance,StopDetector};if(typeof module!=='undefined')module.exports=api;root.StopRecorderCore=api;
})(typeof window!=='undefined'?window:globalThis);
