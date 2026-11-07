(()=>{
'use strict';
const trigger=document.getElementById('fmLayerMenuButton');
const popup=document.getElementById('fmLayerMenuPopup');
const close=document.getElementById('fmLayerMenuClose');
if(!trigger||!popup)return;
let opened=false;
function position(){const r=trigger.getBoundingClientRect();const width=Math.min(320,window.innerWidth-20);popup.style.left=Math.max(8,Math.min(r.left,window.innerWidth-width-8))+'px';const maxHeight=window.innerHeight-20;popup.style.maxHeight=maxHeight+'px';const below=window.innerHeight-r.bottom;popup.style.top=(below>240?r.bottom+5:Math.max(8,r.top-Math.min(330,maxHeight)-5))+'px';}
function show(on){opened=!!on;popup.hidden=!opened;trigger.setAttribute('aria-expanded',String(opened));if(opened)position();}
trigger.addEventListener('click',e=>{e.stopPropagation();show(!opened);});
close?.addEventListener('click',()=>show(false));
document.addEventListener('pointerdown',e=>{if(opened&&!popup.contains(e.target)&&!trigger.contains(e.target))show(false);},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){show(false);trigger.focus();}});
popup.addEventListener('click',e=>{if(e.target.closest('[data-action="pathUnion"],[data-action="pathSubtract"],[data-action="pathIntersect"],[data-action="pathDivide"],[data-action="generateOutlineObject"],[data-action="createLinkedClone"]'))show(false);});
window.addEventListener('resize',()=>{if(opened)position();});
window.addEventListener('scroll',()=>{if(opened)position();},true);
})();
