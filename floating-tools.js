(()=>{
  'use strict';
  const panel=document.getElementById('floatingTools');
  const handle=document.getElementById('floatingToolsHandle');
  const menuButton=document.getElementById('floatingToolsMenuButton');
  const menu=document.getElementById('floatingToolsMenu');
  const cols=document.getElementById('floatingToolsColumns');
  const reset=document.getElementById('floatingToolsReset');
  const collapse=document.getElementById('floatingToolsCollapse');
  if(!panel||!handle||!menuButton||!menu||!cols||!reset||!collapse)return;
  const KEY='flatmotion-floating-tools-v1';
  const defaultPos=()=>({x:12,y:Math.min(Math.max(75,112),Math.max(8,innerHeight-65)),one:false,closed:false});
  let state=defaultPos();
  try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&typeof v==='object')state={...state,...v};}catch{}
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const closeMenu=()=>{menu.hidden=true;menuButton.setAttribute('aria-expanded','false');};
  const placeMenu=()=>{
    const r=menuButton.getBoundingClientRect();
    const w=menu.offsetWidth||210;
    const h=menu.offsetHeight||90;
    const x=clamp(r.left,8,Math.max(8,innerWidth-w-8));
    let y=r.bottom+5;
    if(y+h>innerHeight-8)y=Math.max(8,r.top-h-5);
    menu.style.left=x+'px';menu.style.top=y+'px';
  };
  menuButton.addEventListener('click',()=>{
    if(!menu.hidden){closeMenu();return;}
    menu.hidden=false;menuButton.setAttribute('aria-expanded','true');placeMenu();
  });
  document.addEventListener('pointerdown',e=>{
    if(!menu.hidden&&!menu.contains(e.target)&&!menuButton.contains(e.target))closeMenu();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
  function apply(){
    panel.classList.toggle('single-column',!!state.one);
    panel.classList.toggle('collapsed',!!state.closed);
    cols.setAttribute('aria-checked',String(!!state.one));
    collapse.setAttribute('aria-expanded',String(!state.closed));
    collapse.textContent=state.closed?'+':'−';
    collapse.title=state.closed?'パレットを展開':'パレットを折りたたむ';
    const w=panel.offsetWidth,h=panel.offsetHeight;
    state.x=clamp(Number(state.x)||0,0,Math.max(0,innerWidth-w));
    state.y=clamp(Number(state.y)||0,0,Math.max(0,innerHeight-Math.min(h,45)));
    panel.style.left=state.x+'px';panel.style.top=state.y+'px';
    panel.style.maxHeight=Math.max(45,innerHeight-state.y-5)+'px';
    const grid=panel.querySelector('#toolsGrid');
    if(grid)grid.style.maxHeight=Math.max(0,innerHeight-state.y-48)+'px';
    if(!menu.hidden)placeMenu();
  }
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}};
  function update(){apply();save();}
  cols.addEventListener('click',()=>{state.one=!state.one;update();closeMenu();});
  collapse.addEventListener('click',()=>{state.closed=!state.closed;update();closeMenu();});
  reset.addEventListener('click',()=>{state=defaultPos();update();closeMenu();});
  let drag=null;
  handle.addEventListener('pointerdown',e=>{
    if(e.button!==0||e.target.closest('button'))return;
    closeMenu();
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:state.x,top:state.y};
    handle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  handle.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    state.x=drag.left+e.clientX-drag.x;
    state.y=drag.top+e.clientY-drag.y;
    apply();
  });
  const end=e=>{
    if(!drag||drag.id!==e.pointerId)return;
    if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);
    drag=null;save();
  };
  handle.addEventListener('pointerup',end);
  handle.addEventListener('pointercancel',end);
  window.addEventListener('resize',()=>{apply();save();});
  apply();
})();
