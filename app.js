/* FLAT MOTION — static, dependency-free SVG character animation editor */
(()=>{'use strict';
const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
const uid = ()=> 'p'+Math.random().toString(36).slice(2,10);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rnd=(v,d=1)=>Number(Number(v).toFixed(d));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,f=0)=>Number.isFinite(+v)?+v:f;
const fmtTime=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(Math.floor(n%60)).padStart(2,'0')}`;
const PALETTE=['#604538','#97765f','#c78b7b','#e9b8a0','#f0d4af','#f8e4c7','#fff5e4','#4e676a','#78948c','#a5ba9d','#8296b7','#d7b5c0','#63505e','#3e3434'];
const toolHints={crop:'四角形またはオブジェクトの形で指定した内側を削除します。交差では2つのオブジェクトが重なった部分を削除します。',select:'レイヤーのチェックボックスで複数選択すると、まとめて移動できます。「オブジェクトを統合」は元のパスと色を残す非破壊統合です。統合直後は自動施錠され、位置だけ移動可能です。鍵を解除すると展開して個別編集・統合解除できます。',node:'頂点の編集と変形を統合。先頭フレームでは基本形を編集し、2フレーム目以降は変形キーフレームを追加。編集／追加／削除を切替。Shift＋クリックで2点選択し均等に頂点を追加。',morph:'輪郭の点をドラッグして、そのフレームの変形キーを打ちます。四角形・楕円は右側からパスに変換。',mesh:'メッシュの交点をドラッグして素材を曲げます。右パネルからメッシュを作成。',pen:'ベジェ（塗り）：クリックで頂点を置いて閉じた形状を作ります。最初の点か「塗りを確定」で完成します。',strokePen:'ベジェ（線画）：クリックで点を打ち、Enterか「線画を確定」で仕上げます。頂点ツールで後から線の曲がり方を調整できます。',line:'直線：ドラッグで線を引きます。Shiftで45°刻みに固定できます。作成後も頂点追加・曲線化が可能です。',brush:'フリーハンド：ツール設定で「塗りつぶし／線画」、最大ポイント数、自動補正を選んでからドラッグします。',rect:'ドラッグして長方形のベクターパーツを描きます。',ellipse:'ドラッグして楕円のベクターパーツを描きます。',triangle:'ドラッグで三角形を描画します。向きは右側の「ツール」から切り替えられます。',triangleUp:'ドラッグで上向き三角形を作成します。',triangleDown:'ドラッグで下向き三角形を作成します。',pivot:'パーツの中心にある✳をドラッグして、関節の回転軸を移動。',hand:'手のひらツール：右側「ツール」で移動・回転・拡大縮小を選択し、キャンバス上をドラッグします。作品の描画内容には影響しません。',gradient:'グラデーション：対象をクリックして選び、上をドラッグして色の方向と範囲を指定します。ツール設定で線状／円状と、色→透明／色→色を切り替えられます。',raster:'ラフ作画：筆圧対応のラスターペン／消しゴム。ブラシ径はツール別に保存。手振れ補正と筆圧による太さの変化を設定できます。',text:'テキスト：キャンバスをクリックして文字レイヤーを追加。レイヤータブで縦書き・円形・アーチ配置、フォントや字間を編集。文字をパスへ変換すると頂点で編集できます。'};
const emptyDoc=()=>({version:20,name:'新しいアニメーション',width:960,height:540,fps:12,seconds:6,background:'#fffaf3',transparent:false,gridVisible:false,gridSize:40,gridTransparency:0,gridColor:'#867567',layers:[],audio:[],references:[],fonts:[]});
let doc=emptyDoc();
let S={selected:null,frame:0,tool:'select',triangleDirection:'up',color:'#c78b7b',autoKey:true,onionPrev:false,onionNext:false,playing:false,zoom:1,fitScale:1,showGrid:true,pen:[],cursor:null,drag:null,nodeIndex:0,vertexSelected:false,nodeMode:'edit',nodeSelected:new Set(),nodeInsertCount:1,simplifySession:null,inspectorTab:'layer',viewMode:'move',viewX:0,viewY:0,viewRotation:0,constrainShape:false,constrainSelection:false,recording:false,history:[],future:[],playStart:0,playFrame:0,collapsedFolders:new Set(),multiSelected:new Set(),activeContour:0};
const INSPECTOR_COLLAPSE_KEY='flatmotion.inspector.collapsed.v1';
const WORKSPACE_INSPECTOR_KEY='flatmotion.workspace.inspector.hidden.v1';
const WORKSPACE_PALETTE_KEY='flatmotion.workspace.palette.open.v1';
const WORKSPACE_TIMELINE_KEY='flatmotion.workspace.timeline.hidden.v1';
let timelinePaneHidden=false;
try{timelinePaneHidden=localStorage.getItem(WORKSPACE_TIMELINE_KEY)==='true';}catch(e){}
let inspectorPaneHidden=false, paletteOpen=false;
try{inspectorPaneHidden=localStorage.getItem(WORKSPACE_INSPECTOR_KEY)==='true';paletteOpen=localStorage.getItem(WORKSPACE_PALETTE_KEY)==='true';}catch(e){}
function syncWorkspaceLayout(){
 const grid=$('.main-grid'),pane=$('#inspectorSidebar'),toggle=$('#inspectorToggleButton'),label=$('#inspectorToggleLabel'),arrow=toggle?.querySelector('.inspector-toggle-arrow');
 if(grid)grid.classList.toggle('inspector-is-collapsed',inspectorPaneHidden);
 if(grid)grid.classList.toggle('timeline-is-collapsed',timelinePaneHidden);
 const timeline=$('#timelinePanel'),timelineToggle=$('#timelineToggleButton'),timelineLabel=$('#timelineToggleLabel'),timelineArrow=timelineToggle?.querySelector('.timeline-toggle-arrow');
 if(timeline){timeline.hidden=timelinePaneHidden;timeline.setAttribute('aria-hidden',String(timelinePaneHidden));}
 if(timelineToggle){timelineToggle.setAttribute('aria-expanded',String(!timelinePaneHidden));timelineToggle.title=timelinePaneHidden?'タイムラインを開く':'タイムラインを閉じてキャンバスを広げる';}
 if(timelineLabel)timelineLabel.textContent=timelinePaneHidden?'タイムラインを開く':'タイムラインを閉じる';
 if(timelineArrow)timelineArrow.textContent=timelinePaneHidden?'▴':'▾';
 if(pane){pane.hidden=inspectorPaneHidden;pane.setAttribute('aria-hidden',String(inspectorPaneHidden));}
 if(toggle){toggle.setAttribute('aria-expanded',String(!inspectorPaneHidden));toggle.title=inspectorPaneHidden?'プロパティパネルを開く':'プロパティパネルを閉じる';}
 if(label)label.textContent=inspectorPaneHidden?'プロパティを開く':'プロパティを閉じる';
 if(arrow)arrow.textContent=inspectorPaneHidden?'❮':'❯';
 const palette=$('#paletteSection'),palButton=$('#paletteToggle'),palBody=$('#paletteBody');
 if(palette)palette.classList.toggle('is-collapsed',!paletteOpen);
 if(palButton){palButton.setAttribute('aria-expanded',String(paletteOpen));palButton.title=paletteOpen?'カラーパレットを閉じる':'カラーパレットを開く';}
 if(palBody)palBody.hidden=!paletteOpen;
}
function toggleInspectorPanel(){inspectorPaneHidden=!inspectorPaneHidden;try{localStorage.setItem(WORKSPACE_INSPECTOR_KEY,String(inspectorPaneHidden));}catch(e){}syncWorkspaceLayout();requestAnimationFrame(refitOnResize);}
function toggleTimelinePanel(){timelinePaneHidden=!timelinePaneHidden;try{localStorage.setItem(WORKSPACE_TIMELINE_KEY,String(timelinePaneHidden));}catch(e){}syncWorkspaceLayout();requestAnimationFrame(refitOnResize);}
function togglePalettePanel(){paletteOpen=!paletteOpen;try{localStorage.setItem(WORKSPACE_PALETTE_KEY,String(paletteOpen));}catch(e){}syncWorkspaceLayout();}

S.smartGuides=true;S.smartGuideLines=[];S.offsetDistance=12;
S.cropMode='range';S.cropSelectionMode='rect';S.cropSelection=null;S.cropGrow=0;S.cropTargetId='';S.cropSourceId='';
S.inspectorCollapsed=new Set();
S.rasterMode='pen';S.rasterSizes={pen:7,eraser:24};S.rasterStabilize=35;S.rasterPressure=true;
try{const r=JSON.parse(localStorage.getItem('flatmotion.raster.preferences.v1')||'{}');S.rasterSizes.pen=clamp(num(r.pen,7),1,150);S.rasterSizes.eraser=clamp(num(r.eraser,24),1,150);S.rasterStabilize=clamp(num(r.stabilize,35),0,100);S.rasterPressure=r.pressure!==false;}catch(e){}
function saveRasterPreferences(){try{localStorage.setItem('flatmotion.raster.preferences.v1',JSON.stringify({...S.rasterSizes,stabilize:S.rasterStabilize,pressure:S.rasterPressure}));}catch(e){}}


// Freehand drawing preferences are UI settings, not modifications to the FMS project.
S.brushMode='fill';
S.brushMaxPoints=250;
S.brushAutoSmooth=true;
S.brushSmoothStrength=55;
try{
 const pref=JSON.parse(localStorage.getItem('flatmotion.freehand.options.v1')||'{}');
 S.brushMode=pref.mode==='line'?'line':'fill';
 S.brushMaxPoints=clamp(Math.round(num(pref.maxPoints,250)),10,800);
 S.brushAutoSmooth=pref.autoSmooth!==false;
 S.brushSmoothStrength=clamp(Math.round(num(pref.strength,55)),0,100);
}catch(e){}
function saveFreehandSettings(){try{
 localStorage.setItem('flatmotion.freehand.options.v1',JSON.stringify({mode:S.brushMode,maxPoints:S.brushMaxPoints,autoSmooth:S.brushAutoSmooth,strength:S.brushSmoothStrength}));
}catch(e){}}

S.autoVertexCorrectionStrength=45;
try{S.autoVertexCorrectionStrength=clamp(Math.round(num(localStorage.getItem('flatmotion.vertex.autocorrect.strength'),45)),0,100);}catch(e){}
S.nodeHandleSize=2.5;
try{S.nodeHandleSize=clamp(Number(localStorage.getItem('flatmotion.node.handlesize')||2.5),1,7);}catch(e){}
S.gradientDefaults={type:'linear',mode:'fade',color1:'#c78b7b',color2:'#fffaf3'};
try{const saved=JSON.parse(localStorage.getItem(INSPECTOR_COLLAPSE_KEY)||'[]');if(Array.isArray(saved))S.inspectorCollapsed=new Set(saved.filter(x=>typeof x==='string'));}catch(e){}
const SAVE_KEY='flatmotion.studio.project.v2'; // v2 storage remains readable; data is upgraded on load
const ART=$('#artboard');
const EYE_IMAGES={shown: 'assets/eye-visible.png', hidden: 'assets/eye-hidden.png'};
const FOLDER_IMAGE='assets/ui/choco/23.png';
const COPY_IMAGE='assets/copy.png';
const total=()=>Math.max(1,Math.round(doc.fps*doc.seconds));
const sel=()=>doc.layers.find(l=>l.id===S.selected)||null;
const layerBy=id=>doc.layers.find(l=>l.id===id)||null;

// Checkbox selections are ephemeral UI state: they do not modify the FMS project.
function checkedLayers(){return doc.layers.filter(l=>S.multiSelected.has(l.id));}
function setSingleSelection(id){S.activeContour=0;S.selected=layerBy(id)?.id||null;S.multiSelected=new Set(S.selected?[S.selected]:[]);}
function updateCheckedSelection(id,checked){
 id=lockedFolderAncestor(layerBy(id))?.id||id;
 const selected=new Set(S.multiSelected);
 if(!selected.size&&S.selected)selected.add(S.selected);
 if(checked)selected.add(id);else selected.delete(id);
 S.multiSelected=new Set([...selected].filter(x=>!!layerBy(x)));
 if(checked)S.selected=id;
 else if(!S.multiSelected.has(S.selected))S.selected=[...S.multiSelected].at(-1)||null;
 S.pen=[];S.nodeIndex=0;S.simplifySession=null;renderAll();
}
function hasSelectedFolderAncestor(layer,ids){return folderAncestry(layer).some(f=>ids.has(f.id));}
function hasSelectedRigAncestor(layer,ids){const seen=new Set([layer.id]);let p=layerBy(layer.parent);while(p&&!seen.has(p.id)){if(ids.has(p.id))return true;seen.add(p.id);p=layerBy(p.parent);}return false;}
function selectedRoots({forMotion=false}={}){
 const all=checkedLayers(),ids=new Set(all.map(x=>x.id));
 return all.filter(l=>!hasSelectedFolderAncestor(l,ids)&&(!forMotion||!hasSelectedRigAncestor(l,ids)));
}
function beginMultiMove(e,p){
 const layers=selectedRoots({forMotion:true}).filter(l=>effectiveVisible(l)&&canTranslate(l));
 if(!layers.length)return;
 S.drag={type:'multiMove',start:p,changed:false,entries:layers.map(l=>({id:l.id,pose:getPose(l),parentInverse:matInv(getParentWorld(l)),key:null}))};
 ART.setPointerCapture(e.pointerId);
}
function moveMultiSelection(d,p){
 const dx=p.x-d.start.x,dy=p.y-d.start.y;
 if(!d.changed&&Math.hypot(dx,dy)<.65)return;
 if(!d.changed){
  snapshot();d.changed=true;
  for(const entry of d.entries){const l=layerBy(entry.id);if(!l)continue;
   entry.key=S.autoKey||Object.hasOwn(l.keys,String(S.frame))||S.frame===0?S.frame:(Object.keys(l.keys).map(Number).filter(f=>f<=S.frame).sort((a,b)=>b-a)[0]||0);
   if(!Object.hasOwn(l.keys,String(entry.key)))l.keys[entry.key]={...entry.pose};
  }
 }
 for(const entry of d.entries){const l=layerBy(entry.id);if(!l||entry.key===null)continue;
  const inverse=entry.parentInverse;
  const localX=inverse[0]*dx+inverse[2]*dy,localY=inverse[1]*dx+inverse[3]*dy;
  const pose=l.keys[entry.key];
  pose.x=rnd(entry.pose.x+localX,2);pose.y=rnd(entry.pose.y+localY,2);
 }
 renderStage();
}
function multiSelectionOverlay(){
 const layers=selectedRoots().filter(l=>effectiveVisible(l));
 if(layers.length<2)return'';
 let markup='',all=[];
 for(const l of layers){const m=getWorld(l),b=getBBox(l);const corners=[{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:b.x,y:b.y+b.h}].map(p=>matApply(m,p));
 all.push(...corners);markup+=`<polygon points="${corners.map(p=>`${rnd(p.x,2)},${rnd(p.y,2)}`).join(' ')}" fill="none" stroke="#c18b6f" stroke-dasharray="5 3" stroke-width="1.5" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
 }
 const xs=all.map(p=>p.x),ys=all.map(p=>p.y),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
 markup+=`<rect x="${rnd(x,2)}" y="${rnd(y,2)}" width="${rnd(w,2)}" height="${rnd(h,2)}" fill="none" stroke="#ad755a" stroke-width="2" stroke-dasharray="8 5" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
 return markup;
}
function beginInlineLayerRename(id){
 const l=layerBy(id);if(!l||effectiveLocked(l)){toast('名前を変更するにはロックを解除してください。');return;}
 const row=$$('#layerList .layer-row').find(el=>el.dataset.layerRow===id);if(!row)return;
 const label=row.querySelector('.layer-name');if(!label||row.querySelector('.layer-rename-input'))return;
 const input=document.createElement('input');input.type='text';input.className='layer-rename-input';input.maxLength=60;input.value=l.name;input.setAttribute('aria-label','レイヤー名を変更');
 const finish=commit=>{
  if(!input.isConnected)return;
  const next=input.value.trim();if(commit&&next&&next!==l.name){snapshot();l.name=next;mutated();}
  else {input.replaceWith(label);row.draggable=true;}
 };
 input.addEventListener('pointerdown',e=>e.stopPropagation());input.addEventListener('click',e=>e.stopPropagation());input.addEventListener('dblclick',e=>e.stopPropagation());
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();finish(true);}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(false);}});
 input.addEventListener('blur',()=>finish(true));
 row.draggable=false;label.replaceWith(input);input.focus();input.select();
}

const isFolder=l=>!!l&&(l.shape?.type==='folder'||l.type==='folder');
function folderParent(layer){const f=layerBy(layer?.folderId);return isFolder(f)&&f!==layer?f:null;}
function folderAncestry(layer){const out=[],seen=new Set([layer?.id]);let f=folderParent(layer);while(f&&!seen.has(f.id)&&out.length<32){out.push(f);seen.add(f.id);f=folderParent(f);}return out;}
function memberOfFolder(layer,folderId){return folderAncestry(layer).some(f=>f.id===folderId);}
function isFolderAncestorOfLayer(folderId,layer){return folderAncestry(layer).some(f=>f.id===folderId);}
function effectiveVisible(layer){return layer?.visible!==false&&folderAncestry(layer).every(f=>f.visible!==false);}
function effectiveLocked(layer){return !!layer?.locked||folderAncestry(layer).some(f=>f.locked);}
function lockedFolderAncestor(layer){return folderAncestry(layer).filter(f=>f.locked).at(-1)||null;}
function canTranslate(layer){return !!layer&&!lockedFolderAncestor(layer);}
function isEditBlocked(layer){return effectiveLocked(layer);}
function effectiveOpacity(layer,frame=S.frame){return folderAncestry(layer).reduce((v,f)=>v*clamp(getPose(f,frame).opacity,0,1),1);}
function layerTree(parentId=null,depth=0,includeHidden=true){if(depth>25)return[];const out=[];for(const l of doc.layers){if((l.folderId||null)!==parentId)continue;out.push({layer:l,depth});if(isFolder(l)&&(includeHidden||!S.collapsedFolders.has(l.id)))out.push(...layerTree(l.id,depth+1,includeHidden));}return out;}
function drawableLayers(){return layerTree().filter(x=>!isFolder(x.layer)).map(x=>x.layer);}
function uiLayerRows(parentId=null,depth=0){if(depth>25)return[];const out=[];for(const l of [...doc.layers].reverse()){if((l.folderId||null)!==parentId)continue;out.push({layer:l,depth});if(isFolder(l)&&!l.locked&&!S.collapsedFolders.has(l.id))out.push(...uiLayerRows(l.id,depth+1));}return out;}
function directChildren(folderId){return doc.layers.filter(l=>(l.folderId||null)===folderId);}
function folderOptions(selected){return doc.layers.filter(f=>isFolder(f)&&f.id!==selected.id&&!(isFolder(selected)&&memberOfFolder(f,selected.id)));}

const basePose=()=>({x:0,y:0,r:0,sx:1,sy:1,skew:0,opacity:1,ease:'ease'});
const matI=()=>[1,0,0,1,0,0];
const matMul=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const matT=(x,y)=>[1,0,0,1,x,y];
const matR=deg=>{let a=deg*Math.PI/180;return [Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0];};
const matS=(sx,sy)=>[sx,0,0,sy,0,0];
const matSkewX=deg=>[1,0,Math.tan(deg*Math.PI/180),1,0,0];
const matApply=(m,p)=>({x:m[0]*p.x+m[2]*p.y+m[4],y:m[1]*p.x+m[3]*p.y+m[5]});
const matInv=m=>{let d=m[0]*m[3]-m[1]*m[2];if(!d)return matI();return [m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d];};
const matString=m=>`matrix(${m.map(v=>rnd(v,6)).join(' ')})`;
function snapshot(){if(S.recording)return;S.history.push(compactHistoryState());if(S.history.length>65)S.history.shift();S.future=[];}
function saveLocal(){try{const compact={...doc,fonts:(doc.fonts||[]).map(({data,...rest})=>rest)};localStorage.setItem(SAVE_KEY,JSON.stringify(compact));}catch(e){/* large artwork may exceed storage quota */}}
function mutated({full=true}={}){saveLocal();if(full)renderAll();else renderStage();}
function getPose(layer,frame=S.frame){
 const entries=Object.entries(layer.keys||{}).map(([f,v])=>[+f,v]).sort((a,b)=>a[0]-b[0]);
 if(!entries.length)return basePose();
 if(frame<=entries[0][0])return {...basePose(),...entries[0][1]};
 if(frame>=entries.at(-1)[0])return {...basePose(),...entries.at(-1)[1]};
 for(let i=0;i<entries.length-1;i++){
   const [f0,a]=entries[i], [f1,b]=entries[i+1];if(frame<f0||frame>f1)continue;
   let t=(frame-f0)/(f1-f0),mode=a.ease||'ease';if(mode==='hold')t=0;else if(mode==='ease')t=t*t*(3-2*t);else if(mode==='easeIn')t=t*t;else if(mode==='easeOut')t=1-(1-t)*(1-t);
   const p={...basePose()};for(const prop of ['x','y','sx','sy','skew','opacity'])p[prop]=num(a[prop],p[prop])+(num(b[prop],p[prop])-num(a[prop],p[prop]))*t;
   let delta=num(b.r)-num(a.r);if(Math.abs(delta)>180&&Math.abs(delta)%360!==0)delta=((delta+540)%360)-180;
   p.r=num(a.r)+delta*t;p.ease=mode;return p;
 }
 return {...basePose(),...entries.at(-1)[1]};
}
function getParentWorld(layer,frame=S.frame,depth=0){
 if(depth>30)return matI();const folder=folderParent(layer);if(isFolder(layer))return folder?getWorld(folder,frame,depth+1):matI();
 const rig=layerBy(layer.parent);
 if(rig&&rig!==layer){const rigWorld=getWorld(rig,frame,depth+1);if(folder&&!isFolderAncestorOfLayer(folder.id,rig))return matMul(getWorld(folder,frame,depth+1),rigWorld);return rigWorld;}
 return folder?getWorld(folder,frame,depth+1):matI();
}
function getWorld(layer,frame=S.frame,depth=0){
 if(depth>30)return matI();const p=getPose(layer,frame),v=layer.pivot||{x:0,y:0};
 const local=matMul(matMul(matMul(matMul(matMul(matT(p.x,p.y),matT(v.x,v.y)),matR(p.r)),matSkewX(num(p.skew))),matS(p.sx,p.sy)),matT(-v.x,-v.y));
 return matMul(getParentWorld(layer,frame,depth+1),local);
}
function getBBox(layer){if(layer?.shape?.type==='clone'){
 const source=cloneSourceLayer(layer);
 if(!source)return{x:-20,y:-20,w:40,h:40};
 // Source geometry is stored in global canvas coordinates. Convert it into
 // the clone's *parent* space, not into its moving/rotating local pose.
 const bounds=previewWorldBounds(source);if(!bounds)return{x:-20,y:-20,w:40,h:40};
 const inv=matInv(getParentWorld(layer));const pts=[{x:bounds.x,y:bounds.y},{x:bounds.x+bounds.w,y:bounds.y},{x:bounds.x,y:bounds.y+bounds.h},{x:bounds.x+bounds.w,y:bounds.y+bounds.h}].map(pt=>matApply(inv,pt));
 const xs=pts.map(pt=>pt.x),ys=pts.map(pt=>pt.y);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
 }if(isFolder(layer)){const inv=matInv(getWorld(layer)),points=[];
 for(const child of doc.layers){if(isFolder(child)||!memberOfFolder(child,layer.id))continue;
 const box=getBBox(child),wm=matMul(inv,getWorld(child));for(const v of [{x:box.x,y:box.y},{x:box.x+box.w,y:box.y},{x:box.x,y:box.y+box.h},{x:box.x+box.w,y:box.y+box.h}])points.push(matApply(wm,v));}
 if(!points.length)return{x:-30,y:-30,w:60,h:60};const xs=points.map(p=>p.x),ys=points.map(p=>p.y);const x=Math.min(...xs),y=Math.min(...ys);return{x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y};}
 const sh=layer.shape||{};if(sh.type==='rect')return{x:sh.x,y:sh.y,w:sh.w,h:sh.h};if(sh.type==='ellipse')return{x:sh.cx-sh.rx,y:sh.cy-sh.ry,w:sh.rx*2,h:sh.ry*2};if(sh.type==='text')return textLocalBounds(sh);if(sh.type==='svg'||sh.type==='merged')return{x:-sh.w/2,y:-sh.h/2,w:sh.w,h:sh.h};if(sh.type==='image')return{x:-sh.w/2,y:-sh.h/2,w:sh.w,h:sh.h};if(sh.type==='path'){const pts=getMorphPoints(layer)||[];if(sh.extraContours?.length)pts.push(...sh.extraContours.flat());if(!pts.length)return{x:0,y:0,w:0,h:0};const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),minx=Math.min(...xs),miny=Math.min(...ys);if(sh.lineArt){const w=Math.max(...xs)-minx,h=Math.max(...ys)-miny;return{x:minx-Math.max(0,10-w)/2,y:miny-Math.max(0,10-h)/2,w:Math.max(10,w),h:Math.max(10,h)};}return{x:minx,y:miny,w:Math.max(...xs)-minx,h:Math.max(...ys)-miny};}return{x:-20,y:-20,w:40,h:40};}

// Typography is kept as editable SVG text until explicitly converted to polygons.
// Glyph layout, including Japanese vertical punctuation and sideways latin, is
// computed in one place for editor, SVG export and HTML player.
function normalizeTextShape(raw={}){
 const s=raw||{},choice=['linear','arc','circle'].includes(s.layout)?s.layout:'linear';
 return {type:'text',content:String(s.content??'FLAT MOTION').slice(0,320),fontFamily:String(s.fontFamily||'Yu Gothic, Meiryo, sans-serif').slice(0,180),fontSize:clamp(num(s.fontSize,72),8,280),fontWeight:s.fontWeight==='bold'?'bold':'normal',direction:s.direction==='vertical'?'vertical':'horizontal',layout:choice,letterSpacing:clamp(num(s.letterSpacing,0),-20,80),lineHeight:clamp(num(s.lineHeight,1.25),.7,3),columnGap:clamp(num(s.columnGap,12),0,140),maxHeight:clamp(num(s.maxHeight,420),80,2000),latinRotate:s.latinRotate!==false,arcRadius:clamp(num(s.arcRadius,180),15,1100),arcSpan:clamp(num(s.arcSpan,130),10,350),arcAngle:clamp(num(s.arcAngle,0),-180,180)};
}

// User-supplied fonts are stored in the editable FMS project and also in an
// IndexedDB font shelf for reuse across new projects (where available).
const fontFaceCache=new Map(),fontDataCache=new Map();
const FONT_DB_NAME='flatmotion-font-shelf-v1';
function openFontShelf(){return new Promise((resolve,reject)=>{
 if(!('indexedDB'in window)){resolve(null);return;}
 try{const req=indexedDB.open(FONT_DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('fonts'))req.result.createObjectStore('fonts',{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('フォント保存領域を開けません'));}catch(e){reject(e);}
});}
async function allShelfFonts(){try{const db=await openFontShelf();if(!db)return[];return await new Promise(resolve=>{const tx=db.transaction('fonts','readonly'),request=tx.objectStore('fonts').getAll();request.onsuccess=()=>resolve(request.result||[]);request.onerror=()=>resolve([]);tx.oncomplete=()=>db.close();});}catch(e){return[];}}
async function saveShelfFont(entry){try{const db=await openFontShelf();if(!db)return;await new Promise((resolve,reject)=>{const tx=db.transaction('fonts','readwrite');tx.objectStore('fonts').put(entry);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}catch(e){/* FMS save still embeds the font */}}
async function deleteShelfFont(id){try{const db=await openFontShelf();if(!db)return;await new Promise((resolve,reject)=>{const tx=db.transaction('fonts','readwrite');tx.objectStore('fonts').delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}catch(e){}}
function cleanCustomFont(f){if(!f||typeof f!=='object'||!/^FMUser_[A-Za-z0-9_]+$/.test(f.family||'')||!/^data:(?:font\/[\w.+-]+|application\/(?:octet-stream|x-font[\w.+-]*|font[\w.+-]*));base64,/i.test(String(f.data||'')))return null;
 const data=String(f.data||'');if(!/;base64,/.test(data)||data.length>30*1024*1024)return null;
 return{id:String(f.id||uid()).slice(0,32),family:String(f.family),name:String(f.name||'カスタムフォント').slice(0,110),data};}
function customFontCss(){const faces=(doc.fonts||[]).filter(f=>f?.data&&/^FMUser_[A-Za-z0-9_]+$/.test(f.family)&&doc.layers.some(l=>l.visible!==false&&(l.shape?.type==='text'&&l.shape.fontFamily===f.family||l.shape?.type==='merged'&&l.shape.fontFamilies?.includes(f.family))));if(!faces.length)return'';return `<defs><style type="text/css">${faces.map(f=>`@font-face{font-family:'${f.family}';src:url('${f.data}');font-weight:normal;font-style:normal;}@font-face{font-family:'${f.family}';src:url('${f.data}');font-weight:bold;font-style:normal;}`).join('')}</style></defs>`;}
async function activateCustomFont(f){if(!f?.data||!window.FontFace)return false;if(fontFaceCache.has(f.family))return true;
 const face=new FontFace(f.family,`url("${f.data}")`,{weight:'normal',style:'normal'});await face.load();document.fonts.add(face);fontFaceCache.set(f.family,face);fontDataCache.set(f.id,f.data);return true;}
async function prepareProjectFonts(){const old=Array.isArray(doc.fonts)?doc.fonts:[];const shelf=await allShelfFonts();const existing=new Set(old.map(x=>x.family));
 // FMS entries take priority over the browser-wide shelf.
 for(const item of shelf)if(item?.family&&!existing.has(item.family)){old.push(item);existing.add(item.family);}
 doc.fonts=old.filter(x=>x?.family&&x?.data);let loaded=0;
 for(const item of doc.fonts){try{if(await activateCustomFont(item))loaded++;}catch(e){/* one invalid font must not block others */}}
 if(loaded){renderStage();renderInspector();}
}
async function importCustomFonts(files){if(!files?.length)return;doc.fonts??=[];let added=0,first=null;
 for(const file of files){if(!/\.(?:ttf|otf|woff2?|TTF|OTF|WOFF2?)$/i.test(file.name)){toast(`${file.name}: TTF / OTF / WOFF / WOFF2 を選択してください。`);continue;}
 if(file.size>16*1024*1024){toast(`${file.name}: 16MB以下のフォントを指定してください。`);continue;}
 try{const data=await readAsDataURL(file),id=uid(),ext=file.name.split('.').pop().toLowerCase(),family='FMUser_'+id.replace(/[^A-Za-z0-9_]/g,'_');
 const entry={id,family,name:file.name.replace(/\.(?:ttf|otf|woff2?)$/i,''),data};
 if(!(await activateCustomFont(entry)))throw Error('このブラウザではフォントを読み込めません。');
 doc.fonts.push(entry);await saveShelfFont(entry);first??=entry;added++;
 }catch(e){toast(`${file.name}: ${e.message||'フォント読み込みに失敗しました。'}`);}}
 if(added){const l=sel();if(l?.shape?.type==='text'&&first&&!effectiveLocked(l)){snapshot();l.shape.fontFamily=first.family;}
 saveLocal();renderAll();toast(`${added}件のフォントを登録しました。フォント一覧から選べます。`);}
}
async function removeCustomFont(id){const f=(doc.fonts||[]).find(x=>x.id===id);if(!f)return;
 if(!confirm(`「${f.name}」を登録一覧から削除しますか？\nこのフォントを使用中の文字レイヤーは標準フォントに変更します。`))return;
 snapshot();for(const l of doc.layers)if(l.shape?.type==='text'&&l.shape.fontFamily===f.family)l.shape.fontFamily='Yu Gothic, Meiryo, sans-serif';
 doc.fonts=doc.fonts.filter(x=>x.id!==id);const face=fontFaceCache.get(f.family);if(face){document.fonts.delete(face);fontFaceCache.delete(f.family);}fontDataCache.delete(f.id);await deleteShelfFont(f.id);mutated();}

function textCharacters(str){return Array.from(String(str||''));}
function textVerticalCharacter(c){const m={'、':'︑','，':'︐','､':'︑','。':'︒','．':'︒','｡':'︒','「':'﹁','」':'﹂','『':'﹃','』':'﹄'};return m[c]||c;}
function textVerticalOffset(c,size){if('、，､。．｡'.includes(c))return {x:size*.28,y:-size*.08};if('「『'.includes(c))return {x:size*.16,y:0};if('」』'.includes(c))return {x:-size*.16,y:0};return {x:0,y:0};}
function textFontString(s){return `${s.fontWeight} ${s.fontSize}px ${s.fontFamily}`;}
function textAdvance(char,sh){const s=normalizeTextShape(sh);if(!textAdvance.ctx&&typeof document!=='undefined')textAdvance.ctx=document.createElement('canvas').getContext('2d');const ctx=textAdvance.ctx;if(!ctx)return s.fontSize*.9;try{ctx.font=textFontString(s);return Math.max(s.fontSize*.18,ctx.measureText(char).width);}catch(e){return s.fontSize*.9;}}
function textGlyphLayout(raw){const sh=normalizeTextShape(raw),size=sh.fontSize,rows=sh.content.replace(/\r/g,'').split('\n');let out=[];
 if(sh.layout==='arc'||sh.layout==='circle'){
  const chars=textCharacters(sh.content.replace(/\s*\n\s*/g,'')),n=chars.length;
  if(!n)return[];const angles=sh.layout==='circle'?360:sh.arcSpan,center=sh.arcAngle;
  chars.forEach((c,i)=>{const deg=sh.layout==='circle'?(-90+center+(i+.5)*360/n):(center+(n===1?0:(i/(n-1)-.5)*angles));const r=deg*Math.PI/180;
   // Arc baseline: middle character is high, ends descend. Circle baseline:
   // all characters sit on the circle and rotate to its tangent.
   const x=sh.layout==='circle'?Math.cos(r)*sh.arcRadius:Math.sin(r)*sh.arcRadius;
   const y=sh.layout==='circle'?Math.sin(r)*sh.arcRadius:sh.arcRadius*(1-Math.cos(r));
   out.push({char:c,x,y,rotation:sh.layout==='circle'?deg+90:deg,source:c});
  });return out;
 }
 if(sh.direction==='vertical'){
  const columns=[];let col=[],height=0,step=size*sh.lineHeight+sh.letterSpacing;
  const flush=()=>{if(col.length){columns.push(col);col=[];height=0;}};
  for(let row=0;row<rows.length;row++){if(row>0)flush();for(const c of textCharacters(rows[row])){if(col.length&&height+step>sh.maxHeight)flush();col.push(c);height+=step;}}flush();
  const gap=size+sh.columnGap,w=columns.length*gap;
  for(let colidx=0;colidx<columns.length;colidx++){
   const chars=columns[colidx],totalH=chars.length*step;
   for(let i=0;i<chars.length;i++){const source=chars[i],offset=textVerticalOffset(source,size),latin=sh.latinRotate&&/^[A-Za-z0-9Ａ-Ｚａ-ｚ０-９]$/.test(source);
    out.push({char:textVerticalCharacter(source),source,x:(columns.length-1-colidx)*gap-w/2+gap/2+offset.x,y:i*step-totalH/2+step/2+offset.y,rotation:latin?90:0});
   }
  }
  return out;
 }
 const heights=rows.length*size*sh.lineHeight;
 for(let j=0;j<rows.length;j++){const chars=textCharacters(rows[j]),width=chars.reduce((n,c)=>n+textAdvance(c,sh),0)+Math.max(0,chars.length-1)*sh.letterSpacing;let x=-width/2;
  for(const c of chars){const advance=textAdvance(c,sh);out.push({char:c,source:c,x:x+advance/2,y:(j+.5)*size*sh.lineHeight-heights/2,rotation:0});x+=advance+sh.letterSpacing;}
 }
 return out;
}
function textLocalBounds(raw){const sh=normalizeTextShape(raw),glyphs=textGlyphLayout(sh),size=sh.fontSize;if(!glyphs.length)return{x:-size/2,y:-size/2,w:size,h:size};let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const g of glyphs){const halfW=Math.max(size*.5,textAdvance(g.char,sh)*.5),halfH=size*.65,a=g.rotation*Math.PI/180,c=Math.cos(a),sn=Math.sin(a);
  for(const dx of [-halfW,halfW])for(const dy of [-halfH,halfH]){const x=g.x+c*dx-sn*dy,y=g.y+sn*dx+c*dy;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
 }
 return{x:rnd(minX,2),y:rnd(minY,2),w:rnd(maxX-minX,2),h:rnd(maxY-minY,2)};
}
function textSvgMarkup(sh,fill,stroke='none',strokeWidth=2){const s=normalizeTextShape(sh),font=esc(s.fontFamily),weight=esc(s.fontWeight);let out='';for(const g of textGlyphLayout(s)){
  out+=`<text x="${rnd(g.x,3)}" y="${rnd(g.y,3)}" transform="rotate(${rnd(g.rotation,3)} ${rnd(g.x,3)} ${rnd(g.y,3)})" font-family="${font}" font-size="${rnd(s.fontSize,2)}" font-weight="${weight}" text-anchor="middle" dominant-baseline="central" fill="${fill}" stroke="${stroke}" stroke-width="${rnd(strokeWidth,2)}" stroke-linejoin="round">${esc(g.char)}</text>`;
 }return `<g>${out}</g>`;}
// Multi-contour glyphs preserve counter-spaces (e.g. O / 日) using evenodd.
function glyphCompoundD(layer,frame=S.frame){const sh=layer.shape;let d=roundedPathD(layer,frame);for(const pts of sh.extraContours||[])d+=' '+pathD(pts,true,false,sh.extraContourBezier?'bezier':'line');return d;}

function pathD(points,closed=false,smooth=false,mode='auto'){if(!points||!points.length)return'';let d=`M ${rnd(points[0].x,2)} ${rnd(points[0].y,2)}`;if(mode==='bezier'){const n=points.length;for(let i=0;i<(closed?n:n-1);i++){const a=points[i],b=points[(i+1)%n];d+=` C ${rnd(a.x+num(a.outX),2)} ${rnd(a.y+num(a.outY),2)} ${rnd(b.x+num(b.inX),2)} ${rnd(b.y+num(b.inY),2)} ${rnd(b.x,2)} ${rnd(b.y,2)}`;}return d+(closed?' Z':'');}if(mode==='line')smooth=false;if(points.length<3||!smooth){for(let i=1;i<points.length;i++)d+=` L ${rnd(points[i].x,2)} ${rnd(points[i].y,2)}`;return d+(closed?' Z':'');}
 const n=points.length,max=closed?n:n-1;
 for(let i=0;i<max;i++){
  const a=points[closed?(i-1+n)%n:Math.max(0,i-1)],b=points[i],c=points[(i+1)%n],e=points[closed?(i+2)%n:Math.min(n-1,i+2)];
  const x1=b.x+(c.x-a.x)/6,y1=b.y+(c.y-a.y)/6,x2=c.x-(e.x-b.x)/6,y2=c.y-(e.y-b.y)/6;
  d+=` C ${rnd(x1,2)} ${rnd(y1,2)} ${rnd(x2,2)} ${rnd(y2,2)} ${rnd(c.x,2)} ${rnd(c.y,2)}`;
 }
 return d+(closed?' Z':'');
}

// Draw rounded joins non-destructively: original anchors / Bezier handles remain editable.
// Corner radii are measured after the layer/folder transform, so scaling cannot
// stretch the intended on-screen roundness into elliptical corners.
function roundedPathD(layer,frame=S.frame){
 const sh=layer.shape,rad=clamp(num(sh.cornerRadius,0),0,400),mode=sh.pathMode||(sh.smooth?'auto':'line');
 const pts=getMorphPoints(layer,frame),closed=!!sh.closed,n=pts.length;
 if(rad<.01||n<3||mode==='auto')return pathD(pts,closed,sh.smooth,mode);
 const world=getWorld(layer,frame),inverse=matInv(world),count=closed?n:n-1;
 const transform=p=>matApply(world,p),untransform=p=>matApply(inverse,p);
 const position=p=>({x:num(p.x),y:num(p.y)});
 const segments=[];
 for(let i=0;i<count;i++){
  const a=pts[i],b=pts[(i+1)%n],p0=transform(position(a)),p3=transform(position(b));
  const ca=mode==='bezier'?{x:a.x+num(a.outX),y:a.y+num(a.outY)}:{x:a.x+(b.x-a.x)/3,y:a.y+(b.y-a.y)/3};
  const cb=mode==='bezier'?{x:b.x+num(b.inX),y:b.y+num(b.inY)}:{x:b.x-(b.x-a.x)/3,y:b.y-(b.y-a.y)/3};
  segments.push([p0,transform(ca),transform(cb),p3]);
 }
 const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
 const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
 const evaluate=(c,t)=>{const u=1-t;return {x:u*u*u*c[0].x+3*u*u*t*c[1].x+3*u*t*t*c[2].x+t*t*t*c[3].x,y:u*u*u*c[0].y+3*u*u*t*c[1].y+3*u*t*t*c[2].y+t*t*t*c[3].y};};
 const split=(c,t)=>{const a=lerp(c[0],c[1],t),b=lerp(c[1],c[2],t),d=lerp(c[2],c[3],t),e=lerp(a,b,t),f=lerp(b,d,t),g=lerp(e,f,t);return [[c[0],a,e,g],[g,f,d,c[3]]];};
 const part=(c,a,b)=>{if(a<=0&&b>=1)return c;const tail=a>0?split(c,a)[1]:c;return b<1?split(tail,(b-a)/Math.max(1e-12,1-a))[0]:tail;};
 const lenData=segments.map(c=>{const steps=40,values=[0];let sum=0,last=c[0];for(let i=1;i<=steps;i++){const p=evaluate(c,i/steps);sum+=distance(last,p);values.push(sum);last=p;}return {length:sum,values};});
 function lengthToT(k,len){const d=lenData[k],target=clamp(len,0,d.length);if(target<=0)return 0;if(target>=d.length)return 1;let lo=1;while(lo<d.values.length&&d.values[lo]<target)lo++;const a=d.values[lo-1],b=d.values[lo];return ((lo-1)+(target-a)/Math.max(1e-10,b-a))/40;}
 const start=Array(count).fill(0),end=Array(count).fill(1),corners=Array(n).fill(null);
 const vec=(a,b)=>({x:b.x-a.x,y:b.y-a.y});
 const normalize=v=>{const len=Math.hypot(v.x,v.y);return len>1e-7?{x:v.x/len,y:v.y/len}:null;};
 for(let j=closed?0:1;j<(closed?n:n-1);j++){
  const prev=(j-1+count)%count,next=j%count,p=segments[prev],q=segments[next];
  const tangentIn=normalize(vec(p[2],p[3]))||normalize(vec(p[1],p[3]))||normalize(vec(p[0],p[3]));
  const tangentOut=normalize(vec(q[0],q[1]))||normalize(vec(q[0],q[2]))||normalize(vec(q[0],q[3]));
  if(!tangentIn||!tangentOut)continue;
  const dot=clamp(tangentIn.x*tangentOut.x+tangentIn.y*tangentOut.y,-1,1),turn=Math.acos(dot);
  if(turn<Math.PI/24||turn>Math.PI*.97)continue; // preserve smooth and folded vertices
  const wanted=rad*Math.tan(turn/2);
  const trim=Math.min(wanted,lenData[prev].length*.44,lenData[next].length*.44);
  if(trim<.015)continue;
  end[prev]=lengthToT(prev,lenData[prev].length-trim);
  start[next]=lengthToT(next,trim);
  corners[j]={turn};
 }
 if(!corners.some(Boolean))return pathD(pts,closed,sh.smooth,mode);
 const pieces=segments.map((c,i)=>part(c,start[i],end[i]));
 const fmt=p=>`${rnd(p.x,3)} ${rnd(p.y,3)}`;
 const from=p=>fmt(untransform(p));
 let d=`M ${from(pieces[0][0])}`;
 for(let i=0;i<count;i++){
  const seg=pieces[i];
  d+=` C ${from(seg[1])} ${from(seg[2])} ${from(seg[3])}`;
  const vertex=(i+1)%n;if(!corners[vertex])continue;
  const next=pieces[(i+1)%count],a=seg[3],b=next[0],anchor=segments[i][3];
  const vin=normalize(vec(seg[2],seg[3]))||normalize(vec(a,anchor));
  const vout=normalize(vec(next[0],next[1]))||normalize(vec(anchor,b));
  if(!vin||!vout){d+=` L ${from(b)}`;continue;}
  const k=4/3*Math.tan(corners[vertex].turn/4);
  const da=distance(a,anchor)*k,db=distance(anchor,b)*k;
  d+=` C ${from({x:a.x+vin.x*da,y:a.y+vin.y*da})} ${from({x:b.x-vout.x*db,y:b.y-vout.y*db})} ${from(b)}`;
 }
 return d+(closed?' Z':'');
}

function normalizeEffects(e={}){return {shadowOn:!!e?.shadowOn,shadowBlur:clamp(num(e?.shadowBlur,8),0,80),shadowOpacity:clamp(num(e?.shadowOpacity,.35),0,1),shadowColor:String(e?.shadowColor||'#6e5145'),shadowX:clamp(num(e?.shadowX,6),-200,200),shadowY:clamp(num(e?.shadowY,8),-200,200),edgeOn:!!e?.edgeOn,edgeSize:clamp(num(e?.edgeSize,6),0,60),edgeColor:String(e?.edgeColor||'#fff7ef'),edgePosition:e?.edgePosition==='inside'?'inside':'outside',blurOn:!!e?.blurOn,blurAmount:clamp(num(e?.blurAmount,8),0,50)};}
function vertexPressure(layer,index){return clamp(num(layer.shape?.points?.[index]?.widthScale,1),.05,15);}
function variableStrokeSamples(layer,frame=S.frame){
 const sh=layer.shape,pts=getMorphPoints(layer,frame),closed=!!sh.closed;
 if(pts.length<2)return [];
 const d=roundedPathD(layer,frame),tokens=(d.match(/[MLCZ]|[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g)||[]);
 let cursor=0,last=null,first=null;const raw=[];
 const put=(p)=>{if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return;const prev=raw[raw.length-1];if(prev&&Math.hypot(p.x-prev.x,p.y-prev.y)<.00001)return;raw.push({...p});};
 const move=(a,b,steps)=>{if(!last){put(a);first=a;}for(let i=1;i<=steps;i++)put({x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps});last=b;};
 let command='';
 while(cursor<tokens.length){if(/[MLCZ]/.test(tokens[cursor]))command=tokens[cursor++];if(command==='M'){
  const x=+tokens[cursor++],y=+tokens[cursor++];last={x,y};first=last;put(last);command='L';
 }else if(command==='L'){
  const x=+tokens[cursor++],y=+tokens[cursor++],end={x,y};if(!Number.isFinite(x)||!Number.isFinite(y))break;move(last,end,Math.max(1,Math.min(120,Math.ceil(Math.hypot(x-last.x,y-last.y)/3))));
 }else if(command==='C'){
  const nums=tokens.slice(cursor,cursor+6).map(Number);cursor+=6;if(nums.length!==6||nums.some(n=>!Number.isFinite(n)))break;
  const a=last,b={x:nums[0],y:nums[1]},c={x:nums[2],y:nums[3]},e={x:nums[4],y:nums[5]};
  const length=Math.hypot(b.x-a.x,b.y-a.y)+Math.hypot(c.x-b.x,c.y-b.y)+Math.hypot(e.x-c.x,e.y-c.y);
  const steps=Math.max(10,Math.min(200,Math.ceil(length/3)));
  for(let i=1;i<=steps;i++){const t=i/steps,u=1-t;put({x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*e.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*e.y});}last=e;
 }else if(command==='Z'){
  if(first&&last){move(last,first,Math.max(1,Math.min(120,Math.ceil(Math.hypot(first.x-last.x,first.y-last.y)/3))));}command='';
 }else break;
 }
 if(raw.length<2)return [];
 raw[0].s=0;for(let i=1;i<raw.length;i++)raw[i].s=raw[i-1].s+Math.hypot(raw[i].x-raw[i-1].x,raw[i].y-raw[i-1].y);
 const anchors=[{s:0,ratio:vertexPressure(layer,0)}];let previous=0;
 // In an open line, endpoints are *topological* anchors, not nearest-point
 // matches. They must never be reassigned to another portion of the curve.
 // Search only for genuine interior vertices; reserve the last sample for
 // the final endpoint. This also covers a line whose two ends are close.
 const lastIndex=raw.length-1;
 const interiorLimit=closed?pts.length:pts.length-1;
 for(let j=1;j<interiorLimit;j++){
  let best=Infinity,bestAt=Math.min(lastIndex-1,previous+1);
  for(let k=previous+1;k<lastIndex;k++){
   const dd=(raw[k].x-pts[j].x)**2+(raw[k].y-pts[j].y)**2;
   if(dd<best){best=dd;bestAt=k;}
  }
  if(!Number.isFinite(best))break;
  previous=bestAt;
  anchors.push({s:raw[bestAt].s,ratio:vertexPressure(layer,j)});
 }
 const end=raw[lastIndex].s;
 anchors.push({s:end,ratio:vertexPressure(layer,closed?0:pts.length-1)});
 const base=normalizeOutline(layer.lineStyle||{}),baseWidth=base.style==='dot'?base.dotSize:base.width;
 let j=0;
 for(const item of raw){while(j<anchors.length-2&&item.s>anchors[j+1].s)j++;const a=anchors[j],b=anchors[j+1],t=clamp((item.s-a.s)/Math.max(.00001,b.s-a.s),0,1);item.w=clamp(baseWidth*(a.ratio+(b.ratio-a.ratio)*t),.1,240);}
 return raw;
}
function variableStrokePointAt(points,s){s=clamp(s,0,points[points.length-1].s);let low=0,high=points.length-1;while(low+1<high){const mid=(low+high)>>1;if(points[mid].s<s)low=mid;else high=mid;}const a=points[low],b=points[high],t=clamp((s-a.s)/Math.max(1e-9,b.s-a.s),0,1);return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,w:a.w+(b.w-a.w)*t,s};}
function variableStrokeShape(points,closed=false,roundCaps=true){if(points.length<2)return'';
 const normalAt=(i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;return {x:-dy/len,y:dx/len};};
 const left=[],right=[];for(let i=0;i<points.length;i++){const p=points[i],n=normalAt(i),r=p.w/2;left.push([p.x+n.x*r,p.y+n.y*r]);right.push([p.x-n.x*r,p.y-n.y*r]);}
 const fmt=(p)=>`${rnd(p[0],3)} ${rnd(p[1],3)}`;
 let d='M '+fmt(left[0])+left.slice(1).map(p=>' L '+fmt(p)).join('');
 if(!closed&&roundCaps){const r=Math.max(.05,points[points.length-1].w/2);d+=` A ${rnd(r,3)} ${rnd(r,3)} 0 0 0 ${fmt(right[right.length-1])}`;}
 else d+=' L '+fmt(right[right.length-1]);
 d+=right.slice(0,-1).reverse().map(p=>' L '+fmt(p)).join('');
 if(!closed&&roundCaps){const r=Math.max(.05,points[0].w/2);d+=` A ${rnd(r,3)} ${rnd(r,3)} 0 0 0 ${fmt(left[0])}`;}
 return d+' Z';
}
function variableWidthLineMarkup(layer,frame=S.frame,colorOverride){const samples=variableStrokeSamples(layer,frame);if(samples.length<2)return'';
 const style=normalizeOutline(layer.lineStyle||{}),fill=colorOverride||style.color,closed=!!layer.shape.closed,total=samples.at(-1).s;
 if(style.style==='solid')return `<path data-variable-stroke="true" d="${variableStrokeShape(samples,closed,true)}" fill="${esc(fill)}"/>`;
 if(style.style==='dot'){
  const step=Math.max(.5,style.dotSize+style.dotGap),parts=[];
  for(let d=0;d<=total+.001;d+=step){const pt=variableStrokePointAt(samples,d);parts.push(`<circle cx="${rnd(pt.x,3)}" cy="${rnd(pt.y,3)}" r="${rnd(pt.w/2,3)}" fill="${esc(fill)}"/>`);if(parts.length>5000)break;}
  return `<g data-variable-stroke="true">${parts.join('')}</g>`;
 }
 const pieces=[],dash=Math.max(.5,style.dashLength),gap=Math.max(.2,style.dashGap);
 for(let begin=0;begin<total;begin+=dash+gap){const end=Math.min(total,begin+dash),section=[variableStrokePointAt(samples,begin)];for(const pt of samples)if(pt.s>begin&&pt.s<end)section.push(pt);section.push(variableStrokePointAt(samples,end));
  pieces.push(`<path d="${variableStrokeShape(section,false,false)}" fill="${esc(fill)}"/>`);if(pieces.length>2000)break;}
 return `<g data-variable-stroke="true">${pieces.join('')}</g>`;
}

function lineArtStrokeAttrs(layer,colorOverride){
 const o=normalizeOutline(layer.lineStyle||{}),color=esc(colorOverride||o.color),dot=o.style==='dot';
 const width=dot?o.dotSize:o.width;
 const cap=o.style==='dash'?'butt':'round';
 const dash=o.style==='dash'?` stroke-dasharray="${rnd(o.dashLength,2)} ${rnd(Math.max(.2,o.dashGap),2)}"`:dot?` stroke-dasharray="0 ${rnd(Math.max(.5,o.dotSize+o.dotGap),2)}"`:'';
 return `fill="none" stroke="${color}" stroke-width="${rnd(width,2)}" stroke-linecap="${cap}" stroke-linejoin="round"${dash}`;
}
function lineArtMarkup(layer,frame=S.frame,colorOverride){const sh=layer.shape;return sh.points?.some(p=>Math.abs(num(p.widthScale,1)-1)>.001)?variableWidthLineMarkup(layer,frame,colorOverride):`<path d="${roundedPathD(layer,frame)}" ${lineArtStrokeAttrs(layer,colorOverride)}/>`;}
function normalizeOutline(o={}){const style=['solid','dash','dot'].includes(o?.style)?o.style:'solid';return {on:!!o?.on,style,width:clamp(num(o?.width,4),0.1,120),color:String(o?.color||'#47332b'),dashLength:clamp(num(o?.dashLength,16),1,100),dashGap:clamp(num(o?.dashGap,8),0,100),dotSize:clamp(num(o?.dotSize,4),0.5,120),dotGap:clamp(num(o?.dotGap,10),0,100),placement:['inside','center','outside'].includes(o?.placement)?o.placement:'center'};}
function layerEffects(layer){if(!layer.effects)layer.effects=normalizeEffects();else layer.effects=normalizeEffects(layer.effects);return layer.effects;}
function layerOutline(layer){if(!layer.outline)layer.outline=normalizeOutline();else layer.outline=normalizeOutline(layer.outline);return layer.outline;}
function fxColorMix(a,b,t){const hex=v=>/^#[a-fA-F0-9]{6}$/.test(v||'')?v:'#000000';a=hex(a);b=hex(b);return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');}
function getEffectsAt(layer,frame=S.frame){const base=normalizeEffects(layer.effects);const keys=Object.entries(layer.effectKeys||{}).map(([f,v])=>[+f,v]).filter(([f,v])=>Number.isFinite(f)&&v&&typeof v==='object').sort((a,b)=>a[0]-b[0]);if(!keys.length)return base;
 if(keys[0][0]>0)keys.unshift([0,base]);
 if(frame<=keys[0][0])return normalizeEffects(keys[0][1]);
 if(frame>=keys.at(-1)[0])return normalizeEffects(keys.at(-1)[1]);
 for(let i=0;i<keys.length-1;i++){const [a,p]=keys[i],[b,q]=keys[i+1];if(frame<a||frame>b)continue;
 const from=normalizeEffects(p),to=normalizeEffects(q),t=easingT((frame-a)/(b-a),p.ease||'ease'),out={...from};
 for(const field of ['shadowBlur','shadowOpacity','shadowX','shadowY','edgeSize','blurAmount'])out[field]=from[field]+(to[field]-from[field])*t;
 for(const field of ['shadowColor','edgeColor'])out[field]=fxColorMix(from[field],to[field],t);
 // Mode/visibility changes are stepped at a keyframe, never blended.
 if(frame===b)for(const field of ['shadowOn','edgeOn','edgePosition','blurOn'])out[field]=to[field];
 return out;}
 return base;}
function setFxKey(layer,field,value){if(!layer||effectiveLocked(layer))return;
 const current=getEffectsAt(layer,S.frame),next={...current,[field]:value};
 if(S.frame===0){layer.effects=normalizeEffects(next);}
 if(!layer.effectKeys)layer.effectKeys={};
 if(S.frame>0&&!Object.hasOwn(layer.effectKeys,'0'))layer.effectKeys['0']=normalizeEffects(layer.effects);
 layer.effectKeys[String(S.frame)]={...normalizeEffects(next),ease:layer.effectKeys[S.frame]?.ease||'ease'};
}
function addEffectKey(){const l=sel();if(!l||effectiveLocked(l))return;snapshot();const v=getEffectsAt(l,S.frame);if(!l.effectKeys)l.effectKeys={};if(S.frame>0&&!l.effectKeys['0'])l.effectKeys['0']=normalizeEffects(l.effects);l.effectKeys[S.frame]={...normalizeEffects(v),ease:'ease'};if(S.frame===0)l.effects=normalizeEffects(v);mutated();toast('エフェクトキーを追加しました。');}
function removeEffectKey(){const l=sel();if(!l||!l.effectKeys?.[S.frame]||effectiveLocked(l))return;if(S.frame===0){toast('開始フレームのエフェクトキーは削除できません。');return;}snapshot();delete l.effectKeys[S.frame];mutated();}
function effectFilterId(layer,prefix){return `fm_fx_${prefix}_${doc.layers.indexOf(layer)}`;}
function effectFilterMarkup(layer,prefix,frame=S.frame){const fx=getEffectsAt(layer,frame);if(!fx.shadowOn&&!fx.edgeOn&&!fx.blurOn)return'';const id=effectFilterId(layer,prefix),w=Math.max(1,doc.width),h=Math.max(1,doc.height);
 let defs=`<filter id="${id}" x="${-w}" y="${-h}" width="${w*3}" height="${h*3}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">`;
 if(fx.shadowOn){defs+=`<feGaussianBlur in="SourceAlpha" stdDeviation="${rnd(fx.shadowBlur,2)}" result="fmShadowBlur"/><feOffset in="fmShadowBlur" dx="${rnd(fx.shadowX,2)}" dy="${rnd(fx.shadowY,2)}" result="fmShadowOffset"/><feFlood flood-color="${esc(fx.shadowColor)}" flood-opacity="${rnd(fx.shadowOpacity,4)}" result="fmShadowColor"/><feComposite in="fmShadowColor" in2="fmShadowOffset" operator="in" result="fmShadow"/>`;}
 if(fx.edgeOn){
  const inside=fx.edgePosition==='inside';
  defs+=`<feMorphology in="SourceAlpha" operator="${inside?'erode':'dilate'}" radius="${rnd(fx.edgeSize,2)}" result="fmEdgeMorph"/>`;
  defs+=`<feComposite in="${inside?'SourceAlpha':'fmEdgeMorph'}" in2="${inside?'fmEdgeMorph':'SourceAlpha'}" operator="out" result="fmEdgeAlpha"/><feFlood flood-color="${esc(fx.edgeColor)}" flood-opacity="1" result="fmEdgeColor"/><feComposite in="fmEdgeColor" in2="fmEdgeAlpha" operator="in" result="fmEdge"/>`;
 }
 defs+='<feMerge result="fmComposited">'+(fx.shadowOn?'<feMergeNode in="fmShadow"/>':'')+(fx.edgeOn&&fx.edgePosition==='outside'?'<feMergeNode in="fmEdge"/>':'')+'<feMergeNode in="SourceGraphic"/>'+(fx.edgeOn&&fx.edgePosition==='inside'?'<feMergeNode in="fmEdge"/>':'')+'</feMerge>';
 if(fx.blurOn)defs+=`<feGaussianBlur in="fmComposited" stdDeviation="${rnd(fx.blurAmount,2)}" result="fmBlurred"/>`;
 defs+='</filter>';
 return `<defs>${defs}</defs>`;}
function outlineConfig(layer){const o=layerOutline(layer);if(!o.on)return null;if(o.style==='dash')return {color:o.color,width:o.width,dash:`${rnd(o.dashLength,2)} ${rnd(o.dashGap,2)}`,linecap:'round'};if(o.style==='dot')return {color:o.color,width:o.dotSize,dash:`0 ${rnd(o.dotGap,2)}`,linecap:'round'};return {color:o.color,width:o.width,dash:'',linecap:'round'};}
// The source Bézier path is unchanged. For closed shapes the visible half of
// a double-width stroke is clipped/masked to place it inside or outside.
// Open curves have no interior: they remain centered.
function fmPlacedOutlinePath(d,cfg,layer,key,closed=true){
 const placement=layerOutline(layer).placement;
 const base=`fill="none" stroke="${esc(cfg.color)}" stroke-width="${rnd(cfg.width*(placement==='center'||!closed?1:2),2)}" stroke-linecap="${cfg.linecap}" stroke-linejoin="round"${cfg.dash?` stroke-dasharray="${cfg.dash}"`:''}`;
 if(!closed||placement==='center')return `<path d="${d}" ${base}/>`;
 const id=`fm_outline_place_${String(layer.id).replace(/[^A-Za-z0-9_-]/g,'')}_${key}`;
 if(placement==='inside')return `<defs><clipPath id="${id}" clipPathUnits="userSpaceOnUse"><path d="${d}" fill-rule="evenodd"/></clipPath></defs><path d="${d}" ${base} clip-path="url(#${id})"/>`;
 return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-100000" y="-100000" width="200000" height="200000"><rect x="-100000" y="-100000" width="200000" height="200000" fill="white"/><path d="${d}" fill="black" fill-rule="evenodd"/></mask></defs><path d="${d}" ${base} mask="url(#${id})"/>`;
}
function rectWorldScale(layer,frame=S.frame){const m=getWorld(layer,frame);return [Math.max(0.0001,Math.hypot(m[0],m[1])),Math.max(0.0001,Math.hypot(m[2],m[3]))];}
function rectCornerSpec(sh,scaleX=1,scaleY=1){
 const x=num(sh.x),y=num(sh.y),w=Math.max(0,num(sh.w)),h=Math.max(0,num(sh.h));
 const sx=Math.max(0.0001,Math.abs(scaleX)),sy=Math.max(0.0001,Math.abs(scaleY));
 const round=Math.max(0,num(sh.rx,0)),inset=Math.max(0,num(sh.insetRadius,0));
 const active=Array.isArray(sh.insetCorners)?sh.insetCorners:['tr'];
 const cs={};for(const corner of ['tl','tr','br','bl']){
  const concave=inset>0&&active.includes(corner),r=concave?inset:round;
  // One screen/canvas-space radius translates into different LOCAL x/y
  // radii under anisotropic scaling, producing the same visual circular arc.
  cs[corner]={rx:Math.min(w/2,r/sx),ry:Math.min(h/2,r/sy),concave};
 }
 return {x,y,w,h,cs};
}
function rectPathD(sh,scaleX=1,scaleY=1){
 const {x,y,w,h,cs}=rectCornerSpec(sh,scaleX,scaleY),a=x+w,b=y+h;
 const X=corner=>cs[corner].rx,Y=corner=>cs[corner].ry;
 const arc=(corner,ex,ey)=>{const c=cs[corner];return c.rx>0&&c.ry>0?` A ${rnd(c.rx,3)} ${rnd(c.ry,3)} 0 0 ${c.concave?0:1} ${rnd(ex,3)} ${rnd(ey,3)}`:` L ${rnd(ex,3)} ${rnd(ey,3)}`;};
 return `M ${rnd(x+X('tl'),3)} ${rnd(y,3)} L ${rnd(a-X('tr'),3)} ${rnd(y,3)}`+
 arc('tr',a,y+Y('tr'))+` L ${rnd(a,3)} ${rnd(b-Y('br'),3)}`+
 arc('br',a-X('br'),b)+` L ${rnd(x+X('bl'),3)} ${rnd(b,3)}`+
 arc('bl',x,b-Y('bl'))+` L ${rnd(x,3)} ${rnd(y+Y('tl'),3)}`+
 arc('tl',x+X('tl'),y)+' Z';
}
function rectShapeSvg(sh,attrs,scaleX=1,scaleY=1){
 const {cs}=rectCornerSpec(sh,scaleX,scaleY),active=Array.isArray(sh.insetCorners)?sh.insetCorners:['tr'];
 const needsInset=num(sh.insetRadius,0)>0&&active.length>0;
 if(!needsInset){const c=cs.tl;return `<rect x="${sh.x}" y="${sh.y}" width="${sh.w}" height="${sh.h}" rx="${rnd(c.rx,3)}" ry="${rnd(c.ry,3)}" ${attrs}/>`;}
 return `<path d="${rectPathD(sh,scaleX,scaleY)}" ${attrs}/>`;
}
function rectContourPoints(sh,scaleX=1,scaleY=1){
 const {x,y,w,h,cs}=rectCornerSpec(sh,scaleX,scaleY),a=x+w,b=y+h,pts=[];
 function add(pt){if(!pts.length||Math.hypot(pts.at(-1).x-pt.x,pts.at(-1).y-pt.y)>0.01)pts.push({x:rnd(pt.x,3),y:rnd(pt.y,3)});}
 add({x:x+cs.tl.rx,y});
 const corners=[
 ['tr',{x:a-cs.tr.rx,y},{x:a,y:y+cs.tr.ry},cs.tr.concave?{x:a,y,from:Math.PI,to:Math.PI/2}:{x:a-cs.tr.rx,y:y+cs.tr.ry,from:-Math.PI/2,to:0}],
 ['br',{x:a,y:b-cs.br.ry},{x:a-cs.br.rx,y:b},cs.br.concave?{x:a,y:b,from:-Math.PI/2,to:-Math.PI}:{x:a-cs.br.rx,y:b-cs.br.ry,from:0,to:Math.PI/2}],
 ['bl',{x:x+cs.bl.rx,y:b},{x,y:b-cs.bl.ry},cs.bl.concave?{x,y:b,from:0,to:-Math.PI/2}:{x:x+cs.bl.rx,y:b-cs.bl.ry,from:Math.PI/2,to:Math.PI}],
 ['tl',{x,y:y+cs.tl.ry},{x:x+cs.tl.rx,y},cs.tl.concave?{x,y,from:Math.PI/2,to:0}:{x:x+cs.tl.rx,y:y+cs.tl.ry,from:Math.PI,to:Math.PI*1.5}]
 ];
 for(const [key,start,end,arc] of corners){add(start);if(!cs[key].rx||!cs[key].ry){add(end);continue;}const steps=Math.max(6,Math.ceil(Math.max(cs[key].rx,cs[key].ry)/7));for(let i=1;i<=steps;i++){const angle=arc.from+(arc.to-arc.from)*i/steps;add({x:arc.x+Math.cos(angle)*cs[key].rx,y:arc.y+Math.sin(angle)*cs[key].ry});}}
 if(pts.length>1&&Math.hypot(pts.at(-1).x-pts[0].x,pts.at(-1).y-pts[0].y)<0.01)pts.pop();return pts;
}
function vectorOutlineSvg(layer,frame=S.frame){
 const sh=layer.shape,cfg=outlineConfig(layer);
 if(!cfg||!['rect','ellipse','path'].includes(sh?.type))return'';
 let d='';
 if(sh.type==='rect'){const [sx,sy]=rectWorldScale(layer,frame);d=rectPathD(sh,sx,sy);}
 else if(sh.type==='ellipse'){
  const {cx,cy,rx,ry}=sh;
  d=`M ${rnd(cx-rx,4)} ${rnd(cy,4)} A ${rnd(rx,4)} ${rnd(ry,4)} 0 1 0 ${rnd(cx+rx,4)} ${rnd(cy,4)} A ${rnd(rx,4)} ${rnd(ry,4)} 0 1 0 ${rnd(cx-rx,4)} ${rnd(cy,4)} Z`;
 }else d=roundedPathD(layer,frame);
 return fmPlacedOutlinePath(d,cfg,layer,'vector',sh.type!=='path'||!!sh.closed);
}

// Morph keys use stable vertex indices, so the animation stays editable in SVG.
function easingT(t,mode){if(mode==='hold')return 0;if(mode==='ease')return t*t*(3-2*t);if(mode==='easeIn')return t*t;if(mode==='easeOut')return 1-(1-t)*(1-t);return t;}
function copyPts(points){return (points||[]).map(p=>({x:num(p.x),y:num(p.y)}));}
function interpolatePoints(keys,frame,fallback){const entries=Object.entries(keys||{}).map(([f,v])=>[+f,v]).filter(([f,v])=>Number.isFinite(f)&&Array.isArray(v?.points)&&v.points.length===fallback.length).sort((a,b)=>a[0]-b[0]);
 if(!entries.length)return copyPts(fallback);
 if(frame<=entries[0][0])return copyPts(entries[0][1].points);
 if(frame>=entries.at(-1)[0])return copyPts(entries.at(-1)[1].points);
 for(let i=0;i<entries.length-1;i++){const [f0,a]=entries[i],[f1,b]=entries[i+1];if(frame<f0||frame>f1)continue;const t=easingT((frame-f0)/(f1-f0),a.ease||'ease');return a.points.map((p,j)=>({x:p.x+(b.points[j].x-p.x)*t,y:p.y+(b.points[j].y-p.y)*t}));}
 return copyPts(fallback);
}
function getMorphPoints(layer,frame=S.frame){const pts=interpolatePoints(layer.morphKeys,frame,layer.shape.points||[]);return pts.map((p,i)=>({...layer.shape.points[i],x:p.x,y:p.y}));}
function meshRest(mesh){const b=mesh.bounds,pts=[];for(let y=0;y<=mesh.rows;y++)for(let x=0;x<=mesh.cols;x++)pts.push({x:b.x+b.w*x/mesh.cols,y:b.y+b.h*y/mesh.rows});return pts;}
function getMeshPoints(layer,frame=S.frame){return layer.mesh?interpolatePoints(layer.mesh.keys,frame,meshRest(layer.mesh)):[];}
function affineFromTriangles(a,b,c,p,q,r){const x1=b.x-a.x,y1=b.y-a.y,x2=c.x-a.x,y2=c.y-a.y,det=x1*y2-y1*x2;if(Math.abs(det)<1e-7)return matI();
 const a0=((q.x-p.x)*y2-(r.x-p.x)*y1)/det,c0=((r.x-p.x)*x1-(q.x-p.x)*x2)/det;
 const b0=((q.y-p.y)*y2-(r.y-p.y)*y1)/det,d0=((r.y-p.y)*x1-(q.y-p.y)*x2)/det;
 return [a0,b0,c0,d0,p.x-a0*a.x-c0*a.y,p.y-b0*a.x-d0*a.y];}
function meshMarkup(layer,frame,prefix){const mesh=layer.mesh;if(!mesh)return shapeMarkup(layer,frame,prefix);const rest=meshRest(mesh),dst=getMeshPoints(layer,frame),cols=mesh.cols,rows=mesh.rows;const patterned=normalizeTexture(layer.texture).type!=='none';const sh=patterned?'':shapeMarkup(layer,frame,prefix);let clips='',faces='',index=0;
 function tri(ia,ib,ic){const a=rest[ia],b=rest[ib],c=rest[ic],p=dst[ia],q=dst[ib],r=dst[ic];if(Math.abs((q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x))<1e-6)return;const id='fm_'+prefix+'_'+layer.id+'_'+index++;
 // Adjacent SVG triangle clips can reveal hairline cracks due to alpha anti-aliasing.
 // Overlap each clip slightly without changing the piecewise-affine source transform.
 const center={x:(p.x+q.x+r.x)/3,y:(p.y+q.y+r.y)/3};
 const expand=v=>{const dx=v.x-center.x,dy=v.y-center.y,len=Math.hypot(dx,dy)||1;return {x:v.x+dx/len*1.6,y:v.y+dy/len*1.6};};
 const [p0,q0,r0]=[p,q,r].map(expand);
 const d=`M ${rnd(p0.x,4)} ${rnd(p0.y,4)} L ${rnd(q0.x,4)} ${rnd(q0.y,4)} L ${rnd(r0.x,4)} ${rnd(r0.y,4)} Z`;
 clips+=`<clipPath id="${id}" clipPathUnits="userSpaceOnUse"><path d="${d}"/></clipPath>`;
 const deform=affineFromTriangles(a,b,c,p,q,r);
 const faceMarkup=patterned?shapeMarkup(layer,frame,prefix+'_mesh_'+index,deform):sh;
 faces+=`<g clip-path="url(#${id})"><g transform="${matString(deform)}">${faceMarkup}</g></g>`;
 }
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const i=y*(cols+1)+x;tri(i,i+1,i+cols+2);tri(i,i+cols+2,i+cols+1);}
 return `<defs>${clips}</defs>${faces}`;
}
function layerMarkup(layer,frame,prefix){return layer.mesh?meshMarkup(layer,frame,prefix):shapeMarkup(layer,frame,prefix);}
// Raster sketch is stored as a transparent, embedded PNG inside a regular image layer.
function rasterCanvas(){const c=document.createElement('canvas');c.width=doc.width;c.height=doc.height;return c;}
function createRasterLayer(){snapshot();const c=rasterCanvas();const l=newLayer({type:'image',raster:true,w:doc.width,h:doc.height,data:c.toDataURL('image/png')},doc.width/2,doc.height/2,'ラフ（ラスター）',{worldCoordinates:true});setSingleSelection(l.id);mutated();setTool('raster');toast('ラスターレイヤーを追加しました。');}
function activeRaster(){const l=sel();return l?.shape?.raster&&!l.shape.threeD&&l.shape.type==='image'&&!effectiveLocked(l)?l:null;}
function rasterLocalPoint(layer,p){const q=matApply(matInv(getWorld(layer)),p);return{x:q.x+layer.shape.w/2,y:q.y+layer.shape.h/2};}
// Pointer Events supplies pressure in [0,1] for a supported stylus. Browsers report
// 0.5 while a mouse button is down, so non-stylus pointers must use full brush size.
function rasterPressureValue(e,enabled){
 if(!enabled||e.pointerType!=='pen')return 1;
 const v=Number(e.pressure);
 return Number.isFinite(v)?clamp(v,0,1):.5;
}
function rasterSample(layer,e,pressureEnabled){
 const point=rasterLocalPoint(layer,ptFromEvent(e));
 return {x:point.x,y:point.y,pressure:rasterPressureValue(e,pressureEnabled)};
}
function rasterWidth(d,pressure){
 if(!d.pressureEnabled||!d.isPen)return d.size;
 // Keep a visible tip even when devices report pressure=0 on initial contact/lift.
 return d.size*(.12+.88*Math.pow(clamp(pressure,0,1),.85));
}
function rasterDrawSegment(d,a,b){
 const ctx=d.ctx,wa=rasterWidth(d,a.pressure),wb=rasterWidth(d,b.pressure);
 const distance=Math.hypot(b.x-a.x,b.y-a.y);
 // Draw a union of overlapping round dabs so variable-width strokes never split.
 // A single path/fill also avoids pressure-dependent opacity buildup.
 const spacing=Math.max(.25,Math.min(wa,wb)*.28);
 const count=Math.max(1,Math.ceil(distance/spacing));
 ctx.save();
 ctx.globalCompositeOperation=d.mode==='eraser'?'destination-out':'source-over';
 ctx.fillStyle=d.mode==='eraser'?'#000':d.color;
 ctx.beginPath();
 for(let i=0;i<=count;i++){
  const t=count===0?0:i/count;
  const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
  const radius=Math.max(.06,(wa+(wb-wa)*t)/2);
  ctx.moveTo(x+radius,y);
  ctx.arc(x,y,radius,0,Math.PI*2);
 }
 ctx.fill();
 ctx.restore();
}
function rasterApplyPoint(d,point,force=false){
 const strength=d.stabilize/100;
 const delta=force?1:Math.max(.06,1-strength*.93);
 const prev=d.last;
 const target={
  x:prev.x+(point.x-prev.x)*delta,
  y:prev.y+(point.y-prev.y)*delta,
  pressure:prev.pressure+(point.pressure-prev.pressure)*(force?1:Math.max(.25,delta))
 };
 rasterDrawSegment(d,prev,target);
 d.last=target;
 d.rawLast=point;
 d.sampleCount++;
}
function rasterQueuePaint(d,layer){
 if(d.paintQueued)return;
 d.paintQueued=true;
 requestAnimationFrame(()=>{
  d.paintQueued=false;
  if(S.drag===d&&d.ready){
   layer.shape.data=d.canvas.toDataURL('image/png');
   renderStage();
  }
 });
}
function rasterStart(e,p){
 const layer=activeRaster();
 if(!layer){toast('先に「＋ ラスター」でラスターレイヤーを作成・選択してください。');return;}
 const canvas=document.createElement('canvas');canvas.width=layer.shape.w;canvas.height=layer.shape.h;
 const context=canvas.getContext('2d',{willReadFrequently:false});
 const pressureEnabled=S.rasterPressure;
 const first=rasterSample(layer,e,pressureEnabled);
 const d={type:'raster',id:layer.id,canvas,ctx:context,points:[first],pointerId:e.pointerId,
  ready:false,ended:false,last:first,rawLast:first,sampleCount:1,
  mode:S.rasterMode,size:S.rasterSizes[S.rasterMode],color:S.color,
  isPen:e.pointerType==='pen',pressureEnabled,stabilize:S.rasterStabilize};
 S.drag=d;ART.setPointerCapture(e.pointerId);
 const img=new Image();
 img.onload=()=>{
  if(S.drag!==d)return;
  context.drawImage(img,0,0,canvas.width,canvas.height);
  snapshot();d.ready=true;
  const points=d.points;
  d.last=points[0];d.rawLast=points[0];d.sampleCount=1;
  rasterDrawSegment(d,d.last,d.last);
  for(let i=1;i<points.length;i++)rasterApplyPoint(d,points[i]);
  layer.shape.data=canvas.toDataURL('image/png');renderStage();
  if(d.ended)rasterFinish(d);
 };
 img.onerror=()=>{if(S.drag===d){S.drag=null;toast('ラスター画像を読み込めませんでした。');}};
 img.src=layer.shape.data;
}
function rasterMove(e){
 const d=S.drag;
 if(!d||d.type!=='raster'||e.pointerId!==d.pointerId)return;
 const layer=layerBy(d.id);if(!layer)return;
 // Coalesced samples preserve the pressure and resolution of fast tablet strokes.
 const events=e.type==='pointermove'&&typeof e.getCoalescedEvents==='function'?e.getCoalescedEvents():null;
 const samples=events?.length?events:[e];
 for(const event of samples){
  const point=rasterSample(layer,event,d.pressureEnabled);
  if(!d.ready){d.points.push(point);continue;}
  rasterApplyPoint(d,point);
 }
 if(d.ready)rasterQueuePaint(d,layer);
}
function rasterFinish(d){
 const layer=layerBy(d.id);
 if(d.ready&&layer){
  // The smoothing filter lags behind the pointer. Flush its tail at stroke end.
  // For a tap, the initial dot has already been drawn at the proper pressure.
  if(d.sampleCount>1){
   const last=d.rawLast;
   for(let i=0;i<6;i++)rasterApplyPoint(d,last,i===5);
  }
  layer.shape.data=d.canvas.toDataURL('image/png');
  saveLocal();renderAll();
 }
 if(S.drag===d)S.drag=null;
}
function initMesh(layer,divisions=2){if(!layer)return;const b=getBBox(layer),w=Math.max(1,b.w),h=Math.max(1,b.h);const mesh={cols:divisions,rows:divisions,bounds:{x:b.x,y:b.y,w,h},keys:{}};mesh.keys['0']={points:meshRest(mesh),ease:'ease'};layer.mesh=mesh;}
function convertToPath(layer){const sh=layer.shape;if(sh.type==='path')return true;let points=[];
 if(sh.type==='rect'){points=rectContourPoints(sh);}
 else if(sh.type==='ellipse'){for(let i=0;i<24;i++){const a=i*Math.PI*2/24;points.push({x:sh.cx+Math.cos(a)*sh.rx,y:sh.cy+Math.sin(a)*sh.ry});}}
 else return false;
 layer.shape={type:'path',points,closed:true,smooth:false};delete layer.morphKeys;return true;
}
function editDeformPoint(d,p){const layer=layerBy(d.id);if(!layer||layer.locked)return;const local=matApply(matInv(getWorld(layer)),p),current={x:rnd(local.x,2),y:rnd(local.y,2)};
 const kind=d.type==='morph'?'morphKeys':'mesh';const old=d.initial[d.index];if(!d.changed&&dist(old,current)<.25)return;
 if(!d.changed){snapshot();d.changed=true;
 if(kind==='morphKeys'){if(!layer.morphKeys)layer.morphKeys={'0':{points:copyPts(layer.shape.points),ease:'ease'}};layer.morphKeys[S.frame]={points:copyPts(d.initial),ease:'ease'};}
 else {layer.mesh.keys[S.frame]={points:copyPts(d.initial),ease:'ease'};}}
 const keys=kind==='morphKeys'?layer.morphKeys:layer.mesh.keys;keys[S.frame].points[d.index]=current;renderStage();
}
function resetDeformFrame(kind){const l=sel();if(!l||l.locked)return;const attr=kind==='morph'?'morphKeys':'mesh';const keys=kind==='morph'?l.morphKeys:l.mesh?.keys;if(!keys){toast('変形キーがありません。');return;}
 snapshot();const pts=kind==='morph'?copyPts(l.shape.points):meshRest(l.mesh);
 keys[S.frame]={points:pts,ease:'ease'};mutated();}
function clearDeform(kind){const l=sel();if(!l||l.locked)return;snapshot();if(kind==='morph')delete l.morphKeys;else delete l.mesh;mutated();}
function applyDeformPreset(name){const l=sel();if(!l||l.locked)return;const isMesh=S.tool==='mesh'||!!l.mesh&&S.tool!=='node';if(!isMesh&&l.shape.type!=='path'){toast('頂点変形ではパスのパーツを選択してください。');return;}
 if(isMesh&&!l.mesh){snapshot();initMesh(l,2);}else snapshot();
 const keys=isMesh?l.mesh.keys:(l.morphKeys||(l.morphKeys={'0':{points:copyPts(l.shape.points),ease:'ease'}}));const rest=isMesh?meshRest(l.mesh):copyPts(l.shape.points),base=isMesh?getMeshPoints(l):getMorphPoints(l),bbox=isMesh?l.mesh.bounds:getBBox(l),start=S.frame,mid=clamp(start+Math.round(doc.fps*.5),0,total()-1),end=clamp(start+doc.fps,0,total()-1);
 if(end<=start){toast('終了間際のフレームでは適用できません。');return;}
 const warped=base.map(p=>{const nx=(p.x-bbox.x)/Math.max(1,bbox.w),ny=(p.y-bbox.y)/Math.max(1,bbox.h);if(name==='sway')return{x:rnd(p.x+Math.sin(ny*Math.PI*.5)*22,2),y:rnd(p.y-ny*5,2)};
 return{x:rnd(bbox.x+bbox.w/2+(p.x-(bbox.x+bbox.w/2))*1.09,2),y:rnd(bbox.y+bbox.h/2+(p.y-(bbox.y+bbox.h/2))*.89,2)};});
 if(!Object.hasOwn(keys,String(start)))keys[start]={points:copyPts(base),ease:'ease'};keys[mid]={points:warped,ease:'ease'};keys[end]={points:copyPts(base),ease:'ease'};
 mutated();toast(name==='sway'?'揺れの変形キーを追加しました。':'伸縮の変形キーを追加しました。');
}

// A gradient is stored in the object's local coordinate system, so it follows
// parenting, folder transforms, rotation, scaling and animation automatically.
function cleanGradientColor(c,fallback){return typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)?c:fallback;}
function normalizeGradient(raw){if(!raw||typeof raw!=='object')return null;
 return {type:raw.type==='radial'?'radial':'linear',mode:raw.mode==='two'?'two':'fade',color1:cleanGradientColor(raw.color1,'#c78b7b'),color2:cleanGradientColor(raw.color2,'#fffaf3'),x1:clamp(num(raw.x1,0),-100000,100000),y1:clamp(num(raw.y1,0),-100000,100000),x2:clamp(num(raw.x2,100),-100000,100000),y2:clamp(num(raw.y2,0),-100000,100000)};
}
function isGradientTarget(layer){return !!layer&&!isFolder(layer)&&['rect','ellipse','path','svg','image','text'].includes(layer.shape?.type);}
function gradientDefaultsFor(layer){const b=getBBox(layer),isLine=layer.shape?.type==='path'&&layer.shape.lineArt;
 return normalizeGradient({...S.gradientDefaults,color1:layer.fill||S.color,x1:b.x+(isLine?.05:.15)*b.w,y1:b.y+b.h/2,x2:b.x+b.w*.85,y2:b.y+b.h/2});
}
function gradientId(layer,prefix){return `fm_grad_${prefix}_${doc.layers.indexOf(layer)}`;}
function gradientSvg(layer,prefix){if(!isGradientTarget(layer)||!layer.gradient)return {defs:'',url:''};const g=normalizeGradient(layer.gradient);if(!g)return {defs:'',url:''};const id=gradientId(layer,prefix),radius=Math.max(.001,Math.hypot(g.x2-g.x1,g.y2-g.y1));
 const start=`<stop offset="0%" stop-color="${esc(g.color1)}" stop-opacity="1"/>`,end=`<stop offset="100%" stop-color="${esc(g.mode==='fade'?g.color1:g.color2)}" stop-opacity="${g.mode==='fade'?'0':'1'}"/>`;
 const attr=g.type==='radial'?`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${rnd(g.x1,3)}" cy="${rnd(g.y1,3)}" r="${rnd(radius,3)}" fx="${rnd(g.x1,3)}" fy="${rnd(g.y1,3)}">`:`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${rnd(g.x1,3)}" y1="${rnd(g.y1,3)}" x2="${rnd(g.x2,3)}" y2="${rnd(g.y2,3)}">`;
 return {defs:`<defs>${attr}${start}${end}${g.type==='radial'?'</radialGradient>':'</linearGradient>'}</defs>`,url:`url(#${id})`};
}
function currentGradientSettings(){const layer=sel();return normalizeGradient(layer?.gradient)||{...S.gradientDefaults};}
function gradientToolPanel(){const layer=sel(),ok=isGradientTarget(layer),g=currentGradientSettings();
 const colorStart=cleanGradientColor(g.color1,layer?.fill||S.color),colorEnd=cleanGradientColor(g.color2,'#fffaf3');
 return `<section class="prop-section gradient-tool-panel"><div class="prop-heading"><strong>グラデーション</strong><span class="prop-chip blue">GRADIENT</span></div>
 <div class="prop-tip">${ok?`対象：<b>${esc(layer.name)}</b>。オブジェクト上をドラッグして向きと範囲を指定します。`:'まずキャンバスのオブジェクトをクリックして選択してください。'} 線状はドラッグ始点→終点、円状は始点が中心・終点までが半径です。</div>
 <fieldset class="gradient-radio"><legend>グラデーションの形</legend><label><input type="radio" name="gradientType" data-gradient="type" value="linear" ${g.type==='linear'?'checked':''}> 線状</label><label><input type="radio" name="gradientType" data-gradient="type" value="radial" ${g.type==='radial'?'checked':''}> 円状（中心から外）</label></fieldset>
 <fieldset class="gradient-radio"><legend>色の変化</legend><label><input type="radio" name="gradientMode" data-gradient="mode" value="fade" ${g.mode==='fade'?'checked':''}> 色 → 透明</label><label><input type="radio" name="gradientMode" data-gradient="mode" value="two" ${g.mode==='two'?'checked':''}> 色 → 色</label></fieldset>
 <div class="prop-row"><label>始点の色</label><label class="color-control"><input type="color" data-gradient="color1" value="${esc(colorStart)}"><span>${esc(colorStart.toUpperCase())}</span></label></div>
 <div class="prop-row"><label>終点の色</label><label class="color-control"><input type="color" data-gradient="color2" value="${esc(colorEnd)}" ${g.mode==='fade'?'disabled':''}><span>${g.mode==='fade'?'透明':esc(colorEnd.toUpperCase())}</span></label></div>
 <div class="prop-control-row"><button class="soft-btn" data-action="resetGradient" ${!layer?.gradient?'disabled':''}>グラデーションを解除</button></div>
 <div class="prop-tip">ドラッグ後も色や種類をいつでも変更できます。オブジェクトを回転・移動するとグラデーションも追従します。</div>
 </section>`;
}
function updateGradientSetting(input,{live=false}={}){const field=input.dataset.gradient;if(!field)return;const l=sel(),eligible=isGradientTarget(l)&&!effectiveLocked(l);const isColor=field==='color1'||field==='color2';const value=input.value;
 if(eligible){if(live&&!input.dataset.gradientDirty){snapshot();input.dataset.gradientDirty='1';}else if(!live&&!input.dataset.gradientDirty)snapshot();
  const g=normalizeGradient(l.gradient)||gradientDefaultsFor(l);g[field]=value;l.gradient=normalizeGradient(g);S.gradientDefaults={...S.gradientDefaults,[field]:value};saveLocal();renderStage();if(!live){delete input.dataset.gradientDirty;renderInspector();}}
 else {S.gradientDefaults={...S.gradientDefaults,[field]:value};if(!live)renderInspector();}
}
function gradientDragOverlay(){if(S.tool!=='gradient'||S.playing)return'';const l=sel();if(!isGradientTarget(l)||!effectiveVisible(l))return'';let g=l.gradient?normalizeGradient(l.gradient):null;
 if(S.drag?.type==='gradient'&&S.drag.changed){g={...(S.drag.preview||g)};}
 if(!g)return'';const m=getWorld(l),a=matApply(m,{x:g.x1,y:g.y1}),b=matApply(m,{x:g.x2,y:g.y2}),radius=Math.max(2,dist(a,b));
 return `<g pointer-events="none" opacity=".92">${g.type==='radial'?`<circle cx="${rnd(a.x,2)}" cy="${rnd(a.y,2)}" r="${rnd(radius,2)}" fill="none" stroke="#c87d63" stroke-width="1.5" stroke-dasharray="7 5" vector-effect="non-scaling-stroke"/>`:''}<line x1="${rnd(a.x,2)}" y1="${rnd(a.y,2)}" x2="${rnd(b.x,2)}" y2="${rnd(b.y,2)}" stroke="#a45b40" stroke-width="2" stroke-dasharray="6 3" vector-effect="non-scaling-stroke"/><circle cx="${rnd(a.x,2)}" cy="${rnd(a.y,2)}" r="7" fill="#fff7e9" stroke="#a45b40" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="${rnd(b.x,2)}" cy="${rnd(b.y,2)}" r="6" fill="#a45b40" stroke="#fff9f3" stroke-width="2" vector-effect="non-scaling-stroke"/></g>`;
}

function trianglePoints(x,y,w,h,down=false){return down?[{x,y},{x:x+w,y},{x:x+w/2,y:y+h}]:[{x:x+w/2,y},{x:x+w,y:y+h},{x,y:y+h}];}
// Fill patterns use SVG primitives so preview and exported SVG/PNG/PSD share the same geometry.
function normalizeTexture(v){const t=v&&typeof v==='object'?v:{};return {type:['none','dots','stripes'].includes(t.type)?t.type:'none',dotSize:clamp(num(t.dotSize,8),1,150),dotGap:clamp(num(t.dotGap,12),0,200),stripeWidth:clamp(num(t.stripeWidth,12),1,200),stripeGap:clamp(num(t.stripeGap,12),0,200),angle:clamp(num(t.angle,0),-180,180),color1:cleanGradientColor(t.color1,'#553f36'),color2:cleanGradientColor(t.color2,'#f8e7c7'),mode:t.mode==='two'?'two':'fade'};}
function textureSvg(layer,prefix,frame=S.frame,deform=null){const t=normalizeTexture(layer.texture);if(t.type==='none'||layer.fillHidden)return {defs:'',url:''};const id='fm_tex_'+prefix+'_'+doc.layers.indexOf(layer);const angle=rnd(t.angle,2),background=esc(layer.fill||'#c78b7b');let tile='',size;
 // Counteract the full world transform (including parent folders and keyframes).
 // The pattern remains aligned to the artboard, while only its clipping shape deforms.
 const world=deform?matMul(getWorld(layer,frame),deform):getWorld(layer,frame);
 const inverse=matInv(world);
 const patternTransform=`${matString(inverse)} rotate(${angle})`;
 if(t.type==='dots'){
  size=t.dotSize+t.dotGap;tile=`<rect width="${size}" height="${size}" fill="${background}"/><circle cx="${rnd(size/2,3)}" cy="${rnd(size/2,3)}" r="${rnd(t.dotSize/2,3)}" fill="${esc(t.color1)}"/>`;
 }else{
  size=t.stripeWidth+t.stripeGap;tile=`${t.mode==='two'?`<rect width="${size}" height="${size}" fill="${esc(t.color2)}"/>`:''}<rect width="${t.stripeWidth}" height="${size}" fill="${esc(t.color1)}"/>`;
 }
 return {defs:`<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="${rnd(size,3)}" height="${rnd(size,3)}" patternTransform="${patternTransform}">${tile}</pattern></defs>`,url:`url(#${id})`};
}
function isTextureTarget(layer){return !!layer&&!isFolder(layer)&&!layer.shape?.lineArt&&['rect','ellipse','path','text','svg','image'].includes(layer.shape?.type)&&!layer.shape?.threeD;}
function textureInspector(layer){if(!isTextureTarget(layer))return '';const t=normalizeTexture(layer.texture);const control=(key,label,min,max,unit='px')=>`<div class="fm-texture-slider"><label>${label} <output data-texture-output="${key}">${rnd(t[key],0)}${unit}</output></label><input type="range" data-texture="${key}" min="${min}" max="${max}" step="1" value="${t[key]}"></div>`;
 return `<section class="prop-section fm-texture-panel"><div class="prop-heading"><strong>オブジェクトのテクスチャ</strong><span class="prop-chip">PATTERN</span></div><div class="prop-row"><label>パターン</label><select data-texture="type"><option value="none" ${t.type==='none'?'selected':''}>なし（通常の塗り）</option><option value="dots" ${t.type==='dots'?'selected':''}>ドット ●</option><option value="stripes" ${t.type==='stripes'?'selected':''}>ストライプ ▥</option></select></div>${t.type==='none'?'<div class="prop-tip">ドット・ストライプの模様を選択したオブジェクトに適用できます。模様は変形に影響されずサイズと角度を維持します。</div>':`${t.type==='dots'?control('dotSize','ドットの大きさ',1,150)+control('dotGap','ドットの間隔',0,200):control('stripeWidth','ストライプの太さ',1,200)+control('stripeGap','ストライプの間隔',0,200)}${control('angle','角度',-180,180,'°')}<div class="prop-row"><label>${t.type==='dots'?'ドット色':'ストライプ色 A'}</label><input type="color" data-texture="color1" value="${t.color1}"></div>${t.type==='dots'?'<div class="prop-tip">下地には「カラー・輪郭」の塗り色を使います。</div>':`<fieldset class="gradient-radio"><legend>ストライプの配色</legend><label><input type="radio" name="textureMode" data-texture="mode" value="fade" ${t.mode==='fade'?'checked':''}> 指定色＋透明</label><label><input type="radio" name="textureMode" data-texture="mode" value="two" ${t.mode==='two'?'checked':''}> 指定色＋指定色</label></fieldset>${t.mode==='two'?`<div class="prop-row"><label>ストライプ色 B</label><input type="color" data-texture="color2" value="${t.color2}"></div>`:''}`}`}</section>`;
}
function changeTextureInput(input,final=false){const l=sel();if(!isTextureTarget(l)||effectiveLocked(l))return;const field=input.dataset.texture;if(!field)return;if(!input.dataset.liveDirty){snapshot();input.dataset.liveDirty='1';}const t=normalizeTexture(l.texture);t[field]=['type','mode','color1','color2'].includes(field)?input.value:num(input.value,t[field]);l.texture=normalizeTexture(t);const output=document.querySelector(`[data-texture-output="${field}"]`);if(output)output.textContent=rnd(l.texture[field],0)+(field==='angle'?'°':'px');renderStage();if(final){delete input.dataset.liveDirty;saveLocal();renderInspector();}}

function shapeMarkup(layer,frame=S.frame,prefix='stage',deform=null){
 const sh=layer.shape;if(!sh)return'';
 const tex=textureSvg(layer,prefix,frame,deform),gr=tex.url?{defs:'',url:''}:gradientSvg(layer,prefix),hasFill=!!(gr.url||tex.url)&&!layer.fillHidden;
 const stroke=layer.strokeOn?esc(layer.stroke||'#453029'):'none',fill=layer.fillHidden?'none':tex.url||gr.url||esc(layer.fill||'#c78b7b');
 const st=`fill="${fill}" stroke="${stroke}" stroke-width="${rnd(layer.strokeWidth||2,2)}" stroke-linecap="round" stroke-linejoin="round"`;
 const outline=vectorOutlineSvg(layer,frame);
 if(sh.type==='merged')return sh.markup||'';
 if(sh.type==='text')return tex.defs+gr.defs+textSvgMarkup(sh,fill,stroke,layer.strokeWidth);
 if(sh.type==='rect'){const [sx,sy]=rectWorldScale(layer,frame);return tex.defs+gr.defs+rectShapeSvg(sh,st,sx,sy)+outline;}
 if(sh.type==='ellipse')return tex.defs+gr.defs+`<ellipse cx="${sh.cx}" cy="${sh.cy}" rx="${sh.rx}" ry="${sh.ry}" ${st}/>`+outline;
 if(sh.type==='path'&&sh.lineArt){return gr.defs+lineArtMarkup(layer,frame,gr.url||null);}
 if(sh.type==='path'){
  const d=sh.extraContours?.length?glyphCompoundD(layer,frame):roundedPathD(layer,frame);
  const rule=sh.extraContours?.length?'evenodd':'nonzero';
  if(sh.generatedOutlinePlacement&&sh.generatedOutlinePlacement!=='center'){
   const id='fm-generated-outline-'+String(layer.id).replace(/[^a-zA-Z0-9_-]/g,'');
   const outside=sh.generatedOutlinePlacement==='outside';
   const mask=outside?`<mask id="${id}" maskUnits="userSpaceOnUse" x="-100000" y="-100000" width="200000" height="200000"><rect x="-100000" y="-100000" width="200000" height="200000" fill="white"/><path d="${d}" fill="black" fill-rule="${rule}"/></mask>`:`<clipPath id="${id}"><path d="${d}" clip-rule="${rule}"/></clipPath>`;
   const attr=outside?`mask="url(#${id})"`:`clip-path="url(#${id})"`;
   return tex.defs+gr.defs+`<defs>${mask}</defs><path d="${d}" fill="none" stroke="${stroke}" stroke-width="${rnd((layer.strokeWidth||2)*2,2)}" stroke-linecap="round" stroke-linejoin="round" ${attr}/>`+outline;
  }
  return tex.defs+gr.defs+`<path d="${d}" fill-rule="${rule}" fill="${sh.closed&&!layer.fillHidden?fill:'none'}" stroke="${stroke}" stroke-width="${rnd(layer.strokeWidth||2,2)}" stroke-linecap="round" stroke-linejoin="round"/>`+outline;
 }
 if(sh.type==='svg'||sh.type==='image'){
  const content=sh.type==='svg'?`<g transform="translate(${-sh.vx-sh.w/2} ${-sh.vy-sh.h/2})">${sh.markup}</g>`:`<image href="${esc(sh.data)}" x="${-sh.w/2}" y="${-sh.h/2}" width="${sh.w}" height="${sh.h}" preserveAspectRatio="xMidYMid meet"/>`;
  if(!gr.url&&!tex.url)return content;
  const b=getBBox(layer),id=gradientId(layer,prefix)+'_alpha';
  return `${tex.defs}${gr.defs}<defs><mask id="${id}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="${rnd(b.x-2,3)}" y="${rnd(b.y-2,3)}" width="${rnd(b.w+4,3)}" height="${rnd(b.h+4,3)}" mask-type="alpha" style="mask-type:alpha">${content}</mask></defs><rect x="${rnd(b.x-2,3)}" y="${rnd(b.y-2,3)}" width="${rnd(b.w+4,3)}" height="${rnd(b.h+4,3)}" fill="${tex.url||gr.url}" mask="url(#${id})"/>`;
 }
 return'';
}
// A layer OR a folder is a single stack item.  Clipping is resolved between
// siblings at the same folder depth; a run of clipped items shares the first
// non-clipped item directly beneath it.  A folder supplies its composited alpha.
function clipBaseFor(layer){
 if(!layer)return null;
 const siblings=directChildren(layer.folderId||null);
 const index=siblings.indexOf(layer);
 for(let i=index-1;i>=0;i--){
  if(!siblings[i].clipToBelow)return siblings[i];
 }
 return null;
}
function clipMaskId(base,prefix){return `fm_clip_${prefix}_${doc.layers.indexOf(base)}`;}
// Render an individual stack item, including the contents of a folder, as an
// isolated SVG group.  Children's world transforms already include folder
// transforms; only folder alpha is applied by the wrapper (once per group).
// Procedural repeat placement.  Copies are virtual; saved source geometry is untouched.
function normalizeRepeat(value={}){
 const v=value&&typeof value==='object'?value:{};
 return {enabled:!!v.enabled,
  mode:['rect','circle','line'].includes(v.mode)?v.mode:'circle',
  copies:clamp(Math.round(num(v.copies,7)),0,48),
  angle:clamp(num(v.angle,0),-180,180),
  width:clamp(num(v.width,260),20,1200),height:clamp(num(v.height,180),20,1000),
  radius:clamp(num(v.radius,130),10,600),length:clamp(num(v.length,360),0,1500),
  gap:clamp(num(v.gap,0),-120,240)};
}
// Keep path dimensions (circle radius / rectangle size / line baseline) independent
// from the edge-to-edge gap.  Items are placed along a fixed geometric path.
function repeatFootprint(layer,frame=S.frame){
 const b=getBBox(layer),angle=normalizeRepeat(layer.repeat).angle*Math.PI/180;
 // Approximates the projected painted extent including the object's own rotation.
 const alongX=Math.abs(Math.cos(angle))*b.w+Math.abs(Math.sin(angle))*b.h;
 const alongY=Math.abs(Math.sin(angle))*b.w+Math.abs(Math.cos(angle))*b.h;
 return {x:Math.max(1,alongX),y:Math.max(1,alongY),circle:Math.max(1,alongX,alongY)};
}
function repeatPoints(raw,footprint={x:1,y:1,circle:1}){
 const r=normalizeRepeat(raw),count=r.copies+1;
 if(!r.enabled||!r.copies)return[{x:0,y:0}];
 let pts=[];
 if(r.mode==='line'){
  // Width/height do not change: each item's edge clearance is based on
  // its projected width plus the requested gap.  length is a baseline spread.
  const extent=Math.max(1,num(footprint.x,1));
  const step=Math.max(.25,extent+r.gap);
  // length is a minimum overall center-to-center span (not modified by gap).
  // Gap always acts on the objects, including when length is zero.
  const baseStep=Math.max(0,(r.length-Math.max(0,r.copies)*extent)/Math.max(1,r.copies));
  const distance=step+baseStep;
  for(let i=0;i<count;i++)pts.push({x:(i-(count-1)/2)*distance,y:0});
 }else if(r.mode==='circle'){
  const radius=Math.max(1,r.radius); // NEVER add gap to the radius.
  const footprintPx=Math.max(1,num(footprint.circle,1));
  const chord=clamp(footprintPx+r.gap,.25,2*radius);
  const requestedAngle=2*Math.asin(clamp(chord/(2*radius),0,1));
  // Do not wind around more than one circle and unexpectedly stack copies.
  const stepAngle=Math.min(requestedAngle,Math.PI*2/count);
  const arc=stepAngle*(count-1),start=-Math.PI/2-arc/2;
  for(let i=0;i<count;i++){
   const a=start+i*stepAngle;
   pts.push({x:Math.cos(a)*radius,y:Math.sin(a)*radius});
  }
 }else{
  const width=Math.max(2,r.width),height=Math.max(2,r.height); // fixed outline
  const perimeter=2*(width+height);
  const footprintPx=Math.max(1,num(footprint.circle,1));
  const step=Math.min(Math.max(.25,footprintPx+r.gap),perimeter/count);
  // Walk the perimeter; slider changes distance between items, not dimensions.
  for(let i=0;i<count;i++){
   let d=i*step;
   if(d<width)pts.push({x:-width/2+d,y:-height/2});
   else if((d-=width)<height)pts.push({x:width/2,y:-height/2+d});
   else if((d-=height)<width)pts.push({x:width/2-d,y:height/2});
   else pts.push({x:-width/2,y:height/2-(d-width)});
  }
 }
 return pts;
}
function repeatMatrix(layer,frame,dx,dy,angle,center){
 const world=getWorld(layer,frame),inv=matInv(world);
 const around=matMul(matMul(matT(center.x+dx,center.y+dy),matR(angle)),matT(-center.x,-center.y));
 return matMul(matMul(world,around),inv);
}
function repeatBBox(layer,frame=S.frame){
 const b=getBBox(layer),r=normalizeRepeat(layer.repeat);if(!r.enabled||!r.copies)return b;
 const center={x:b.x+b.w/2,y:b.y+b.h/2},angle=r.angle*Math.PI/180;
 const pts=repeatPoints(r,repeatFootprint(layer,frame)),corners=[{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:b.x,y:b.y+b.h}];
 let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
 for(const offset of pts)for(const corner of corners){
  const cx=corner.x-center.x,cy=corner.y-center.y;
  const x=center.x+offset.x+cx*Math.cos(angle)-cy*Math.sin(angle);
  const y=center.y+offset.y+cx*Math.sin(angle)+cy*Math.cos(angle);
  left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
 }
 return {x:left,y:top,w:right-left,h:bottom-top};
}

// Linked clone: source geometry, rig and animation are read on every frame.
// No rasterization, no snapshots and no duplicated editable control points.
function cloneSourceLayer(clone){const source=layerBy(clone?.shape?.sourceId);return source&&source.id!==clone.id&&source.shape?.type!=='clone'?source:null;}
// Live union of the visible vector geometry in a linked folder. Each cubic
// Bezier segment is only split at intersections; shared interior edges vanish.
// SVG artwork and merged vector objects are also vector layers. Earlier
// versions incorrectly restricted the union to rect/ellipse/path, making
// perfectly valid imported SVGs fail the closed-vector check.
function fmSvgNodeMatrix(node){
 const raw=node.getAttribute('transform')||'';
 if(!raw)return matI();
 try{const dm=new DOMMatrix(raw);return [dm.a,dm.b,dm.c,dm.d,dm.e,dm.f];}catch(_){
  let total=matI();const re=/(matrix|translate|scale|rotate)\s*\(([^)]*)\)/gi;let match;
  while((match=re.exec(raw))){const n=match[2].trim().split(/[\s,]+/).map(Number);let a=matI();
   if(match[1]==='matrix'&&n.length===6)a=n;
   else if(match[1]==='translate')a=matT(n[0]||0,n[1]||0);
   else if(match[1]==='scale')a=[n[0]||1,0,0,n.length>1?n[1]:n[0]||1,0,0];
   else if(match[1]==='rotate'){const radians=(n[0]||0)*Math.PI/180;a=n.length>2?matMul(matMul(matT(n[1],n[2]),matR(radians)),matT(-n[1],-n[2])):matR(radians);}
   total=matMul(total,a);
  }return total;
 }
}
function fmSvgPathContours(d,world){
 const tokens=(d||'').match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)||[];
 const argc={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7,Z:0};
 const output=[];let command='',i=0,point={x:0,y:0},first=null,contour=[],lastControl=null,lastQuadratic=null,prev='';
 const point2=(x,y,rel)=>({x:(rel?point.x:0)+x,y:(rel?point.y:0)+y});
 const flush=()=>{if(contour.length){output.push(contour);contour=[];}};
 while(i<tokens.length){
  if(/^[a-zA-Z]$/.test(tokens[i]))command=tokens[i++];
  if(!command)break;const upper=command.toUpperCase(),relative=command!==upper;
  if(!(upper in argc))throw Error('SVGのパスコマンド '+upper+' に未対応です');
  if(upper==='Z'){
   if(first&&point&&Math.hypot(point.x-first.x,point.y-first.y)>1e-7)contour.push(fmBzLine(point,first));
   if(contour.length>=2)flush();else contour=[];
   point=first||point;lastControl=null;lastQuadratic=null;prev='Z';command='';continue;
  }
  const count=argc[upper];if(i+count>tokens.length||tokens.slice(i,i+count).some(t=>/^[a-zA-Z]$/.test(t)))break;
  const vals=tokens.slice(i,i+count).map(Number);i+=count;
  if(upper==='M'){
   flush();point=point2(vals[0],vals[1],relative);first={...point};command=relative?'l':'L';lastControl=null;lastQuadratic=null;prev='M';continue;
  }
  let next=null,seg=null;
  if(upper==='L')next=point2(vals[0],vals[1],relative);
  else if(upper==='H')next={x:(relative?point.x:0)+vals[0],y:point.y};
  else if(upper==='V')next={x:point.x,y:(relative?point.y:0)+vals[0]};
  else if(upper==='C'){
   const a=point2(vals[0],vals[1],relative),b=point2(vals[2],vals[3],relative);next=point2(vals[4],vals[5],relative);
   seg=[point,a,b,next];lastControl=b;
  }else if(upper==='S'){
   const a=['C','S'].includes(prev)&&lastControl?{x:2*point.x-lastControl.x,y:2*point.y-lastControl.y}:point;
   const b=point2(vals[0],vals[1],relative);next=point2(vals[2],vals[3],relative);
   seg=[point,a,b,next];lastControl=b;
  }else if(upper==='Q'||upper==='T'){
   const q=upper==='Q'?point2(vals[0],vals[1],relative):(['Q','T'].includes(prev)&&lastQuadratic?{x:2*point.x-lastQuadratic.x,y:2*point.y-lastQuadratic.y}:point);
   next=upper==='Q'?point2(vals[2],vals[3],relative):point2(vals[0],vals[1],relative);
   seg=[point,{x:point.x+2*(q.x-point.x)/3,y:point.y+2*(q.y-point.y)/3},{x:next.x+2*(q.x-next.x)/3,y:next.y+2*(q.y-next.y)/3},next];lastQuadratic=q;
  }else if(upper==='A'){
   next=point2(vals[5],vals[6],relative);
   const local=fmBzParse(`M ${point.x} ${point.y} A ${vals[0]} ${vals[1]} ${vals[2]} ${vals[3]} ${vals[4]} ${next.x} ${next.y}`,matI());
   contour.push(...local);point=next;lastControl=null;lastQuadratic=null;prev='A';continue;
  }
  if(!seg)seg=fmBzLine(point,next);
  contour.push(seg);point=next;prev=upper;
  if(!['C','S'].includes(upper))lastControl=null;
  if(!['Q','T'].includes(upper))lastQuadratic=null;
 }
 // Open SVG subpaths have no filled region; they cannot contribute to a
 // silhouette union (the caller may still display their strokes separately).
 return output.map(loop=>loop.map(seg=>seg.map(q=>matApply(world,q))));
}
function fmSvgMarkupContours(layer,frame=S.frame){
 const shape=layer.shape,offset=shape.type==='svg'?matT(-num(shape.vx)-num(shape.w)/2,-num(shape.vy)-num(shape.h)/2):matI();
 const parser=new DOMParser(),root=parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${shape.markup||''}</svg>`,'image/svg+xml').documentElement;
 const result=[];let skipped=0;
 const parsePoints=raw=>(raw||'').trim().split(/[\s,]+/).map(Number);
 const walk=(node,parent)=>{
  if(node.nodeType!==1)return;
  const tag=node.localName.toLowerCase();if(['defs','clippath','mask','lineargradient','radialgradient'].includes(tag))return;
  const m=matMul(parent,fmSvgNodeMatrix(node));
  const n=k=>num(node.getAttribute(k),0);const poly=pts=>pts.length>=3?[pts.map((pt,j)=>fmBzLine(pt,pts[(j+1)%pts.length]).map(p=>matApply(m,p)))]:[];
  let loops=[];
  if(tag==='path')loops=fmSvgPathContours(node.getAttribute('d'),m);
  else if(tag==='rect'){
   const x=n('x'),y=n('y'),w=n('width'),h=n('height'),rx=n('rx'),ry=n('ry');
   const temp={shape:{type:'rect',x,y,w,h,rx:Math.max(rx,ry),insetRadius:0},keys:{'0':basePose()}};
   loops=[fmBzParse(rectPathD(temp.shape),m)];
  }else if(tag==='circle'||tag==='ellipse'){
   const x=n('cx'),y=n('cy'),rx=tag==='circle'?n('r'):n('rx'),ry=tag==='circle'?n('r'):n('ry'),k=.5522847498307936;
   const p=[{x:x+rx,y},{x,y:y+ry},{x:x-rx,y},{x,y:y-ry},{x:x+rx,y}];
   const c1=[{x:x+rx,y:y+k*ry},{x:x-k*rx,y:y+ry},{x:x-rx,y:y-k*ry},{x:x+k*rx,y:y-ry}];
   const c2=[{x:x+k*rx,y:y+ry},{x:x-rx,y:y+k*ry},{x:x-k*rx,y:y-ry},{x:x+rx,y:y-k*ry}];
   loops=[Array.from({length:4},(_,j)=>[p[j],c1[j],c2[j],p[j+1]].map(t=>matApply(m,t)))];
  }else if(tag==='polygon'){
   const points=parsePoints(node.getAttribute('points')),pts=[];
   for(let i=0;i+1<points.length;i+=2)pts.push({x:points[i],y:points[i+1]});loops=poly(pts);
  }else if(tag==='line'||tag==='polyline'||tag==='text'||tag==='image')skipped++;
  result.push(...loops.filter(loop=>loop.length>=2));
  for(const child of node.children)walk(child,m);
 };
 walk(root,matMul(getWorld(layer,frame),offset));
 if(!result.length&&skipped)throw Error('このSVGは線またはテキストのみで、閉じた外周を取得できません');
 return result;
}
// Convert a visible OPEN vector stroke into a closed vector stroke footprint.
// The original path remains untouched. Its centreline is evaluated as cubic
// Bezier geometry; offsets use short vector segments (not a raster trace),
// including circular caps. These footprints participate in the SAME boolean
// union as closed shapes, so hidden overlaps do not receive an inner outline.
function fmOpenStrokeContours(layer,frame=S.frame){
 const sh=layer.shape;
 if(sh?.type!=='path'||sh.closed||!Array.isArray(sh.points)||sh.points.length<2)return [];
 const m=getWorld(layer,frame),anchors=getMorphPoints(layer,frame),line=!!sh.lineArt;
 const style=normalizeOutline(line?layer.lineStyle||{width:4}:{});
 const width=line?(style.style==='dot'?style.dotSize:style.width):num(layer.strokeWidth,3);
 // Scale from the local path space, consistent with the source's transform.
 const scale=(Math.hypot(m[0],m[1])+Math.hypot(m[2],m[3]))/2;
 const radius=Math.max(.05,width*scale/2);
 const source=fmBzParse(roundedPathD(layer,frame),m);
 if(!source.length)return [];
 const samples=[];
 // Keep the amount of geometry bounded for long freehand strokes.
 // These points describe vector boundaries, not bitmap pixels.
 for(const segment of source){
  const length=Array.from({length:9},(_,i)=>fmBzAt(segment,i/8)).reduce((sum,p,i,arr)=>i?sum+Math.hypot(p.x-arr[i-1].x,p.y-arr[i-1].y):0,0);
  const steps=Math.min(12,Math.max(1,Math.ceil(length/18)));
  for(let j=0;j<steps;j++){
   const t=j/steps,p=fmBzAt(segment,t),d=fmBzTan(segment,t);
   const len=Math.hypot(d.x,d.y);
   const tan=len>1e-8?{x:d.x/len,y:d.y/len}:null;
   samples.push({p,tan});
  }
 }
 const last=source.at(-1),d=fmBzTan(last,1),dlen=Math.hypot(d.x,d.y);
 samples.push({p:last[3],tan:dlen>1e-8?{x:d.x/dlen,y:d.y/dlen}:null});
 // Limit pathological freehand input: preserve endpoints while avoiding O(n²)
 // intersections across thousands of raw stylus points.
 if(samples.length>90){const dense=samples.slice();samples.length=0;for(let i=0;i<90;i++)samples.push(dense[Math.round(i*(dense.length-1)/89)]);}
 if(samples.length<2)return [];
 // Tangents at degenerate curve endpoints fall back to neighbouring vertices.
 for(let i=0;i<samples.length;i++){
  if(samples[i].tan)continue;
  const before=samples[Math.max(0,i-1)].p,after=samples[Math.min(samples.length-1,i+1)].p;
  const dx=after.x-before.x,dy=after.y-before.y,sz=Math.hypot(dx,dy)||1;
  samples[i].tan={x:dx/sz,y:dy/sz};
 }
 // Uniform sections are enough for constant-width lines. For pressure-based
 // freehand strokes interpolate the widthScale at the original path anchors.
 const widths=anchors.map(a=>Math.max(.05,num(a.widthScale,1)));
 const pieces=source.length;
 const offset=(s,sign,index)=>{
  const segIndex=Math.min(pieces-1,Math.floor(index/Math.max(1,(samples.length-1)/pieces)));
  const blend=pieces>0?(index/(samples.length-1))*pieces-segIndex:0;
  const weight=line?widths[Math.min(segIndex,widths.length-1)]*(1-Math.max(0,Math.min(1,blend)))+widths[Math.min(segIndex+1,widths.length-1)]*Math.max(0,Math.min(1,blend)):1;
  return {x:s.p.x-sign*s.tan.y*radius*weight,y:s.p.y+sign*s.tan.x*radius*weight};
 };
 const left=samples.map((q,i)=>offset(q,1,i)),right=samples.map((q,i)=>offset(q,-1,i));
 const contour=[];
 for(let i=1;i<left.length;i++)contour.push(fmBzLine(left[i-1],left[i]));
 // Two quarter-circle cubics are used for each semicircular endpoint cap.
 const quarter=(a,b,c,ta,tb)=>{
  const k=.5522847498307936;
  return [a,{x:a.x+ta.x*k,y:a.y+ta.y*k},{x:b.x-tb.x*k,y:b.y-tb.y*k},b];
 };
 const cap=(p,t,r,forward)=>{
  const n={x:-t.y,y:t.x},start=forward?{x:p.x+n.x*r,y:p.y+n.y*r}:{x:p.x-n.x*r,y:p.y-n.y*r};
  const mid={x:p.x+(forward?t.x:-t.x)*r,y:p.y+(forward?t.y:-t.y)*r};
  const end=forward?{x:p.x-n.x*r,y:p.y-n.y*r}:{x:p.x+n.x*r,y:p.y+n.y*r};
  // Tangents point from +normal to forward to -normal (and inverse at start).
  const ta=forward?t:{x:-t.x,y:-t.y};
  const atMid=forward?{x:-n.x,y:-n.y}:n;
  const atEnd=forward?{x:-t.x,y:-t.y}:t;
  const k=.5522847498307936;
  return [[start,{x:start.x+ta.x*r*k,y:start.y+ta.y*r*k},{x:mid.x-atMid.x*r*k,y:mid.y-atMid.y*r*k},mid],
   [mid,{x:mid.x+atMid.x*r*k,y:mid.y+atMid.y*r*k},{x:end.x-atEnd.x*r*k,y:end.y-atEnd.y*r*k},end]];
 };
 const endSample=samples.at(-1),startSample=samples[0];
 const endRadius=Math.hypot(left.at(-1).x-endSample.p.x,left.at(-1).y-endSample.p.y);
 const startRadius=Math.hypot(left[0].x-startSample.p.x,left[0].y-startSample.p.y);
 contour.push(...cap(endSample.p,endSample.tan,endRadius,true));
 for(let i=right.length-1;i>0;i--)contour.push(fmBzLine(right[i],right[i-1]));
 contour.push(...cap(startSample.p,startSample.tan,startRadius,false));
 return [contour];
}
function fmCloneVectorContours(l,frame){
 if(l.shape?.type==='path'&&!l.shape.closed)return fmOpenStrokeContours(l,frame);
 if(['rect','ellipse','path'].includes(l.shape?.type))return fmBzContours(l,frame);
 if(['svg','merged'].includes(l.shape?.type))return fmSvgMarkupContours(l,frame);
 return [];
}
// A clone is one linked merged-vector object, NOT a stack of individually
// stroked source parts. Only its union perimeter receives the clone outline.
// Recompute from source geometry at the requested animation frame; do not bake
// an independent copy, so path/transform edits remain linked.
const fmCloneOutlineCache = new Map();
function cloneMergedSilhouetteMarkup(source,clone,frame){
 const children=(isFolder(source)?layerTree(source.id).map(x=>x.layer).filter(l=>!isFolder(l)&&effectiveVisible(l)):[source]);
 if(!children.length)return '';
 const vector=[],unsupported=[];
 for(const l of children){
  if(l.mesh||l.clipToBelow||normalizeRepeat(l.repeat).enabled){unsupported.push(l.name+'（特殊変形）');continue;}
  try{
   const contours=fmCloneVectorContours(l,frame);
   if(contours.length)vector.push({original:l,contours});
   else unsupported.push(l.name+'（対応するベクターパスがありません）');
  }catch(error){unsupported.push(l.name+'（'+error.message+'）');}
 }
 // Never silently discard children and show a misleading partial clone.
 if(unsupported.length)throw Error('統合できない項目: '+unsupported.slice(0,3).join('、')+(unsupported.length>3?' ほか':''));
 if(!vector.length)return '';
 // During interactive transforms the floating-point intersection solver
 // can briefly fail for tangencies/overlapping edges. Never render an open or
 // partially connected perimeter. Cache the last valid closed vector outline.
 const cacheKey=clone.id+'@'+frame;
 const fmt=p=>`${rnd(p.x,5)} ${rnd(p.y,5)}`;
 let d='',outlineWorldTransform='';
 try{
  const loops=fmBzMerge(vector,frame);
  d=loops.map(loop=>'M '+fmt(loop[0][0])+loop.map(seg=>' C '+fmt(seg[1])+' '+fmt(seg[2])+' '+fmt(seg[3])).join('')+' Z').join(' ');
  if(!d)throw Error('外周パスが空です');
  fmCloneOutlineCache.set(cacheKey,{d,sourceId:source.id,world:getWorld(source,frame).slice()});
  if(fmCloneOutlineCache.size>120)fmCloneOutlineCache.delete(fmCloneOutlineCache.keys().next().value);
 }catch(error){
  const cached=fmCloneOutlineCache.get(cacheKey);
  if(!cached)throw error;
  d=cached.d;
  // When the source folder as a WHOLE moves, keep its cached contour
  // attached to its live transform instead of leaving a stationary ghost.
  if(cached.sourceId===source.id){
   const delta=matMul(getWorld(source,frame),matInv(cached.world));
   outlineWorldTransform=` transform="${matString(delta)}"`;
  }
 }
 const o=outlineConfig(clone);
 const stroke=o?`stroke="${esc(o.color)}" stroke-width="${rnd(o.width,2)}" stroke-linejoin="round" stroke-linecap="${o.linecap}"${o.dash?` stroke-dasharray="${o.dash}"`:''}`:'stroke="none"';
 const fill='none'; // Only the merged outer perimeter is stroked. Source artwork supplies the original fills.
 // World-space source paths -> clone parent space; the outer render group
 // applies only the clone's own position/rotation/scale.
 return `<g transform="${matString(matInv(getParentWorld(clone,frame)))}"><g${outlineWorldTransform}>${o?fmPlacedOutlinePath(d,o,clone,'merged',true):''}</g></g>`;
}
// Interactive outline preview: compute the edge of the LIVE composited source
// alpha in SVG, not a numerically intersected chain of cubic segments. This
// avoids intermittent open gaps while a source part is being dragged. The
// underlying paths are untouched and the normal stationary outline remains
// vector-based. The filter is only used for on-screen drag previews.
function cloneLiveDragOutlineMarkup(source,clone,frame,prefix){
 const cfg=outlineConfig(clone);
 if(!cfg)return '';
 const placement=layerOutline(clone).placement;
 const width=Math.max(.5,cfg.width);
 const r=Math.max(.01,placement==='center'?width/2:width);
 const suffix=String(prefix+'_'+clone.id+'_'+frame).replace(/[^A-Za-z0-9_-]/g,'_');
 const id='fm_live_clone_outline_'+suffix;
 const original=renderStackItem(source,frame,false,prefix+'_outline_live_src');
 // Difference of dilation and erosion gives the exposed edge of the unioned
 // painted source, including where visible parts overlap. No intersection
 // solver is involved during drag; movement is reflected each redraw.
 const pre=placement==='inside'
  ? `<feComposite in="SourceAlpha" in2="fmInner" operator="out" result="fmEdge"/>`
  : placement==='outside'
   ? `<feComposite in="fmOuter" in2="SourceAlpha" operator="out" result="fmEdge"/>`
   : `<feComposite in="fmOuter" in2="fmInner" operator="out" result="fmEdge"/>`;
 const outer=placement==='inside'?'':`<feMorphology in="SourceAlpha" operator="dilate" radius="${rnd(r,2)}" result="fmOuter"/>`;
 const inner=placement==='outside'?'':`<feMorphology in="SourceAlpha" operator="erode" radius="${rnd(r,2)}" result="fmInner"/>`;
 return `<defs><filter id="${id}" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">${outer}${inner}${pre}<feFlood flood-color="${esc(cfg.color)}" result="fmOutlineColor"/><feComposite in="fmOutlineColor" in2="fmEdge" operator="in"/></filter></defs><g filter="url(#${id})" pointer-events="none">${original}</g>`;
}
// Original folder outline uses the same merged perimeter, not the lines of
// individual children. Leave folder contents untouched.
function cloneFolderOutlineMarkup(folder,clone,frame){
 return cloneMergedSilhouetteMarkup(folder,clone,frame);
}
// True linked clone: source geometry is read live every render, including open
// paths, folder contents, morph keys and source transforms. No union/trace.
// Clone paint settings are independent from source geometry.
function clonePartMarkup(source,clone,frame,prefix,depth=0){
 if(depth>24||source.visible===false)return '';
 if(isFolder(source)){
  const children=directChildren(source.id).filter(child=>child.visible!==false);
  const opacity=rnd(clamp(getPose(source,frame).opacity,0,1),4);
  return `<g opacity="${opacity}">${children.map((child,i)=>clonePartMarkup(child,clone,frame,prefix+'_part'+i,depth+1)).join('')}</g>`;
 }
 const shape=source.shape||{};
 const o=layerOutline(clone);
 let content='';
 if(shape.type==='path'&&shape.lineArt){
  // Line art is an open stroke, not a closed silhouette. Render its original
  // live curve with the clone's independently editable stroke settings.
  if(o.on){
   const cfg={...o,on:true};
   content=lineArtMarkup({...source,lineStyle:cfg},frame,cfg.color);
  }else content='';
 }else if(['rect','ellipse','path','text'].includes(shape.type)&&!shape.raster&&!shape.threeD){
  const style={...source,fill:clone.fill,fillHidden:clone.fillHidden,
   strokeOn:false,outline:clone.outline,gradient:null,texture:null};
  content=layerMarkup(style,frame,prefix);
 }else{
  // Imported SVG/merged vectors and raster/3D references retain the original
  // source rendering; the link never destroys their artwork or transforms.
  content=layerMarkup(source,frame,prefix);
 }
 if(!content)return '';
 const wm=getWorld(source,frame);
 const opacity=rnd(clamp(getPose(source,frame).opacity,0,1),4);
 return `<g transform="${matString(wm)}" opacity="${opacity}">${content}</g>`;
}
// Clone artwork is painted from the LIVE source stack, not recolored from
// the union geometry. This retains every original fill, gradient, pattern,
// SVG surface, source stroke, opacity, animation and child ordering.
function cloneMarkup(clone,frame,prefix){
 const source=cloneSourceLayer(clone);
 if(!source)return `<text x="4" y="18" fill="#b24e3d" font-size="13">参照元がありません</text>`;
 const backToCanvas=`transform="${matString(matInv(getParentWorld(clone,frame)))}"`;
 let appearance='';
 if(!clone.fillHidden){
  const original=renderStackItem(source,frame,false,prefix+'_linkedAppearance');
  if(clone.paintOverride){
   // Optional monochrome override, never applied by default. Composite over
   // SourceAlpha rather than painting one union polygon over all colors.
   const id='fm_clone_paint_'+String(clone.id).replace(/[^A-Za-z0-9_-]/g,'')+'_'+String(prefix).replace(/[^A-Za-z0-9_-]/g,'');
   appearance=`<defs><filter id="${id}" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB"><feFlood flood-color="${esc(clone.fill||'#c78b7b')}" result="color"/><feComposite in="color" in2="SourceAlpha" operator="in"/></filter></defs><g filter="url(#${id})">${original}</g>`;
  }else appearance=original;
 }
 // The union is used ONLY for the optional independent outer stroke.
 // Unsupported stroke geometry must not cause the original art to disappear.
 let perimeter='';
 if(layerOutline(clone).on){
  try{
   // During direct manipulation the geometric union may have degenerate
   // intermediate intersections. Render the union silhouette as a live SVG
   // alpha edge instead; recompute accurate cubic contours on pointerup.
   const interactive=!!S.drag&&['move','multiMove','scale','rotate','node','bezier','morph','mesh','pivot'].includes(S.drag.type);
   perimeter=interactive
    ?cloneLiveDragOutlineMarkup(source,clone,frame,prefix+'_drag')
    :cloneMergedSilhouetteMarkup(source,clone,frame);
  }catch(error){console.warn('クローンの外周線を描画できません:',error);}
 }
 return `<g ${backToCanvas}>${appearance}${perimeter}</g>`;
}
function createLinkedClone(){
 const src=sel();
 if(!src){toast('クローンするレイヤーまたはフォルダーを選択してください。');return;}
 if(src.shape?.type==='clone'){toast('クローンを再クローンせず、元レイヤーから作成してください。');return;}
 if(effectiveLocked(src)){toast('ロック中のレイヤーはクローンできません。');return;}
 // The clone inherits the source's parent but has an independent pose.
 // Put its pivot at the visible bounds center in parent coordinates, so the
 // rotation handle stays on the artwork rather than at artboard (0,0).
 const sourceBounds=previewWorldBounds(src);
 const centerWorld=sourceBounds?{x:sourceBounds.x+sourceBounds.w/2,y:sourceBounds.y+sourceBounds.h/2}:matApply(getWorld(src),src.pivot||{x:0,y:0});
 const parentSpacePivot=matApply(matInv(getParentWorld(src)),centerWorld);
 snapshot();
 const clone={id:uid(),name:'クローン：'+src.name,shape:{type:'clone',sourceId:src.id},
  fill:src.fill||'#c78b7b',stroke:src.stroke||'#47332b',strokeOn:false,strokeWidth:src.strokeWidth||2,
  fillHidden:false,paintOverride:false,visible:true,locked:false,clipToBelow:false,parent:null,folderId:src.folderId||null,
  pivot:{x:parentSpacePivot.x,y:parentSpacePivot.y},keys:{'0':basePose()},repeat:normalizeRepeat(),effects:normalizeEffects(),
  outline:normalizeOutline({on:false,color:'#47332b',width:4,style:'solid'})};
 doc.layers.splice(doc.layers.indexOf(src)+1,0,clone);
 setSingleSelection(clone.id);mutated();toast('統合表示のリンク付きクローンを作成しました。外周アウトラインはクローン側で設定できます。');
}
function cloneInspector(layer){
 const source=cloneSourceLayer(layer),o=layerOutline(layer),p=getPose(layer);
 return `<section class="prop-section"><div class="prop-heading"><strong>リンク付き統合オブジェクト</strong><span class="prop-chip blue">LINK</span></div>
 <div class="prop-tip">参照元：${source?esc(source.name):'見つかりません'}。元の図形やフォルダーを1つの統合オブジェクトとして表示し、元の形状・変形・アニメーションを自動反映します。内部の重複線は描画しません。</div>
 <div class="prop-row"><label>名前</label><input data-field="name" value="${esc(layer.name)}" /></div>
 <div class="prop-row"><label class="check-inline"><input type="checkbox" data-style="fillHidden" ${layer.fillHidden?'checked':''}> 塗りを非表示（線だけ）</label></div>
 <div class="prop-row"><label class="check-inline"><input type="checkbox" data-clone-paint="override" ${layer.paintOverride?'checked':''}> 元の色を単色に置換（任意）</label></div>
 ${layer.paintOverride?`<div class="prop-row"><label>置換色</label><input data-style="fill" type="color" value="${esc(layer.fill)}"></div>`:'<div class="prop-tip">通常は元の色・グラデーション・テクスチャをそのまま表示します。</div>'}
 </section>
 <section class="prop-section"><div class="prop-heading"><strong>外周アウトライン</strong><span class="prop-chip blue">外周のみ</span></div>
 <div class="prop-row"><label class="check-inline"><input type="checkbox" data-outline="on" ${o.on?'checked':''}> アウトラインを使用</label></div>

 <fieldset class="fm-outline-placement" aria-label="アウトラインの位置"><legend>線の位置</legend><div class="fm-outline-placement-choices">${[['inside','内側'],['center','中央'],['outside','外側']].map(([value,label])=>`<label><input type="radio" name="fmOutlinePlacement_${esc(l.id)}" data-outline="placement" value="${value}" ${o.placement===value?'checked':''}> ${label}</label>`).join('')}</div></fieldset>
 <div class="prop-row"><label>線色</label><input data-outline="color" type="color" value="${esc(o.color)}"></div>
 <div class="prop-row"><label>線幅：${rnd(o.width,1)}px</label><input data-outline="width" type="range" min="0.5" max="40" step="0.5" value="${rnd(o.width,1)}"></div>
 <div class="prop-row"><label>線の種類</label><select data-outline="style"><option value="solid" ${o.style==='solid'?'selected':''}>実線</option><option value="dash" ${o.style==='dash'?'selected':''}>破線</option><option value="dot" ${o.style==='dot'?'selected':''}>点線</option></select></div>
 <div class="prop-tip">元オブジェクトのアウトラインとは独立して設定します。内部パーツごとには線を引かず、統合形状の外周だけを縁取ります。</div></section>
 <section class="prop-section"><div class="prop-heading"><strong>統合オブジェクトの位置・変形</strong><span class="micro">FRAME ${String(S.frame+1).padStart(3,'0')}</span></div>
 <div class="prop-grid"><div class="field-wrap"><label>位置 X</label><input type="number" data-pose="x" value="${rnd(p.x)}"></div><div class="field-wrap"><label>位置 Y</label><input type="number" data-pose="y" value="${rnd(p.y)}"></div><div class="field-wrap"><label>回転 °</label><input type="number" data-pose="r" value="${rnd(p.r)}"></div><div class="field-wrap"><label>横方向の倍率</label><input type="number" step="0.05" data-pose="sx" value="${rnd(p.sx,3)}"></div><div class="field-wrap"><label>縦方向の倍率</label><input type="number" step="0.05" data-pose="sy" value="${rnd(p.sy,3)}"></div></div>
 <div class="prop-sep"></div><div class="prop-heading"><strong>回転軸</strong></div><div class="prop-grid"><div class="field-wrap"><label>軸 X</label><input type="number" data-pivot="x" value="${rnd(layer.pivot.x)}"></div><div class="field-wrap"><label>軸 Y</label><input type="number" data-pivot="y" value="${rnd(layer.pivot.y)}"></div></div></section>
 <section class="prop-section"><div class="prop-heading"><strong>アニメーション</strong></div><div class="prop-control-row"><button class="soft-btn primary" data-action="addKey">◆ キーを打つ</button><button class="soft-btn" data-action="removeKey">キー削除</button></div></section>${effectsInspector(layer)}${projectInspector()}`;
}
function renderRepeatSource(layer,frame,markInteractive,prefix,maskMode){
 const p=getPose(layer,frame),opacity=rnd(clamp(p.opacity,0,1),4);
 if(layer.shape?.type==='clone'){
  const interactive=markInteractive?` class="art-layer${effectiveLocked(layer)?' locked':''}" data-layer-id="${esc(layer.id)}"`:'';
  return `<g${interactive} transform="${matString(getWorld(layer,frame))}" opacity="${opacity}">${cloneMarkup(layer,frame,prefix)}</g>`;
 }
 if(isFolder(layer)){
  let outside='';
  if(layerOutline(layer).on){
   try{outside=cloneFolderOutlineMarkup(layer,{...layer,fillHidden:true},frame);}
   catch(error){console.warn('フォルダーアウトライン:',error);}
  }
  return `<g opacity="${opacity}">${renderStack(layer.id,frame,markInteractive,prefix+'_children_'+doc.layers.indexOf(layer),maskMode)}${outside}</g>`;
 }
 const m=getWorld(layer,frame);
 const interactive=markInteractive?` class="art-layer${effectiveLocked(layer)?' locked':''}" data-layer-id="${esc(layer.id)}"`:'';
 return `<g${interactive} transform="${matString(m)}" opacity="${opacity}" >${layerMarkup(layer,frame,prefix)}</g>`;
}
function renderStackItem(layer,frame,markInteractive,prefix,maskMode=false){
 const r=normalizeRepeat(layer.repeat);let content='';
 if(r.enabled&&r.copies>0){
  const b=getBBox(layer),center={x:b.x+b.w/2,y:b.y+b.h/2};
  repeatPoints(r,repeatFootprint(layer,frame)).forEach((pt,i)=>{
   const m=repeatMatrix(layer,frame,pt.x,pt.y,r.angle,center);
   // Unique prefix for each source keeps internal gradients, meshes and masks independent.
   content+=`<g transform="${matString(m)}">${renderRepeatSource(layer,frame,markInteractive,prefix+'_copy_'+i,maskMode)}</g>`;
  });
 }else content=renderRepeatSource(layer,frame,markInteractive,prefix,maskMode);
 if(maskMode)return content;
 const defs=effectFilterMarkup(layer,prefix,frame);if(!defs)return content;
 return `${defs}<g filter="url(#${effectFilterId(layer,prefix)})">${content}</g>`;
}
function clipMaskMarkup(base,frame,prefix){
 const id=clipMaskId(base,prefix);
 // Rendering the entire folder inside the mask (rather than only its first
 // child) gives the expected union of visible painted alpha, including its
 // nested folders, transforms, opacity and internal clipping relationships.
 const content=renderStackItem(base,frame,false,prefix+'_maskbase_'+doc.layers.indexOf(base),true);
 const cut=base.crop?cropMaskMarkup(base,frame,prefix+'_cutbase'):"";const contentMask=base.crop?`<g mask="url(#${cropMaskId(base,prefix+'_cutbase')})">${content}</g>`:content;
 return `${cut}<mask id="${id}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="${doc.width}" height="${doc.height}" style="mask-type:alpha" mask-type="alpha">${contentMask}</mask>`;
}

function cropMaskId(layer,prefix){return `fm_cut_${prefix}_${doc.layers.indexOf(layer)}`;}
function cropShapeMarkup(crop){if(crop.kind==='rect'){const r=crop.rect||{},offset=num(crop.expand),x=num(r.x)-offset,y=num(r.y)-offset,w=num(r.w)+2*offset,h=num(r.h)+2*offset;
 return w>.05&&h>.05?`<rect x="${rnd(x,3)}" y="${rnd(y,3)}" width="${rnd(w,3)}" height="${rnd(h,3)}" fill="#fff"/>`:'';}
 return String(crop.snapshot||'');}
function cropMaskMarkup(layer,frame,prefix){const crop=layer?.crop;if(!crop)return'';
 const id=cropMaskId(layer,prefix),base=cropShapeMarkup(crop),anchor=Array.isArray(crop.targetInverse)&&crop.targetInverse.length===6?crop.targetInverse:matI();
 const anchored=matMul(getWorld(layer,frame),anchor),offs=num(crop.expand),morphId=`${id}_morph`,subtractId=`${id}_subtract`;
 let filter='';let artwork=base;
 if(crop.kind==='object'&&Math.abs(offs)>=.5){const op=offs>0?'dilate':'erode';filter=`<filter id="${morphId}" x="${-doc.width}" y="${-doc.height}" width="${doc.width*3}" height="${doc.height*3}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="${op}" radius="${rnd(Math.abs(offs),2)}"/></filter>`;artwork=`<g filter="url(#${morphId})">${artwork}</g>`;}
 // クリッピング（選択範囲だけ残す）とは逆の動作。選択範囲内を透明化し、外側を残す。
 // SourceAlpha is the selected area (including SVG, PNG and nested folders).
 // A white full-frame flood minus that alpha produces the inverse mask, preserving
 // soft alpha edges and allowing cuts to keep following the target's motion.
 const subtract=`<filter id="${subtractId}" x="0" y="0" width="${doc.width}" height="${doc.height}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-color="#ffffff" flood-opacity="1" result="fmKeepOutside"/><feComposite in="fmKeepOutside" in2="SourceAlpha" operator="out"/></filter>`;
 return `<defs>${filter}${subtract}<mask id="${id}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="${doc.width}" height="${doc.height}" mask-type="alpha" style="mask-type:alpha"><g filter="url(#${subtractId})"><g transform="${matString(anchored)}">${artwork}</g></g></mask></defs>`;
}
// Only snapshot render markup produced by the app is stored; strip executable SVG content on loading foreign project files.
function sanitizeCropSnapshot(markup){if(typeof markup!=='string'||markup.length>3000000)return'';
 const parsed=new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`,'image/svg+xml');if(parsed.querySelector('parsererror'))return'';
 const allowed=new Set(['g','defs','rect','circle','ellipse','path','line','polyline','polygon','image','clipPath','mask','filter','feMorphology','feGaussianBlur','feFlood','feComposite','feMerge','feMergeNode','feOffset','feColorMatrix','use']);
 function clean(el){const n=el.localName;if(!allowed.has(n))return null;const c=document.createElementNS('http://www.w3.org/2000/svg',n);
 for(const a of el.attributes){const name=a.name,value=a.value;if(/^on/i.test(name)||name==='href'&&!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value)&&!/^#[\w.:-]+$/.test(value))continue;
 if(name==='style'&&!/^(mask-type\s*:\s*alpha\s*;?\s*)$/i.test(value))continue;
 if(/[<>]|javascript:|(?:https?:|file:|blob:)/i.test(value))continue;
 if(/url\(/i.test(value)&&!/url\(\s*#[\w.:-]+\s*\)/i.test(value))continue;
 if(name.startsWith('xmlns'))continue;c.setAttribute(name,value);}
 for(const child of el.children){const safe=clean(child);if(safe)c.appendChild(safe);}return c;}
 const wrapper=document.createElementNS('http://www.w3.org/2000/svg','g');for(const ch of parsed.documentElement.children){const safe=clean(ch);if(safe)wrapper.appendChild(safe);}return wrapper.innerHTML;
}
function currentCropSource(source){return renderStackItem(source,S.frame,false,'cut_snapshot_'+doc.layers.indexOf(source)+'_'+uid(),true);}
function cropSelectionRect(a,b){return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)};}
function cropRectPreview(){const r=S.cropSelection?.rect;if(!r)return'';const x=r.x-S.cropGrow,y=r.y-S.cropGrow,w=r.w+2*S.cropGrow,h=r.h+2*S.cropGrow;if(w<=0||h<=0)return'';
 return `<rect x="${rnd(x,2)}" y="${rnd(y,2)}" width="${rnd(w,2)}" height="${rnd(h,2)}" fill="#5cb7a8" fill-opacity=".16" stroke="#a4563d" stroke-width="2" stroke-dasharray="7 5" vector-effect="non-scaling-stroke" pointer-events="none"/>`;}
function cropSelectionOverlay(){if(S.tool!=='crop'||S.cropMode!=='range')return'';
 if(S.cropSelectionMode==='rect')return cropRectPreview();
 const source=layerBy(S.cropSourceId);if(!source)return'';const markup=currentCropSource(source),id='fm_cut_preview',offs=num(S.cropGrow),filter=offs?`<filter id="${id}_grow" x="-100%" y="-100%" width="300%" height="300%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="${offs>0?'dilate':'erode'}" radius="${Math.abs(offs)}"/></filter>`:'';
 return `<defs>${filter}<mask id="${id}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="${doc.width}" height="${doc.height}" style="mask-type:alpha">${offs?`<g filter="url(#${id}_grow)">`:''}${markup}${offs?'</g>':''}</mask></defs><rect width="${doc.width}" height="${doc.height}" fill="#5cb7a8" fill-opacity=".30" mask="url(#${id})" pointer-events="none"/>`;
}
function cropLayerChoices(excludeId=''){return doc.layers.filter(l=>l.id!==excludeId).map(l=>`<option value="${esc(l.id)}"${l.id===(excludeId==='__target__'?S.cropTargetId:S.cropSourceId)?' selected':''}>${isFolder(l)?'▣ ':''}${esc(l.name)}</option>`).join('');}
function cropPanel(){const layers=doc.layers,valid=l=>!!l&&layers.some(x=>x.id===l)&&!effectiveLocked(layerBy(l));
 if(!layers.some(l=>l.id===S.cropTargetId))S.cropTargetId=S.selected&&layerBy(S.selected)?S.selected:layers.find(l=>!effectiveLocked(l))?.id||'';
 if(!layers.some(l=>l.id===S.cropSourceId)||S.cropSourceId===S.cropTargetId)S.cropSourceId=layers.find(l=>l.id!==S.cropTargetId)?.id||'';
 const target=layerBy(S.cropTargetId),source=layerBy(S.cropSourceId);
 const choices=(selected,exclude='')=>layers.filter(l=>l.id!==exclude).map(l=>`<option value="${esc(l.id)}"${l.id===selected?' selected':''}>${isFolder(l)?'▣ ':''}${esc(l.name)}</option>`).join('');
 return `<section class="prop-section crop-options"><div class="prop-heading"><strong>切り抜き設定</strong><span class="prop-chip blue">CUT</span></div>
 <div class="crop-label">削除する範囲</div><div class="crop-radios"><label><input type="radio" name="cropMode" value="range" ${S.cropMode==='range'?'checked':''}> 選択範囲</label><label><input type="radio" name="cropMode" value="intersection" ${S.cropMode==='intersection'?'checked':''}> 交差</label></div>
 ${S.cropMode==='range'?`<div class="crop-label">選択範囲の作り方（範囲内を削除）</div><div class="crop-radios"><label><input type="radio" name="cropSelectionMode" value="rect" ${S.cropSelectionMode==='rect'?'checked':''}> 四角形ドラッグ</label><label><input type="radio" name="cropSelectionMode" value="object" ${S.cropSelectionMode==='object'?'checked':''}> オブジェクト指定</label></div>
 ${S.cropSelectionMode==='rect'?`<div class="prop-tip">キャンバス上をドラッグし、削除したい内側の範囲を指定します。</div><div class="crop-selection-status">${S.cropSelection?.rect?`選択範囲：${Math.round(S.cropSelection.rect.w)} × ${Math.round(S.cropSelection.rect.h)} px`:'まだ範囲がありません。キャンバスをドラッグしてください。'}</div>`:`<div class="prop-row"><label>選択元</label><select data-crop="source"><option value="">選択元を指定</option>${choices(S.cropSourceId)}</select></div><div class="prop-tip">指定オブジェクト（フォルダーも可）の形の内側を削除します。</div>`}
 <div class="prop-row"><label>切り抜き対象</label><select data-crop="target"><option value="">対象を指定</option>${choices(S.cropTargetId)}</select></div>
 <div class="crop-slider-heading"><label for="cropExpand">選択範囲の拡大・縮小</label><output id="cropExpandValue">${S.cropGrow>0?'+':''}${S.cropGrow} px</output></div><input id="cropExpand" type="range" min="-100" max="100" value="${S.cropGrow}" step="1"><div class="slider-hints"><span>縮小 −100</span><span>0</span><span>拡大 +100</span></div>`:`<div class="prop-row"><label>① 切り抜きたいレイヤー</label><select data-crop="target"><option value="">対象を指定</option>${choices(S.cropTargetId)}</select></div><div class="prop-row"><label>② 切り抜き元のレイヤー</label><select data-crop="source"><option value="">元になるレイヤー</option>${choices(S.cropSourceId,S.cropTargetId)}</select></div><div class="prop-tip">②の不透明な部分が①に重なる箇所を削除します。重なっていない部分は残ります。選択範囲の指定は不要です。</div>`}
 <button type="button" data-action="applyCrop" class="soft-btn primary wide" ${!valid(S.cropTargetId)||S.cropMode==='intersection'&&(!source||source.id===target?.id)||S.cropMode==='range'&&S.cropSelectionMode==='object'&&(!source||source.id===target?.id)||S.cropMode==='range'&&S.cropSelectionMode==='rect'&&!S.cropSelection?.rect?'disabled':''}>内側を切り抜く</button>
 <div class="prop-control-row"><button class="soft-btn" data-action="clearCrop" ${!target?.crop?'disabled':''}>対象の切り抜き解除</button><button class="soft-btn" data-action="clearCropRange">選択範囲を解除</button></div><div class="prop-tip">選択範囲の内側、または2つのオブジェクトが重なった部分を削除（透明化）します。元の素材は保持するため、解除やCtrl+Zで元に戻せます。</div>
 </section>`;
}
function applyCrop(){const target=layerBy(S.cropTargetId);if(!target||effectiveLocked(target)){toast('切り抜き対象を選択してください。');return;}
 let crop={kind:'rect',targetInverse:matInv(getWorld(target,S.frame)),expand:0};
 if(S.cropMode==='range'&&S.cropSelectionMode==='rect'){
  const rect=S.cropSelection?.rect;if(!rect||rect.w<1||rect.h<1){toast('キャンバス上で選択範囲を作成してください。');return;}crop.rect={...rect};crop.expand=S.cropGrow;
 }else{
  const source=layerBy(S.cropSourceId);if(!source||source===target){toast('異なる切り抜き元を選択してください。');return;}
  if(isFolder(source)&&isFolderAncestorOfLayer(source.id,target)||isFolder(target)&&isFolderAncestorOfLayer(target.id,source)){toast('親子関係にあるフォルダー同士は切り抜きできません。');return;}
  crop.kind='object';crop.snapshot=currentCropSource(source);crop.expand=S.cropMode==='range'?S.cropGrow:0;
 }
 snapshot();target.crop=crop;saveLocal();renderAll();toast(`${target.name} に切り抜きを適用しました。`);
}
function clearCrop(){const target=layerBy(S.cropTargetId);if(!target?.crop)return;snapshot();delete target.crop;mutated();toast('切り抜きを解除しました。');}

function renderStack(parentId,frame,markInteractive,prefix,maskMode=false){
 let defs='',paint='';const defined=new Set();
 for(const layer of directChildren(parentId)){
  if(!effectiveVisible(layer))continue;
  let mask='';
  if(layer.clipToBelow){
   const base=clipBaseFor(layer);
   if(!base||!effectiveVisible(base))continue;
   const id=clipMaskId(base,prefix);
   if(!defined.has(id)){
    defined.add(id);
    defs+=clipMaskMarkup(base,frame,prefix);
   }
   mask=` mask="url(#${id})"`;
  }
  const cut=layer.crop?cropMaskMarkup(layer,frame,prefix+'_cut_'+doc.layers.indexOf(layer)):'';
  const cropMask=cut?` mask="url(#${cropMaskId(layer,prefix+'_cut_'+doc.layers.indexOf(layer))})"`:'';
  paint+=`${cut}<g${mask}><g${cropMask}>${renderStackItem(layer,frame,markInteractive,prefix+'_item_'+doc.layers.indexOf(layer),maskMode)}</g></g>`;
 }
 return (defs?`<defs>${defs}</defs>`:'')+paint;
}
function drawLayers(frame=S.frame,alpha=1,markInteractive=false,prefix='live'){
 return `<g opacity="${rnd(clamp(alpha,0,1),4)}">${renderStack(null,frame,markInteractive,prefix)}</g>`;
}
function svgForFrame(frame=S.frame){let bg=doc.transparent?'':`<rect width="${doc.width}" height="${doc.height}" fill="${esc(doc.background)}"/>`;return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}">${customFontCss()}${bg}${drawLayers(frame,1,false,"file")}</svg>`;}
function selectionOverlay(){if(checkedLayers().length>1)return multiSelectionOverlay();const l=sel();if(!l||!effectiveVisible(l)||!isFolder(l)&&l.clipToBelow&&(!clipBaseFor(l)||!effectiveVisible(clipBaseFor(l))))return'';const m=getWorld(l),b=repeatBBox(l),corners=[{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:b.x,y:b.y+b.h}].map(p=>matApply(m,p));
 const points=corners.map(p=>`${rnd(p.x,2)},${rnd(p.y,2)}`).join(' ');const pivot=matApply(m,l.pivot||{x:0,y:0});const tm={x:(corners[0].x+corners[1].x)/2,y:(corners[0].y+corners[1].y)/2};
 const dy={x:corners[3].x-corners[0].x,y:corners[3].y-corners[0].y};const len=Math.hypot(dy.x,dy.y)||1;const rot={x:tm.x-dy.x/len*32,y:tm.y-dy.y/len*32};
 let out=`<polygon points="${points}" fill="none" stroke="#db8c6c" stroke-width="1.5" stroke-dasharray="5 3" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
 if(S.tool==='select'&&!effectiveLocked(l)){out+=`<line x1="${tm.x}" y1="${tm.y}" x2="${rot.x}" y2="${rot.y}" stroke="#d58e70" stroke-width="1.5" vector-effect="non-scaling-stroke" pointer-events="none"/><circle data-handle="rotate" cx="${rot.x}" cy="${rot.y}" r="8" fill="#fffaf5" stroke="#cd8165" stroke-width="2" style="cursor:grab"/>`;out+=corners.map((p,i)=>{const size=clamp(14/Math.max(.15,S.zoom*S.fitScale),10,32);return `<rect x="${rnd(p.x-size/2,2)}" y="${rnd(p.y-size/2,2)}" width="${rnd(size,2)}" height="${rnd(size,2)}" rx="2" fill="#fffaf5" stroke="#cd8165" stroke-width="2" vector-effect="non-scaling-stroke" data-handle="scale" data-corner="${i}" style="cursor:${i%2===0?'nwse-resize':'nesw-resize'};pointer-events:all"/>`;}).join('');}
 if(S.tool==='select')out+=`<circle cx="${pivot.x}" cy="${pivot.y}" r="9" fill="#fffaf5" stroke="#c7795f" stroke-width="1.5" vector-effect="non-scaling-stroke" pointer-events="none"/><line x1="${pivot.x-5}" y1="${pivot.y}" x2="${pivot.x+5}" y2="${pivot.y}" stroke="#bd7057" stroke-width="1.5" pointer-events="none"/><line x1="${pivot.x}" y1="${pivot.y-5}" x2="${pivot.x}" y2="${pivot.y+5}" stroke="#bd7057" stroke-width="1.5" pointer-events="none"/>`;
 if(S.tool==='node'&&!effectiveLocked(l)&&l.shape.type==='path'){const isNode=S.tool==='node',pts=S.activeContour>0&&l.shape.extraContours?.[S.activeContour-1]?l.shape.extraContours[S.activeContour-1]:getMorphPoints(l);pts.forEach((pt,i)=>{const p=matApply(m,pt),active=isNode&&(i===S.nodeIndex||S.nodeSelected.has(i));out+=`<circle cx="${p.x}" cy="${p.y}" r="${Math.max(4.5,S.nodeHandleSize+2)}" fill="transparent" stroke="none" data-handle="${isNode?'node':'morph'}" data-point="${i}" style="cursor:move;pointer-events:all"/><circle cx="${p.x}" cy="${p.y}" r="${active?S.nodeHandleSize+1:S.nodeHandleSize}" fill="${active?'#ffe1ae':'#fff'}" stroke="${active?'#a75d42':'#c56d57'}" stroke-width="1.15" vector-effect="non-scaling-stroke" pointer-events="none"/>`;});
 if(isNode&&l.shape.pathMode==='bezier'&&pts.length){const i=clamp(S.nodeIndex,0,pts.length-1),pt=pts[i],pivot=matApply(m,pt);for(const [direction,color] of [['in','#4b9aa5'],['out','#c77850']]){const dx=num(pt[direction+'X']),dy=num(pt[direction+'Y']),end=matApply(m,{x:pt.x+dx,y:pt.y+dy});out+=`<line x1="${pivot.x}" y1="${pivot.y}" x2="${end.x}" y2="${end.y}" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke" pointer-events="none"/><circle cx="${end.x}" cy="${end.y}" r="${Math.max(4,S.nodeHandleSize+1.5)}" fill="transparent" stroke="none" data-handle="bezier-${direction}" data-point="${i}" style="cursor:crosshair;pointer-events:all"/><circle cx="${end.x}" cy="${end.y}" r="${Math.max(1.6,S.nodeHandleSize-.2)}" fill="white" stroke="${color}" stroke-width="1.15" vector-effect="non-scaling-stroke" pointer-events="none"/>`;}}}
 if(S.tool==='mesh'&&!effectiveLocked(l)&&l.mesh){const pts=getMeshPoints(l),cols=l.mesh.cols,rows=l.mesh.rows;
 const line=(a,b)=>{const p=matApply(m,pts[a]),q=matApply(m,pts[b]);return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="#52a1ac" stroke-width="1.5" stroke-dasharray="4 3" vector-effect="non-scaling-stroke" pointer-events="none"/>`;};
 for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const i=y*(cols+1)+x;if(x<cols)out+=line(i,i+1);if(y<rows)out+=line(i,i+cols+1);}
 pts.forEach((pt,i)=>{const p=matApply(m,pt);out+=`<rect x="${p.x-5}" y="${p.y-5}" width="10" height="10" rx="2" fill="#ffffff" stroke="#268895" stroke-width="2" data-handle="mesh" data-point="${i}" style="cursor:move"/>`;});
 }
 return out;}
function drawShapeBounds(start,end,locked){let dx=end.x-start.x,dy=end.y-start.y;
 if(locked){const side=Math.max(Math.abs(dx),Math.abs(dy));dx=(dx<0?-side:side);dy=(dy<0?-side:side);}
 return {x:Math.min(start.x,start.x+dx),y:Math.min(start.y,start.y+dy),w:Math.abs(dx),h:Math.abs(dy)};
}
function lineEnd(start,end,shift=false){if(!shift)return end;const a=Math.atan2(end.y-start.y,end.x-start.x),r=Math.hypot(end.y-start.y,end.x-start.x),snap=Math.round(a/(Math.PI/4))*Math.PI/4;return {x:start.x+Math.cos(snap)*r,y:start.y+Math.sin(snap)*r};}
function temporaryOverlay(){let o='';if(S.pen.length){const pts=S.pen.concat(S.cursor?[S.cursor]:[]),points=pts.map(p=>`${rnd(p.x,2)},${rnd(p.y,2)}`).join(' ');if(pts.length>=3&&S.tool==='pen')o+=`<polygon points="${points}" fill="${esc(S.color)}" fill-opacity=".25" stroke="none" pointer-events="none"/>`;if(S.tool==='strokePen')o+=`<path d="${pathD(pts,false,true,'auto')}" fill="none" stroke="${esc(S.color)}" stroke-width="4" stroke-linecap="round" pointer-events="none"/>`;else o+=`<polyline points="${points}" fill="none" stroke="#9c5846" stroke-width="2.1" stroke-dasharray="5 4" pointer-events="none"/>`;S.pen.forEach((p,i)=>{o+=`<circle cx="${p.x}" cy="${p.y}" r="${i===0?7:5}" fill="${i===0?'#fff2dc':'#fffdfa'}" stroke="#a25c46" stroke-width="2" pointer-events="none"/>`;});}if(S.drag&&(S.drag.type==='draw'||S.drag.type==='brush'||S.drag.type==='line')){let d=S.drag;if(d.type==='brush'){const mode=d.brushMode||S.brushMode,closed=mode!=='line',pts=processedFreehandStroke(d.points,mode),smooth=S.brushAutoSmooth;o+=`<path d="${pathD(pts,closed,smooth,smooth?'auto':'line')}" fill="${closed?esc(S.color):'none'}" fill-opacity="${closed?'.42':'0'}" stroke="${closed?'#aa705d':esc(S.color)}" stroke-width="${closed?1.3:4}" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>`;}else if(d.type==='line'&&S.cursor){const q=lineEnd(d.start,S.cursor,d.shift);o+=`<line x1="${d.start.x}" y1="${d.start.y}" x2="${q.x}" y2="${q.y}" stroke="${esc(S.color)}" stroke-width="4" stroke-linecap="round" pointer-events="none"/>`;}else if(S.cursor){const {x,y,w,h}=drawShapeBounds(d.start,S.cursor,d.lock||d.shift);o+=S.tool==='ellipse'?`<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${w/2}" ry="${h/2}" fill="${S.color}" fill-opacity=".45" stroke="#aa705d" stroke-dasharray="5 4"/>`:['triangle','triangleUp','triangleDown'].includes(S.tool)?`<polygon points="${trianglePoints(x,y,w,h,S.tool==='triangleDown'||(S.tool==='triangle'&&S.triangleDirection==='down')).map(q=>q.x+','+q.y).join(' ')}" fill="${esc(S.color)}" fill-opacity=".45" stroke="#aa705d" stroke-dasharray="5 4"/>`:`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${S.color}" fill-opacity=".45" stroke="#aa705d" stroke-dasharray="5 4"/>`;}}
 return o;}
function smartGuideMarkup(){
 if(!S.smartGuides||!S.smartGuideLines?.length)return '';
 return `<g class="fm-smart-guide" pointer-events="none">${S.smartGuideLines.map(g=>g.axis==='x'?`<line x1="${g.value}" y1="0" x2="${g.value}" y2="${doc.height}" stroke="#da6792" stroke-width="1" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>`:`<line x1="0" y1="${g.value}" x2="${doc.width}" y2="${g.value}" stroke="#da6792" stroke-width="1" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>`).join('')}</g>`;
}
function layerWorldBox(layer){
 const b=getBBox(layer),m=getWorld(layer),points=[{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:b.x,y:b.y+b.h}].map(q=>matApply(m,q));
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
 return {x,y,w,h};
}
// Selection alignment uses the existing layer transforms and keyframe system.
// Only top-level selected roots move: selecting a folder and its child never moves it twice.
function alignSelection(kind){
 const roots=selectedRoots({forMotion:true}).filter(l=>!effectiveLocked(l));
 if(roots.length<2){toast('レイヤー一覧のチェックで2個以上選択してください。');return;}
 const entries=roots.map(l=>({layer:l,box:layerWorldBox(l)})).filter(e=>Object.values(e.box).every(Number.isFinite));
 if(entries.length<2){toast('整列できるオブジェクトがありません。');return;}
 const needsThree=kind.startsWith('dist')||kind.startsWith('gap');
 if(needsThree&&entries.length<3){toast('分布・等間隔には3個以上選択してください。');return;}
 const minX=Math.min(...entries.map(e=>e.box.x)),maxX=Math.max(...entries.map(e=>e.box.x+e.box.w));
 const minY=Math.min(...entries.map(e=>e.box.y)),maxY=Math.max(...entries.map(e=>e.box.y+e.box.h));
 const targets=new Map();
 const setDelta=(entry,dx=0,dy=0)=>targets.set(entry.layer.id,{dx,dy});
 if(['left','centerX','right','top','centerY','bottom'].includes(kind)){
  entries.forEach(entry=>{const b=entry.box;
   const dx=kind==='left'?minX-b.x:kind==='centerX'?(minX+maxX)/2-(b.x+b.w/2):kind==='right'?maxX-(b.x+b.w):0;
   const dy=kind==='top'?minY-b.y:kind==='centerY'?(minY+maxY)/2-(b.y+b.h/2):kind==='bottom'?maxY-(b.y+b.h):0;
   setDelta(entry,dx,dy);
  });
 }else{
  const vertical=kind.endsWith('Y');
  const start=vertical?'y':'x',size=vertical?'h':'w';
  const sorted=[...entries].sort((a,b)=>a.box[start]-b.box[start]||String(a.layer.id).localeCompare(String(b.layer.id)));
  const n=sorted.length;
  if(kind.startsWith('gap')){
   const available=(vertical?maxY-minY:maxX-minX)-sorted.reduce((sum,e)=>sum+e.box[size],0);
   const gap=available/(n-1);let cursor=vertical?minY:minX;
   sorted.forEach(e=>{const delta=cursor-e.box[start];setDelta(e,vertical?0:delta,vertical?delta:0);cursor+=e.box[size]+gap;});
  }else{
   const anchor=e=>kind.startsWith('distStart')?e.box[start]:kind.startsWith('distEnd')?e.box[start]+e.box[size]:e.box[start]+e.box[size]/2;
   const first=anchor(sorted[0]),last=anchor(sorted[n-1]);
   sorted.forEach((e,i)=>{const delta=first+(last-first)*i/(n-1)-anchor(e);setDelta(e,vertical?0:delta,vertical?delta:0);});
  }
 }
 const moves=entries.map(e=>({...e,delta:targets.get(e.layer.id)})).filter(e=>e.delta&&Math.hypot(e.delta.dx,e.delta.dy)>1e-6);
 if(!moves.length){toast('すでに整列されています。');return;}
 snapshot();
 for(const {layer,delta} of moves){
  const current=getPose(layer,S.frame);
  const key=S.autoKey||Object.hasOwn(layer.keys,String(S.frame))||S.frame===0?S.frame:(Object.keys(layer.keys).map(Number).filter(f=>f<=S.frame).sort((a,b)=>b-a)[0]??0);
  if(!layer.keys[key])layer.keys[key]={...current};
  const inv=matInv(getParentWorld(layer,S.frame));
  const dx=inv[0]*delta.dx+inv[2]*delta.dy,dy=inv[1]*delta.dx+inv[3]*delta.dy;
  layer.keys[key].x=rnd(num(layer.keys[key].x,current.x)+dx,3);
  layer.keys[key].y=rnd(num(layer.keys[key].y,current.y)+dy,3);
 }
 S.smartGuideLines=[];mutated();toast('選択オブジェクトを整列しました。');
}

// Reflect editable objects around their own pivot without altering geometry or paints.
// Folder roots are reflected as a group; descendants are not flipped twice.
function flipSelectedObjects(axis){
 if(S.tool!=='select'){toast('選択ツールで使用してください。');return;}
 const checked=selectedRoots({forMotion:true});
 const targets=(checked.length?checked:[sel()]).filter(l=>l&&!effectiveLocked(l)&&!l.shape?.threeD);
 if(!targets.length){toast('反転するオブジェクトを選択してください。');return;}
 snapshot();
 for(const layer of targets){
  const pose=getPose(layer,S.frame);
  // Keep all other components of the transform untouched, and create a
  // keyframe at the current frame so the action is undoable and animatable.
  const key=String(S.frame);
  const next={...pose};
  if(axis==='horizontal')next.sx=-(Math.abs(num(pose.sx,1))<1e-6?1:num(pose.sx,1));
  else next.sy=-(Math.abs(num(pose.sy,1))<1e-6?1:num(pose.sy,1));
  layer.keys=layer.keys||{};
  layer.keys[key]={...next};
 }
 S.smartGuideLines=[];
 mutated();
 toast(axis==='horizontal'?'左右反転しました。':'上下反転しました。');
}

function smartSnapPosition(layer,original,proposed){
 S.smartGuideLines=[];
 if(!S.smartGuides||!layer||doc.layers.length>450)return proposed;
 const orig=layerWorldBox(layer),pm=getParentWorld(layer),d=matApply(pm,{x:proposed.x,y:proposed.y}),o=matApply(pm,{x:original.x,y:original.y}),current=getPose(layer),cur=matApply(pm,{x:current.x,y:current.y});
 const alreadyX=cur.x-o.x,alreadyY=cur.y-o.y;orig.x-=alreadyX;orig.y-=alreadyY;
 let dx=d.x-o.x,dy=d.y-o.y;
 const anchors=[orig.x+dx,orig.x+orig.w/2+dx,orig.x+orig.w+dx];
 const yAnchors=[orig.y+dy,orig.y+orig.h/2+dy,orig.y+orig.h+dy];
 const excluded=new Set([layer.id]);for(const part of doc.layers)if(isFolder(layer)&&memberOfFolder(part,layer.id))excluded.add(part.id);
 const targetsX=[0,doc.width/2,doc.width],targetsY=[0,doc.height/2,doc.height];
 for(const other of doc.layers){if(excluded.has(other.id)||isFolder(other)||!effectiveVisible(other)||other.shape?.type==='raster'||other.shape?.threeD)continue;
  const b=layerWorldBox(other);targetsX.push(b.x,b.x+b.w/2,b.x+b.w);targetsY.push(b.y,b.y+b.h/2,b.y+b.h);
 }
 const tolerance=8/Math.max(.16,S.zoom*S.fitScale),snap=(anchors,targets)=>{let min=tolerance,delta=0,at=null;for(const a of anchors)for(const t of targets){const err=t-a;if(Math.abs(err)<min){min=Math.abs(err);delta=err;at=t;}}return{delta,at};};
 const sx=snap(anchors,targetsX),sy=snap(yAnchors,targetsY);
 if(sx.at!==null){dx+=sx.delta;S.smartGuideLines.push({axis:'x',value:sx.at});}
 if(sy.at!==null){dy+=sy.delta;S.smartGuideLines.push({axis:'y',value:sy.at});}
 const inverse=matInv(pm),w=matApply(inverse,{x:o.x+dx,y:o.y+dy});return{x:w.x,y:w.y};
}
// Snap the actively dragged resize corner to canvas/object centers and edges.
// This changes the scale itself (rather than stretching a rasterized pattern).
function smartSnapScale(layer,drag,pose){
 S.smartGuideLines=[];
 if(!S.smartGuides||!layer||doc.layers.length>450)return pose;
 const parent=getParentWorld(layer),pivot=drag.pivot,corner=repeatBBox(layer);
 const local=[{x:corner.x,y:corner.y},{x:corner.x+corner.w,y:corner.y},{x:corner.x+corner.w,y:corner.y+corner.h},{x:corner.x,y:corner.y+corner.h}][drag.corner];
 const rad=pose.r*Math.PI/180,c=Math.cos(rad),s=Math.sin(rad),vx=local.x-pivot.x,vy=local.y-pivot.y;
 const activeParent={x:pose.x+pivot.x+c*vx*pose.sx-s*vy*pose.sy,y:pose.y+pivot.y+s*vx*pose.sx+c*vy*pose.sy};
 const active=matApply(parent,activeParent), tx=[0,doc.width/2,doc.width],ty=[0,doc.height/2,doc.height];
 for(const other of doc.layers){if(other.id===layer.id||isFolder(other)||!effectiveVisible(other)||other.shape?.type==='raster'||other.shape?.threeD||memberOfFolder(other,layer.id))continue;
  const b=layerWorldBox(other);tx.push(b.x,b.x+b.w/2,b.x+b.w);ty.push(b.y,b.y+b.h/2,b.y+b.h);
 }
 const tol=8/Math.max(.16,S.zoom*S.fitScale),nearest=(v,targets)=>{let delta=0,best=tol,at=null;for(const t of targets){const diff=t-v;if(Math.abs(diff)<best){best=Math.abs(diff);delta=diff;at=t;}}return{delta,at};};
 const ax=nearest(active.x,tx),ay=nearest(active.y,ty);
 if(ax.at===null&&ay.at===null)return pose;
 // Convert the world-space corner correction into parent-space, then into
 // the local scale axes. The opposite resize handle remains anchored.
 const inv=matInv(parent),dpx=inv[0]*ax.delta+inv[2]*ay.delta,dpy=inv[1]*ax.delta+inv[3]*ay.delta;
 const localX=c*dpx+s*dpy,localY=-s*dpx+c*dpy;
 const ratioX=Math.abs(vx)>0.0001?localX/vx:0,ratioY=Math.abs(vy)>0.0001?localY/vy:0;
 const signX=Math.sign(pose.sx||1),signY=Math.sign(pose.sy||1);
 const sx=signX*clamp((pose.sx+ratioX)*signX,.025,50),sy=signY*clamp((pose.sy+ratioY)*signY,.025,50);
 if(ax.at!==null)S.smartGuideLines.push({axis:'x',value:ax.at});
 if(ay.at!==null)S.smartGuideLines.push({axis:'y',value:ay.at});
 const anchor=drag.anchorLocal,rx=(anchor.x-pivot.x)*sx,ry=(anchor.y-pivot.y)*sy;
 const x=drag.anchorParent.x-pivot.x-(c*rx-s*ry),y=drag.anchorParent.y-pivot.y-(s*rx+c*ry);
 return {...pose,sx,sy,x,y};
}
function gridPreviewMarkup(){
 if(doc.gridVisible===false)return '';
 const unit=clamp(Math.round(num(doc.gridSize,40)),8,256), major=unit*5;
 const transparency=clamp(num(doc.gridTransparency,0),0,100), gridColor=/^#[0-9a-f]{6}$/i.test(doc.gridColor||'')?doc.gridColor:'#867567';
 return `<defs><pattern id="fm_grid_minor" width="${unit}" height="${unit}" patternUnits="userSpaceOnUse"><path d="M ${unit} 0 L 0 0 0 ${unit}" fill="none" stroke="${gridColor}" stroke-opacity=".42" stroke-width=".8"/></pattern><pattern id="fm_grid_major" width="${major}" height="${major}" patternUnits="userSpaceOnUse"><path d="M ${major} 0 L 0 0 0 ${major}" fill="none" stroke="${gridColor}" stroke-opacity=".46" stroke-width="1.15"/></pattern></defs><g class="fm-grid-overlay" opacity="${rnd(1-transparency/100,3)}" pointer-events="none" aria-hidden="true"><rect width="${doc.width}" height="${doc.height}" fill="url(#fm_grid_minor)"/><rect width="${doc.width}" height="${doc.height}" fill="url(#fm_grid_major)"/></g>`;
}
function renderStage(){syncPaletteOpacitySlider();ART.setAttribute('viewBox',`0 0 ${doc.width} ${doc.height}`);ART.setAttribute('width',doc.width);ART.setAttribute('height',doc.height);
 let bg=`<rect width="${doc.width}" height="${doc.height}" fill="${doc.transparent?'#fff':esc(doc.background)}" ${doc.transparent?'opacity="0"':''}/>`;
 let onion='';if(!S.playing&&S.onionPrev&&S.frame>0)onion+=drawLayers(S.frame-1,.17,false,'onionPrev');if(!S.playing&&S.onionNext&&S.frame<total()-1)onion+=drawLayers(S.frame+1,.13,false,'onionNext');
 ART.innerHTML=bg+onion+drawLayers(S.frame,1,true,"stage")+gridPreviewMarkup()+(!S.playing?(S.tool==='crop'?cropSelectionOverlay():selectionOverlay())+temporaryOverlay()+gradientDragOverlay()+smartGuideMarkup():'');
 const empty=$('#emptyCanvas');empty.style.display=drawableLayers().length||S.pen.length?'none':'flex';
 $('#stageSize').textContent=`${doc.width} × ${doc.height}`;const penBar=$('#penControls');if(penBar){penBar.classList.toggle('hidden',!S.pen.length||!['pen','strokePen'].includes(S.tool));$('#penCount').textContent=S.pen.length+' 点';$('#penClose').style.display=S.tool==='strokePen'?'none':'';$('#penOpen').textContent=S.tool==='strokePen'?'線画を確定':'開いた線で確定';$('#penClose').disabled=S.pen.length<3;$('#penOpen').disabled=S.pen.length<2;}if(['pen','strokePen'].includes(S.tool)&&S.pen.length)$('#stageStatus').textContent=`${S.tool==='strokePen'?'線画ベジェ':'ベジェ曲線'}を作成中：${S.pen.length}点配置済み / Enterで確定 / Escで中止`;}
function renderPalette(){let s='';PALETTE.forEach(c=>{s+=`<button class="swatch${S.color.toLowerCase()===c.toLowerCase()?' active':''}" data-color="${c}" title="${c}" style="background:${c}"></button>`;});$('#paletteGrid').innerHTML=s;$('#drawColor').value=S.color;$('#drawColorCode').textContent=S.color.toUpperCase();const mark=$('#paletteCurrentColor');if(mark)mark.style.backgroundColor=S.color;}
// The thumbnail renderer is shared with the stage. Raster alpha is sampled
// at low resolution, cached and used to crop previews to the painted area.
const rasterPreviewCache=new Map();
function rasterInkBBox(layer){
 const id=layer.id,src=layer.shape?.data;
 if(!src||!layer.shape?.raster)return undefined;
 let cached=rasterPreviewCache.get(id);
 if(cached?.src===src)return cached.bounds;
 cached={src,bounds:undefined};rasterPreviewCache.set(id,cached);
 const img=new Image();
 img.onload=()=>{
  if(rasterPreviewCache.get(id)!==cached)return;
  try{
   const width=Math.max(1,Math.min(192,img.naturalWidth)),height=Math.max(1,Math.min(192,Math.round(img.naturalHeight*width/img.naturalWidth)));
   const c=document.createElement('canvas');c.width=width;c.height=height;
   const ctx=c.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,width,height);ctx.drawImage(img,0,0,width,height);
   const pixels=ctx.getImageData(0,0,width,height).data;
   let minx=width,miny=height,maxx=-1,maxy=-1;
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    if(pixels[(y*width+x)*4+3]<12)continue;
    minx=Math.min(minx,x);miny=Math.min(miny,y);maxx=Math.max(maxx,x);maxy=Math.max(maxy,y);
   }
   if(maxx>=minx){
    const sh=layer.shape,sx=sh.w/width,sy=sh.h/height;
    cached.bounds={x:minx*sx-sh.w/2,y:miny*sy-sh.h/2,w:Math.max(1,(maxx-minx+1)*sx),h:Math.max(1,(maxy-miny+1)*sy)};
   }else cached.bounds=null;
  }catch(e){cached.bounds=undefined;}
  // A raster stroke can change after decode has started. Ignore stale images.
  if(rasterPreviewCache.get(id)===cached&&layerBy(id)?.shape?.data===src)requestAnimationFrame(renderLayers);
 };
 img.onerror=()=>{if(rasterPreviewCache.get(id)===cached)cached.bounds=undefined;};
 img.src=src;
 return undefined;
}
function previewWorldBounds(layer){
 if(isFolder(layer)){
  const descendants=doc.layers.filter(l=>!isFolder(l)&&memberOfFolder(l,layer.id));
  const parts=descendants.map(previewWorldBounds).filter(Boolean);
  if(!parts.length)return null;
  const left=Math.min(...parts.map(b=>b.x)),top=Math.min(...parts.map(b=>b.y));
  const right=Math.max(...parts.map(b=>b.x+b.w)),bottom=Math.max(...parts.map(b=>b.y+b.h));
  return {x:left,y:top,w:right-left,h:bottom-top};
 }
 const raster=layer.shape?.raster;
 const bounds=raster?rasterInkBBox(layer):undefined;
 if(raster&&bounds===null)return null;
 const b=bounds||repeatBBox(layer,S.frame);
 if(!b||![b.x,b.y,b.w,b.h].every(Number.isFinite)||b.w<=0||b.h<=0)return null;
 const m=getWorld(layer,S.frame);
 const corners=[{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x,y:b.y+b.h},{x:b.x+b.w,y:b.y+b.h}].map(p=>matApply(m,p));
 const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);
 const x=Math.min(...xs),y=Math.min(...ys);return{x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y};
}
function layerThumbnailMarkup(layer){
 try{
  const b=previewWorldBounds(layer);
  if(!b)return '<span class="layer-thumb-placeholder">·</span>';
  const margin=Math.max(2,Math.max(b.w,b.h)*.14),x=b.x-margin,y=b.y-margin,w=Math.max(8,b.w+margin*2),h=Math.max(8,b.h+margin*2);
  const prefix='thumb_'+String(layer.id).replace(/[^a-zA-Z0-9_-]/g,'_');
  return `<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${[x,y,w,h].map(v=>rnd(v,3)).join(' ')}" preserveAspectRatio="xMidYMid meet">${renderStackItem(layer,S.frame,false,prefix)}</svg>`;
 }catch(error){return '<span class="layer-thumb-placeholder">◇</span>';}
}
function renderLayers(){
 syncPaletteOpacitySlider();
 const target=sel(),clearButton=$('#clearLayerContentsButton'),deleteButton=$('#deleteLayerButton');
 if(clearButton){clearButton.disabled=!target||isFolder(target)||effectiveLocked(target);clearButton.title=!target?'クリアするレイヤーを選択してください':isFolder(target)?'フォルダーはクリア対象外です。個々のレイヤーを選択してください':effectiveLocked(target)?'ロック解除が必要です':'選択レイヤーの描画内容だけを消去（レイヤー自体は残します）';}
 if(deleteButton){deleteButton.disabled=!target||effectiveLocked(target);deleteButton.title=target&&isFolder(target)?'選択フォルダーと中のレイヤーを削除（確認あり）':'選択したレイヤーを削除';}
 const el=$('#layerList'),count=selectedRoots().length;const btn=$('#mergeLayersButton'),unmerge=$('#unmergeLayersButton'),status=$('#mergeSelectionCount');if(unmerge){unmerge.disabled=!(sel()?.mergeGroup&&!effectiveLocked(sel()))&&!(checkedLayers().length===1&&checkedLayers()[0].mergeGroup&&!effectiveLocked(checkedLayers()[0]));unmerge.title='選択した統合オブジェクトを元のパーツに戻します';}if(btn){btn.disabled=count<2;btn.title=count<2?'チェックボックスで2個以上選択してください':`${count}個のオブジェクトを元の色・パスを保持したまま統合`;if(status)status.textContent=count>1?`${count}個選択中`:'2個以上選択';}if(!doc.layers.length){el.innerHTML='<div class="blank-state small">描いたパーツがここに並びます。</div>';return;}
 el.innerHTML=uiLayerRows().map(({layer:l,depth})=>{const folder=isFolder(l),visible=l.visible!==false,clip=!!l.clipToBelow,base=clipBaseFor(l),muted=!effectiveVisible(l),locked=effectiveLocked(l),checked=S.multiSelected.has(l.id)||!S.multiSelected.size&&S.selected===l.id;
 const icon=l.shape?.type==='clone'?'◇':folder?(l.mergeGroup?'◇':`<img class="folder-art" src="${FOLDER_IMAGE}" alt="" aria-hidden="true" draggable="false">`):l.shape.lineArt?'〰':['svg','merged'].includes(l.shape.type)?'◇':l.shape.raster?'✎':l.shape.type==='image'?'▧':l.shape.type==='ellipse'?'◯':l.shape.type==='rect'?'▭':'⌁';
 const children=folder?directChildren(l.id).length:0;
 return `<div class="layer-row${folder?' folder-row':''}${l.mergeGroup?' merged-group-row':''}${checked?' selected':''}${S.selected===l.id?' active-primary':''}${clip?' clipped':''}${muted?' layer-hidden':''}${locked?' layer-locked':''}" data-select="${esc(l.id)}" data-layer-row="${esc(l.id)}" draggable="${locked?'false':'true'}" style="--tree-depth:${Math.min(depth,8)}">
  <input class="layer-select-check" type="checkbox" data-layer-check="${esc(l.id)}" ${checked?'checked':''} title="複数選択に追加／解除" aria-label="${esc(l.name)}を選択" />
  <button type="button" class="folder-toggle${folder?'':' spacer'}" ${folder?`data-action="toggleFolder" data-id="${esc(l.id)}" title="${locked?'ロック解除すると開けます':`${l.mergeGroup?'統合オブジェクト':'フォルダー'}を${S.collapsedFolders.has(l.id)?'展開':'折りたたむ'}`}" ${locked?'disabled':''}`:''}>${folder?(S.collapsedFolders.has(l.id)||locked?'▶':'▼'):'·'}</button>
  <button type="button" class="mini-action visibility-action${!visible?' muted':''}" data-action="visibility" data-id="${esc(l.id)}" title="${visible?'非表示にする':'表示する'}" aria-label="${visible?'非表示にする':'表示する'}" aria-pressed="${visible}"><img class="eye-art ${visible?'shown':'hidden'}" src="${EYE_IMAGES[visible?'shown':'hidden']}" alt="" aria-hidden="true" draggable="false"></button>
  <button type="button" class="mini-action lock-toggle${l.locked?' is-locked':''}" data-action="lock" data-id="${esc(l.id)}" title="${l.locked?'ロック解除（移動以外の編集を許可）':'施錠（位置移動のみ許可）'}" aria-label="${l.locked?'ロック解除':'ロックする'}" ${lockedFolderAncestor(l)?'disabled':''}><img src="assets/${l.locked?'lock-closed':'lock-open'}.png" alt="" draggable="false"></button>
  <span class="layer-thumb" title="${esc(l.name)} の描画プレビュー" aria-hidden="true">${layerThumbnailMarkup(l)}</span>
  <span class="layer-name" title="ダブルクリックで名前変更：${esc(l.name)}" data-rename-layer="${esc(l.id)}">${esc(l.name)}</span>
  <span class="layer-icon${folder?' folder-icon':''}${l.mergeGroup?' merged-group-icon':''}" title="${folder?(l.mergeGroup?'統合レイヤー':'グループフォルダー'):l.shape.raster?'ラスターレイヤー':'ベクターレイヤー'}">${icon}</span>
  ${folder?`<span class="folder-children-count">${children}</span>`:''}
  ${l.mergeGroup?`<button type="button" class="mini-action unmerge-inline" data-action="unmergeThis" data-id="${esc(l.id)}" title="統合解除" ${locked?'disabled':''}>↗</button>`:''}
  <button type="button" class="mini-action clip-action${clip?' active':''}" data-action="clip" data-id="${esc(l.id)}" title="${clip?'クリッピング解除':base?`下の${isFolder(base)?'フォルダー':'レイヤー'}にクリッピング`:'下にレイヤーかフォルダーが必要です'}" ${locked||!clip&&!base?'disabled':''}>↳</button>
 </div>`;
 }).join('');
}

function renderAll(){renderStage();renderPalette();renderLayers();renderInspector();renderTimeline();updateTimeUI();updateButtons();}
function updateButtons(){$$('.tool-btn').forEach(b=>b.classList.toggle('active',b.dataset.tool===S.tool));const toolHint=$('#toolHint');if(toolHint)toolHint.textContent=toolHints[S.tool]||'';$('#artboardShell').dataset.tool=S.tool;$('#playButton').textContent=S.playing?'Ⅱ':'▶';$('#zoomLabel').textContent=`${Math.round(S.zoom*S.fitScale*100)}%`;$('#gridButton').style.color=doc.gridVisible!==false?'#fffde9':'#d9d9c1';$('#gridButton').setAttribute('aria-pressed',String(doc.gridVisible!==false));$('#stageViewport').classList.add('no-grid');$('#stageViewport').dataset.viewMode=S.tool==='hand'?S.viewMode:'none';}
function applyInspectorTab(){
 if(!['layer','motion','tool','canvas'].includes(S.inspectorTab))S.inspectorTab='canvas';
 $$('.inspector-tab').forEach(b=>{const active=b.dataset.inspectorTab===S.inspectorTab;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
 $$('.inspector-tab-panel',$('#inspector')).forEach(p=>{p.hidden=p.dataset.panel!==S.inspectorTab;});
}
// Smooths only small vertex deviations. Sharp corners and open endpoints stay
// anchored; per-vertex widthScale and the original number of points are kept.
function autoVertexCorrectionInspector(layer){
 const count=(layer.shape.points?.length||0)+(layer.shape.extraContours||[]).reduce((n,c)=>n+c.length,0);
 const canApply=!effectiveLocked(layer)&&layer.shape.points?.length>=3;
 return `<section class="prop-section vertex-autocorrect-panel"><div class="prop-heading"><strong>頂点の自動補正</strong><span class="prop-chip blue">SMOOTH</span></div>
 <div class="field-wrap"><label for="vertexAutoCorrectionStrength">補正の強度 <output id="vertexAutoCorrectionValue">${S.autoVertexCorrectionStrength}%</output></label>
 <input type="range" id="vertexAutoCorrectionStrength" min="0" max="100" step="5" value="${S.autoVertexCorrectionStrength}" aria-label="頂点の自動補正の強度"/>
 <div class="slider-hints"><span>弱い・原形を維持</span><span>強い・滑らか</span></div></div>
 <button class="soft-btn primary wide" data-action="autoCorrectVertices" ${canApply?'':'disabled'}>自動補正を適用</button>
 <div class="prop-tip">調整したパスの細かな凸凹を滑らかに整えます。<b>線の両端・鋭い角・頂点ごとの線幅は維持</b>し、頂点数は変えません。${layer.morphKeys&&S.frame>0?'現在のフレームに変形キーを記録します。':'Undo（Ctrl+Z）で戻せます。'}<br>対象：ベジェ（塗り／線画）・直線から作ったパス・フリーハンド。${count} 頂点</div></section>`;
}
function vertexCorrection(points,closed,strength){
 const src=points.map(p=>({...p})),n=src.length;
 if(n<3||strength<=0)return src;
 const weight=strength/100,protectedCorners=new Array(n).fill(false),movable=new Array(n).fill(0);
 for(let i=0;i<n;i++){
  if(!closed&&(i===0||i===n-1)||src[i].nodeType==='corner')continue;
  const prev=src[(i-1+n)%n],p=src[i],next=src[(i+1)%n];
  const ax=p.x-prev.x,ay=p.y-prev.y,bx=next.x-p.x,by=next.y-p.y;
  const lenA=Math.hypot(ax,ay),lenB=Math.hypot(bx,by);
  if(lenA<1e-6||lenB<1e-6)continue;
  const turn=Math.acos(clamp((ax*bx+ay*by)/(lenA*lenB),-1,1));
  // Deliberate corners above ~80 degrees must remain pointed. The transition
  // from 45 to 80 degrees is gradual, rather than a sharp on/off threshold.
  const factor=clamp((1.40-turn)/.62,0,1);
  protectedCorners[i]=factor===0;
  movable[i]=factor;
 }
 const iterations=1+Math.round(3*weight),amount=(.13+.38*weight)*weight;
 let current=src.map(p=>({x:p.x,y:p.y}));
 for(let k=0;k<iterations;k++){
  const previous=current;
  current=previous.map((p,i)=>{
   if(movable[i]===0)return {...p};
   const a=previous[(i-1+n)%n],b=previous[(i+1)%n],da=Math.hypot(p.x-a.x,p.y-a.y),db=Math.hypot(p.x-b.x,p.y-b.y);
   if(da+db<1e-6)return {...p};
   const t=da/(da+db),target={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
   const dx=target.x-p.x,dy=target.y-p.y,mag=Math.hypot(dx,dy);
   const max=Math.min(da,db)*.35;
   const f=Math.min(1,max/Math.max(mag,1e-6))*amount*movable[i];
   return {x:p.x+dx*f,y:p.y+dy*f};
  });
 }
 return src.map((p,i)=>({...p,x:rnd(current[i].x,3),y:rnd(current[i].y,3),__cornerProtected:protectedCorners[i]}));
}
function correctedBezierHandles(points,closed){
 const n=points.length;
 return points.map((p,i)=>{
  const explicitCorner=p.nodeType==='corner'||p.__cornerProtected;
  const prev=points[(i-1+n)%n],next=points[(i+1)%n];
  let handles;
  if(explicitCorner){
   handles={inX:!closed&&i===0?0:(prev.x-p.x)/3,inY:!closed&&i===0?0:(prev.y-p.y)/3,
    outX:!closed&&i===n-1?0:(next.x-p.x)/3,outY:!closed&&i===n-1?0:(next.y-p.y)/3};
  }else{
   handles=curveHandles(points,i,closed);
   // Prevent excessive overshoot at unevenly spaced vertices.
   const limitIn=(!closed&&i===0)?0:Math.hypot(prev.x-p.x,prev.y-p.y)*.38;
   const limitOut=(!closed&&i===n-1)?0:Math.hypot(next.x-p.x,next.y-p.y)*.38;
   for(const [a,b,limit] of [['inX','inY',limitIn],['outX','outY',limitOut]]){
    const len=Math.hypot(handles[a],handles[b]);if(len>limit&&len>1e-7){handles[a]*=limit/len;handles[b]*=limit/len;}
   }
  }
  const {__cornerProtected, ...rest}=p;
  return {...rest,...Object.fromEntries(Object.entries(handles).map(([k,v])=>[k,rnd(v,3)])),nodeType:explicitCorner?'corner':'smooth'};
 });
}
function autoCorrectSelectedVertices(){
 const l=sel();
 if(!l||l.shape?.type!=='path'){toast('ベクターパスを選択してください。');return;}
 if(effectiveLocked(l)){toast('ロック中のレイヤーは補正できません。');return;}
 const strength=S.autoVertexCorrectionStrength;
 if(strength<=0){toast('補正の強度を1%以上にしてください。');return;}
 const sh=l.shape,closed=!!sh.closed;
 if(!Array.isArray(sh.points)||sh.points.length<3){toast('3点以上のパスが必要です。');return;}
 const originalMain=S.frame===0?getMorphPoints(l,0):getMorphPoints(l,S.frame);
 const smoothed=vertexCorrection(originalMain,closed,strength);
 const originalExtra=(sh.extraContours||[]).map(contour=>contour.map(p=>({...p})));
 const smoothedExtra=originalExtra.map(contour=>vertexCorrection(contour,true,strength));
 const previousMode=sh.pathMode||(sh.smooth?'auto':'line');
 const newMode=previousMode==='line'?'bezier':previousMode;
 const coordinatesChanged=(a,b)=>a.some((p,i)=>Math.hypot(p.x-b[i].x,p.y-b[i].y)>.001);
 const changed=coordinatesChanged(originalMain,smoothed)||originalExtra.some((c,i)=>coordinatesChanged(c,smoothedExtra[i]))||newMode!==previousMode;
 if(!changed){toast('すでに滑らかなパスです。');return;}
 snapshot();
 const changedAtZero=S.frame===0;
 if(changedAtZero){
  // The base shape is edited at frame zero. All existing morph keys receive
  // exactly the same positional offsets, preserving animation differences.
  const delta=smoothed.map((p,i)=>({x:p.x-originalMain[i].x,y:p.y-originalMain[i].y}));
  sh.points=sh.points.map((p,i)=>({...p,x:rnd(p.x+delta[i].x,3),y:rnd(p.y+delta[i].y,3)}));
  if(l.morphKeys)for(const entry of Object.values(l.morphKeys)){
   if(!Array.isArray(entry.points)||entry.points.length!==delta.length)continue;
   entry.points=entry.points.map((p,i)=>({x:rnd(p.x+delta[i].x,3),y:rnd(p.y+delta[i].y,3)}));
  }
 }else{
  if(!l.morphKeys)l.morphKeys={'0':{points:copyPts(sh.points),ease:'ease'}};
  if(!l.morphKeys['0'])l.morphKeys['0']={points:copyPts(sh.points),ease:'ease'};
  l.morphKeys[String(S.frame)]={points:copyPts(smoothed),ease:l.morphKeys[S.frame]?.ease||'ease'};
 }
 if(originalExtra.length)sh.extraContours=smoothedExtra.map((pts,i)=>pts.map((p,j)=>({...originalExtra[i][j],x:p.x,y:p.y})));
 if(newMode==='bezier'){
  // Bezier handles are relative to their anchors. Vertex widthScale and all
  // other point metadata are preserved by the spread in this helper.
  const basis=changedAtZero?sh.points:smoothed;
  const corrected=correctedBezierHandles(basis,closed);
  sh.points=sh.points.map((p,i)=>({...p,inX:corrected[i].inX,inY:corrected[i].inY,outX:corrected[i].outX,outY:corrected[i].outY,nodeType:corrected[i].nodeType}));
  if(sh.extraContours)sh.extraContours=sh.extraContours.map(c=>correctedBezierHandles(c,true));
 }
 sh.pathMode=newMode;sh.smooth=newMode==='auto';
 S.simplifySession=null;S.vertexSelected=false;
 mutated();
 toast(`自動補正を適用しました（強度 ${strength}%）。Ctrl+Zで戻せます。`);
}
function organizeInspectorTabs(){
 const host=$('#inspector');
 // Split independent sections so each can be folded without hiding other controls.
 const nodes=Array.from(host.children);
 for(let i=0;i<nodes.length;i++){
  const node=nodes[i];if(!node.classList?.contains('prop-section'))continue;
  // Keep the canvas grid configuration independent from project dimensions and name.
  const grid=node.classList.contains('project-overview')?node.querySelector('.grid-options'):null;
  if(grid){
   const gridSection=document.createElement('section');gridSection.className='prop-section grid-options';
   while(grid.firstChild)gridSection.appendChild(grid.firstChild);
   grid.remove();nodes.splice(i+1,0,gridSection);
  }
  // Position and pivot used to live in one section; make them separate motion groups.
  const headings=Array.from(node.children).filter(c=>c.classList?.contains('prop-heading'));
  if(headings.length>1){
   for(let h=1;h<headings.length;h++){
    const heading=headings[h],pivotSection=document.createElement('section');pivotSection.className='prop-section motion-pivot';
    if(heading.previousElementSibling?.classList.contains('prop-sep'))heading.previousElementSibling.remove();
    let move=heading;while(move){const next=move.nextSibling;pivotSection.appendChild(move);move=next;}
    if(pivotSection.firstElementChild?.classList.contains('prop-sep'))pivotSection.firstElementChild.remove();
    nodes.splice(++i,0,pivotSection);
   }
  }
  // Animation key buttons belong in Motion; effect appearance sliders stay in Layer.
  if(node.classList.contains('effects-panel')){
   const controls=node.querySelector(':scope > .prop-control-row');
   if(controls){
    const motionSection=document.createElement('section');motionSection.className='prop-section motion-effect-keys';
    const heading=document.createElement('div');heading.className='prop-heading';heading.innerHTML='<strong>エフェクトアニメーション</strong><span class="micro">FX</span>';
    motionSection.appendChild(heading);const hint=controls.nextElementSibling?.classList.contains('prop-tip')?controls.nextElementSibling:null;
    motionSection.appendChild(controls);if(hint)motionSection.appendChild(hint);
    nodes.splice(i+1,0,motionSection);
   }
  }
 }
 const buckets={layer:[],motion:[],tool:[],canvas:[]};
 const motionTitles=new Set(['位置・変形','グループの位置・変形','回転軸 / 関節','グループの回転軸','キーフレーム','グループのアニメーション','簡単モーション','エフェクトアニメーション']);
 for(const node of nodes){
  const title=node.querySelector?.(':scope > .prop-heading strong')?.textContent?.trim()||'';
  const tab=node.classList?.contains('project-overview')||node.classList?.contains('grid-options')?'canvas'
   :node.classList?.contains('deform-panel')||node.classList?.contains('motion-pivot')||motionTitles.has(title)?'motion'
   :node.classList?.contains('path-editor')?'tool':'layer';
  buckets[tab].push(node);
 }
 // Position and keyframes lead; advanced deformation / effect keys follow them.
 const motionOrder={'位置・変形':0,'グループの位置・変形':0,'回転軸 / 関節':1,'グループの回転軸':1,'キーフレーム':2,'グループのアニメーション':2,'変形アニメーション':3,'エフェクトアニメーション':4,'簡単モーション':5};
 buckets.motion.sort((a,b)=>(motionOrder[a.querySelector(':scope > .prop-heading strong')?.textContent?.trim()]??99)-(motionOrder[b.querySelector(':scope > .prop-heading strong')?.textContent?.trim()]??99));
 host.replaceChildren();const panels={};
 for(const tab of ['layer','motion','tool','canvas']){
  const panel=document.createElement('div');panel.className='inspector-tab-panel';panel.dataset.panel=tab;panel.setAttribute('role','tabpanel');
  buckets[tab].forEach(node=>panel.appendChild(node));host.appendChild(panel);panels[tab]=panel;
 }
 if(!buckets.layer.length)panels.layer.innerHTML='<div class="inspector-placeholder">パーツを選択するとレイヤーの設定が表示されます。</div>';
 if(!buckets.motion.length)panels.motion.innerHTML='<div class="inspector-placeholder">レイヤーやフォルダーを選ぶと、位置・回転軸・キーフレーム・変形モーションの設定が表示されます。</div>';
 if(S.tool==='select'){
  const selectedLayer=sel();
  if(selectedLayer&&selectedLayer.shape?.type==='path'&&(selectedLayer.shape.lineArt||selectedLayer.strokeOn))panels.tool.insertAdjacentHTML('beforeend',selectionStrokeInspector(selectedLayer));
  if(selectedLayer&&selectedLayer.shape?.type==='path')panels.tool.insertAdjacentHTML('beforeend',autoVertexCorrectionInspector(selectedLayer));
 }
 if(S.tool==='crop')panels.tool.insertAdjacentHTML('beforeend',cropPanel());
 if(S.tool==='gradient')panels.tool.insertAdjacentHTML('beforeend',gradientToolPanel());
 panels.tool.insertAdjacentHTML('afterbegin',`<section class="prop-section tool-settings"><div class="prop-heading"><strong>描画ツール</strong><span class="micro">TOOLS</span></div>
 <div class="active-tool-name">${esc(({select:'選択',crop:'切り抜き',gradient:'グラデーション',node:'頂点',pen:'ベジェ（塗り）',strokePen:'ベジェ（線画）',line:'直線',brush:'フリーハンド',raster:'ラフ作画',rect:'四角形',ellipse:'楕円',triangle:'三角形',triangleUp:'三角形 △',triangleDown:'三角形 ▼',mesh:'メッシュ',pivot:'回転軸',hand:'手のひら',text:'テキスト'})[S.tool]||S.tool)}</div>
 <div id="toolHint" class="prop-tip">${esc(toolHints[S.tool]||'')}</div>
 ${S.tool==='node'&&sel()?.shape?.type==='path'&&S.vertexSelected?`<section class="prop-section fm-node-point-style"><div class="prop-heading"><strong>選択中の点 ${S.nodeIndex+1}</strong></div><div class="prop-control-row"><button type="button" class="soft-btn" data-action="pointCorner">◆ 角ばらせる</button><button type="button" class="soft-btn" data-action="pointSmooth">◯ なめらかにする</button></div><div class="prop-tip">塗り・線画・直線・ベジェ・自動スムーズに対応。切替後も頂点選択を維持します。</div></section>`:''}
 ${S.tool==='triangle'?`<div class="fm-triangle-direction"><fieldset class="view-mode-group"><legend>三角形の向き</legend><label class="view-mode-choice"><input type="radio" name="fmTriangleDirection" value="up" ${S.triangleDirection==='up'?'checked':''}><span>△ 上向き</span></label><label class="view-mode-choice"><input type="radio" name="fmTriangleDirection" value="down" ${S.triangleDirection==='down'?'checked':''}><span>▼ 下向き</span></label></fieldset><div class="prop-tip">描画する三角形の向きを選択します。既存の図形は変更しません。</div></div>`:''}
 ${S.tool==='node'?`<div class="fm-node-edit-mode"><div class="deform-subtitle"><b>頂点操作</b><span>編集方法を切替</span></div><fieldset class="fm-node-mode-radios"><legend>操作モード</legend>${[['edit','編集'],['add','頂点追加'],['delete','頂点削除']].map(([value,label])=>`<label><input type="radio" name="fmNodeMode" value="${value}" ${S.nodeMode===value?'checked':''}><span>${label}</span></label>`).join('')}</fieldset>${S.nodeMode==='add'?`<div class="prop-tip">同じパスの頂点をクリック後、Shift＋クリックで隣の頂点を選択。2点間に均等に追加します。</div><div class="prop-row"><label for="fmNodeInsertCount">追加数</label><input type="number" id="fmNodeInsertCount" min="1" max="100" step="1" value="${S.nodeInsertCount}" style="width:76px"></div><button class="soft-btn primary wide" data-action="fmInsertBetweenNodes" ${S.nodeSelected.size!==2?'disabled':''}>選択した2点の間に頂点を追加（${S.nodeSelected.size}/2）</button>`:''}${S.nodeMode==='delete'?'<div class="prop-tip">削除したい頂点をクリックすると、その頂点を削除します。</div>':''}</div>`:''}
 ${S.tool==='select'?`<div class="fm-selection-flip prop-section"><div class="prop-heading"><strong>選択オブジェクトの反転</strong></div><div class="prop-control-row" style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="soft-btn" data-action="flipHorizontal">⇄ 左右反転</button><button type="button" class="soft-btn" data-action="flipVertical">⇅ 上下反転</button></div><div class="prop-tip">選択したオブジェクトを回転軸を基準に反転します。複数選択・フォルダーにも対応します。</div></div><div class="shape-ratio-setting"><label class="check-inline"><input type="checkbox" id="constrainSelection" ${S.constrainSelection?'checked':''}> 縦横比を維持して拡大縮小</label><span>四隅のハンドルで変形するときに適用</span></div><div class="prop-tip">OFFのときは自由変形。Shiftキーを押している間も縦横比を維持します。角丸と凹み角の半径は変わりません。</div>`:''}
 ${['rect','ellipse'].includes(S.tool)?`<div class="shape-ratio-setting"><label class="check-inline"><input type="checkbox" id="constrainShape" ${S.constrainShape?'checked':''}> 図形を1:1の比率で描画</label><span>正方形・正円（四角形／楕円）</span></div>
 <div class="prop-tip">チェックを入れると、図形をドラッグするとき幅と高さが等しくなります。Shiftキーを押しながらドラッグしても1:1にできます。</div>`:''}
 ${S.tool==='raster'?`<div class="freehand-options raster-options">
 <fieldset class="view-mode-group"><legend>ラフ描画ツール</legend><label class="view-mode-choice"><input type="radio" name="rasterMode" value="pen" ${S.rasterMode==='pen'?'checked':''}><span>ペン</span></label><label class="view-mode-choice"><input type="radio" name="rasterMode" value="eraser" ${S.rasterMode==='eraser'?'checked':''}><span>消しゴム</span></label></fieldset>
 <div class="field-wrap"><label for="rasterSize">${S.rasterMode==='pen'?'ペン':'消しゴム'}のサイズ <output id="rasterSizeValue">${S.rasterSizes[S.rasterMode]}</output> px</label><input id="rasterSize" type="range" min="1" max="150" step="1" value="${S.rasterSizes[S.rasterMode]}"></div>
 <div class="field-wrap"><label for="rasterStabilize">手振れ補正 <output id="rasterStabilizeValue">${S.rasterStabilize}</output>%</label><input id="rasterStabilize" type="range" min="0" max="100" step="1" value="${S.rasterStabilize}"></div>
 <label class="check-inline raster-pressure-toggle"><input id="rasterPressure" type="checkbox" ${S.rasterPressure?'checked':''}> 筆圧でブラシの太さを変更</label>
 <div class="prop-tip">筆圧対応ペンタブでは、弱く押すと細く・強く押すと太く描けます（ペン・消しゴム両対応）。マウスは設定サイズのまま描画します。ブラシサイズはツールごとに独立して保存。PSD・PNG・SVG・プロジェクト保存に対応。</div>
 <button class="soft-btn primary wide" data-action="createRaster">＋ ラスターレイヤー追加</button></div>`:''}
 ${S.tool==='brush'?`<div class="freehand-options">
 <fieldset class="view-mode-group freehand-mode-group"><legend>描画モード</legend>
  <label class="view-mode-choice"><input type="radio" name="freehandMode" value="fill" ${S.brushMode==='fill'?'checked':''}><span>塗りつぶし</span></label>
  <label class="view-mode-choice"><input type="radio" name="freehandMode" value="line" ${S.brushMode==='line'?'checked':''}><span>線画</span></label>
 </fieldset>
 <div class="field-wrap"><label for="freehandMaxPoints">最大ポイント数 <output id="freehandMaxPointsValue">${S.brushMaxPoints}</output> 点</label>
 <input type="range" id="freehandMaxPoints" min="10" max="800" step="10" value="${S.brushMaxPoints}">
 <div class="slider-hints"><span>少ない・シンプル</span><span>多い・細かい</span></div></div>
 <div class="shape-ratio-setting"><label class="check-inline"><input id="freehandAutoSmooth" type="checkbox" ${S.brushAutoSmooth?'checked':''}> 自動補正（手ぶれをなめらかに）</label></div>
 <div class="field-wrap"><label for="freehandSmoothStrength">補正の強さ <output id="freehandSmoothStrengthValue">${S.brushSmoothStrength}</output>%</label>
 <input type="range" id="freehandSmoothStrength" min="0" max="100" step="5" value="${S.brushSmoothStrength}" ${S.brushAutoSmooth?'':'disabled'}>
 <div class="slider-hints"><span>弱い・描線を保持</span><span>強い・なめらか</span></div></div>
 <div class="prop-tip">描画前に設定して、キャンバス上をドラッグしてください。線画は塗りなしの編集可能なパスになり、頂点ごとの線幅や実線・破線・点線にも対応します。ポイント上限は<strong>確定したパスの頂点数</strong>に適用します。</div>
 </div>`:''}

  ${S.tool==='hand'?`<fieldset class="view-mode-group"><legend>ビュー操作</legend>
   <label class="view-mode-choice"><input type="radio" name="viewMode" value="move" ${S.viewMode==='move'?'checked':''}><span>移動</span></label>
   <label class="view-mode-choice"><input type="radio" name="viewMode" value="rotate" ${S.viewMode==='rotate'?'checked':''}><span>回転</span></label>
   <label class="view-mode-choice"><input type="radio" name="viewMode" value="scale" ${S.viewMode==='scale'?'checked':''}><span>拡大縮小</span></label>
   </fieldset><div class="prop-tip view-mode-hint">${S.viewMode==='move'?'ドラッグでキャンバスの表示位置を移動します。':S.viewMode==='rotate'?'左右にドラッグして表示だけを回転します。Shiftキーで15°ごとに固定。':'上下にドラッグして表示倍率を変更します。上方向に拡大、下方向に縮小。'}</div>
   <div class="view-status">倍率 <b id="viewZoomReadout">${Math.round(S.zoom*S.fitScale*100)}%</b> ／ 回転 <b id="viewAngleReadout">${rnd(S.viewRotation,1)}°</b></div>
   <div class="view-reset-actions"><button class="soft-btn" data-action="resetRotation">回転を戻す</button><button class="soft-btn" data-action="resetView">表示をリセット</button></div>`:''}
  ${S.tool==='node'?`<div class="node-size-setting field-wrap"><label for="nodeHandleSize">頂点の表示サイズ <output id="nodeHandleSizeValue">${S.nodeHandleSize}</output> px</label><input type="range" min="1" max="7" step="0.5" value="${S.nodeHandleSize}" id="nodeHandleSize"><div class="prop-tip">画面に表示する頂点の大きさだけを変更します。クリックできる範囲は少し広めに残します。</div></div>`:''}
 ${['pen','strokePen','node'].includes(S.tool)?`<div class="pen-guide"><b>${S.tool==='strokePen'?'線画ベジェの描き方':'ベジェ曲線の描き方'}</b><span>${S.tool==='strokePen'?'点をクリックして追加 → 「線画を確定」。開いたパスのまま、あとから頂点やカーブを編集できます。':'点をクリックして追加 → 確定 → 線の種類でベジェ曲線や自動スムーズに変更。'}</span></div>`:''}
 </section>`);

 if(!buckets.canvas.length)panels.canvas.insertAdjacentHTML('beforeend','<div class="inspector-placeholder">キャンバス設定を読み込めませんでした。</div>');
 panels.canvas.insertAdjacentHTML('beforeend',`<section class="prop-section"><div class="prop-heading"><strong>書き出し</strong><span class="micro">EXPORT</span></div>
 <div class="prop-tip">静止画は現在のフレームを、動画・PNG連番・再生HTMLはタイムライン全体を書き出します。</div>
 <div class="export-options">
 <button class="soft-btn" data-action="exportPNG"><strong>PNG画像</strong><span>現在のフレーム</span></button>
 <button class="soft-btn" data-action="exportSVG"><strong>SVGベクター</strong><span>現在のフレーム</span></button>
 <button class="soft-btn" data-action="exportFrames"><strong>PNG連番 ZIP</strong><span>全フレーム</span></button>
 <button class="soft-btn" data-action="exportWEBM"><strong>WebM動画</strong><span>全フレーム</span></button>
 <button class="soft-btn" data-action="exportHTML"><strong>アニメーションHTML</strong><span>ブラウザで再生可能</span></button>
 </div></section>`);
 setupInspectorCollapsibles();
 setupInspectorSubtabs();
 applyInspectorTab();
}
// Each existing section heading is one independent sub-tab.
// Do not categorize controls into arbitrary Basic/Effects groups.
const inspectorSubtabState={layer:'',motion:'',tool:'',canvas:''};
function inspectorSectionTitle(section){
 const title=section.querySelector(':scope > .prop-section-toggle .prop-toggle-heading strong, :scope > .prop-heading strong');
 return (title?.textContent||'').trim();
}
function setupInspectorSubtabs(){
 const host=$('#inspector');
 for(const panel of $$('.inspector-tab-panel',host)){
  const tab=panel.dataset.panel;
  const children=Array.from(panel.children);
  if(!children.length)continue;
  const entries=[];
  const duplicates=new Map();
  for(const child of children){
   const title=child.classList?.contains('prop-section')?inspectorSectionTitle(child):'案内';
   const label=title||'その他';
   const n=(duplicates.get(label)||0)+1;duplicates.set(label,n);
   const key=label+(n>1?' #'+n:'');
   const page=document.createElement('div');page.className='inspector-subtab-page';page.dataset.subtabPage=key;page.setAttribute('role','tabpanel');
   page.appendChild(child);entries.push({key,label,page});
  }
  const available=entries.map(x=>x.key);
  const current=available.includes(inspectorSubtabState[tab])?inspectorSubtabState[tab]:available[0];
  const shell=document.createElement('div');shell.className='inspector-subtab-shell';
  const nav=document.createElement('nav');nav.className='inspector-subtabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','設定項目');
  for(const item of entries){
   const btn=document.createElement('button');btn.type='button';btn.className='inspector-subtab';btn.dataset.propertySubtab=item.key;btn.dataset.propertyMainTab=tab;
   btn.textContent=item.label;btn.title=item.label;btn.setAttribute('role','tab');
   const active=item.key===current;btn.classList.toggle('active',active);btn.setAttribute('aria-selected',String(active));
   nav.appendChild(btn);
  }
  shell.append(nav);
  panel.replaceChildren(shell);
  for(const item of entries){item.page.hidden=item.key!==current;panel.appendChild(item.page);}
  // Always expose selected section controls, even if it was folded previously.
  activateInspectorSection(panel,current,false);
 }
}
function activateInspectorSection(panel,key,resetScroll=true){
 const tab=panel.dataset.panel;
 inspectorSubtabState[tab]=key;
 for(const p of panel.querySelectorAll(':scope > .inspector-subtab-page')){
  p.hidden=p.dataset.subtabPage!==key;
  if(!p.hidden){
   const body=p.querySelector('.prop-section-body');
   const toggle=p.querySelector('.prop-section-toggle');
   if(body)body.hidden=false;
   if(toggle)toggle.setAttribute('aria-expanded','true');
  }
 }
 for(const btn of panel.querySelectorAll('.inspector-subtabs .inspector-subtab')){
  const active=btn.dataset.propertySubtab===key;
  btn.classList.toggle('active',active);btn.setAttribute('aria-selected',String(active));
 }
 if(resetScroll){const scrolling=$('#inspector');if(scrolling)scrolling.scrollTop=0;}
}
function switchInspectorSubtab(tab,key){
 const panel=$$('.inspector-tab-panel',$('#inspector')).find(p=>p.dataset.panel===tab);
 if(!panel||!Array.from(panel.children).some(p=>p.dataset.subtabPage===key))return;
 activateInspectorSection(panel,key);
}
document.addEventListener('click',e=>{
 const btn=e.target.closest?.('[data-property-subtab]');
 if(btn){switchInspectorSubtab(btn.dataset.propertyMainTab,btn.dataset.propertySubtab);return;}
});

function setupInspectorCollapsibles(){
 const panels=$$('.inspector-tab-panel',$('#inspector'));
 for(const panel of panels){
  for(const section of Array.from(panel.children)){
   if(!section.classList?.contains('prop-section'))continue;
   const heading=Array.from(section.children).find(el=>el.classList?.contains('prop-heading'));
   if(!heading)continue;
   const name=heading.querySelector('strong')?.textContent?.trim();if(!name)continue;
   const key=`${panel.dataset.panel}:${name}`;
   const body=document.createElement('div');body.className='prop-section-body';
   while(heading.nextSibling)body.appendChild(heading.nextSibling);
   const toggle=document.createElement('button');toggle.type='button';toggle.className='prop-section-toggle';toggle.dataset.collapseSection=key;
   const title=document.createElement('span');title.className='prop-toggle-heading';title.innerHTML=heading.innerHTML;
   const arrow=document.createElement('span');arrow.className='prop-toggle-arrow';arrow.setAttribute('aria-hidden','true');
   toggle.append(title,arrow);const collapsed=S.inspectorCollapsed.has(key);
   toggle.setAttribute('aria-expanded',String(!collapsed));body.hidden=collapsed;
   heading.replaceWith(toggle);section.appendChild(body);
  }
 }
}

function repeatInspector(l){
 const r=normalizeRepeat(l.repeat),lock=effectiveLocked(l)?'disabled':'';
 const f=repeatFootprint(l),count=r.copies+1;
 const availableGap=r.mode==='circle'?2*r.radius*Math.sin(Math.PI/count)-f.circle:
  r.mode==='rect'?2*(r.width+r.height)/count-f.circle:Infinity;
 const gapWarning=r.enabled&&r.copies&&r.mode!=='line'&&r.gap>availableGap+.001?
  `<div class="prop-tip" role="status">この${r.mode==='circle'?'半径':'四角形サイズ'}と複製数では ${r.gap}px のすき間を確保できません。最大目安は ${Math.floor(availableGap)}px です。半径・幅・高さを大きくするか複製数を減らしてください。</div>`:'';
 const slider=(title,name,min,max,step=1,unit='px')=>`<div class="repeat-field"><label for="repeat-${name}">${title}<output data-repeat-value="${name}">${r[name]}${unit?' '+unit:''}</output></label><input id="repeat-${name}" type="range" data-repeat="${name}" min="${min}" max="${max}" step="${step}" value="${r[name]}" ${lock}></div>`;
 return `<section class="prop-section repeat-placement" data-repeat-owner="${esc(l.id)}"><div class="prop-heading"><strong>複製配置</strong><span class="prop-chip blue">REPEAT</span></div>
 <label class="check-inline"><input type="checkbox" data-repeat="enabled" ${r.enabled?'checked':''} ${lock}> 複製配置を使用する</label>
 <div class="prop-row"><label>配置形状</label><select data-repeat="mode" ${lock}><option value="rect" ${r.mode==='rect'?'selected':''}>四角形（周囲）</option><option value="circle" ${r.mode==='circle'?'selected':''}>円形（円周）</option><option value="line" ${r.mode==='line'?'selected':''}>直線</option></select></div>
 ${slider('複製数','copies',0,48,1,'個')}
 <div class="repeat-count-note">元の形を含め <strong>${r.copies+1} 個</strong>を配置</div>
 ${slider('オブジェクトの角度','angle',-180,180,1,'°')}
 ${r.mode==='rect'?slider('四角形の幅','width',20,1200,5)+slider('四角形の高さ','height',20,1000,5):r.mode==='circle'?slider('円の半径','radius',10,600,5):slider('直線の長さ','length',0,1500,5)}
 ${slider('複製間隔','gap',-120,240,1)}
 ${gapWarning}
 <div class="prop-tip">元の形状を残した非破壊複製です。円の半径・四角形の縦横サイズは固定です。複製間隔は隣り合うオブジェクトのすき間です。指定の大きさにすべて収まらない場合は最大配置数に応じて自動調整します。フォルダーでは中のパーツ全体を複製します。</div>
 <div class="prop-tip">複製は元のレイヤーに連動し、移動・回転・変形アニメーション・色変更にも追従します。元の形状は変更されません。</div>
 </section>`;
}
function updateRepeatInput(input,live=false){
 const l=sel();if(!l||effectiveLocked(l)||!input.dataset.repeat)return;
 const field=input.dataset.repeat;
 if(live&&!input.dataset.repeatEditing){snapshot();input.dataset.repeatEditing='1';}
 if(!live)snapshot();
 const r=normalizeRepeat(l.repeat);
 if(field==='enabled')r.enabled=input.checked;
 else if(field==='mode')r.mode=input.value;
 else r[field]=Number(input.value);
 l.repeat=normalizeRepeat(r);
 if(live){
  const output=document.querySelector(`[data-repeat-value="${field}"]`);
  if(output)output.textContent=l.repeat[field]+(field==='copies'?' 個':field==='angle'?' °':' px');
  const count=$('.repeat-count-note strong');if(count)count.textContent=(l.repeat.copies+1)+' 個';
  renderStage();saveLocal();
 }else{
  renderAll();saveLocal();
 }
}

function folderOutlineInspector(folder){const o=layerOutline(folder);return `<section class="prop-section"><div class="prop-heading"><strong>フォルダーのアウトライン</strong><span class="prop-chip blue">外周のみ</span></div>
 <div class="prop-tip">フォルダー内の閉じたベクター図形を合体した外周線です。重なる図形の内部境界は描画しません。元の子レイヤーはそのまま編集できます。</div>
 <label class="check-inline"><input type="checkbox" data-outline="on" ${o.on?'checked':''}> 外周アウトラインを有効化</label>

 <fieldset class="fm-outline-placement" aria-label="アウトラインの位置"><legend>線の位置</legend><div class="fm-outline-placement-choices">${[['inside','内側'],['center','中央'],['outside','外側']].map(([value,label])=>`<label><input type="radio" name="fmOutlinePlacement_${esc(folder.id)}" data-outline="placement" value="${value}" ${o.placement===value?'checked':''}> ${label}</label>`).join('')}</div></fieldset>
 <div class="prop-row"><label>線色</label><input type="color" data-outline="color" value="${esc(o.color)}"></div>
 <div class="prop-row"><label>線幅</label><input type="range" data-outline="width" min="0.5" max="40" step="0.5" value="${rnd(o.width,1)}"></div>
 <div class="prop-row"><label>線種</label><select data-outline="style"><option value="solid" ${o.style==='solid'?'selected':''}>実線</option><option value="dash" ${o.style==='dash'?'selected':''}>破線</option><option value="dot" ${o.style==='dot'?'selected':''}>点線</option></select></div>
 <div class="prop-tip">フォルダーから「クローン」を作ると、独立した線だけのレイヤーとして表示できます。</div></section>`;}
function folderInspector(l){const p=getPose(l),members=doc.layers.filter(x=>memberOfFolder(x,l.id)&&!isFolder(x)),folders=folderOptions(l),direct=directChildren(l.id);
 return `<section class="prop-section"><div class="prop-heading"><strong>${l.mergeGroup?'統合オブジェクト（編集可能）':'フォルダー情報'}</strong><span class="prop-chip">${members.length} PARTS</span></div>
 <div class="prop-row"><label>${l.mergeGroup?'オブジェクト名':'フォルダー名'}</label><input data-field="name" type="text" value="${esc(l.name)}" maxlength="60"></div>
 <div class="prop-row"><label>入れ子の階層</label><select data-field="folderId"><option value="">最上位</option>${folders.map(f=>`<option value="${esc(f.id)}" ${l.folderId===f.id?'selected':''}>${esc(f.name)}</option>`).join('')}</select></div>
 <div class="folder-hint">${l.mergeGroup?'<strong>非破壊の統合</strong> — 色・ベジェパス・頂点・キーフレームは元のまま残っています。展開後に子レイヤーを選べば個別編集可能。折りたたむと1つのオブジェクトとして選択・移動できます。':'<strong>まとめてアニメーション</strong> — フォルダーを選択してキャンバス上をドラッグすると、中のパーツがすべて移動します。回転ハンドルで回転、四隅のハンドルで拡大縮小できます。個別のパーツも引き続き編集可能です。'}</div>
 <div class="group-controls">${l.mergeGroup?`<button class="soft-btn primary" data-action="expandMerged">◇ 中のパーツを編集</button><button class="soft-btn" data-action="unmergeLayers">統合解除</button>`:`<button class="soft-btn" data-action="addFolderChild">＋ 素材を追加</button><button class="soft-btn" data-action="ungroup">フォルダー解除</button>`}</div></section>
 <section class="prop-section"><div class="prop-heading"><strong>グループの位置・変形</strong><span class="micro">FRAME ${String(S.frame+1).padStart(3,'0')}</span></div>
 <div class="prop-grid"><div class="field-wrap"><label>位置 X</label><input type="number" data-pose="x" value="${rnd(p.x)}"></div><div class="field-wrap"><label>位置 Y</label><input type="number" data-pose="y" value="${rnd(p.y)}"></div><div class="field-wrap"><label>回転 °</label><input type="number" data-pose="r" value="${rnd(p.r)}"></div><div class="field-wrap"><label>横方向の倍率</label><input type="number" step="0.05" data-pose="sx" value="${rnd(p.sx,3)}"></div><div class="field-wrap"><label>縦方向の倍率</label><input type="number" step="0.05" data-pose="sy" value="${rnd(p.sy,3)}"></div></div>
 <div class="prop-sep"></div><div class="prop-heading"><strong>グループの回転軸</strong></div><div class="prop-grid"><div class="field-wrap"><label>軸 X</label><input type="number" data-pivot="x" value="${rnd(l.pivot.x)}"></div><div class="field-wrap"><label>軸 Y</label><input type="number" data-pivot="y" value="${rnd(l.pivot.y)}"></div></div>
 <div class="prop-tip">フォルダーの回転軸は、作成時に内容物の中央へ配置されます。「回転軸」ツールで変更できます。</div></section>
 <section class="prop-section"><div class="prop-heading"><strong>グループのアニメーション</strong><span class="micro">${Object.keys(l.keys).length} KEYS</span></div>
 <div class="prop-control-row"><button class="soft-btn primary" data-action="addKey">◆ キーを打つ</button><button class="soft-btn" data-action="removeKey">キー削除</button></div>
 <div class="prop-tip">このフォルダーにキーフレームを追加すると、中に入っているすべてのレイヤーの動きに重ねて適用されます。</div></section>
 <section class="prop-section"><div class="prop-heading"><strong>フォルダー内のパーツ</strong></div><div class="prop-tip">${direct.length?(l.mergeGroup?direct.map(x=>`<button type="button" class="merged-part-jump" data-select="${esc(x.id)}" title="選択してパス・色を編集">${esc(x.name)}</button>`).join(''):direct.map(x=>esc(x.name)).join(' ／ ')):'まだ空です。レイヤーをフォルダーへドラッグしてください。'}</div></section>`;}
function lockedInspector(layer){
 const p=getPose(layer),kind=layer.mergeGroup?'統合オブジェクト':isFolder(layer)?'フォルダー':'レイヤー';
 return `<section class="prop-section locked-inspector"><div class="prop-heading"><strong>施錠中：${esc(layer.name)}</strong><span class="prop-chip">${kind}</span></div>
 <div class="lock-inspector-head"><img src="assets/lock-closed.png" alt=""/><span>位置の移動のみ可能です。色・パス・回転・拡大縮小・レイヤー構成は編集できません。${isFolder(layer)?'ロック中は内部を開けません。':''}</span></div>
 <div class="prop-grid"><div class="field-wrap"><label>位置 X</label><input type="number" step="1" data-pose="x" value="${rnd(p.x)}"/></div><div class="field-wrap"><label>位置 Y</label><input type="number" step="1" data-pose="y" value="${rnd(p.y)}"/></div></div>
 <button type="button" class="soft-btn wide" data-action="unlockSelected">鍵を解除して編集する</button></section>`;
}
function isOpacitySliderLayer(layer){return !!layer;}
function syncPaletteOpacitySlider(){
 const input=document.getElementById('fmLayerOpacitySlider');if(!input)return;
 const label=document.getElementById('fmLayerOpacityValue');
 const hint=document.getElementById('fmLayerOpacityHint');
 const layer=sel();const locked=!!layer&&effectiveLocked(layer);
 const active=!!layer&&!locked;
 const value=layer?Math.round(clamp(getPose(layer).opacity,0,1)*100):100;
 // Do not disrupt a gesture with DOM rewrites. Only modify the slider's value
 // when the active layer/frame changes or another control has updated the pose.
 if(!input.dataset.liveDirty)input.value=String(value);
 input.disabled=!active;
 if(label)label.textContent=(input.dataset.liveDirty?input.value:value)+'%';
 if(hint)hint.textContent=!layer?'レイヤーを選択してください':locked?'ロック解除すると調整できます':layer.name;
}
function threeDInspector(layer){const d=layer.shape.threeD;return `<section class="prop-section"><div class="prop-heading"><strong>3D下書きレイヤー</strong><span class="prop-chip">実験版</span></div><div class="prop-tip">${esc(d.filename||'3Dモデル')}／${esc((d.format||'').toUpperCase())}</div><button type="button" class="soft-btn primary wide" data-action="edit3D">▧ モデル・ポーズを編集</button><div class="prop-tip">OBJ / FBX / VRM / GLB。3D画面で回転・移動・ボーン角度・カメラを調整し、「レイヤーへ反映」で更新します。完成画像は他の2Dレイヤーと同様に上下移動できます。</div></section>${projectInspector()}`;}
async function open3DLayer(existing=false){const layer=existing?sel():null;if(existing&&(!layer?.shape?.threeD||effectiveLocked(layer)))return;
 try{const module=await import('./three-layer.js');if(!window.FlatMotion3D)throw Error('3Dモジュールが初期化されませんでした');await window.FlatMotion3D.open({layer,documentWidth:doc.width,documentHeight:doc.height,onSave:({data,threeD,width,height})=>{
 snapshot();if(layer&&doc.layers.includes(layer)){layer.shape={type:'image',w:width,h:height,data,threeD};setSingleSelection(layer.id);}
 else{const created=newLayer({type:'image',w:width,h:height,data,threeD},doc.width/2,doc.height/2,'3D下書き：'+threeD.filename,{worldCoordinates:true});setSingleSelection(created.id);}
 mutated();toast('3D下書きをレイヤーへ反映しました。');}});
 }catch(e){console.error(e);toast('3D編集画面を開けませんでした。ブラウザ・通信環境をご確認ください。');}}
function renderInspector(){const el=$('#inspector');const l=sel();if(l?.shape?.type==='clone'&&!effectiveLocked(l)){el.innerHTML=cloneInspector(l);organizeInspectorTabs();return;}if(l?.shape?.threeD&&!effectiveLocked(l)){el.innerHTML=threeDInspector(l);organizeInspectorTabs();return;}if(l&&effectiveLocked(l)){el.innerHTML=lockedInspector(l);organizeInspectorTabs();return;}if(isFolder(l)){el.innerHTML=folderInspector(l)+folderOutlineInspector(l)+repeatInspector(l)+effectsInspector(l)+clipInspector(l)+projectInspector();organizeInspectorTabs();return;}if(!l){el.innerHTML=`<div class="inspector-empty"><div class="illu"><img src="assets/decorations/inspector-leaf.png" alt=""></div><strong>まずはパーツを描いてみましょう</strong><p>上部の四角形・楕円・ベジェ曲線で形を作れます。<br>パーツを選ぶと回転軸やアニメーションを設定できます。</p><button class="soft-btn primary wide" data-action="import">SVG / PNG のパーツを読み込む</button><div class="project-summary"><span>キャンバス <b>${doc.width} × ${doc.height}</b></span><span>フレームレート <b>${doc.fps} FPS</b></span><span>長さ <b>${doc.seconds} 秒</b></span><span>パーツ数 <b>${doc.layers.length}</b></span></div></div>${projectInspector()}`;organizeInspectorTabs();return;}
 const p=getPose(l),frames=Object.keys(l.keys).map(Number).sort((a,b)=>a-b),atKey=Object.hasOwn(l.keys,String(S.frame));const prevFrame=frames.filter(f=>f<=S.frame).at(-1)||0;const easing=l.keys[prevFrame]?.ease||'ease';
 const desc=l.shape.type==='merged'?'統合済みベクターオブジェクト':l.shape.type==='svg'?'SVG素材（元のパスを保持）':l.shape.type==='image'?'PNG素材（ラスターレイヤー）':l.shape.type==='path'?(l.shape.lineArt?'線画ベクターパス':'編集可能なパス'):l.shape.type==='rect'?'ベクター長方形':l.shape.type==='text'?'編集可能なテキスト':'ベクター楕円';
 const others=doc.layers.filter(x=>!isFolder(x)&&x.id!==l.id&&!descendantOf(x.id,l.id));
 el.innerHTML=`
 <section class="prop-section"><div class="prop-heading"><strong>パーツ情報</strong><span class="prop-chip">${esc(desc)}</span></div><div class="prop-row"><label>パーツ名</label><input data-field="name" type="text" value="${esc(l.name)}" maxlength="60"></div><div class="prop-row"><label>親パーツ</label><select data-field="parent"><option value="">親なし（独立）</option>${others.map(a=>`<option value="${a.id}" ${l.parent===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></div><div class="prop-tip">親を設定すると、親の移動や回転に子パーツも追従します。胴体→腕→前腕のような構造を作れます。</div><div class="prop-row"><label>所属フォルダー</label><select data-field="folderId"><option value="">最上位</option>${folderOptions(l).map(f=>`<option value="${esc(f.id)}" ${l.folderId===f.id?'selected':''}>${esc(f.name)}</option>`).join('')}</select></div><div class="prop-tip">左のレイヤー一覧からフォルダーへドラッグしても収納できます。</div></section>
 ${textInspector(l)}
 ${lineArtInspector(l)}
 ${repeatInspector(l)}
 ${clipInspector(l)}
 ${effectsInspector(l)}
 ${outlineInspector(l)}
 ${textureInspector(l)}
 ${rectangleInspector(l)}
 ${pathCornerInspector(l)}
 ${pathInspector(l)}
 ${offsetInspectorMarkup(l)}
 <section class="prop-section"><div class="prop-heading"><strong>位置・変形</strong><span class="micro">FRAME ${String(S.frame+1).padStart(3,'0')}${atKey?' ◆':''}</span></div>
 <div class="prop-grid"><div class="field-wrap"><label>位置 X</label><input type="number" step="1" data-pose="x" value="${rnd(p.x)}"></div><div class="field-wrap"><label>位置 Y</label><input type="number" step="1" data-pose="y" value="${rnd(p.y)}"></div><div class="field-wrap"><label>回転 °</label><input type="number" step="1" data-pose="r" value="${rnd(p.r)}"></div>${isOpacitySliderLayer(l)?'':`<div class="field-wrap"><label>不透明度 %</label><input type="number" min="0" max="100" step="1" data-pose="opacity" value="${rnd(p.opacity*100,0)}"></div>`}<div class="field-wrap"><label>横方向の倍率</label><input type="number" step="0.05" data-pose="sx" value="${rnd(p.sx,3)}"></div><div class="field-wrap"><label>縦方向の倍率</label><input type="number" step="0.05" data-pose="sy" value="${rnd(p.sy,3)}"></div></div>
 <div class="prop-sep"></div><div class="prop-heading"><strong>回転軸 / 関節</strong><span class="micro">ピボット</span></div><div class="prop-grid"><div class="field-wrap"><label>軸 X（ローカル）</label><input type="number" step="1" data-pivot="x" value="${rnd(l.pivot.x)}"></div><div class="field-wrap"><label>軸 Y（ローカル）</label><input type="number" step="1" data-pivot="y" value="${rnd(l.pivot.y)}"></div></div><div class="prop-tip">上部の「回転軸」ツールで✳を動かし、肩・肘・首・腰などの位置に設定します。</div></section>
 <section class="prop-section"><div class="prop-heading"><strong>カラー・輪郭</strong><span class="micro">フラット塗り</span></div>
 ${l.shape.lineArt?'<div class="prop-tip">このパーツは線画専用です。色・太さ・破線・点線は上の「線画オプション」で設定できます。</div>':['svg','image','merged'].includes(l.shape.type)?'<div class="prop-tip">統合／読み込み済み素材の内部カラーは保持されます。個別の頂点や色を再編集する場合は、統合前へUndoで戻してください。</div>':`<div class="prop-row"><label>塗り</label><label class="color-control"><input type="color" data-style="fill" value="${esc(l.fill)}"><span>${esc(l.fill).toUpperCase()}</span></label></div><div class="prop-row"><label class="check-inline"><input type="checkbox" data-style="strokeOn" ${l.strokeOn?'checked':''}> 輪郭線を使用</label></div><div class="prop-row"><label>線色</label><label class="color-control"><input type="color" data-style="stroke" value="${esc(l.stroke)}"><span>${esc(l.stroke).toUpperCase()}</span></label></div><div class="prop-row"><label>線幅</label><input type="number" min="0.1" max="100" step=".5" data-style="strokeWidth" value="${l.strokeWidth}" style="width:90px"></div>${l.shape.type==='path'?`<div class="prop-row"><label class="check-inline"><input type="checkbox" data-style="closed" ${l.shape.closed?'checked':''}> パスを閉じる（塗りつぶし）</label></div>`:''}`}</section>
 ${deformationInspector(l)}
 <section class="prop-section"><div class="prop-heading"><strong>キーフレーム</strong><span class="micro">${frames.length} 個</span></div><div class="prop-row"><label>補間方式</label><select data-field="ease"><option value="ease" ${easing==='ease'?'selected':''}>なめらか</option><option value="linear" ${easing==='linear'?'selected':''}>一定速度</option><option value="easeIn" ${easing==='easeIn'?'selected':''}>加速</option><option value="easeOut" ${easing==='easeOut'?'selected':''}>減速</option><option value="hold" ${easing==='hold'?'selected':''}>コマ送り（切替）</option></select></div><div class="prop-control-row"><button class="soft-btn primary" data-action="addKey" style="flex:1">◆ キーを打つ</button><button class="soft-btn" data-action="removeKey" style="flex:1">キー削除</button></div><div class="prop-tip">フレーム位置を変えてパーツを移動・回転すると、前後の姿勢を自動補間します。</div></section>
 <section class="prop-section"><div class="prop-heading"><strong>簡単モーション</strong><span class="micro">選択パーツへ適用</span></div><div class="preset-grid"><button class="soft-btn" data-preset="breathe">↕ ゆっくり呼吸</button><button class="soft-btn" data-preset="wave">↶ 左右に振る</button><button class="soft-btn" data-preset="float">✦ 浮遊する</button><button class="soft-btn" data-preset="blink">◡ まばたき</button></div></section>${projectInspector()}`;organizeInspectorTabs();
}
function clipInspector(l){
 const base=clipBaseFor(l),target=base?esc(base.name):null;
 const clipped=!!l.clipToBelow;
 const following=doc.layers.filter(x=>x!==l&&x.clipToBelow&&clipBaseFor(x)===l).length;
 const kind=base?(isFolder(base)?'フォルダー':'レイヤー'):null;
 return `<section class="prop-section clip-inspector"><div class="prop-heading"><strong>↳ クリッピング</strong><span class="prop-chip ${clipped?'blue':''}">${clipped?'CLIPPED':isFolder(l)?'FOLDER':'LAYER'}</span></div>
 <label class="check-inline clip-check"><input type="checkbox" data-field="clipToBelow" ${clipped?'checked':''} ${effectiveLocked(l)||!base&&!clipped?'disabled':''}> 下のレイヤー／フォルダーにクリッピング</label>
 ${clipped&&base?`<div class="clip-target">↳ クリッピング元（${kind}）：<b>${target}</b></div>`:!base?'<div class="clip-target muted">同じ階層の下にレイヤーかフォルダーを配置してください。</div>':`<div class="clip-target muted">「${target}」${kind==='フォルダー'?'内のレイヤー全体':'の描画'}の不透明部分だけに表示します。</div>`}
 ${following?`<div class="clip-target">この${isFolder(l)?'フォルダー':'レイヤー'}を下地にしたクリッピング：${following} 件</div>`:''}
 <div class="prop-tip">上のレイヤー → 下のフォルダー、上のフォルダー → 下のレイヤー／フォルダーに対応します。フォルダーの中身をひとつのマスクとして扱い、内部のベジェ・PNG・SVG・メッシュ変形・キーフレームが反映されます。複数の↳は同じ下地を共有します。</div></section>`;
}

function effectsInspector(l){const fx=getEffectsAt(l,S.frame),frames=Object.keys(l.effectKeys||{}).map(Number).sort((a,b)=>a-b);const hasKey=Object.hasOwn(l.effectKeys||{},String(S.frame));
 const slider=(title,field,val,min,max,step='1',unit='')=>`<div class="field-wrap"><label>${title} <output data-value-for="${field}">${rnd(val,1)}${unit}</output></label><input type="range" min="${min}" max="${max}" step="${step}" data-effect="${field}" value="${val}"></div>`;
 return `<section class="prop-section effects-panel"><div class="prop-heading"><strong>エフェクト</strong><span class="prop-chip blue">${frames.length} KEY${frames.length===1?'':'S'}</span></div>
 <div class="prop-control-row"><button class="soft-btn primary" data-action="addEffectKey">◆ エフェクトキーを打つ</button><button class="soft-btn" data-action="removeEffectKey" ${!hasKey||S.frame===0?'disabled':''}>キー削除</button></div>
 <div class="prop-tip">現在 ${S.frame+1} フレーム目${hasKey?'（キーあり）':''}。別のフレームで数値や色を変更すると、エフェクト専用キーが自動作成されます。数値・色はフレーム間で補間されます。</div>
 <div class="prop-sep"></div>
 <label class="check-inline"><input type="checkbox" data-effect="edgeOn" ${fx.edgeOn?'checked':''}> フチを有効化</label>
 <div class="prop-row"><label>フチの位置</label><select data-effect="edgePosition"><option value="outside" ${fx.edgePosition==='outside'?'selected':''}>外側</option><option value="inside" ${fx.edgePosition==='inside'?'selected':''}>内側</option></select></div>
 <div class="prop-grid">${slider('フチの太さ','edgeSize',fx.edgeSize,0,40,0.5,'px')}<div class="field-wrap"><label>フチの色</label><input type="color" data-effect="edgeColor" value="${esc(fx.edgeColor)}"></div></div>
 <div class="prop-sep"></div>
 <label class="check-inline"><input type="checkbox" data-effect="shadowOn" ${fx.shadowOn?'checked':''}> ドロップシャドウを有効化</label>
 <div class="prop-grid">${slider('濃度','shadowOpacity',Math.round(fx.shadowOpacity*100),0,100,1,'%')}${slider('ボケの大きさ','shadowBlur',fx.shadowBlur,0,50,0.5,'px')}${slider('位置 X','shadowX',fx.shadowX,-100,100,1,'px')}${slider('位置 Y','shadowY',fx.shadowY,-100,100,1,'px')}<div class="field-wrap"><label>影の色</label><input type="color" data-effect="shadowColor" value="${esc(fx.shadowColor)}"></div></div>
 <div class="prop-sep"></div>
 <label class="check-inline"><input type="checkbox" data-effect="blurOn" ${fx.blurOn?'checked':''}> ぼかしを有効化</label>
 <div class="prop-grid">${slider('ぼかしの強さ','blurAmount',fx.blurAmount,0,50,0.5,'px')}</div>
 <div class="prop-tip">レイヤーやフォルダー全体をぼかします。フチやドロップシャドウと併用できます。アニメーションの各フレームで強さを変えることもできます。</div>
 <div class="prop-tip">影は最背面。<b>外側のフチ</b>は影の上・本体の下、<b>内側のフチ</b>は本体の上に表示されます。</div></section>`;}
function rectangleInspector(l){if(l?.shape?.type!=='rect')return'';const sh=l.shape,limit=Math.max(0,Math.floor(Math.min(sh.w,sh.h)/2)),round=clamp(num(sh.rx),0,limit),inset=clamp(num(sh.insetRadius),0,limit),selected=Array.isArray(sh.insetCorners)?sh.insetCorners:['tr'];
 const corners=[['tl','左上'],['tr','右上'],['bl','左下'],['br','右下']];
 return `<section class="prop-section rect-corner-panel"><div class="prop-heading"><strong>四角形の角</strong><span class="prop-chip blue">CORNERS</span></div>
 <div class="field-wrap"><label>角を丸める <output data-rect-value="rx">${rnd(round,1)} px</output></label><input type="range" min="0" max="${limit}" step="1" data-rect-shape="rx" value="${round}"></div>
 <div class="field-wrap"><label>角を内側へ丸くへこませる <output data-rect-value="insetRadius">${rnd(inset,1)} px</output></label><input type="range" min="0" max="${limit}" step="1" data-rect-shape="insetRadius" value="${inset}"></div>
 <div class="prop-sep"></div><div class="deform-subtitle"><b>へこませる角</b></div><div class="rect-corner-choices">${corners.map(([key,label])=>`<label class="check-inline"><input type="checkbox" data-inset-corner="${key}" ${selected.includes(key)?'checked':''}> ${label}</label>`).join('')}</div>
 <div class="prop-tip">最初は「右上」のみを選択。必要に応じて四隅を切り替えられます。へこませない角には通常の角丸が適用されます。</div>
 </section>`;}
function applyRectangleUI(input,first=false){const l=sel();if(!l||effectiveLocked(l)||l.shape?.type!=='rect')return;const sh=l.shape;if(first)snapshot();
 if(input.dataset.rectShape){const f=input.dataset.rectShape;sh[f]=clamp(num(input.value,0),0,Math.min(sh.w,sh.h)/2);const o=document.querySelector(`[data-rect-value="${f}"]`);if(o)o.textContent=rnd(sh[f],1)+' px';}
 else if(input.dataset.insetCorner){const old=Array.isArray(sh.insetCorners)?sh.insetCorners.slice():['tr'];const k=input.dataset.insetCorner;sh.insetCorners=input.checked?[...new Set([...old,k])]:old.filter(v=>v!==k);}
 renderStage();}
function commitRectangleUI(input){if(!input.dataset.liveDirty)applyRectangleUI(input,true);delete input.dataset.liveDirty;saveLocal();renderInspector();}

function applyPathCornerUI(input,first=false){
 const l=sel();if(!l||effectiveLocked(l)||l.shape?.type!=='path')return;
 if(first)snapshot();
 l.shape.cornerRadius=clamp(num(input.value,0),0,400);
 const label=$('#pathCornerValue');if(label)label.textContent=rnd(l.shape.cornerRadius,1)+' px';
 renderStage();
}
function commitPathCornerUI(input){if(!input.dataset.liveDirty)applyPathCornerUI(input,true);delete input.dataset.liveDirty;saveLocal();renderInspector();}
function selectionStrokeInspector(layer){
 const lineArt=!!layer.shape?.lineArt,style=lineArt?normalizeOutline(layer.lineStyle||{color:layer.stroke}):null;
 const width=lineArt?(style.style==='dot'?style.dotSize:style.width):clamp(num(layer.strokeWidth,2),.5,120),disabled=effectiveLocked(layer)?'disabled':'';
 return `<section class="prop-section select-line-width-panel"><div class="prop-heading"><strong>線全体の太さ</strong><span class="prop-chip blue">STROKE</span></div>
 <div class="field-wrap"><label>線の太さ <output data-variable-width-label>${rnd(width,1)}px</output></label>
 <input type="range" min="0.5" max="120" step="0.5" ${lineArt?'data-variable-width="true"':'data-global-stroke-width="true"'} value="${rnd(width,1)}" ${disabled} aria-label="選択した線全体の太さを調整" />
 <div class="slider-hints"><span>細い</span><span>太い</span></div></div>
 <div class="prop-tip">選択ツールでは<strong>線全体</strong>の太さを変更します。頂点ごとの強弱が設定されていても割合は保たれます。頂点だけを調整する場合は「頂点」ツールで点を選択してください。</div></section>`;
}
function updateGlobalStrokeWidth(input,commit=false){
 const l=sel();if(S.tool!=='select'||!l||l.shape?.type!=='path'||l.shape.lineArt||!l.strokeOn||effectiveLocked(l))return;
 const width=clamp(num(input.value,2),.5,120);
 if(!input.dataset.liveDirty){snapshot();input.dataset.liveDirty='1';}
 l.strokeWidth=width;
 document.querySelectorAll('[data-global-stroke-width]').forEach(el=>{if(el!==input)el.value=String(width);});
 document.querySelectorAll('[data-variable-width-label]').forEach(el=>{if(el.closest('.select-line-width-panel'))el.textContent=rnd(width,1)+'px';});
 renderStage();
 if(commit){delete input.dataset.liveDirty;saveLocal();renderInspector();}
}
function lineArtInspector(l){if(l?.shape?.type!=='path'||!l.shape.lineArt)return'';const o=normalizeOutline(l.lineStyle||{color:l.stroke});const local=S.tool==='node'&&S.vertexSelected;const activePoint=l.shape.points[clamp(S.nodeIndex,0,l.shape.points.length-1)];const baseline=o.style==='dot'?o.dotSize:o.width;const displayWidth=local?clamp(baseline*num(activePoint?.widthScale,1),.5,120):baseline;return `<section class="prop-section line-art-editor">
 <div class="prop-heading"><strong>線画オプション</strong><span class="prop-chip blue">STROKE</span></div>
 <div class="prop-tip">塗りのないベクター線です。線を作った後でも実線・破線・点線を自由に切り替えられます。</div>

 <div class="prop-row"><label>線の種類</label><select data-line-style="style"><option value="solid" ${o.style==='solid'?'selected':''}>実線 ━━━</option><option value="dash" ${o.style==='dash'?'selected':''}>破線 ━ ━ ━</option><option value="dot" ${o.style==='dot'?'selected':''}>点線 ● ● ●</option></select></div>
 <div class="prop-row"><label>線の色</label><label class="color-control"><input type="color" data-line-style="color" value="${esc(o.color)}"><span>${esc(o.color).toUpperCase()}</span></label></div>
 <div class="field-wrap"><label>${local?`選択頂点 ${S.nodeIndex+1} の線幅`:'線全体の太さ'} <output data-variable-width-label>${rnd(displayWidth,1)}px</output></label><input type="range" min="0.5" max="120" step="0.5" data-variable-width="true" value="${rnd(displayWidth,1)}"><div class="prop-tip">${local?'選択した頂点だけを変更します。隣の頂点へ向けて滑らかに補間されます。':'選択ツールで調整すると線全体を拡縮します。頂点ツールで点を選ぶと、その点だけを調整できます。'}</div></div>
 ${o.style==='dash'?`<div class="field-wrap"><label>破線の長さ ${rnd(o.dashLength,1)}px</label><input type="range" min="1" max="100" step="1" data-line-style="dashLength" value="${rnd(o.dashLength,1)}"></div><div class="field-wrap"><label>破線の間隔 ${rnd(o.dashGap,1)}px</label><input type="range" min="0" max="100" step="1" data-line-style="dashGap" value="${rnd(o.dashGap,1)}"></div>`:''}
 ${o.style==='dot'?`<div class="field-wrap"><label>● の間隔 ${rnd(o.dotGap,1)}px</label><input type="range" min="0" max="100" step="1" data-line-style="dotGap" value="${rnd(o.dotGap,1)}"></div>`:''}
 <div class="prop-tip">「頂点」ツールで端点を動かしたり、「線の種類」で直線／ベジェ曲線／自動スムーズを選べます。</div></section>`;}
function outlineInspector(l){if(!['rect','ellipse','path'].includes(l?.shape?.type)||l.shape.lineArt)return'';const o=layerOutline(l);return `<section class="prop-section"><div class="prop-heading"><strong>アウトライン</strong><span class="prop-chip blue">VECTOR</span></div>
 <label class="check-inline"><input type="checkbox" data-outline="on" ${o.on?'checked':''}> アウトラインを有効化</label>

 <fieldset class="fm-outline-placement" aria-label="アウトラインの位置"><legend>線の位置</legend><div class="fm-outline-placement-choices">${[['inside','内側'],['center','中央'],['outside','外側']].map(([value,label])=>`<label><input type="radio" name="fmOutlinePlacement_${esc(l.id)}" data-outline="placement" value="${value}" ${o.placement===value?'checked':''}> ${label}</label>`).join('')}</div></fieldset>
 <div class="prop-row outline-fill-toggle"><label class="check-inline"><input type="checkbox" data-style="fillHidden" ${l.fillHidden?'checked':''}> 塗りを非表示にする（アウトラインのみ）</label></div>
 <div class="prop-tip">ONにすると内部の塗りだけを隠し、実線・破線・点線のアウトラインを表示します。アウトラインがOFFの場合は自動的にONになります。</div>
 <div class="prop-row"><label>種類</label><select data-outline="style"><option value="solid" ${o.style==='solid'?'selected':''}>実線</option><option value="dash" ${o.style==='dash'?'selected':''}>破線 (- - -)</option><option value="dot" ${o.style==='dot'?'selected':''}>点線 (・・・)</option></select></div>
 <div class="prop-grid"><div class="field-wrap"><label>色</label><input type="color" data-outline="color" value="${esc(o.color)}"></div>${o.style!=='dot'?`<div class="field-wrap"><label>線の太さ</label><input type="range" min="0.5" max="40" step="0.5" data-outline="width" value="${rnd(o.width,1)}"></div>`:`<div class="field-wrap"><label>● の大きさ</label><input type="range" min="0.5" max="40" step="0.5" data-outline="dotSize" value="${rnd(o.dotSize,1)}"></div>`}</div>
 ${o.style==='dash'?`<div class="prop-grid"><div class="field-wrap"><label>短い線の長さ</label><input type="range" min="1" max="60" step="1" data-outline="dashLength" value="${rnd(o.dashLength,0)}"></div><div class="field-wrap"><label>破線の間隔</label><input type="range" min="0" max="60" step="1" data-outline="dashGap" value="${rnd(o.dashGap,0)}"></div></div>`:''}
 ${o.style==='dot'?`<div class="prop-grid"><div class="field-wrap"><label>● の間隔</label><input type="range" min="0" max="60" step="1" data-outline="dotGap" value="${rnd(o.dotGap,0)}"></div></div>`:''}
 <div class="prop-tip">編集可能なベクターレイヤー（四角形・楕円・パス）に使えます。通常の線設定とは別に、装飾用のアウトラインを重ねて表示します。</div></section>`;}

function pathCornerInspector(l){if(l?.shape?.type!=='path')return'';const sh=l.shape,mode=sh.pathMode||(sh.smooth?'auto':'line');return `<section class="prop-section path-corner-panel"><div class="prop-heading"><strong>パスの角丸</strong><span class="prop-chip blue">CORNERS</span></div><div class="prop-sep"></div>
 <div class="deform-subtitle"><b>角丸（シャープな頂点）</b><span><output id="pathCornerValue">${rnd(clamp(num(sh.cornerRadius,0),0,400),1)} px</output></span></div>
 <input id="pathCornerRadius" type="range" min="0" max="200" step="1" value="${clamp(num(sh.cornerRadius,0),0,200)}" aria-label="ベジェ曲線・パスの角丸の半径" ${mode==='auto'?'disabled':''}/>
 <div class="slider-hints"><span>0：そのまま</span><span>200：大きく丸める</span></div>
 <div class="prop-tip">${mode==='auto'?'自動スムーズは既に滑らかなため、角丸は直線かベジェ曲線モードで利用できます。':'折れ角を自動判定して丸めます。頂点・ハンドルのデータはそのまま残り、0に戻すと元の輪郭に戻ります。線画パスも対応。'}</div>
</section>`;}
function pathInspector(l){if(l.shape.type!=='path')return'';const sh=l.shape,activePoints=S.activeContour>0&&sh.extraContours?.[S.activeContour-1]?sh.extraContours[S.activeContour-1]:sh.points,n=activePoints.length,min=sh.closed?3:2,mode=sh.pathMode||(sh.smooth?'auto':'line'),i=clamp(S.nodeIndex,0,n-1),pt=activePoints[i]||{};
 return `<section class="prop-section path-editor"><div class="prop-heading"><strong>パス・ベジェ編集</strong><span class="prop-chip blue">${n} POINTS</span></div>
 ${sh.extraContours?.length?`<div class="prop-row"><label>編集する輪郭</label><select id="textContour">${Array.from({length:1+sh.extraContours.length},(_,j)=>`<option value="${j}" ${S.activeContour===j?'selected':''}>輪郭 ${j+1}${j===0?'（主線）':''}</option>`).join('')}</select></div>`:''}
 <div class="prop-tip">${sh.lineArt?'線画の頂点・曲線を編集できます。直線で描いた線もここからベジェ曲線へ変換可能です。':'塗りつぶしのベジェ輪郭を編集します。'}<b>頂点(N)</b>ツールで点とハンドルをドラッグできます。</div>
 <div class="prop-row"><label>線の種類</label><select id="pathMode"><option value="line" ${mode==='line'?'selected':''}>直線（角ばった線）</option><option value="bezier" ${mode==='bezier'?'selected':''}>ベジェ曲線（ハンドル編集）</option><option value="auto" ${mode==='auto'?'selected':''}>自動スムーズ（補間曲線）</option></select></div>
 <button class="soft-btn primary wide" data-action="editPathNodes">頂点・カーブを編集 (N)</button>
 ${sh.lineArt&&S.tool==='node'&&S.vertexSelected?`<div class="prop-sep"></div><div class="field-wrap"><label>選択頂点 ${i+1} の線の太さ <output data-variable-width-label>${rnd((normalizeOutline(l.lineStyle).style==='dot'?normalizeOutline(l.lineStyle).dotSize:normalizeOutline(l.lineStyle).width)*num(pt.widthScale,1),1)}px</output></label><input type="range" min="0.5" max="120" step="0.5" data-variable-width="true" value="${rnd((normalizeOutline(l.lineStyle).style==='dot'?normalizeOutline(l.lineStyle).dotSize:normalizeOutline(l.lineStyle).width)*num(pt.widthScale,1),1)}"><div class="prop-tip">この頂点のみ線幅を変更し、隣の頂点との間は滑らかにつながります。</div></div>`:''}
 ${S.tool==='node'&&S.vertexSelected?`<div class="prop-sep"></div><div class="deform-subtitle"><b>選択中の点</b><span>${i+1} / ${n}</span></div><div class="prop-control-row"><button class="soft-btn" data-action="pointCorner">◆ 角ばらせる</button><button class="soft-btn" data-action="pointSmooth">◯ なめらかにする</button></div><div class="prop-tip">● オレンジ＝外向き、● 青＝内向きハンドル。滑らか点では反対側が連動、角の点では独立して調整できます。</div>`:''}
 <div class="prop-sep"></div><div class="deform-subtitle"><b>ポイント数を減らす</b><span id="pointCountLabel">${n} / ${n} 点</span></div>
 <input id="simplifyPoints" type="range" min="${min}" max="${n}" step="1" value="${n}" ${n<=min?'disabled':''} aria-label="ポイント数を減らす" />
 <div class="slider-hints"><span>少ない・単純</span><span>現在の点数</span></div><div class="prop-tip">スライダーで点を減らし、輪郭を簡略化します。モーフキーも同じ点に揃えます。Ctrl+Z で元に戻せます。</div>
 </section>`;}
function deformationInspector(l){const isPath=l.shape.type==='path';const hasMesh=!!l.mesh;const morphCount=Object.keys(l.morphKeys||{}).length,meshCount=Object.keys(l.mesh?.keys||{}).length;
 return `<section class="prop-section deform-panel"><div class="prop-heading"><strong>変形アニメーション</strong><span class="prop-chip blue">DEFORM</span></div>
 <div class="deform-block"><div class="deform-subtitle"><b>輪郭モーフ</b><span>${morphCount} キー</span></div>
 <div class="prop-tip">${isPath?'「頂点（N）」で頂点をドラッグ。先頭フレームで基本形、2フレーム目以降で変形キーを編集します。フレームごとに形が滑らかにつながります。':'四角形・楕円は「パスに変換」して輪郭を変形できます。SVG/PNG素材はメッシュ変形をご利用ください。'}</div>
 ${isPath?`<div class="prop-control-row"><button class="soft-btn primary" data-action="morphTool">頂点編集を開始</button><button class="soft-btn" data-action="morphReset">現在の形を初期化</button></div>${morphCount?'<button class="deform-text-btn" data-action="morphClear">頂点変形キーをすべて削除</button>':''}`:l.shape.type==='rect'||l.shape.type==='ellipse'?'<button class="soft-btn primary wide" data-action="convertPath">◇ 編集可能なパスに変換</button>':''}
 </div>
 <div class="deform-block"><div class="deform-subtitle"><b>メッシュ変形</b><span>${hasMesh?`${l.mesh.cols}×${l.mesh.rows} / ${meshCount} キー`:'未設定'}</span></div>
 <div class="prop-tip">SVGやPNG、ベクター形状を格子状に曲げます。髪の毛・服・表情などの揺れに便利です。</div>
 <div class="prop-row"><label>メッシュ分割</label><select id="meshDivisions"><option value="2" ${hasMesh&&l.mesh.cols===2?'selected':''}>2 × 2（軽量）</option><option value="3" ${hasMesh&&l.mesh.cols===3?'selected':''}>3 × 3</option><option value="4" ${hasMesh&&l.mesh.cols===4?'selected':''}>4 × 4（細かい）</option></select></div>
 <div class="prop-control-row"><button class="soft-btn primary" data-action="meshTool">▦ ${hasMesh?'メッシュを編集':'メッシュを作成'}</button>${hasMesh?'<button class="soft-btn" data-action="meshReset">現在の形を初期化</button>':''}</div>
 ${hasMesh?'<button class="deform-text-btn" data-action="meshClear">メッシュを解除</button>':''}</div>
 <div class="deform-block"><div class="deform-subtitle"><b>変形プリセット</b><span>1秒の往復</span></div><div class="prop-control-row"><button class="soft-btn" data-deform-preset="sway">〰 ゆらゆら</button><button class="soft-btn" data-deform-preset="squash">↕ ぷにっと伸縮</button></div></div>
 <div class="prop-tip">変形ツールではドラッグするとそのフレームにキーを自動追加します。タイムラインの <span style="color:#42838d">●</span> は頂点変形、<span style="color:#aa759d">■</span> はメッシュのキーです。</div></section>`;
}
function projectInspector(){return `<section class="prop-section project-overview"><div class="prop-heading"><strong>キャンバス設定</strong><span class="micro">PROJECT</span></div><div class="project-name-field"><label for="projectName">プロジェクト名</label><div class="project-name-input"><input id="projectName" type="text" value="${esc(doc.name)}" maxlength="120" autocomplete="off" spellcheck="false" aria-label="プロジェクト名"><span class="project-extension">.FMS</span></div></div><div class="prop-grid"><div class="field-wrap"><label>幅 (px)</label><input type="number" data-doc="width" min="64" max="3840" step="1" value="${doc.width}"></div><div class="field-wrap"><label>高さ (px)</label><input type="number" data-doc="height" min="64" max="2160" step="1" value="${doc.height}"></div><div class="field-wrap"><label>FPS</label><input type="number" data-doc="fps" min="1" max="30" step="1" value="${doc.fps}"></div><div class="field-wrap"><label>再生時間 (秒)</label><input type="number" data-doc="seconds" min="1" max="20" step="1" value="${doc.seconds}"></div></div><div class="prop-row"><label>背景色</label><label class="color-control"><input type="color" data-doc="background" value="${esc(doc.background)}"><span>${esc(doc.background).toUpperCase()}</span></label></div><label class="check-inline"><input type="checkbox" data-doc="transparent" ${doc.transparent?'checked':''}> 書き出し時に背景を透明にする</label>
 <div class="grid-options"><div class="prop-heading"><strong>グリッド設定</strong><span class="micro">GRID</span></div>
 <label class="check-inline"><input type="checkbox" id="gridVisibleCheck" ${doc.gridVisible!==false?'checked':''}> グリッドを表示</label>
 <div class="grid-size-heading"><label for="gridSizeRange">マス目の大きさ</label><output for="gridSizeRange" id="gridSizeValue">${Math.round(doc.gridSize||40)} px</output></div>
 <input type="range" id="gridSizeRange" min="8" max="256" step="4" value="${Math.round(doc.gridSize||40)}" aria-label="マス目の大きさ">
 <div class="slider-hints"><span>細かい（8 px）</span><span>大きい（256 px）</span></div>
 <div class="grid-size-heading"><label for="gridTransparencyRange">グリッドの透明度</label><output for="gridTransparencyRange" id="gridTransparencyValue">${Math.round(num(doc.gridTransparency,0))}%</output></div>
 <input type="range" id="gridTransparencyRange" min="0" max="100" step="1" value="${Math.round(num(doc.gridTransparency,0))}" aria-label="グリッドの透明度">
 <div class="slider-hints"><span>0%（濃い）</span><span>100%（透明）</span></div>
 <div class="prop-row grid-color-row"><label for="gridColorPicker">グリッドの色</label><label class="color-control"><input type="color" id="gridColorPicker" value="${esc(doc.gridColor||'#867567')}" aria-label="グリッドの色"><span id="gridColorValue">${esc(doc.gridColor||'#867567').toUpperCase()}</span></label></div>
 <div class="prop-tip">グリッドは編集画面にのみ表示され、PNG・SVG・動画には書き出されません。キャンバスのズームや回転にも追従します。</div></div></section>`;}
// Audio clips are independent of vector layers. Embedded data URLs make FMS and the standalone player portable.
const audioBuffers=new Map(),audioDataCache=new Map(),referenceDataCache=new Map();
let audioContext=null,activeAudio=[];
function compactHistoryState(){const copy={...doc,fonts:(doc.fonts||[]).map(f=>{fontDataCache.set(f.id,f.data);return {...f,data:null};}),audio:(doc.audio||[]).map(clip=>{audioDataCache.set(clip.id,clip.data);return {...clip,data:null};}),references:(doc.references||[]).map(ref=>{referenceDataCache.set(ref.id,ref.data);return {...ref,data:null};})};return JSON.stringify(copy);}
function restoreHistoryState(raw){const d=JSON.parse(raw);for(const f of d.fonts||[])f.data=f.data||fontDataCache.get(f.id)||'';for(const clip of d.audio||[]){clip.data=clip.data||audioDataCache.get(clip.id)||'';}for(const ref of d.references||[]){ref.data=ref.data||referenceDataCache.get(ref.id)||'';}return d;}
function getAudioContext(){if(!audioContext){const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)throw Error('このブラウザは音声再生に対応していません');audioContext=new Ctx();}return audioContext;}
function bytesFromDataURL(url){const body=String(url||'').split(',')[1];if(!body)throw Error('音声のデータがありません');const raw=atob(body),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out.buffer;}
async function decodeAudioClip(clip,buffer){const ctx=getAudioContext(),decoded=await ctx.decodeAudioData(buffer||bytesFromDataURL(clip.data));audioBuffers.set(clip.id,decoded);audioDataCache.set(clip.id,clip.data);clip.duration=decoded.duration;if(!Array.isArray(clip.peaks)||!clip.peaks.length)clip.peaks=waveformPeaks(decoded,320);return decoded;}
function waveformPeaks(buffer,steps=320){const data=buffer.getChannelData(0),blocks=Math.max(1,Math.ceil(data.length/steps)),peaks=[];for(let i=0;i<steps;i++){const a=i*blocks,b=Math.min(data.length,(i+1)*blocks);let peak=0;for(let j=a;j<b;j+=Math.max(1,Math.floor((b-a)/28)))peak=Math.max(peak,Math.abs(data[j]));peaks.push(Math.round(peak*1000)/1000);}return peaks;}
function audioWaveformSVG(clip){const peaks=clip.peaks||[],w=640;let bars='';if(peaks.length){const step=w/peaks.length;for(let i=0;i<peaks.length;i++){const h=Math.max(1,Math.min(36,peaks[i]*35));bars+=`<line x1="${rnd(i*step,2)}" y1="${rnd(25-h/2,2)}" x2="${rnd(i*step,2)}" y2="${rnd(25+h/2,2)}"/>`;}}return `<svg viewBox="0 0 ${w} 50" preserveAspectRatio="none" aria-hidden="true"><g stroke="#965c46" stroke-width="${Math.max(.8,w/Math.max(1,peaks.length)*.6)}">${bars}</g></svg>`;}
function audioTimelineRows(cw){const clips=doc.audio||[];if(!clips.length)return `<div class="tl-track-row audio-empty-row"><div class="tl-track-name"><span class="audio-icon">♪</span><span class="audio-empty-label">AUDIO / 音声トラック</span></div><div class="tl-track" style="width:${cw}px;--frame-width:${FRW}px"><button type="button" class="audio-empty-plus" data-action="importAudio" style="position:absolute;left:12px;top:7px">＋ 音声を読み込む</button></div></div>`;
return clips.map((clip,i)=>{const left=clamp(Math.round(num(clip.start)),0,total()-1)*FRW,width=Math.max(8,num(clip.duration,0)*doc.fps*FRW),vol=Math.round(clamp(num(clip.volume,1),0,1)*100),mute=!!clip.muted;
return `<div class="tl-track-row timeline-audio-row" data-audio-row="${esc(clip.id)}"><div class="tl-track-name"><span class="audio-icon">♪</span><span class="audio-label"><strong title="${esc(clip.name)}">${esc(clip.name)}</strong><small class="audio-position-hint">${rnd(clip.start/doc.fps,2)}秒～ / ${rnd(clip.duration,1)}秒</small></span><button type="button" class="audio-row-btn${mute?' muted':''}" data-audio-mute="${esc(clip.id)}" title="${mute?'ミュート解除':'ミュート'}">${mute?'×':'♪'}</button><input type="range" class="audio-volume" data-audio-volume="${esc(clip.id)}" min="0" max="100" value="${vol}" title="音量 ${vol}%" aria-label="${esc(clip.name)}の音量"><button type="button" class="audio-row-btn" data-audio-remove="${esc(clip.id)}" title="音声を削除">×</button></div><div class="tl-track" data-audio-track="${esc(clip.id)}" style="width:${cw}px;--frame-width:${FRW}px"><div class="audio-clip${mute?' muted':''}" data-audio-clip="${esc(clip.id)}" style="left:${left}px;width:${width}px" title="${esc(clip.name)} / ドラッグで開始位置を移動">${audioWaveformSVG(clip)}<span class="audio-clip-label">${esc(clip.name)}</span></div></div></div>`;}).join('');}
function stopAudio(){for(const {source} of activeAudio){try{source.stop();}catch(e){}try{source.disconnect();}catch(e){}}for(const {gain} of activeAudio){try{gain.disconnect();}catch(e){}}activeAudio=[];}
function scheduleAudioAt(frame,destination=null,ctx=null){ctx=ctx||getAudioContext();const time=frame/doc.fps,at=ctx.currentTime+.035;for(const clip of doc.audio||[]){const buffer=audioBuffers.get(clip.id);if(!buffer)continue;const start=num(clip.start)/doc.fps,offset=Math.max(0,time-start),delay=Math.max(0,start-time);if(offset>=buffer.duration||time+delay>=doc.seconds)continue;const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=clip.muted?0:clamp(num(clip.volume,1),0,1);source.connect(gain);gain.connect(destination||ctx.destination);const length=Math.min(buffer.duration-offset,doc.seconds-(time+delay));if(length<=0)continue;source.start(at+delay,offset,length);activeAudio.push({id:clip.id,source,gain});}}
function updateAudioGains(){for(const a of activeAudio){const clip=(doc.audio||[]).find(c=>c.id===a.id);if(a.gain)a.gain.gain.value=clip&&!clip.muted?clamp(num(clip.volume,1),0,1):0;}}
async function importAudio(files){if(!files?.length)return;stopPlayback();let added=0;for(const file of files){if(!file)continue;if(file.size>26*1024*1024){toast(`${file.name} は26MBを超えるため読み込めません。`);continue;}try{const data=await readAsDataURL(file),id=uid(),clip={id,name:file.name,data,type:file.type||'audio/*',start:S.frame,volume:1,muted:false,duration:0,peaks:[]};await decodeAudioClip(clip,await file.arrayBuffer());doc.audio??=[];doc.audio.push(clip);added++;}catch(e){toast(`${file.name}: 読み込み失敗（${e.message}）`);}}if(added){mutated();toast(`${added}個の音声をタイムラインに追加しました。FMS保存時に音声も埋め込まれます。`);}}
async function prepareProjectAudio(){audioBuffers.clear();for(const clip of doc.audio||[]){try{await decodeAudioClip(clip);}catch(e){console.warn('FLAT MOTION audio decode',clip.name,e);toast(`音声を読み込めません: ${clip.name}`);}}renderTimeline();}
function modifyAudio(id,action,value){const clip=(doc.audio||[]).find(a=>a.id===id);if(!clip)return;if(action==='remove'){stopPlayback();doc.audio=doc.audio.filter(a=>a.id!==id);audioBuffers.delete(id);}else if(action==='mute')clip.muted=!clip.muted;else if(action==='volume')clip.volume=clamp(num(value,1),0,1);else if(action==='move')clip.start=clamp(Math.round(value),0,total()-1);updateAudioGains();saveLocal();renderTimeline();}

const FRW=24,TLNAME=230;
function renderTimeline(){let scroll=$('#timelineScroller'),left=scroll.scrollLeft,top=scroll.scrollTop,n=total(),cw=FRW*n;
 let tick='';for(let f=0;f<n;f++){const major=f%doc.fps===0;tick+=`<span class="tl-tick${major?' major':''}" style="left:${f*FRW}px"></span>`;if(major)tick+=`<span class="tl-tick-label" style="left:${f*FRW}px">${Math.floor(f/doc.fps)}s</span>`;}
 let rows=uiLayerRows().map(({layer:l,depth})=>{const entries=Object.keys(l.keys||{}).map(Number).sort((a,b)=>a-b);let spans='';for(let i=0;i<entries.length-1;i++)spans+=`<span class="kf-span" style="left:${entries[i]*FRW}px;width:${(entries[i+1]-entries[i])*FRW}px"></span>`;
 let morphKeys=Object.keys(l.morphKeys||{}).map(Number).sort((a,b)=>a-b).map(f=>`<span class="kf morph-kf${f===S.frame?' selected':''}" data-kind="morph" data-key="${f}" data-id="${l.id}" style="left:${f*FRW}px" title="頂点変形 ${f+1}フレーム"></span>`).join('');
 let meshKeys=Object.keys(l.mesh?.keys||{}).map(Number).sort((a,b)=>a-b).map(f=>`<span class="kf mesh-kf${f===S.frame?' selected':''}" data-kind="mesh" data-key="${f}" data-id="${l.id}" style="left:${f*FRW}px" title="メッシュ変形 ${f+1}フレーム"></span>`).join('');
 let keys=entries.map(f=>`<span class="kf${f===S.frame?' selected':''}" data-key="${f}" data-id="${l.id}" style="left:${f*FRW}px" title="${f+1}フレーム"></span>`).join('');
 let effectKeys=Object.keys(l.effectKeys||{}).map(Number).sort((a,b)=>a-b).map(f=>`<span class="kf effect-kf${f===S.frame?' selected':''}" data-kind="effect" data-key="${f}" data-id="${l.id}" style="left:${f*FRW}px" title="エフェクト ${f+1}フレーム"></span>`).join('');
 return `<div class="tl-track-row${l.id===S.selected?' active':''}" data-row-id="${l.id}"><div class="tl-track-name${isFolder(l)?' folder-track':''}" style="padding-left:${Math.min(depth,8)*11+7}px" data-select="${l.id}"><span class="track-icon">${isFolder(l)?'▸':l.parent?'↳':'◆'}</span><span class="name">${esc(l.name)}</span><span class="track-count">${entries.length}</span></div><div class="tl-track" data-track-id="${l.id}" style="width:${cw}px;--frame-width:${FRW}px">${spans}${keys}${morphKeys}${meshKeys}${effectKeys}</div></div>`;}).join('');
 if(!rows)rows='<div class="tl-track-row"><div class="tl-track-name"><span class="name" style="color:#b49f91">パーツを追加するとここに表示されます</span></div><div class="tl-track" style="width:'+cw+'px;--frame-width:'+FRW+'px"></div></div>';
 $('#timelineInner').style.width=(TLNAME+cw)+'px';$('#timelineInner').innerHTML=`<div class="tl-ruler"><div class="tl-ruler-label">PARTS / フレーム</div><div class="tl-ticks" data-ruler style="width:${cw}px;--frame-width:${FRW}px">${tick}</div></div>${audioTimelineRows(cw)}${rows}<div id="timelinePlayhead" class="tl-playhead" style="left:${TLNAME+FRW*S.frame}px"></div>`;
 scroll.scrollLeft=left;scroll.scrollTop=top;
}
function updateTimeUI(){let n=total();$('#timeDisplay').textContent=`${fmtTime(S.frame/doc.fps)} / ${fmtTime(doc.seconds)}`;$('#frameCounter').textContent=`FRAME ${String(S.frame+1).padStart(3,'0')} / ${String(n).padStart(3,'0')}`;const playhead=$('#timelinePlayhead');if(playhead)playhead.style.left=(TLNAME+FRW*S.frame)+'px';
 $$('.kf.selected').forEach(k=>k.classList.remove('selected'));$$(`.kf[data-key="${S.frame}"]`).forEach(k=>k.classList.add('selected'));
}
function frameTo(f,{timeline=false}={}){S.frame=clamp(Math.round(f),0,total()-1);renderStage();if(!S.playing){renderInspector();renderLayers();if(timeline)renderTimeline();}updateTimeUI();}
// Actual viewport dimensions can change while the browser lays out the editor.
// Refit the reference scale without overwriting the user's chosen zoom/pan/rotation.
function calculateFitScale(){const vp=$('#stageViewport'),space=20;return clamp(Math.min((vp.clientWidth-space)/doc.width,(vp.clientHeight-space)/doc.height),.07,1);}
function fitCanvas(){S.fitScale=calculateFitScale();S.zoom=1;S.viewX=0;S.viewY=0;S.viewRotation=0;applyZoom();}
function refitOnResize(){const next=calculateFitScale();if(Math.abs(next-S.fitScale)>.00001){S.fitScale=next;applyZoom();}}
function applyZoom(){const z=S.zoom*S.fitScale,w=doc.width*z,h=doc.height*z,shell=$('#artboardShell');shell.style.width=w+'px';shell.style.height=h+'px';ART.style.width=w+'px';ART.style.height=h+'px';shell.style.transform=`translate(-50%, -50%) translate(${S.viewX}px, ${S.viewY}px) rotate(${S.viewRotation}deg)`;updateButtons();const viewZoom=$('#viewZoomReadout'),viewAngle=$('#viewAngleReadout');if(viewZoom)viewZoom.textContent=`${Math.round(z*100)}%`;if(viewAngle)viewAngle.textContent=`${rnd(S.viewRotation,1)}°`;}
function setViewZoom(next){S.zoom=clamp(next,.12,12);applyZoom();}
function resetViewRotation(){S.viewRotation=0;applyZoom();}

// ===== Editable geometry construction (pixel-sampled vector contours) =====
// Boolean operations use pixel coverage as an intermediate geometry test.
// Traced output is editable vector geometry. Precision is resolution-bounded.
function geometrySelected(){return checkedLayers().filter(l=>l&&!isFolder(l)&&['rect','ellipse','path'].includes(l.shape?.type)&&!l.shape.lineArt&&l.shape.closed!==false&&!effectiveLocked(l)&&effectiveVisible(l)&&!l.mesh&&!l.repeat?.enabled&&!l.clipToBelow);}
function geomBounds(layers,spread=0){const boxes=layers.map(layerWorldBox);const x=Math.min(...boxes.map(b=>b.x))-spread-2,y=Math.min(...boxes.map(b=>b.y))-spread-2;const right=Math.max(...boxes.map(b=>b.x+b.w))+spread+2,bottom=Math.max(...boxes.map(b=>b.y+b.h))+spread+2;return{x,y,w:right-x,h:bottom-y};}
function geomCanvas(bounds){const maxSize=1800,res=Math.min(2.25,Math.max(.35,Math.min(maxSize/Math.max(1,bounds.w),maxSize/Math.max(1,bounds.h))));const w=Math.max(2,Math.ceil(bounds.w*res)),h=Math.max(2,Math.ceil(bounds.h*res));const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;return{canvas,ctx:canvas.getContext('2d',{willReadFrequently:true}),res,w,h};}
function geomPaint(ctx,layer,bounds,res,offset=0){const sh=layer.shape,m=getWorld(layer);ctx.save();ctx.setTransform(res,0,0,res,-bounds.x*res,-bounds.y*res);ctx.transform(...m);ctx.fillStyle='#ffffff';ctx.strokeStyle='#ffffff';ctx.lineJoin='round';ctx.lineCap='round';
 let path;
 if(sh.type==='path'){path=new Path2D(sh.extraContours?.length?glyphCompoundD(layer,S.frame):roundedPathD(layer,S.frame));}
 else if(sh.type==='rect'){path=new Path2D();path.rect(sh.x,sh.y,sh.w,sh.h);}
 else if(sh.type==='ellipse'){path=new Path2D();path.ellipse(sh.cx,sh.cy,Math.max(.001,sh.rx),Math.max(.001,sh.ry),0,0,Math.PI*2);}
 if(path){ctx.fill(path,'evenodd');if(offset!==0){ctx.globalCompositeOperation=offset>0?'source-over':'destination-out';ctx.lineWidth=Math.abs(offset)*2;ctx.stroke(path);}}
 ctx.restore();}
function geomMask(layer,bounds,res,w,h,offset=0){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});geomPaint(ctx,layer,bounds,res,offset);const data=ctx.getImageData(0,0,w,h).data;const out=new Uint8Array(w*h);for(let i=0,j=3;i<out.length;i++,j+=4)out[i]=data[j]>120?1:0;return out;}
function geomContours(mask,w,h,bounds,res){
 const edgeMap=new Map(),edge=(ax,ay,bx,by)=>{const key=ay*(w+1)+ax,ending=by*(w+1)+bx;let list=edgeMap.get(key);if(!list){list=[];edgeMap.set(key,list);}list.push(ending);};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(!mask[y*w+x])continue;const i=y*w+x;if(y===0||!mask[i-w])edge(x,y,x+1,y);if(x===w-1||!mask[i+1])edge(x+1,y,x+1,y+1);if(y===h-1||!mask[i+w])edge(x+1,y+1,x,y+1);if(x===0||!mask[i-1])edge(x,y+1,x,y);}
 const loops=[],decode=n=>({x:bounds.x+(n%(w+1))/res,y:bounds.y+Math.floor(n/(w+1))/res});
 for(const [start,entries] of edgeMap){while(entries.length){let current=start,points=[],limit=0;while(limit++<w*h*2){points.push(decode(current));const queue=edgeMap.get(current);if(!queue?.length)break;current=queue.pop();if(current===start)break;}if(current===start&&points.length>=3){const clean=[];for(let i=0;i<points.length;i++){const a=points[(i-1+points.length)%points.length],b=points[i],c=points[(i+1)%points.length];if(Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x))>1e-7)clean.push(b);}if(clean.length>=3){let simplified=clean;if(clean.length>70){const s=rdp([...clean,clean[0]],Math.max(.3,1/res*.42));if(s.length>=4)simplified=s.slice(0,-1);}if(simplified.length>2)loops.push(simplified);}}}}
 return loops.filter(p=>Math.abs(p.reduce((a,v,i)=>{const u=p[(i+1)%p.length];return a+v.x*u.y-u.x*v.y;},0))>=Math.max(.5,2/res/res));
}
function geomResult(contours,source,name,retains){if(!contours.length){toast('図形の重なりがありません。');return null;}const sorted=contours.sort((a,b)=>Math.abs(b.reduce((n,p,i)=>{const q=b[(i+1)%b.length];return n+p.x*q.y-q.x*p.y;},0))-Math.abs(a.reduce((n,p,i)=>{const q=a[(i+1)%a.length];return n+p.x*q.y-q.x*p.y;},0)));
 const base=source[0],folderId=base.folderId||null;const result=newLayer({type:'path',points:[],extraContours:[],closed:true,smooth:false,pathMode:'line'},0,0,name,{folderId,fill:base.fill,stroke:base.stroke,strokeOn:base.strokeOn,strokeWidth:base.strokeWidth});const inverse=matInv(getParentWorld(result));const loops=sorted.map(pts=>pts.map(q=>{const v=matApply(inverse,q);return{x:rnd(v.x,3),y:rnd(v.y,3)};}));result.shape.points=loops[0];result.shape.extraContours=loops.slice(1);result.fillHidden=false;result.texture=base.texture?structuredClone(base.texture):undefined;result.strokeOn=base.strokeOn;result.strokeWidth=base.strokeWidth;result.stroke=base.stroke;result.gradient=null;const b=getBBox(result);result.pivot={x:rnd(b.x+b.w/2,2),y:rnd(b.y+b.h/2,2)};
 const pos=Math.max(...source.map(l=>doc.layers.indexOf(l)));doc.layers.splice(doc.layers.indexOf(result),1);doc.layers.splice(pos+1,0,result);
 for(const l of source){if(retains)l.visible=false;else doc.layers.splice(doc.layers.indexOf(l),1);}setSingleSelection(result.id);return result;
}
function pathfinderOperation(mode){const layers=geometrySelected().sort((a,b)=>doc.layers.indexOf(a)-doc.layers.indexOf(b));if(layers.length<2){toast('ベクター図形をレイヤーのチェックで2つ以上選択してください。');return;}if(checkedLayers().length!==layers.length){toast('図形の基本パスだけ選択してください（ロック・メッシュ・線画・クリッピング等は対象外）。');return;}
 if(!layers.every(l=>(l.folderId||null)===(layers[0].folderId||null))){toast('同じフォルダー内の図形を選んでください。');return;}
 try{const bounds=geomBounds(layers),{res,w,h}=geomCanvas(bounds),masks=layers.map(l=>geomMask(l,bounds,res,w,h));const result=new Uint8Array(w*h);
 const compute=(kind)=>{const out=new Uint8Array(w*h);for(let i=0;i<out.length;i++){const hit=masks.reduce((n,m)=>n+(m[i]?1:0),0);out[i]=kind==='union'?+(hit>0):kind==='intersect'?+(hit===masks.length):kind==='subtract'?+(masks[0][i]&&!masks.slice(1).some(m=>m[i])):+(hit>0);}return out;};
 const keep=$('#fmGeometryKeepSource')?.checked!==false;
 if(mode==='divide'){
  const union=compute('union'),overlap=new Uint8Array(w*h),other=new Uint8Array(w*h);for(let i=0;i<union.length;i++){const count=masks.reduce((n,m)=>n+(m[i]?1:0),0);overlap[i]=+(count>1);other[i]=+(count===1);}
  const a=geomContours(other,w,h,bounds,res),b=geomContours(overlap,w,h,bounds,res);if(!a.length&&!b.length){toast('分割できる領域がありません。');return;}
  snapshot();if(a.length)geomResult(a,layers,'分割：非重複',true);if(b.length)geomResult(b,layers,'分割：重なり',true);if(!keep)layers.forEach(l=>{const ix=doc.layers.indexOf(l);if(ix>=0)doc.layers.splice(ix,1);});mutated();toast('分割しました（重なり部分と非重複部分を別レイヤーに生成）。');return;
 }
 const contours=geomContours(compute(mode),w,h,bounds,res);if(!contours.length){toast('結果が空です。オブジェクトの配置を確認してください。');return;}
 snapshot();geomResult(contours,layers,{union:'パス：合体',subtract:'パス：前面型抜き',intersect:'パス：交差'}[mode],keep);mutated();toast('編集可能なベクターパスを生成しました。');
 }catch(e){console.error('Pathfinder:',e);toast('パス演算に失敗しました: '+e.message);}
}

// Isolate the rendered alpha of a layer or its entire visible folder, then
// trace only the outer silhouette. Results are standard editable path layers.
// True vector silhouette: flatten curves in world coordinates, split intersecting
// edges, retain only boundaries of the union. Never rasterize or trace pixels.
function fmOutlineVectorSubpaths(l){
 const s=l.shape, m=getWorld(l,S.frame), result=[];
 const append=(poly)=>{if(poly.length<3)return;const out=[];for(const p of poly){const q=matApply(m,p);if(!out.length||Math.hypot(q.x-out.at(-1).x,q.y-out.at(-1).y)>.00001)out.push(q);}if(out.length>2&&Math.hypot(out[0].x-out.at(-1).x,out[0].y-out.at(-1).y)<.00001)out.pop();if(out.length>=3)result.push(out);};
 const sampleD=d=>{
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);
  const length=path.getTotalLength();if(!length||!Number.isFinite(length))return;
  // SVG path evaluation preserves the exact source Bezier geometry during sampling.
  const count=Math.min(6000,Math.max(8,Math.ceil(length/.65)));
  const pts=[];for(let i=0;i<count;i++){const p=path.getPointAtLength(length*i/count);pts.push({x:p.x,y:p.y});}append(pts);
 };
 if(s.type==='path'){
  if(!s.closed||s.lineArt)return [];
  sampleD(roundedPathD(l,S.frame));
  for(const points of s.extraContours||[])sampleD(pathD(points,true,false,'line'));
 }else if(s.type==='ellipse'){
  const circumference=2*Math.PI*Math.sqrt((s.rx*s.rx+s.ry*s.ry)/2),n=Math.min(6000,Math.max(40,Math.ceil(circumference/.65))),pts=[];
  for(let i=0;i<n;i++){const t=i*2*Math.PI/n;pts.push({x:s.cx+Math.cos(t)*s.rx,y:s.cy+Math.sin(t)*s.ry});}append(pts);
 }else if(s.type==='rect'){
  const [sx,sy]=rectWorldScale(l,S.frame);
  sampleD(rectPathD(s,sx,sy));
 }
 return result;
}
function fmOutlineArea(poly){let area=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];area+=a.x*b.y-b.x*a.y;}return area/2;}
function fmOutlinePointIn(poly,x,y){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
function fmOutlineUnion(polygons){
 const edges=[];
 for(let k=0;k<polygons.length;k++){
  const loops=polygons[k];for(const loop of loops)for(let i=0;i<loop.length;i++){
   const a=loop[i],b=loop[(i+1)%loop.length];if(Math.hypot(a.x-b.x,a.y-b.y)>1e-6)edges.push({a,b,ts:[0,1]});
  }
 }
 if(edges.length>6500)throw Error('頂点数が多すぎます。対象を分けてください。');
 const cross=(x,y)=>x.x*y.y-x.y*y.x;
 const subtract=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
 for(let i=0;i<edges.length;i++){
  const e=edges[i],r=subtract(e.b,e.a),minx=Math.min(e.a.x,e.b.x),maxx=Math.max(e.a.x,e.b.x),miny=Math.min(e.a.y,e.b.y),maxy=Math.max(e.a.y,e.b.y);
  for(let j=i+1;j<edges.length;j++){
   const f=edges[j];if(Math.max(minx,Math.min(f.a.x,f.b.x))>Math.min(maxx,Math.max(f.a.x,f.b.x))+1e-8||Math.max(miny,Math.min(f.a.y,f.b.y))>Math.min(maxy,Math.max(f.a.y,f.b.y))+1e-8)continue;
   const s=subtract(f.b,f.a),den=cross(r,s),q=subtract(f.a,e.a);
   if(Math.abs(den)<1e-10){
    if(Math.abs(cross(q,r))>1e-7)continue;
    const rr=r.x*r.x+r.y*r.y,ss=s.x*s.x+s.y*s.y;
    if(rr<1e-12||ss<1e-12)continue;
    for(const p of [f.a,f.b]){const t=((p.x-e.a.x)*r.x+(p.y-e.a.y)*r.y)/rr;if(t>1e-7&&t<1-1e-7)e.ts.push(t);}
    for(const p of [e.a,e.b]){const t=((p.x-f.a.x)*s.x+(p.y-f.a.y)*s.y)/ss;if(t>1e-7&&t<1-1e-7)f.ts.push(t);}
    continue;
   }
   const t=cross(q,s)/den,u=cross(q,r)/den;
   if(t>=-1e-8&&t<=1+1e-8&&u>=-1e-8&&u<=1+1e-8){e.ts.push(Math.max(0,Math.min(1,t)));f.ts.push(Math.max(0,Math.min(1,u)));}
  }
 }
 const isFilled=(x,y)=>polygons.some(loops=>{let n=0;for(const loop of loops)if(fmOutlinePointIn(loop,x,y))n++;return n%2===1;});
 const kept=new Map(),quant=p=>`${Math.round(p.x*10000)},${Math.round(p.y*10000)}`;
 for(const e of edges){const ts=[...new Set(e.ts.map(t=>Math.round(t*1e9)/1e9))].sort((a,b)=>a-b),dx=e.b.x-e.a.x,dy=e.b.y-e.a.y;
  for(let i=1;i<ts.length;i++){
   const t0=ts[i-1],t1=ts[i];if(t1-t0<1e-8)continue;
   const a={x:e.a.x+dx*t0,y:e.a.y+dy*t0},b={x:e.a.x+dx*t1,y:e.a.y+dy*t1};
   const d=Math.hypot(b.x-a.x,b.y-a.y);if(d<1e-6)continue;
   const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};const eps=Math.min(.025,Math.max(.00005,d*.1)),nx=-dy/Math.hypot(dx,dy),ny=dx/Math.hypot(dx,dy);
   const left=isFilled(mid.x+nx*eps,mid.y+ny*eps),right=isFilled(mid.x-nx*eps,mid.y-ny*eps);
   if(left===right)continue;
   const p=left?a:b,q=left?b:a,key=quant(p)+'>'+quant(q),opp=quant(q)+'>'+quant(p);
   if(kept.has(opp))kept.delete(opp);else if(!kept.has(key))kept.set(key,{a:p,b:q});
  }
 }
 const next=new Map();for(const e of kept.values()){const k=quant(e.a);if(!next.has(k))next.set(k,[]);next.get(k).push(e);}
 const result=[],seen=new Set();for(const e of kept.values()){
  if(seen.has(e))continue;const loop=[],origin=quant(e.a);let current=e,steps=0;
  while(current&&!seen.has(current)&&steps++<kept.size+1){seen.add(current);loop.push(current.a);const to=quant(current.b);if(to===origin)break;const candidates=(next.get(to)||[]).filter(x=>!seen.has(x));
   if(!candidates.length){loop.length=0;break;}
   if(candidates.length===1){current=candidates[0];continue;}
   // At a junction, take the smallest positive turn keeping the filled region left.
   const ax=current.b.x-current.a.x,ay=current.b.y-current.a.y;
   current=candidates.sort((p,q)=>{const score=z=>{const bx=z.b.x-z.a.x,by=z.b.y-z.a.y;return (Math.atan2(ax*by-ay*bx,ax*bx+ay*by)+Math.PI*2)%(Math.PI*2);};return score(p)-score(q);})[0];
  }
  if(loop.length>=3&&Math.abs(fmOutlineArea(loop))>1e-5){
   // Vector simplification only removes almost-collinear vertices (no pixel tracing).
   const clean=[];for(let j=0;j<loop.length;j++){const a=loop[(j+loop.length-1)%loop.length],b=loop[j],c=loop[(j+1)%loop.length],cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);if(Math.abs(cross)>1e-5*Math.max(.01,Math.hypot(c.x-a.x,c.y-a.y)))clean.push(b);}
   if(clean.length>=3)result.push(clean);
  }
 }
 return result.sort((a,b)=>Math.abs(fmOutlineArea(b))-Math.abs(fmOutlineArea(a)));
}
function fmOutlineShift(poly,amount){
 // Boundary loops are oriented with the union on the left, so right-normal is exterior.
 const output=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[(i+poly.length-1)%poly.length],b=poly[i],c=poly[(i+1)%poly.length];
  let ux=b.x-a.x,uy=b.y-a.y,vx=c.x-b.x,vy=c.y-b.y;
  const ul=Math.hypot(ux,uy)||1,vl=Math.hypot(vx,vy)||1;ux/=ul;uy/=ul;vx/=vl;vy/=vl;
  const n1={x:uy,y:-ux},n2={x:vy,y:-vx};const sum={x:n1.x+n2.x,y:n1.y+n2.y};let den=sum.x*n1.x+sum.y*n1.y;
  if(Math.abs(den)<.15)den=den<0?-.15:.15;
  const scale=Math.min(3,Math.abs(2/den))*Math.sign(2/den),mx=sum.x*scale/2,my=sum.y*scale/2;
  output.push({x:b.x+mx*amount,y:b.y+my*amount});
 }
 return output;
}
// Generate a stroked layer from an isolated *copy* of the target. For folders,
// copy the complete visible vector subtree first, then flatten that copy to one
// merged silhouette vector, discard its fills and create the stroke layer.
// The original folder and its layers are never modified.

// Preserve the actual cubic controls in the flattened outline. The topology is
// computed from intersections, but the resulting geometry is never tessellated
// into a polygon. All output segments remain genuine cubic Bezier segments.
const fmBzL=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
function fmBzSplit(c,t){const a=fmBzL(c[0],c[1],t),b=fmBzL(c[1],c[2],t),d=fmBzL(c[2],c[3],t),e=fmBzL(a,b,t),f=fmBzL(b,d,t),g=fmBzL(e,f,t);return [[c[0],a,e,g],[g,f,d,c[3]]];}
function fmBzPart(c,a,b){if(a<=0&&b>=1)return c;const tail=a>0?fmBzSplit(c,a)[1]:c;return b<1?fmBzSplit(tail,(b-a)/(1-a))[0]:tail;}
function fmBzAt(c,t){const u=1-t;return{x:u*u*u*c[0].x+3*u*u*t*c[1].x+3*u*t*t*c[2].x+t*t*t*c[3].x,y:u*u*u*c[0].y+3*u*u*t*c[1].y+3*u*t*t*c[2].y+t*t*t*c[3].y};}
function fmBzTan(c,t){const u=1-t;return{x:3*(u*u*(c[1].x-c[0].x)+2*u*t*(c[2].x-c[1].x)+t*t*(c[3].x-c[2].x)),y:3*(u*u*(c[1].y-c[0].y)+2*u*t*(c[2].y-c[1].y)+t*t*(c[3].y-c[2].y))};}
function fmBzReverse(c){return [c[3],c[2],c[1],c[0]];}
function fmBzLine(a,b){return [a,fmBzL(a,b,1/3),fmBzL(a,b,2/3),b];}
function fmBzParse(d,m){
 const ts=d.match(/[MLCZAmlcza]|[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g)||[];
 let i=0,cur=null,first=null,seg=[];
 const pt=()=>({x:Number(ts[i++]),y:Number(ts[i++])});
 while(i<ts.length){const op=ts[i++].toUpperCase();
  if(op==='M'){cur=pt();first=cur;}
  else if(op==='L'){const b=pt();seg.push(fmBzLine(cur,b));cur=b;}
  else if(op==='C'){const a=pt(),b=pt(),c=pt();seg.push([cur,a,b,c]);cur=c;}
  else if(op==='A'){
   let rx=Math.abs(Number(ts[i++])),ry=Math.abs(Number(ts[i++]));const phi=Number(ts[i++])*Math.PI/180,large=Number(ts[i++]),sweep=Number(ts[i++]);const end=pt();
   if(!rx||!ry){seg.push(fmBzLine(cur,end));cur=end;continue;}
   const co=Math.cos(phi),si=Math.sin(phi),dx=(cur.x-end.x)/2,dy=(cur.y-end.y)/2;
   const xp=co*dx+si*dy,yp=-si*dx+co*dy,lambda=xp*xp/(rx*rx)+yp*yp/(ry*ry);
   if(lambda>1){const k=Math.sqrt(lambda);rx*=k;ry*=k;}
   const denom=rx*rx*yp*yp+ry*ry*xp*xp;
   const fac=(large===sweep?-1:1)*Math.sqrt(Math.max(0,(rx*rx*ry*ry-denom)/Math.max(1e-16,denom)));
   const cxp=fac*rx*yp/ry,cyp=-fac*ry*xp/rx,cx=co*cxp-si*cyp+(cur.x+end.x)/2,cy=si*cxp+co*cyp+(cur.y+end.y)/2;
   const angle=(x,y)=>Math.atan2(y,x);
   let start=angle((xp-cxp)/rx,(yp-cyp)/ry),finish=angle((-xp-cxp)/rx,(-yp-cyp)/ry),delta=finish-start;
   if(sweep&&delta<0)delta+=Math.PI*2;if(!sweep&&delta>0)delta-=Math.PI*2;
   const point=t=>({x:cx+rx*Math.cos(t)*co-ry*Math.sin(t)*si,y:cy+rx*Math.cos(t)*si+ry*Math.sin(t)*co});
   const tangent=t=>({x:-rx*Math.sin(t)*co-ry*Math.cos(t)*si,y:-rx*Math.sin(t)*si+ry*Math.cos(t)*co});
   const pieces=Math.max(1,Math.ceil(Math.abs(delta)/(Math.PI/2))),step=delta/pieces,k=4/3*Math.tan(step/4);
   for(let j=0;j<pieces;j++){
    const a=start+j*step,b=a+step,p0=j?point(a):cur,p3=j===pieces-1?end:point(b),v0=tangent(a),v1=tangent(b);
    seg.push([p0,{x:p0.x+v0.x*k,y:p0.y+v0.y*k},{x:p3.x-v1.x*k,y:p3.y-v1.y*k},p3]);
   }
   cur=end;
  }
  else if(op==='Z'){if(Math.hypot(cur.x-first.x,cur.y-first.y)>1e-5)seg.push(fmBzLine(cur,first));cur=first;}
  else throw Error('このパス形式にはまだ対応していません: '+op);
 }
 return seg.map(c=>c.map(p=>matApply(m,p)));
}
function fmBzContours(l,frame=S.frame){
 const s=l.shape,m=getWorld(l,frame),contours=[];
 if(s.type==='path'){
  if(!s.closed||s.lineArt)return [];
  const mode=s.pathMode||(s.smooth?'auto':'line');
  const anchors=getMorphPoints(l,frame);
  if(mode==='bezier'&&!num(s.cornerRadius,0)){
   contours.push(anchors.map((a,i)=>{
    const b=anchors[(i+1)%anchors.length];return [
     {x:a.x,y:a.y},{x:a.x+num(a.outX),y:a.y+num(a.outY)},
     {x:b.x+num(b.inX),y:b.y+num(b.inY)},{x:b.x,y:b.y}
    ].map(p=>matApply(m,p));
   }));
  }else contours.push(fmBzParse(roundedPathD(l,frame),m));
  for(const ps of s.extraContours||[]){
   if(s.extraContourBezier){contours.push(ps.map((a,i)=>{const b=ps[(i+1)%ps.length];return [
     {x:a.x,y:a.y},{x:a.x+num(a.outX),y:a.y+num(a.outY)},
     {x:b.x+num(b.inX),y:b.y+num(b.inY)},{x:b.x,y:b.y}
    ].map(p=>matApply(m,p));}));}
   else contours.push(fmBzParse(pathD(ps,true,false,'line'),m));
  }
 }else if(s.type==='ellipse'){
  const x=s.cx,y=s.cy,rx=s.rx,ry=s.ry,k=.5522847498307936;
  const pts=[{x:x+rx,y},{x,y:y+ry},{x:x-rx,y},{x,y:y-ry},{x:x+rx,y}];
  const c1=[{x:x+rx,y:y+k*ry},{x:x-k*rx,y:y+ry},{x:x-rx,y:y-k*ry},{x:x+k*rx,y:y-ry}];
  const c2=[{x:x+k*rx,y:y+ry},{x:x-rx,y:y+k*ry},{x:x-k*rx,y:y-ry},{x:x+rx,y:y-k*ry}];
  contours.push(Array.from({length:4},(_,i)=>[pts[i],c1[i],c2[i],pts[i+1]].map(p=>matApply(m,p))));
 }else if(s.type==='rect'){
  const [sx,sy]=rectWorldScale(l,frame);
  contours.push(fmBzParse(rectPathD(s,sx,sy),m));
 }
 return contours.filter(a=>a.length);
}
function fmBzFlat(c){const a=c[0],b=c[3],dx=b.x-a.x,dy=b.y-a.y,den=Math.hypot(dx,dy);if(den<1e-9)return Math.max(Math.hypot(c[1].x-a.x,c[1].y-a.y),Math.hypot(c[2].x-a.x,c[2].y-a.y));return Math.max(Math.abs(dx*(c[1].y-a.y)-dy*(c[1].x-a.x))/den,Math.abs(dx*(c[2].y-a.y)-dy*(c[2].x-a.x))/den);}
function fmBzSample(c,tol=.6){const out=[c[0]];function go(seg,depth){if(depth>=10||fmBzFlat(seg)<tol){out.push(seg[3]);return;}const [a,b]=fmBzSplit(seg,.5);go(a,depth+1);go(b,depth+1);}go(c,0);return out;}
function fmBzPoly(contour){const pts=[];for(const c of contour){const sample=fmBzSample(c,.35);pts.push(...sample.slice(0,-1));}return pts;}
function fmBzIntersection(a,b){
 const aa=[],bb=[];
 const sample=(c,arr)=>{function go(seg,t0,t1,depth){if(depth>=12||fmBzFlat(seg)<.15){arr.push({p:seg[0],t:t0});return;}const [x,y]=fmBzSplit(seg,.5),tm=(t0+t1)/2;go(x,t0,tm,depth+1);go(y,tm,t1,depth+1);}go(c,0,1,0);arr.push({p:c[3],t:1});};
 sample(a,aa);sample(b,bb);const result=[];
 for(let i=1;i<aa.length;i++)for(let j=1;j<bb.length;j++){
  const p=aa[i-1].p,r={x:aa[i].p.x-p.x,y:aa[i].p.y-p.y},q=bb[j-1].p,v={x:bb[j].p.x-q.x,y:bb[j].p.y-q.y};
  const den=r.x*v.y-r.y*v.x;if(Math.abs(den)<1e-10)continue;
  const d={x:q.x-p.x,y:q.y-p.y},u=(d.x*v.y-d.y*v.x)/den,w=(d.x*r.y-d.y*r.x)/den;
  if(u<-.00001||u>1.00001||w<-.00001||w>1.00001)continue;
  let ta=aa[i-1].t+(aa[i].t-aa[i-1].t)*u,tb=bb[j-1].t+(bb[j].t-bb[j-1].t)*w;
  // Newton correction improves the shared endpoint without straightening a curve.
  for(let n=0;n<5;n++){
   const x=fmBzAt(a,ta),y=fmBzAt(b,tb),d1=fmBzTan(a,ta),d2=fmBzTan(b,tb),det=d1.x*(-d2.y)+d2.x*d1.y;
   if(Math.abs(det)<1e-12)break;
   const dx=y.x-x.x,dy=y.y-x.y;
   const dt=(dx*(-d2.y)+d2.x*dy)/det,du=(d1.x*dy-d1.y*dx)/det;
   ta=Math.max(0,Math.min(1,ta+dt));tb=Math.max(0,Math.min(1,tb+du));
   if(Math.abs(dt)+Math.abs(du)<1e-8)break;
  }
  if(Math.hypot(fmBzAt(a,ta).x-fmBzAt(b,tb).x,fmBzAt(a,ta).y-fmBzAt(b,tb).y)<.3&&!result.some(x=>Math.abs(x[0]-ta)<.0005&&Math.abs(x[1]-tb)<.0005))result.push([ta,tb]);
 }
 return result;
}
function fmBzMerge(duplicates,frame=S.frame){
 const grouped=duplicates.map(item=>item.contours||fmCloneVectorContours(item.original,frame));
 const contours=grouped.flat();
 if(!contours.length)throw Error('ベクターパスを取得できません');
 const flatten=grouped.map(group=>group.map(fmBzPoly)),segments=contours.flatMap((loop,owner)=>loop.map(c=>({c,owner,cuts:[0,1]})));
 if(segments.length>450)throw Error('曲線の数が多すぎます。対象を分割してください');
 const bb=c=>({minx:Math.min(...c.map(p=>p.x)),maxx:Math.max(...c.map(p=>p.x)),miny:Math.min(...c.map(p=>p.y)),maxy:Math.max(...c.map(p=>p.y))});
 for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
  const a=segments[i],b=segments[j],x=bb(a.c),y=bb(b.c);
  if(x.minx>y.maxx+.1||y.minx>x.maxx+.1||x.miny>y.maxy+.1||y.miny>x.maxy+.1)continue;
  for(const [u,v] of fmBzIntersection(a.c,b.c)){
   if(u>.000001&&u<.999999)a.cuts.push(u);
   if(v>.000001&&v<.999999)b.cuts.push(v);
  }
 }
 const filled=(p)=>flatten.some(group=>{let hit=false;for(const loop of group)if(fmOutlinePointIn(loop,p.x,p.y))hit=!hit;return hit;});
 const kept=[];
 for(const seg of segments){const ts=[...new Set(seg.cuts.map(t=>Math.round(t*1e7)/1e7))].sort((a,b)=>a-b);
  for(let i=1;i<ts.length;i++){if(ts[i]-ts[i-1]<1e-6)continue;
   const c=fmBzPart(seg.c,ts[i-1],ts[i]),mid=fmBzAt(c,.5),dir=fmBzTan(c,.5),len=Math.hypot(dir.x,dir.y);
   if(len<1e-10)continue;const eps=Math.max(.3,Math.min(.8,len*.025)),nx=-dir.y/len,ny=dir.x/len;
   const left=filled({x:mid.x+nx*eps,y:mid.y+ny*eps}),right=filled({x:mid.x-nx*eps,y:mid.y-ny*eps});
   if(left===right)continue;kept.push(left?c:fmBzReverse(c));
  }
 }
 if(!kept.length)throw Error('統合結果が空です');
 // Shared boundaries of coincident shapes should not be stroked twice.
 const unique=new Map();
 const fingerprint=c=>[c[0],fmBzAt(c,.5),c[3]].map(p=>`${Math.round(p.x*1000)},${Math.round(p.y*1000)}`).join('/');
 for(const c of kept)unique.set(fingerprint(c),c);
 kept.length=0;kept.push(...unique.values());
 // Curves intersected via numeric Bézier subdivision rarely share exactly
 // the same floating-point end coordinates. Join within a bounded canvas-
 // space tolerance, then bring the shared cubic endpoints together without
 // flattening the Bézier handles. Do not accept an OPEN chain as a loop.
 const joinTolerance=.85;
 const pointDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const used=new Set(),loops=[];
 const snapJoin=(a,b)=>{
  const old=a[3],target=b[0],point={x:(old.x+target.x)/2,y:(old.y+target.y)/2};
  a[3]=point;b[0]=point;
  // Preserve each segment's endpoint tangent rather than introduce a kink.
  a[2]={x:a[2].x+point.x-old.x,y:a[2].y+point.y-old.y};
  b[1]={x:b[1].x+point.x-target.x,y:b[1].y+point.y-target.y};
 };
 for(let i=0;i<kept.length;i++){
  if(used.has(i))continue;
  const loop=[kept[i].map(p=>({...p}))],taken=[i];
  let closed=false;
  for(let step=0;step<=kept.length;step++){
   const current=loop.at(-1),end=current[3],origin=loop[0][0];
   if(loop.length>1&&pointDistance(end,origin)<=joinTolerance){
    snapJoin(current,loop[0]);closed=true;break;
   }
   const candidates=[];
   for(let j=0;j<kept.length;j++){
    if(used.has(j)||taken.includes(j))continue;
    const dist=pointDistance(end,kept[j][0]);
    if(dist<=joinTolerance){
     const a=fmBzTan(current,1),b=fmBzTan(kept[j],0);
     const angle=(Math.atan2(a.x*b.y-a.y*b.x,a.x*b.x+a.y*b.y)+Math.PI*2)%(Math.PI*2);
     candidates.push({j,dist,angle});
    }
   }
   if(!candidates.length)break;
   candidates.sort((a,b)=>a.dist-b.dist||a.angle-b.angle);
   const next=candidates[0],seg=kept[next.j].map(p=>({...p}));
   snapJoin(current,seg);loop.push(seg);taken.push(next.j);
  }
  if(closed){taken.forEach(j=>used.add(j));loops.push(loop);}
 }
 if(!loops.length)throw Error('外周曲線の接続に失敗しました');
 const area=loop=>fmOutlineArea(loop.flatMap(c=>fmBzSample(c,.45).slice(0,-1)));
 loops.sort((a,b)=>Math.abs(area(b))-Math.abs(area(a)));
 return loops;
}
function fmBzPoints(loop,inverse){
 return loop.map((seg,i)=>{
  const prev=loop[(i+loop.length-1)%loop.length],p=matApply(inverse,seg[0]),from=matApply(inverse,prev[2]),to=matApply(inverse,seg[1]);
  return {x:rnd(p.x,5),y:rnd(p.y,5),inX:rnd(from.x-p.x,5),inY:rnd(from.y-p.y,5),outX:rnd(to.x-p.x,5),outY:rnd(to.y-p.y,5),nodeType:'corner'};
 });
}

function fmOutlineDuplicateForMerge(root){
 const originals=isFolder(root)?layerTree(root.id).map(x=>x.layer).filter(l=>!isFolder(l)&&effectiveVisible(l)):[root];
 // Copy full object data without placing the temporary copy in the document.
 // Save world-space contours at the copy stage so nested transforms are baked in.
 return originals.map(original=>({
  copy:JSON.parse(JSON.stringify(original)),
  original,
  contours:[]
 }));
}
function fmOutlineMergeCopiedVectors(duplicates){
 if(!duplicates.length)throw Error('統合するベクターレイヤーがありません');
 for(const item of duplicates){const l=item.copy;
  if(!['rect','ellipse','path','svg','merged'].includes(l.shape?.type)||l.clipToBelow||l.mesh||l.repeat?.enabled)
   throw Error('ベクター図形／線画が対象です。ラスター・3D・クリッピング・メッシュ等は対象外です');
 }
 for(const item of duplicates)item.contours=fmCloneVectorContours(item.original);
 return fmBzMerge(duplicates);
}
function generateOutlineObject(){
 const root=sel();if(!root||!effectiveVisible(root)){toast('表示中のレイヤーまたはフォルダーを選択してください。');return;}
 const width=clamp(num($('#fmOutlineStrokeWidth')?.value,4),.5,100);
 const placement=document.querySelector('input[name="fmOutlinePlacement"]:checked')?.value||'center';
 const color=$('#fmOutlineStrokeColor')?.value||'#47332b';
 try{
  // 1. Duplicate the chosen folder/layer in memory (non-destructive).
  const duplicate=fmOutlineDuplicateForMerge(root);
  // Use original Bezier segments and only subdivide curves at actual crossings.
  // Stroke alignment is applied at SVG rendering time: the centreline remains
  // unchanged, avoiding distortion of Bezier geometry.
  const loops=fmOutlineMergeCopiedVectors(duplicate);
  snapshot();
  const result=newLayer({type:'path',points:[],extraContours:[],extraContourBezier:true,closed:true,smooth:false,pathMode:'bezier'},0,0,`${root.name} のアウトライン`,{folderId:root.folderId||null,stroke:color,strokeOn:true,strokeWidth:width,fillHidden:true});
  const inverse=matInv(getParentWorld(result));
  const local=loops.map(loop=>fmBzPoints(loop,inverse));
  result.shape.points=local[0];result.shape.extraContours=local.slice(1);
  result.fillHidden=true;result.strokeOn=true;result.stroke=color;result.strokeWidth=width;
  result.shape.generatedOutlinePlacement=placement;
  result.gradient=null;result.texture=null;result.repeat=normalizeRepeat();
  const bb=getBBox(result);result.pivot={x:rnd(bb.x+bb.w/2,2),y:rnd(bb.y+bb.h/2,2)};
  const sourceIndex=doc.layers.indexOf(root),newIndex=doc.layers.indexOf(result);
  doc.layers.splice(newIndex,1);doc.layers.splice(sourceIndex+1,0,result);
  setSingleSelection(result.id);mutated();
  toast(isFolder(root)?'フォルダーを複製・ベクター統合した外周から新しい線レイヤーを作成しました。':'複製したベクターパスから新しい線レイヤーを作成しました。');
 }catch(err){console.error('Vector outline:',err);toast('アウトライン生成に失敗しました: '+err.message);}
}

function offsetSelectedPath(){const l=sel();if(!l||!['path','rect','ellipse'].includes(l.shape?.type)||l.shape.lineArt||!l.shape.closed&&l.shape.type==='path'||effectiveLocked(l)||l.mesh||l.clipToBelow){toast('通常の閉じたベクター図形を選択してください。');return;}
 const distance=clamp(num($('#fmOffsetAmount')?.value,S.offsetDistance),-200,200);if(Math.abs(distance)<.01){toast('オフセット距離を0以外にしてください。');return;}S.offsetDistance=distance;
 try{const bounds=geomBounds([l],Math.abs(distance)+4),{res,w,h}=geomCanvas(bounds),mask=geomMask(l,bounds,res,w,h,distance),contours=geomContours(mask,w,h,bounds,res);if(!contours.length){toast('内側オフセットで形が消えました。距離を小さくしてください。');return;}
 snapshot();geomResult(contours,[l],`オフセット ${distance>0?'+':''}${distance}px`,true);mutated();toast('オフセットパスを生成しました（元レイヤーは非表示）。');
 }catch(e){console.error(e);toast('オフセットに失敗しました: '+e.message);}
}
function offsetInspectorMarkup(l){if(!l||!['path','rect','ellipse'].includes(l.shape?.type)||l.shape.lineArt||!l.shape.closed&&l.shape.type==='path')return'';return `<section class="fm-offset-panel"><strong>パスのオフセット</strong><div class="prop-tip">外側は＋、内側は−。現在の輪郭から編集可能な新しいパスを生成します。</div><input type="range" id="fmOffsetSlider" min="-200" max="200" step="1" value="${S.offsetDistance}" aria-label="オフセット距離"><div class="fm-offset-values"><input id="fmOffsetAmount" type="number" min="-200" max="200" step="1" value="${S.offsetDistance}" aria-label="オフセット距離 px"><button type="button" data-action="offsetPath">パスを生成</button></div></section>`;}

function setTool(name){if(name==='morph')name='node';S.smartGuideLines=[];S.tool=name;if(name==='hand'||name==='crop'||name==='gradient'||name==='brush'||name==='raster'||name==='node'||name==='triangle')S.inspectorTab='tool';if(name==='node')inspectorSubtabState.tool='描画ツール';if(name==='text')S.inspectorTab='layer';S.pen=[];S.cursor=null;S.drag=null;S.simplifySession=null;S.vertexSelected=false;S.nodeSelected.clear();renderStage();renderInspector();updateButtons();}
function createFolder(){
 const checked=selectedRoots(),multi=checkedLayers().length>1;
 const current=sel(),parentFolder=multi?(checked.every(l=>(l.folderId||null)===(checked[0].folderId||null))?folderParent(checked[0]):null):(isFolder(current)?current:folderParent(current));
 const toMove=multi?checked:(current&&!isFolder(current)?[current]:[]);
 if(toMove.some(l=>effectiveLocked(l))){toast("ロックされたレイヤーはフォルダーへ移動できません。");return;}
 snapshot();const folder={id:uid(),name:`フォルダー ${doc.layers.filter(isFolder).length+1}`,shape:{type:'folder'},type:'folder',fill:'#684737',stroke:'#684737',strokeOn:false,strokeWidth:0,visible:true,locked:false,clipToBelow:false,parent:null,folderId:parentFolder?.id||null,pivot:{x:0,y:0},keys:{'0':basePose()},repeat:normalizeRepeat()};
 const insertion=toMove.length?Math.max(...toMove.map(l=>doc.layers.indexOf(l)))+1:current?doc.layers.indexOf(current)+1:doc.layers.length;
 doc.layers.splice(insertion,0,folder);
 for(const l of toMove)rehomeLayer(l,folder.id,{snap:false});
 if(toMove.length){const b=getBBox(folder);folder.pivot={x:rnd(b.x+b.w/2,2),y:rnd(b.y+b.h/2,2)};}
 setSingleSelection(folder.id);S.collapsedFolders.delete(folder.id);mutated();
 toast(toMove.length?`${toMove.length}個のレイヤーを新しいフォルダーへ収納しました。`:'新しいフォルダーを作成しました。');
}

// An editable merge is a semantic group with original vector paths, styling,
// keyframes and nested groups kept intact.  Its children remain in doc.layers.
// This replaces the old SVG-flattening merge for newly created objects.
function mergeSelectedLayers(){
 const roots=selectedRoots(),selected=checkedLayers();
 if(roots.length<2||selected.length<2){toast('チェックボックスで2個以上選択してください。');return;}
 if(roots.some(l=>effectiveLocked(l)||!effectiveVisible(l))){toast('非表示またはロック中のオブジェクトは統合できません。');return;}
 const folderId=roots[0].folderId||null;
 if(!roots.every(l=>(l.folderId||null)===folderId)){
  toast('見た目と階層を保つため、同じフォルダー内のオブジェクトを選択してください。');return;
 }
 const siblings=directChildren(folderId),positions=roots.map(l=>siblings.indexOf(l)).sort((a,b)=>a-b);
 if(positions.at(-1)-positions[0]+1!==roots.length){
  toast('重なり順を変えないため、連続したオブジェクトを選択してください。');return;
 }
 const ids=new Set();
 for(const root of roots){ids.add(root.id);if(isFolder(root))for(const l of doc.layers)if(memberOfFolder(l,root.id))ids.add(l.id);}
 // External character rigs and external clipping bases can otherwise be
 // silently reinterpreted by the folder hierarchy.
 if(doc.layers.some(l=>!ids.has(l.id)&&l.parent&&ids.has(l.parent))){
  toast('選択外の子パーツがあります。親子関係を解除するか子パーツも含めてください。');return;
 }
 if(roots.some(l=>l.parent&&!ids.has(l.parent))){
  toast('選択外の親パーツに連動するレイヤーがあります。親子関係を解除するか親も含めてください。');return;
 }
 if(roots.some(l=>l.clipToBelow&&!ids.has(clipBaseFor(l)?.id))){
  toast('クリッピングの下地も一緒に選択してください。');return;
 }
 const top=positions.at(-1),above=siblings.slice(top+1);
 if(above.length&&above[0].clipToBelow&&above.some(l=>l.clipToBelow)){
  toast('選択範囲の上にクリッピングされたレイヤーがあります。まとめて選択するかクリッピングを解除してください。');return;
 }
 // All coordinate calculations use the original parent space.  The new
 // editable merge starts as the identity, so its insertion is pixel-stable.
 const parent=folderId?layerBy(folderId):null,parentInv=parent?matInv(getWorld(parent,S.frame)):matI(),points=[];
 for(const root of roots){const b=repeatBBox(root,S.frame),w=getWorld(root,S.frame);
  for(const c of [{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:b.x,y:b.y+b.h}])points.push(matApply(parentInv,matApply(w,c)));
 }
 const cx=(Math.min(...points.map(p=>p.x))+Math.max(...points.map(p=>p.x)))/2;
 const cy=(Math.min(...points.map(p=>p.y))+Math.max(...points.map(p=>p.y)))/2;
 const group={id:uid(),name:`統合オブジェクト ${doc.layers.filter(l=>l.mergeGroup).length+1}`,
  type:'folder',shape:{type:'folder'},mergeGroup:true,
  fill:'#684737',stroke:'#684737',strokeOn:false,strokeWidth:0,
  visible:true,locked:false,clipToBelow:false,parent:null,folderId,
  pivot:{x:rnd(cx,3),y:rnd(cy,3)},keys:{'0':basePose()},
  repeat:normalizeRepeat(),effects:normalizeEffects(),outline:normalizeOutline()};
 const index=Math.max(...roots.map(l=>doc.layers.indexOf(l)));
 snapshot();
 doc.layers.splice(index+1,0,group);
 for(const l of roots)rehomeLayer(l,group.id,{snap:false});
 group.locked=true;setSingleSelection(group.id);S.collapsedFolders.add(group.id);
 S.tool='select';S.pen=[];S.nodeIndex=0;S.vertexSelected=false;S.nodeSelected.clear();S.simplifySession=null;
 mutated();toast(`${roots.length}個を統合し、自動施錠しました。鍵を解除すると内部パーツを編集できます。`);
}
function expandMergedGroup(){const l=sel();if(!l?.mergeGroup)return;if(effectiveLocked(l)){toast('鍵を解除してから内部パーツを編集してください。');return;}
 S.collapsedFolders.delete(l.id);renderLayers();renderTimeline();renderInspector();
 toast('統合オブジェクトを展開しました。内部のパーツを選択して色・パスを編集できます。');
}
function unmergeSelectedLayers(){const group=sel()?.mergeGroup?sel():checkedLayers().length===1&&checkedLayers()[0].mergeGroup?checkedLayers()[0]:null;if(!isFolder(group)||!group.mergeGroup){toast('統合オブジェクトを選択してください。');return;}
 if(effectiveLocked(group)){toast('ロックを解除してから統合解除してください。');return;}
 const composite=normalizeRepeat(group.repeat).enabled&&normalizeRepeat(group.repeat).copies>0||group.clipToBelow||group.crop||Object.values(getEffectsAt(group,S.frame)).some(v=>typeof v==='boolean'&&v);
 if(composite&&!confirm('統合オブジェクト全体に適用した複製・クリッピング・グループエフェクトは解除後に保持されません。元の個別パーツを優先して解除しますか？'))return;
 ungroupFolder(group);
}
// While collapsed, clicking a nested shape selects the merge as one object;
// expanded groups allow selecting each constituent path directly on the canvas.
function canvasMergeTarget(hit){if(!hit)return null;
 const lockParent=lockedFolderAncestor(hit);if(lockParent)return lockParent;
 const ancestry=folderAncestry(hit).filter(g=>g.mergeGroup&&(g.locked||S.collapsedFolders.has(g.id)));
 return ancestry.length?ancestry.at(-1):hit;
}
function poseFromAffine(m,pivot){const sx=Math.hypot(m[0],m[1])||1,sy=(m[0]*m[3]-m[1]*m[2])/sx,r=Math.atan2(m[1],m[0])*180/Math.PI;
 const shear=(m[0]*m[2]+m[1]*m[3])/(sx*(Math.abs(sy)>1e-9?sy:1));
 return{x:m[4]-pivot.x+m[0]*pivot.x+m[2]*pivot.y,y:m[5]-pivot.y+m[1]*pivot.x+m[3]*pivot.y,r,sx,sy,skew:Math.atan(shear)*180/Math.PI};}
function rehomeLayer(layer,newFolderId,{snap=true}={}){
 if(effectiveLocked(layer)){if(snap)toast('階層を変更するにはロックを解除してください。');return false;}
 const target=newFolderId?layerBy(newFolderId):null;if(target&&effectiveLocked(target)){if(snap)toast('施錠中のグループには移動できません。');return false;}if(target&&!isFolder(target))return false;
 if(target&&(target.id===layer.id||isFolder(layer)&&memberOfFolder(target,layer.id)))return false;
 if((layer.folderId||null)===(newFolderId||null))return false;
 const keys=Object.keys(layer.keys||{}).map(Number),before=keys.map(frame=>getWorld(layer,frame));
 if(snap)snapshot();layer.folderId=newFolderId||null;
 for(let i=0;i<keys.length;i++){const frame=keys[i],parent=getParentWorld(layer,frame),matrix=matMul(matInv(parent),before[i]);const pose=poseFromAffine(matrix,layer.pivot||{x:0,y:0});const k=layer.keys[frame];for(const attr of ['x','y','r','sx','sy','skew'])k[attr]=rnd(pose[attr],4);}
 if(snap){S.collapsedFolders.delete(newFolderId);mutated();}return true;
}
function ungroupFolder(folder){if(!isFolder(folder))return;if(effectiveLocked(folder)||directChildren(folder.id).some(e=>effectiveLocked(e))){toast('フォルダーや内部レイヤーのロックを解除してから実行してください。');return;}
 const merged=!!folder.mergeGroup,children=directChildren(folder.id),outer=folder.folderId||null;
 // A moved/animated merge needs its world motion baked onto the original
 // child transforms, so releasing the wrapper doesn't jump the artwork.
 const keys=Object.keys(folder.keys||{}),changed=keys.length!==1||keys[0]!=='0'||keys.some(k=>{
  const v=folder.keys[k];return Math.abs(num(v.x))>1e-6||Math.abs(num(v.y))>1e-6||Math.abs(num(v.r))>1e-6||Math.abs(num(v.sx,1)-1)>1e-6||Math.abs(num(v.sy,1)-1)>1e-6||Math.abs(num(v.opacity,1)-1)>1e-6;
 });
 const baked=merged&&changed?new Map(children.map(l=>[l.id,Array.from({length:total()},(_,f)=>getWorld(l,f))])):null;
 snapshot();
 if(baked){
  // Rig parents are converted first, so child world-relative poses remain sound.
  const ordered=[...children].sort((a,b)=>{
   const depth=l=>{let n=0,p=layerBy(l.parent),seen=new Set([l.id]);while(p&&!seen.has(p.id)&&n<30){seen.add(p.id);n++;p=layerBy(p.parent);}return n;};
   return depth(a)-depth(b);
  });
  for(const l of children)l.folderId=outer;
  doc.layers=doc.layers.filter(l=>l!==folder);
  for(const l of ordered){const previous=l.keys||{},next={};
   for(let f=0;f<total();f++){
    const pose=poseFromAffine(matMul(matInv(getParentWorld(l,f)),baked.get(l.id)[f]),l.pivot||{x:0,y:0});
    next[f]={...basePose(),...Object.fromEntries(['x','y','r','sx','sy','skew'].map(k=>[k,rnd(pose[k],6)])),opacity:rnd(getPose({keys:previous},f).opacity*getPose(folder,f).opacity,6),ease:'linear'};
   }
   l.keys=next;
  }
 }else{
  for(const child of children)rehomeLayer(child,outer,{snap:false});
  doc.layers=doc.layers.filter(l=>l!==folder);
 }
 doc.layers.forEach(x=>{if(x.parent===folder.id)x.parent=null;});
 setSingleSelection(null);S.collapsedFolders.delete(folder.id);
 mutated();toast(merged?`統合を解除しました。${children.length}個の編集可能なパーツに戻しました。`:`フォルダーを解除しました。${children.length}個のレイヤーは残っています。`);
}
function groupDuplicate(folder){const all=[folder,...doc.layers.filter(l=>memberOfFolder(l,folder.id))],idMap=new Map(all.map(l=>[l.id,uid()]));
 const copy=all.map(l=>{const c=JSON.parse(JSON.stringify(l));c.id=idMap.get(l.id);c.name=l===folder?l.name+' のコピー':l.name;c.folderId=idMap.get(l.folderId)||l.folderId||null;c.parent=idMap.get(l.parent)||l.parent||null;return c;});
 copy[0].keys=JSON.parse(JSON.stringify(folder.keys));Object.values(copy[0].keys).forEach(k=>{k.x+=18;k.y+=18;});const at=doc.layers.indexOf(folder)+1;doc.layers.splice(at,0,...copy);setSingleSelection(copy[0].id);S.collapsedFolders.delete(copy[0].id);}
function isSelectableChildOfFolder(part,folder){return isFolder(folder)&&part!==folder&&memberOfFolder(part,folder.id);}


// Convert glyph alpha into editable closed vector contours. This is a local,
// offline approximation of the glyph silhouette; no font bytes are required.
function traceAlphaContours(canvas,scale){const w=canvas.width,h=canvas.height,cx=canvas.getContext('2d',{willReadFrequently:true});if(!cx)return[];
 const data=cx.getImageData(0,0,w,h).data,filled=(x,y)=>x>=0&&x<w&&y>=0&&y<h&&data[(y*w+x)*4+3]>145;
 const graph=new Map(),edges=[];
 const add=(x1,y1,x2,y2)=>{const k=x1+','+y1;const a=graph.get(k)||[];const eid=edges.length;edges.push({x1,y1,x2,y2,used:false});a.push(eid);graph.set(k,a);};
 // Scan only the alpha support; unoccupied image regions generate no edges.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(!filled(x,y))continue;
  if(!filled(x,y-1))add(x,y,x+1,y);
  if(!filled(x+1,y))add(x+1,y,x+1,y+1);
  if(!filled(x,y+1))add(x+1,y+1,x,y+1);
  if(!filled(x-1,y))add(x,y+1,x,y);
 }
 const loops=[];
 for(let ei=0;ei<edges.length;ei++){if(edges[ei].used)continue;let at=ei,points=[],safe=0;
  const first=edges[ei],start=first.x1+','+first.y1;
  while(at!=null&&safe++<edges.length+2){const edge=edges[at];if(edge.used)break;edge.used=true;points.push({x:edge.x1,y:edge.y1});const key=edge.x2+','+edge.y2;if(key===start)break;
   const next=(graph.get(key)||[]).find(j=>!edges[j].used);at=next??null;
  }
  if(points.length<8)continue;
  // Drop collinear pixel steps and then approximate with a small chord tolerance.
  const slim=[];for(let i=0;i<points.length;i++){const a=points[(i-1+points.length)%points.length],b=points[i],c=points[(i+1)%points.length];if((a.x-b.x)*(b.y-c.y)!==(a.y-b.y)*(b.x-c.x))slim.push(b);}
  if(slim.length<3)continue;const area=slim.reduce((acc,p,i)=>{const q=slim[(i+1)%slim.length];return acc+p.x*q.y-q.x*p.y;},0)/2;if(Math.abs(area)<5)continue; // discard noise
  const far=slim.reduce((best,p,i)=>{const d=(p.x-slim[0].x)**2+(p.y-slim[0].y)**2;return d>best.d?{d,i}:best;},{d:-1,i:0}).i;
  const closed=[...slim.slice(0,far+1),...slim.slice(far+1),slim[0]];
  const simplified=rdp(closed,scale*.56).slice(0,-1);
  if(simplified.length>=3){loops.push({area:Math.abs(area),points:simplified.map(p=>({x:(p.x-w/2)/scale,y:(p.y-h/2)/scale}))});}
 }
 return loops.sort((a,b)=>b.area-a.area).slice(0,48);
}
async function convertSelectedTextToPaths(){const source=sel();if(!source||source.shape?.type!=='text'||effectiveLocked(source))return;
 const sh=normalizeTextShape(source.shape),glyphs=textGlyphLayout(sh).filter(g=>g.char.trim());if(!glyphs.length){toast('先に文字を入力してください。');return;}if(glyphs.length>120){toast('パス化は一度に120文字までです。文字を分割してください。');return;}
 try{const font=(doc.fonts||[]).find(f=>f.family===sh.fontFamily);if(font)await activateCustomFont(font);await document.fonts?.load(textFontString(sh),sh.content.slice(0,30));await document.fonts?.ready;}catch(e){}
 const size=sh.fontSize,scale=size>160?1.5:2.3,side=Math.ceil(size*3.4*scale),padding=Math.ceil(size*.6*scale);let paths=[];
 for(const g of glyphs){const measure=textAdvance(g.char,sh),w=Math.ceil(Math.max(side,measure*scale+padding*2)),h=side;
  const canvas=document.createElement('canvas');canvas.width=Math.min(w,2400);canvas.height=Math.min(h,2400);
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#000';ctx.font=`${sh.fontWeight} ${sh.fontSize*scale}px ${sh.fontFamily}`;
  ctx.fillText(g.char,canvas.width/2,canvas.height/2);
  let contours=traceAlphaContours(canvas,scale);if(!contours.length)continue;
  const rot=g.rotation*Math.PI/180,c=Math.cos(rot),sin=Math.sin(rot);
  contours=contours.map(({points,area})=>({area,points:points.map(p=>({x:rnd(g.x+p.x*c-p.y*sin,2),y:rnd(g.y+p.x*sin+p.y*c,2)}))}));
  paths.push({label:g.source,contours});
 }
 if(!paths.length){toast('文字の輪郭を抽出できませんでした。別のフォントをお試しください。');return;}
 snapshot();const world=getWorld(source,S.frame),folder={id:uid(),name:source.name+'（パス化）',shape:{type:'folder'},type:'folder',fill:'#694a3b',stroke:'#694a3b',strokeOn:false,strokeWidth:0,visible:true,locked:false,clipToBelow:false,parent:null,folderId:null,pivot:{x:0,y:0},keys:{'0':{...basePose(),...poseFromAffine(world,{x:0,y:0})}},repeat:normalizeRepeat()};
 // Insert directly after the hidden original to keep the old stack order.
 const index=doc.layers.indexOf(source);doc.layers.splice(index+1,0,folder);
 for(let i=0;i<paths.length;i++){
  const glyph=paths[i],main=glyph.contours[0].points,extras=glyph.contours.slice(1).map(c=>c.points);
  const layer={id:uid(),name:`${String(i+1).padStart(2,'0')} ${glyph.label}`,shape:{type:'path',points:main,extraContours:extras,closed:true,smooth:false,pathMode:'line',cornerRadius:0},fill:source.fill,stroke:source.stroke,strokeOn:false,strokeWidth:source.strokeWidth||2,visible:true,locked:false,clipToBelow:false,parent:null,folderId:folder.id,pivot:{x:0,y:0},keys:{'0':basePose()},repeat:normalizeRepeat(),effects:normalizeEffects(),outline:normalizeOutline()};
  doc.layers.splice(index+2+i,0,layer);
 }
 source.visible=false;setSingleSelection(folder.id);S.inspectorTab='layer';S.activeContour=0;mutated();toast(`${paths.length}文字をパス化しました。フォルダー内の文字を選んで「頂点」で編集できます。`);
}

function insertTextLayer(point){snapshot();const shape=normalizeTextShape({content:'テキスト',fontSize:72});const l=newLayer(shape,Math.round(point.x),Math.round(point.y),'テキスト',{worldCoordinates:true});setSingleSelection(l.id);S.inspectorTab='layer';mutated();toast('テキストを追加しました。右側の「文字・レイアウト」から入力できます。');}
function textInspector(layer){if(layer.shape?.type!=='text')return'';const s=normalizeTextShape(layer.shape),options=[['Yu Gothic, Meiryo, sans-serif','ゴシック（日本語）'],['Yu Mincho, Hiragino Mincho ProN, serif','明朝（日本語）'],['Noto Sans JP, sans-serif','Noto Sans JP'],['Noto Serif JP, serif','Noto Serif JP'],['Arial, sans-serif','Arial'],['Georgia, serif','Georgia'],['Impact, sans-serif','Impact']];
 const choice=(label,field,list)=>`<div class="prop-row"><label>${label}</label><select data-text-field="${field}">${list.map(([v,n])=>`<option value="${esc(v)}" ${s[field]===v?'selected':''}>${esc(n)}</option>`).join('')}</select></div>`;
 const slider=(label,field,min,max,step=1)=>`<div class="field-wrap"><label>${label} <output>${rnd(s[field],1)}</output></label><input type="range" min="${min}" max="${max}" step="${step}" data-text-field="${field}" value="${s[field]}"></div>`;
 return `<section class="prop-section text-editor"><div class="prop-heading"><strong>文字・レイアウト</strong><span class="prop-chip blue">TEXT</span></div>
 <div class="field-wrap"><label>テキストを入力</label><textarea rows="3" maxlength="320" data-text-field="content" style="width:100%;min-height:72px">${esc(s.content)}</textarea></div>
 ${choice('文字の向き','direction',[['horizontal','横書き'],['vertical','縦書き（右から左へ）']])}
 ${choice('配置の形','layout',[['linear','直線状'],['arc','アーチ状'],['circle','円周状']])}
 ${choice('文字の太さ','fontWeight',[['normal','標準'],['bold','太字']])}
 <div class="prop-row"><label>フォント</label><select data-text-field="fontFamily">${options.map(([v,n])=>`<option value="${esc(v)}" ${s.fontFamily===v?'selected':''}>${esc(n)}</option>`).join('')}${(doc.fonts||[]).map(f=>`<option value="${esc(f.family)}" ${s.fontFamily===f.family?'selected':''}>${esc(f.name)}（登録）</option>`).join('')}${options.some(([v])=>v===s.fontFamily)||(doc.fonts||[]).some(f=>f.family===s.fontFamily)?'':`<option selected value="${esc(s.fontFamily)}">カスタム</option>`}</select></div>
 <div class="prop-row"><label>フォント名の直接指定</label><input type="text" data-text-field="fontFamily" value="${esc(s.fontFamily)}" placeholder="例：Yu Gothic, sans-serif"></div>
 <div class="font-shelf-panel"><div class="font-shelf-header"><strong>手持ちのフォント</strong><span>${(doc.fonts||[]).length}件登録</span></div>
 <button class="soft-btn font-add-btn" type="button" data-action="importFonts">＋ フォントファイルを登録</button>
 ${(doc.fonts||[]).length?`<div class="font-file-list">${doc.fonts.map(f=>`<div class="font-file-item"><span title="${esc(f.name)}">${esc(f.name)}</span><button type="button" data-font-delete="${esc(f.id)}" title="登録から削除">削除</button></div>`).join('')}</div>`:''}
 <div class="prop-tip">TTF / OTF / WOFF / WOFF2 に対応。登録したフォントはFMS保存に含まれ、ブラウザの登録一覧でも再利用できます。</div></div>
 <div class="prop-grid">${slider('文字サイズ','fontSize',8,280)}${slider('字間','letterSpacing',-20,80)}${slider('行間倍率','lineHeight',.7,3,.05)}
 ${s.direction==='vertical'?`${slider('縦書き列間','columnGap',0,140)}${slider('折り返し高さ','maxHeight',80,1600)}`:''}
 ${s.layout!=='linear'?`${slider(s.layout==='circle'?'円の半径':'アーチの半径','arcRadius',15,800)}${s.layout==='arc'?slider('アーチ角度','arcSpan',10,350):''}${slider('角度・開始位置','arcAngle',-180,180)}`:''}
 </div>
 ${s.direction==='vertical'?`<label class="check-inline"><input type="checkbox" data-text-field="latinRotate" ${s.latinRotate?'checked':''}> 英数字を横向きに回転</label>`:''}
 <div class="prop-control-row"><button class="soft-btn primary wide" data-action="outlineText">文字をパス化（頂点編集）</button></div>
 <div class="prop-tip">パス化すると現在の見た目を文字ごとの輪郭パーツに変換します。変換後は「頂点」ツールで編集できます。元テキストは非表示で残します。輪郭抽出にはアンチエイリアス画像からの近似トレースを使います。</div>
 </section>`;
}
function applyTextField(el,live=false){const l=sel();if(l?.shape?.type!=='text'||effectiveLocked(l))return;const k=el.dataset.textField;if(!k)return;
 if(!el.dataset.textEditing){snapshot();el.dataset.textEditing='1';}
 let v=el.type==='checkbox'?el.checked:el.value;if(['fontSize','letterSpacing','lineHeight','columnGap','maxHeight','arcRadius','arcSpan','arcAngle'].includes(k))v=num(v);
 l.shape=normalizeTextShape({...l.shape,[k]:v});saveLocal();renderStage();
 if(live){if(el.type==='range'){const out=el.closest('.field-wrap')?.querySelector('output');if(out)out.textContent=String(rnd(v,1));}return;}
 renderAll();
}

function newLayer(shape,x,y,name,opts={}){const l={id:uid(),name:name||`パーツ ${doc.layers.length+1}`,shape,fill:opts.fill||S.color,stroke:opts.stroke||'#47332b',strokeOn:!!opts.strokeOn,strokeWidth:opts.strokeWidth||2,fillHidden:!!opts.fillHidden,lineStyle:normalizeOutline(opts.lineStyle||{color:opts.stroke||S.color}),visible:true,locked:false,clipToBelow:false,gradient:null,parent:opts.parent||null,folderId:opts.folderId!==undefined?opts.folderId:isFolder(sel())?sel().id:sel()?.folderId||null,pivot:{x:0,y:0},keys:{'0':{...basePose(),x,y}},repeat:normalizeRepeat(opts.repeat),effects:normalizeEffects(opts.effects),outline:normalizeOutline(opts.outline)};doc.layers.push(l);
 // Canvas drawing produces coordinates in world space.  A selected folder may
 // already be translated, rotated or scaled; convert positions to its space.
 if(opts.worldCoordinates){
  const parentMatrix=getParentWorld(l),parentInverse=matInv(parentMatrix);
  const scaleX=Math.hypot(parentMatrix[0],parentMatrix[1])||1;
  const scaleY=(parentMatrix[0]*parentMatrix[3]-parentMatrix[1]*parentMatrix[2])/scaleX||1;
  const parentAngle=Math.atan2(parentMatrix[1],parentMatrix[0])*180/Math.PI;
  for(const pose of Object.values(l.keys)){
   const original=matApply(parentInverse,{x:pose.x,y:pose.y});
   pose.x=rnd(original.x,3);pose.y=rnd(original.y,3);
   // A newly drawn rectangle/ellipse must keep its on-screen orientation,
   // even if the selected parent folder is already rotated/scaled.
   pose.r=rnd(num(pose.r)-parentAngle,4);
   pose.sx=rnd(num(pose.sx,1)/scaleX,5);
   pose.sy=rnd(num(pose.sy,1)/scaleY,5);
  }
 }
 setSingleSelection(l.id);return l;}
function selectLayer(id,needRender=true){const target=layerBy(id);setSingleSelection(lockedFolderAncestor(target)?.id||id);S.pen=[];S.nodeIndex=0;S.vertexSelected=false;S.nodeSelected.clear();S.simplifySession=null;if(needRender)renderAll();}
function writePose(l,changes,{alreadySnapshotted=false}={}){if(!canTranslate(l)||(effectiveLocked(l)&&Object.keys(changes).some(k=>k!=='x'&&k!=='y')))return;if(!alreadySnapshotted)snapshot();let frame=S.frame;let k;
 if(S.autoKey||Object.hasOwn(l.keys,String(frame))||frame===0){k=frame;}else{k=Object.keys(l.keys).map(Number).filter(f=>f<=frame).sort((a,b)=>b-a)[0]||0;}
 if(!Object.hasOwn(l.keys,String(k)))l.keys[k]=getPose(l,frame);
 const pose=l.keys[k];Object.entries(changes).forEach(([key,v])=>{pose[key]=key==='opacity'?clamp(v,0,1):key==='sx'||key==='sy'?clamp(v,-20,20):v;});
 mutated({full:false});}
function descendantsOf(parentId){const ids=new Set([parentId]);let changed=true;while(changed){changed=false;doc.layers.forEach(l=>{if(l.parent&&ids.has(l.parent)&&!ids.has(l.id)){ids.add(l.id);changed=true;}});}return ids;}
function descendantOf(candidateId,rootId){return descendantsOf(rootId).has(candidateId);}
function changeParent(l,newId){if(!l||effectiveLocked(l)||newId===l.id||newId&&descendantOf(newId,l.id))return;const oldPos=matApply(getWorld(l),{x:0,y:0});const priorPose=getPose(l);snapshot();l.parent=newId||null;const desired=matApply(matInv(getParentWorld(l)),oldPos);const dx=desired.x-priorPose.x,dy=desired.y-priorPose.y;Object.values(l.keys).forEach(k=>{k.x+=dx;k.y+=dy;});mutated();}
function applyPreset(name){const l=sel();if(!l||l.locked)return;const start=S.frame,max=total()-1,fps=doc.fps;
 let steps=[];if(name==='breathe'){steps=[[0,{sy:1,y:getPose(l).y}],[.5,{sy:1.055,y:getPose(l).y-3}],[1,{sy:1,y:getPose(l).y}]];}
 if(name==='wave'){steps=[[0,{r:getPose(l).r}],[.25,{r:getPose(l).r+18}],[.5,{r:getPose(l).r-18}],[.75,{r:getPose(l).r+12}],[1,{r:getPose(l).r}]];}
 if(name==='float'){steps=[[0,{y:getPose(l).y}],[.5,{y:getPose(l).y-20}],[1,{y:getPose(l).y}]];}
 if(name==='blink'){steps=[[0,{sy:getPose(l).sy}],[.38,{sy:getPose(l).sy}],[.42,{sy:.09}],[.47,{sy:getPose(l).sy}],[1,{sy:getPose(l).sy}]];}
 const duration=name==='blink'?Math.min(Math.round(fps*2),max-start):Math.min(Math.round(fps*2),max-start);if(duration<2){toast('タイムラインの最後です。開始フレームを前に移動してください。');return;}
 snapshot();const original=getPose(l,start);steps.forEach(([t,p])=>{const f=clamp(start+Math.round(t*duration),0,max);l.keys[f]={...original,...p,ease:name==='blink'?'linear':'ease'};});mutated();toast('モーションをキーフレームに追加しました。');}
function changeDuration(field,val){snapshot();if(field==='width'||field==='height')doc[field]=clamp(Math.round(num(val,doc[field])),64,field==='width'?3840:2160);
 if(field==='fps')doc.fps=clamp(Math.round(num(val,doc.fps)),1,30);
 if(field==='seconds')doc.seconds=clamp(Math.round(num(val,doc.seconds)),1,20);
 if(field==='background'){doc.background=val;}
 if(field==='transparent')doc.transparent=!!val;
 S.frame=clamp(S.frame,0,total()-1);mutated();if(field==='width'||field==='height')fitCanvas();}
function addKey(){const l=sel();if(!l||l.locked)return;snapshot();l.keys[S.frame]={...getPose(l),ease:'ease'};
 if(l.shape?.type==='path'&&l.morphKeys)l.morphKeys[S.frame]={points:getMorphPoints(l),ease:'ease'};
 if(l.mesh)l.mesh.keys[S.frame]={points:getMeshPoints(l),ease:'ease'};
 mutated();}
function removeKey(){const l=sel();if(!l||l.locked)return;if(S.frame===0){toast('最初のキーフレームは削除できません。');return;}snapshot();delete l.keys[S.frame];if(l.morphKeys)delete l.morphKeys[S.frame];if(l.mesh)delete l.mesh.keys[S.frame];mutated();}
function toggleClip(l,checked){if(!l)return;if(effectiveLocked(l)){toast('ロックされたレイヤーは編集できません。');return;}
 if(checked&&!clipBaseFor(l)){toast('クリッピングするには、下に下地となるレイヤーが必要です。');return;}
 if(!!l.clipToBelow===!!checked)return;snapshot();l.clipToBelow=!!checked;mutated();toast(l.clipToBelow?'下のレイヤーにクリッピングしました。':'クリッピングを解除しました。');}
function reorder(direction){const l=sel();if(!l||effectiveLocked(l))return;const siblings=doc.layers.filter(x=>(x.folderId||null)===(l.folderId||null));const idx=siblings.indexOf(l),other=siblings[idx+direction];if(!other||effectiveLocked(other))return;
 snapshot();const a=doc.layers.indexOf(l),b=doc.layers.indexOf(other);[doc.layers[a],doc.layers[b]]=[doc.layers[b],doc.layers[a]];mutated();}
function duplicate(){const l=sel();if(!l||effectiveLocked(l)){toast('複製するにはロックを解除してください。');return;}snapshot();if(isFolder(l)){groupDuplicate(l);mutated();return;}
 const copy=JSON.parse(JSON.stringify(l));copy.id=uid();copy.name+=' のコピー';Object.values(copy.keys).forEach(k=>{k.x+=18;k.y+=18;});doc.layers.splice(doc.layers.indexOf(l)+1,0,copy);setSingleSelection(copy.id);mutated();}
// Clear the artwork without removing its layer, name, animation keys or folder membership.
// Raster layers keep their exact pixel dimensions. Other leaf layers become an empty
// drawable raster only after the user explicitly accepts that type conversion.
function clearLayerContents(){
 const layer=sel();
 if(!layer){toast('描画内容を消すレイヤーを選択してください。');return;}
 if(effectiveLocked(layer)){toast('描画内容を消すにはレイヤーのロックを解除してください。');return;}
 if(isFolder(layer)){toast('フォルダーではなく、描画内容を消すレイヤーを選択してください。');return;}
 const wasRaster=layer.shape?.type==='image'&&!!layer.shape.raster;
 const prompt=wasRaster?
  `「${layer.name}」の描画内容をすべて消去しますか？\nレイヤーと名前・アニメーション設定は残ります。\nCtrl+Z で取り消せます。`:
  `「${layer.name}」の描画内容をすべて消去しますか？\nこのレイヤーは透明なラスターレイヤーに変換され、元のベクター・画像の内容は失われます。\nCtrl+Z で取り消せます。`;
 if(!confirm(prompt))return;
 snapshot();
 const width=wasRaster?layer.shape.w:doc.width;
 const height=wasRaster?layer.shape.h:doc.height;
 const blank=document.createElement('canvas');blank.width=Math.max(1,Math.round(num(width,doc.width)));blank.height=Math.max(1,Math.round(num(height,doc.height)));
 const png=blank.toDataURL('image/png');
 if(wasRaster){layer.shape.data=png;}
 else{
  layer.shape={type:'image',raster:true,w:blank.width,h:blank.height,data:png};
  delete layer.morphKeys;delete layer.mesh;delete layer.gradient;
  layer.strokeOn=false;layer.fillHidden=false;
  layer.outline=normalizeOutline();layer.effects=normalizeEffects();
  layer.repeat=normalizeRepeat();
  S.tool='raster';S.inspectorTab='tool';
 }
 mutated();toast('「'+layer.name+'」の描画内容をクリアしました。レイヤーは残っています。');
}
function deleteSelected(){
 const layer=sel();
 if(!layer){toast('削除するレイヤーを選択してください。');return;}
 if(effectiveLocked(layer)){toast('削除するにはロックを解除してください。');return;}
 const descendants=isFolder(layer)?doc.layers.filter(child=>memberOfFolder(child,layer.id)):[];
 const toRemove=new Set([layer.id,...descendants.map(child=>child.id)]);
 if(descendants.some(child=>effectiveLocked(child))){toast('フォルダー内のレイヤーのロックを解除してください。');return;}
 if(isFolder(layer)&&!confirm(`「${layer.name}」と中の${descendants.length}個のレイヤーを削除しますか？\nフォルダーだけを解除する場合は「統合解除」を使用してください。\nCtrl+Z で取り消せます。`))return;
 snapshot();
 // Preserve rig-linked layers not being removed, as the previous delete action did.
 const parent=layer.parent;
 for(const other of doc.layers){if(toRemove.has(other.id))continue;if(toRemove.has(other.parent))other.parent=parent&&!toRemove.has(parent)?parent:null;}
 doc.layers=doc.layers.filter(item=>!toRemove.has(item.id));
 for(const id of toRemove)S.collapsedFolders.delete(id);
 if(toRemove.has(S.cropTargetId))S.cropTargetId='';
 if(toRemove.has(S.cropSourceId))S.cropSourceId='';
 setSingleSelection(null);mutated();toast('選択したレイヤーを削除しました。');
}
function undo(){if(!S.history.length)return;S.future.push(compactHistoryState());doc=restoreHistoryState(S.history.pop());S.multiSelected=new Set([...S.multiSelected].filter(id=>!!layerBy(id)));S.selected=layerBy(S.selected)?.id||[...S.multiSelected].at(-1)||null;S.frame=clamp(S.frame,0,total()-1);void prepareProjectAudio();void prepareSubviewReferences();void prepareProjectFonts();mutated();fitCanvas();}
function redo(){if(!S.future.length)return;S.history.push(compactHistoryState());doc=restoreHistoryState(S.future.pop());S.multiSelected=new Set([...S.multiSelected].filter(id=>!!layerBy(id)));S.selected=layerBy(S.selected)?.id||[...S.multiSelected].at(-1)||null;S.frame=clamp(S.frame,0,total()-1);void prepareProjectAudio();void prepareSubviewReferences();void prepareProjectFonts();mutated();fitCanvas();}
function makeDemo(){if(doc.layers.length&&!confirm('現在のパーツをサンプルに置き換えますか？'))return;snapshot();doc.layers=[];doc.width=960;doc.height=540;doc.fps=12;doc.seconds=6;doc.transparent=false;doc.background='#fff8ee';S.frame=0;
 const add=(name,shape,x,y,fill,parent=null)=>newLayer(shape,x,y,name,{fill,parent});
 const rect=(x,y,w,h,rx=0)=>({type:'rect',x,y,w,h,rx});const oval=(rx,ry,cx=0,cy=0)=>({type:'ellipse',rx,ry,cx,cy});
 const polygon=(pts,smooth=false)=>({type:'path',points:pts.map(([x,y])=>({x,y})),closed:true,smooth});
 const torso=add('胴体 / Body',rect(-59,-60,118,158,37),480,276,'#78948c');
 const leftLeg=add('左脚 / Leg L',rect(-20,0,40,130,15),-27,86,'#71605e',torso.id);
 const rightLeg=add('右脚 / Leg R',rect(-20,0,40,130,15),29,86,'#71605e',torso.id);
 const lShoe=add('左の靴',rect(-22,113,48,24,11),0,0,'#4c4143',leftLeg.id);
 const rShoe=add('右の靴',rect(-22,113,48,24,11),0,0,'#4c4143',rightLeg.id);
 const armL=add('左上腕 / Upper arm L',rect(-16,0,32,103,16),-64,-38,'#ddac92',torso.id);
 const armR=add('右上腕 / Upper arm R',rect(-16,0,32,103,16),64,-38,'#ddac92',torso.id);
 armL.keys[0].r=20;armR.keys[0].r=-20;
 const handL=add('左手 / Hand L',oval(17,21,0,8),0,91,'#e9bba2',armL.id);
 const handR=add('右手 / Hand R',oval(17,21,0,8),0,91,'#e9bba2',armR.id);
 const shirt=add('服 / Shirt',rect(-60,-60,120,159,38),0,0,'#78948c',torso.id);
 const neck=add('首 / Neck',rect(-17,-82,34,40,12),0,0,'#dda88b',torso.id);
 const head=add('頭 / Head',oval(56,64),0,-135,'#efc7a9',torso.id);
 const hair=add('前髪 / Hair',polygon([[-57,-15],[-53,-46],[-32,-65],[0,-71],[35,-58],[54,-34],[57,-10],[32,-31],[20,-17],[6,-33],[-10,-14],[-25,-31],[-46,-10]],true),0,0,'#5f4a45',head.id);
 const eyeL=add('左目 / Eye L',oval(4.8,6),-21,7,'#55433d',head.id);
 const eyeR=add('右目 / Eye R',oval(4.8,6),21,7,'#55433d',head.id);
 const mouth=add('口 / Mouth',polygon([[-10,30],[0,35],[10,30],[0,37]],true),0,0,'#b87970',head.id);
 const mouthShape=mouth.shape;mouthShape.points=[{x:-10,y:30},{x:0,y:35},{x:10,y:30}];mouthShape.closed=false;mouth.strokeOn=true;mouth.stroke='#b87970';mouth.strokeWidth=2.5;
 torso.keys[18]={...torso.keys[0],y:270,ease:'ease'};torso.keys[36]={...torso.keys[0],y:276,ease:'ease'};torso.keys[54]={...torso.keys[0],y:271,ease:'ease'};torso.keys[71]={...torso.keys[0],y:276};
 armR.keys[9]={...armR.keys[0],r:-115};armR.keys[18]={...armR.keys[0],r:-98};armR.keys[25]={...armR.keys[0],r:-120};armR.keys[32]={...armR.keys[0],r:-98};armR.keys[43]={...armR.keys[0],r:-20};
 head.keys[18]={...head.keys[0],r:5};head.keys[36]={...head.keys[0],r:-5};head.keys[60]={...head.keys[0],r:0};
 for(const eye of [eyeL,eyeR]){eye.keys[27]={...eye.keys[0]};eye.keys[29]={...eye.keys[0],sy:.08,ease:'linear'};eye.keys[31]={...eye.keys[0]};}
 initMesh(hair,2);const baseHair=meshRest(hair.mesh);hair.mesh.keys[18]={points:baseHair.map((p,i)=>({x:p.x+(i%3===2?11:0),y:p.y})),ease:'ease'};hair.mesh.keys[36]={points:copyPts(baseHair),ease:'ease'};hair.mesh.keys[54]={points:baseHair.map((p,i)=>({x:p.x+(i%3===0?-9:0),y:p.y})),ease:'ease'};hair.mesh.keys[71]={points:copyPts(baseHair),ease:'ease'};setSingleSelection(armR.id);S.tool='select';mutated();fitCanvas();toast('パーツの親子関係と動きが入ったサンプルを作成しました。▶で再生できます。');}
function ptFromEvent(e){
 // getBoundingClientRect() is axis-aligned even if the view is rotated.
 // Use the inverse SVG screen matrix to keep Bézier points, handles and layers accurate.
 const ctm=ART.getScreenCTM();if(ctm){const p=ART.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const local=p.matrixTransform(ctm.inverse());return{x:local.x,y:local.y};}
 const r=ART.getBoundingClientRect();return{x:(e.clientX-r.left)*doc.width/r.width,y:(e.clientY-r.top)*doc.height/r.height};
}
function beginViewGesture(e){
 if(e.button!==0&&e.button!==1)return;
 const mode=e.button===1?'move':S.viewMode;
 S.drag={type:'view',mode, pointerId:e.pointerId,sx:e.clientX,sy:e.clientY, panX:S.viewX,panY:S.viewY,rotation:S.viewRotation,zoom:S.zoom};
 e.currentTarget.setPointerCapture(e.pointerId);
 $('#stageViewport').classList.add('view-dragging');
 e.preventDefault();e.stopPropagation();
}
function moveViewGesture(e){
 const d=S.drag;if(!d||d.type!=='view'||d.pointerId!==e.pointerId)return;
 const dx=e.clientX-d.sx,dy=e.clientY-d.sy;
 if(d.mode==='move'){S.viewX=d.panX+dx;S.viewY=d.panY+dy;}
 else if(d.mode==='rotate'){const angle=d.rotation+dx*.45;S.viewRotation=e.shiftKey?Math.round(angle/15)*15:rnd(angle,2);}
 else if(d.mode==='scale'){S.zoom=clamp(d.zoom*Math.exp(-dy*.009),.12,12);}
 applyZoom();
 e.preventDefault();
}
function endViewGesture(e){
 const d=S.drag;if(!d||d.type!=='view'||d.pointerId!==e.pointerId)return;
 S.drag=null;const vp=$('#stageViewport');vp.classList.remove('view-dragging');if(vp.hasPointerCapture(e.pointerId))vp.releasePointerCapture(e.pointerId);
 e.preventDefault();
}

function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function curveHandles(points,i,closed){const n=points.length,p=points[i],prior=points[(i-1+n)%n],next=points[(i+1)%n];if(n<2)return {inX:0,inY:0,outX:0,outY:0};if(!closed&&i===0)return {inX:0,inY:0,outX:rnd((next.x-p.x)/3,3),outY:rnd((next.y-p.y)/3,3)};if(!closed&&i===n-1)return {inX:rnd((prior.x-p.x)/3,3),inY:rnd((prior.y-p.y)/3,3),outX:0,outY:0};const dx=(next.x-prior.x)/6,dy=(next.y-prior.y)/6;return{inX:rnd(-dx,3),inY:rnd(-dy,3),outX:rnd(dx,3),outY:rnd(dy,3)};}
function smoothHandlePoints(points,closed){return points.map((p,i)=>({...p,...curveHandles(points,i,closed),nodeType:'smooth'}));}
function changePathMode(mode){const l=sel();if(!l||l.locked||l.shape.type!=='path')return;const sh=l.shape;const previous=sh.pathMode||(sh.smooth?'auto':'line');if(previous===mode)return;snapshot();if(mode==='bezier'&&previous!=='bezier'){sh.points=smoothHandlePoints(sh.points,sh.closed);S.nodeIndex=0;}sh.pathMode=mode;sh.smooth=mode==='auto';mutated();}
function changePointType(smooth){
 const l=sel();
 if(!l||effectiveLocked(l)||l.shape.type!=='path'||S.tool!=='node'||!S.vertexSelected){toast('頂点ツールで変更する点を選択してください。');return;}
 const sh=l.shape,contour=S.activeContour>0&&sh.extraContours?.[S.activeContour-1]?sh.extraContours[S.activeContour-1]:sh.points;
 const i=clamp(S.nodeIndex,0,contour.length-1);
 if(!contour[i])return;
 snapshot();
 // Point types are independent of the original path-wide stroke mode.
 // Convert the path to editable Bezier handles only once, without changing tools.
 if(sh.pathMode!=='bezier'){
   const wasAuto=sh.pathMode==='auto'||(!sh.pathMode&&sh.smooth);
   const prepare=(pts,closed)=>pts.map((p,j)=>{
     const result=wasAuto?curveHandles(pts,j,closed):{
       inX:(!closed&&j===0)?0:(pts[(j-1+pts.length)%pts.length].x-p.x)/3,
       inY:(!closed&&j===0)?0:(pts[(j-1+pts.length)%pts.length].y-p.y)/3,
       outX:(!closed&&j===pts.length-1)?0:(pts[(j+1)%pts.length].x-p.x)/3,
       outY:(!closed&&j===pts.length-1)?0:(pts[(j+1)%pts.length].y-p.y)/3
     };
     return {...p,...result,nodeType:wasAuto?'smooth':'corner'};
   });
   sh.points=prepare(sh.points,sh.closed);
   if(sh.extraContours)sh.extraContours=sh.extraContours.map(pts=>prepare(pts,true));
   sh.pathMode='bezier';sh.smooth=false;
 }
 const points=S.activeContour>0?sh.extraContours[S.activeContour-1]:sh.points;
 const p=points[i];
 if(smooth){
   Object.assign(p,curveHandles(points,i,S.activeContour>0?true:sh.closed),{nodeType:'smooth'});
 }else{
   const n=points.length,closed=S.activeContour>0?true:sh.closed;
   const prev=points[(i-1+n)%n],next=points[(i+1)%n];
   Object.assign(p,{
     inX:!closed&&i===0?0:rnd((prev.x-p.x)/3,3),
     inY:!closed&&i===0?0:rnd((prev.y-p.y)/3,3),
     outX:!closed&&i===n-1?0:rnd((next.x-p.x)/3,3),
     outY:!closed&&i===n-1?0:rnd((next.y-p.y)/3,3),
     nodeType:'corner'
   });
 }
 S.nodeIndex=i;S.vertexSelected=true;
 S.nodeSelected.clear();S.nodeSelected.add(i);
 S.tool='node';
 mutated();
 // mutated() refreshes the inspector; do not call setTool('node') here.
}

function simplifyIndices(points,target,closed){const n=points.length,alive=Array.from({length:n},(_,i)=>i),minimum=closed?3:2;target=clamp(Math.round(target),minimum,n);if(target>=n)return alive;const segDist=(a,p,b)=>{const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy,t=den?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/den,0,1):0;return Math.hypot(p.x-(a.x+t*dx),p.y-(a.y+t*dy));};while(alive.length>target){let best=Infinity,at=-1;for(let k=0;k<alive.length;k++){if(k===0||!closed&&k===alive.length-1)continue;const prior=points[alive[(k-1+alive.length)%alive.length]],current=points[alive[k]],next=points[alive[(k+1)%alive.length]];let error=segDist(prior,current,next);if(error<best){best=error;at=k;}}if(at<0)break;alive.splice(at,1);}return alive;}
function simplifyPointsLive(value){const l=sel();if(!l||l.locked||l.shape.type!=='path')return;let session=S.simplifySession;if(!session||session.id!==l.id){session={id:l.id,shape:structuredClone(l.shape),morphKeys:l.morphKeys?structuredClone(l.morphKeys):null};S.simplifySession=session;snapshot();}const source=S.activeContour>0&&session.shape.extraContours?.[S.activeContour-1]?session.shape.extraContours[S.activeContour-1]:session.shape.points;const indices=simplifyIndices(source,value,session.shape.closed);l.shape=structuredClone(session.shape);if(S.activeContour>0){l.shape.extraContours[S.activeContour-1]=indices.map(i=>({...source[i]}));}else{l.shape.points=indices.map(i=>({...source[i]}));if(l.shape.pathMode==='bezier')l.shape.points=smoothHandlePoints(l.shape.points,l.shape.closed);if(session.morphKeys){l.morphKeys=structuredClone(session.morphKeys);for(const [frame,k] of Object.entries(l.morphKeys))k.points=indices.map(i=>({...session.morphKeys[frame].points[i]}));}}S.nodeIndex=clamp(S.nodeIndex,0,indices.length-1);const label=$('#pointCountLabel');if(label)label.textContent=indices.length+' / '+source.length+' 点';renderStage();}
function endSimplifyPoints(){if(!S.simplifySession)return;S.simplifySession=null;mutated();}

function simplifyFreehandToLimit(input,maxCount){
 const wanted=clamp(Math.round(num(maxCount,250)),10,800);
 const clean=[];
 for(const pt of input||[]){if(!Number.isFinite(pt?.x)||!Number.isFinite(pt?.y))continue;if(!clean.length||dist(clean.at(-1),pt)>.35)clean.push(pt);}
 if(clean.length<=wanted)return clean;
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 clean.forEach(p=>{minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);});
 let lo=0,hi=Math.max(1,Math.hypot(maxX-minX,maxY-minY));let best=[clean[0],clean.at(-1)];
 for(let i=0;i<15;i++){
  const mid=(lo+hi)/2,candidate=rdp(clean,mid);
  if(candidate.length>wanted)lo=mid;else{hi=mid;best=candidate;}
 }
 if(best.length<=wanted&&best.length>=2)return best;
 const out=[];
 for(let i=0;i<wanted;i++)out.push(clean[Math.round(i*(clean.length-1)/(wanted-1))]);
 return out;
}
function smoothFreehandStroke(points,closed,amount){
 const strength=clamp(num(amount,55)/100,0,1);
 if(strength<=0||points.length<3)return points.map(p=>({...p}));
 let work=points.map(p=>({...p}));
 const iterations=Math.max(1,Math.ceil(strength*4));
 const f=.35*strength;
 for(let step=0;step<iterations;step++){
  work=work.map((p,i)=>{
   if(!closed&&(i===0||i===work.length-1))return {...p};
   const before=work[(i-1+work.length)%work.length],after=work[(i+1)%work.length];
   return {...p,x:p.x*(1-f)+(before.x+after.x)*(f/2),y:p.y*(1-f)+(before.y+after.y)*(f/2)};
  });
 }
 return work;
}
function processedFreehandStroke(raw,mode=S.brushMode){
 const closed=mode!=='line';let pts=simplifyFreehandToLimit(raw,S.brushMaxPoints);
 if(closed&&pts.length>3&&dist(pts[0],pts.at(-1))<2.5)pts=pts.slice(0,-1);
 return S.brushAutoSmooth?smoothFreehandStroke(pts,closed,S.brushSmoothStrength):pts;
}

function rdp(points,epsilon){if(points.length<3)return points;const a=points[0],b=points.at(-1);let max=0,idx=0;for(let i=1;i<points.length-1;i++){const p=points[i],dx=b.x-a.x,dy=b.y-a.y,t=dx*dx+dy*dy?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy),0,1):0;const d=Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);if(d>max){max=d;idx=i;}}
 if(max>epsilon){const left=rdp(points.slice(0,idx+1),epsilon),right=rdp(points.slice(idx),epsilon);return left.slice(0,-1).concat(right);}return[a,b];}
function pointsToLayer(points,{closed=true,smooth=true,name='フリーハンド',lineArt=false,keepToolTab=false}={}){if(points.length< (closed?3:2))return;const xs=points.map(p=>p.x),ys=points.map(p=>p.y);let cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;let pts=points.map(p=>({x:rnd(p.x-cx,2),y:rnd(p.y-cy,2)}));snapshot();const layer=newLayer({type:'path',points:pts,closed:lineArt?false:closed,smooth,pathMode:smooth?'auto':'line',lineArt},rnd(cx),rnd(cy),name,{stroke:S.color,fillHidden:lineArt,lineStyle:{style:'solid',width:4,color:S.color,dotSize:4,dotGap:8,dashLength:12,dashGap:7},worldCoordinates:true});if(!closed&&!lineArt){layer.strokeOn=true;layer.stroke=S.color;layer.strokeWidth=3;}S.nodeIndex=0;if(lineArt&&!keepToolTab)S.inspectorTab='layer';mutated();}
function finishPen(closed=true){const lineArt=S.tool==='strokePen';if(lineArt)closed=false;const ps=S.pen.slice(),min=closed?3:2;if(ps.length<min){toast(closed?'塗りつぶすには3点以上が必要です。':'開いた線を描くには2点以上が必要です。');return;}S.pen=[];S.cursor=null;pointsToLayer(ps,{closed,smooth:lineArt,name:lineArt?'ベジェ（線画）':closed?'ベジェパス':'開いたパス',lineArt});$('#stageStatus').textContent=lineArt?'線画パスを作成しました。レイヤーの「線画オプション」で線種を変更できます。':'パスを作成しました。右側の「線の種類」からベジェ曲線に切り替えられます。';}
function beginPoseDrag(e,kind,l,p,cornerIndex=2){
 const original=getPose(l);let drag={type:kind,id:l.id,start:p,original,changed:false};
 if(kind==='move')drag.parentInv=matInv(getParentWorld(l));
 if(kind==='scale'){
  // Use the SAME local bounding box as the visible selection handles.
  // Procedural circular/rectangular/linear repeats occupy a larger area than
  // the source object. Using getBBox() here makes the first pointer move
  // recompute scale from the original, smaller geometry and snaps the object.
  const box=repeatBBox(l),xy=[{x:box.x,y:box.y},{x:box.x+box.w,y:box.y},{x:box.x+box.w,y:box.y+box.h},{x:box.x,y:box.y+box.h}];
  const i=((cornerIndex%4)+4)%4,anchor=xy[(i+2)%4],active=xy[i];
  drag.corner=i;drag.anchorLocal=anchor;drag.deltaLocal={x:active.x-anchor.x,y:active.y-anchor.y};
  drag.parentInv=matInv(getParentWorld(l));
  drag.anchorParent=matApply(drag.parentInv,matApply(getWorld(l),anchor));
  drag.pivot=l.pivot||{x:0,y:0};
 }
 if(kind==='rotate'){const v=matApply(getWorld(l),l.pivot);drag.pivotWorld=v;drag.startAngle=Math.atan2(p.y-v.y,p.x-v.x)*180/Math.PI;}
 S.drag=drag;ART.setPointerCapture(e.pointerId);
}
function editPoseDuringDrag(d,change){const l=layerBy(d.id);if(!canTranslate(l)||(effectiveLocked(l)&&Object.keys(change).some(k=>k!=='x'&&k!=='y')))return;if(!d.changed){snapshot();d.changed=true;d.key=S.autoKey||Object.hasOwn(l.keys,String(S.frame))||S.frame===0?S.frame:(Object.keys(l.keys).map(Number).filter(f=>f<=S.frame).sort((a,b)=>b-a)[0]||0);if(!Object.hasOwn(l.keys,String(d.key)))l.keys[d.key]={...d.original};}
 Object.assign(l.keys[d.key],change);renderStage();}
function nearestEditableVertex(layer,worldPoint,fallbackIndex){
 if(!layer||layer.shape?.type!=='path')return fallbackIndex;
 const pts=S.activeContour>0&&layer.shape.extraContours?.[S.activeContour-1]?
  layer.shape.extraContours[S.activeContour-1]:getMorphPoints(layer);
 if(!pts?.length)return fallbackIndex;
 const world=getWorld(layer);let best=Infinity,closest=fallbackIndex;
 for(let i=0;i<pts.length;i++){
  const q=matApply(world,pts[i]);const delta=Math.hypot(worldPoint.x-q.x,worldPoint.y-q.y);
  if(delta<best-1e-6){best=delta;closest=i;}
 }
 const hitRadius=Math.max(4.5,S.nodeHandleSize+2);
 return best<=hitRadius+2?closest:fallbackIndex;
}
function pointerDown(e){if(e.button!==0&&e.button!==1)return;if(S.playing)stopPlayback();const p=ptFromEvent(e),hit=e.target.closest?.('[data-layer-id]'),handle=e.target.closest?.('[data-handle]');
 if(S.tool==='raster'){rasterStart(e,p);return;}
 if(S.tool==='text'){if(hit){selectLayer(hit.dataset.layerId);}else insertTextLayer(p);return;}
 if(S.tool==='gradient'){
  let layer=hit?layerBy(hit.dataset.layerId):null;
  if(!isGradientTarget(layer)){const selected=sel();if(isGradientTarget(selected)){const q=matApply(matInv(getWorld(selected)),p),b=getBBox(selected);if(q.x>=b.x&&q.x<=b.x+b.w&&q.y>=b.y&&q.y<=b.y+b.h)layer=selected;}}
  if(!isGradientTarget(layer)||effectiveLocked(layer)){if(!layer)toast('グラデーションをかけるオブジェクトをクリックしてください。');return;}
  if(layer.id!==S.selected){setSingleSelection(layer.id);renderLayers();renderInspector();}
  S.drag={type:'gradient',id:layer.id,start:p,localStart:matApply(matInv(getWorld(layer)),p),changed:false,preview:null};ART.setPointerCapture(e.pointerId);return;
 }
 if(S.tool==='crop'){if(S.cropMode==='range'&&S.cropSelectionMode==='rect'){S.drag={type:'cropSelect',start:p};S.cropSelection={rect:cropSelectionRect(p,p)};ART.setPointerCapture(e.pointerId);renderStage();}return;}
 if(handle&&S.selected){let l=sel();if(!l||effectiveLocked(l))return;let type=handle.dataset.handle;if(type==='rotate'&&S.tool==='select')beginPoseDrag(e,'rotate',l,p);else if(type==='scale'&&S.tool==='select')beginPoseDrag(e,'scale',l,p,Number(handle.dataset.corner||0));else if(type==='pivot'&&S.tool==='pivot'){snapshot();S.drag={type:'pivot',id:l.id};ART.setPointerCapture(e.pointerId);}else if(type==='node'&&S.tool==='node'&&l.shape.type==='path'){
 const clicked=+handle.dataset.point;
 if(S.nodeMode==='delete'){deleteNode(clicked);S.nodeSelected.clear();S.vertexSelected=false;return;}
 S.nodeIndex=clicked;S.vertexSelected=true;
 if(e.shiftKey){if(S.nodeSelected.has(clicked))S.nodeSelected.delete(clicked);else if(S.nodeSelected.size<2)S.nodeSelected.add(clicked);else{S.nodeSelected.clear();S.nodeSelected.add(clicked);}renderStage();renderInspector();return;}
 if(S.nodeMode==='add'){S.nodeSelected.clear();S.nodeSelected.add(clicked);renderStage();renderInspector();return;}
 S.nodeSelected.clear();S.nodeSelected.add(clicked);
 S.drag=S.frame===0||S.activeContour>0?{type:'node',id:l.id,index:S.nodeIndex,contour:S.activeContour,original:copyPts(S.activeContour>0?l.shape.extraContours[S.activeContour-1]:l.shape.points),changed:false}:{type:'morph',id:l.id,index:S.nodeIndex,initial:getMorphPoints(l),changed:false};ART.setPointerCapture(e.pointerId);renderStage();renderInspector();}else if(type.startsWith('bezier-')&&S.tool==='node'&&l.shape.type==='path'){S.nodeIndex=+handle.dataset.point;S.vertexSelected=true;S.drag={type:'bezier',id:l.id,index:S.nodeIndex,side:type.slice(7),changed:false};ART.setPointerCapture(e.pointerId);renderInspector();}else if(type==='morph'&&S.tool==='morph'&&l.shape.type==='path'){S.drag={type:'morph',id:l.id,index:+handle.dataset.point,initial:getMorphPoints(l),changed:false};ART.setPointerCapture(e.pointerId);}else if(type==='mesh'&&S.tool==='mesh'&&l.mesh){S.drag={type:'mesh',id:l.id,index:+handle.dataset.point,initial:getMeshPoints(l),changed:false};ART.setPointerCapture(e.pointerId);}return;}
 if(S.tool==='select'){if(hit){const hitLayer=canvasMergeTarget(layerBy(hit.dataset.layerId));const l=isSelectableChildOfFolder(hitLayer,sel())&&!(sel()?.mergeGroup&&!S.collapsedFolders.has(sel().id))?sel():hitLayer;if(l&&canTranslate(l)){const multi=checkedLayers();if(multi.length>1&&(S.multiSelected.has(l.id)||hasSelectedFolderAncestor(l,S.multiSelected))){beginMultiMove(e,p);renderStage();return;}if(S.selected!==l.id||multi.length>1){setSingleSelection(l.id);renderLayers();renderInspector();}beginPoseDrag(e,'move',l,p);renderStage();return;}}selectLayer(null);return;}
 if(S.tool==='pivot'){if(hit&&canvasMergeTarget(layerBy(hit.dataset.layerId))?.id!==S.selected){selectLayer(canvasMergeTarget(layerBy(hit.dataset.layerId))?.id);return;}const l=sel();if(l&&!l.locked){snapshot();const local=matApply(matInv(getWorld(l)),p);l.pivot={x:rnd(local.x,2),y:rnd(local.y,2)};mutated({full:false});renderInspector();S.drag={type:'pivot',id:l.id};ART.setPointerCapture(e.pointerId);}return;}
 if(S.tool==='node'||S.tool==='mesh'){if(hit&&canvasMergeTarget(layerBy(hit.dataset.layerId))?.id!==S.selected)selectLayer(canvasMergeTarget(layerBy(hit.dataset.layerId))?.id);else if(S.tool==='node'&&!hit&&S.vertexSelected){S.vertexSelected=false;S.nodeSelected.clear();renderStage();renderInspector();}return;}
 if(S.tool==='pen'||S.tool==='strokePen'){if(S.tool==='pen'&&S.pen.length>=3&&dist(S.pen[0],p)<Math.max(9,12/(S.zoom*S.fitScale))){finishPen(true);return;}if(e.detail>=2){if(S.pen.length>=2)finishPen(S.tool==='pen'&&S.pen.length>=3);return;}if(!S.pen.length||dist(S.pen.at(-1),p)>Math.max(1.8,3/(S.zoom*S.fitScale)))S.pen.push({x:rnd(p.x,2),y:rnd(p.y,2)});S.cursor=p;renderStage();return;}
 if(S.tool==='line'){S.drag={type:'line',start:p,shift:e.shiftKey};S.cursor=p;ART.setPointerCapture(e.pointerId);renderStage();return;}
 if(['rect','ellipse','triangle','triangleUp','triangleDown','brush'].includes(S.tool)){S.drag={type:S.tool==='brush'?'brush':'draw',start:p,points:[p],tool:S.tool,brushMode:S.brushMode,lock:S.constrainShape,shift:e.shiftKey};S.cursor=p;ART.setPointerCapture(e.pointerId);renderStage();return;}
}
function pointerMove(e){ const p=ptFromEvent(e);S.cursor=p;if(S.drag?.type==='raster'){rasterMove(e);return;}const d=S.drag;if(d?.type==='cropSelect'){S.cropSelection={rect:cropSelectionRect(d.start,p)};renderStage();return;}
 if(d?.type==='gradient'){const l=layerBy(d.id);if(!l)return;if(!d.changed&&dist(p,d.start)<3)return;const end=matApply(matInv(getWorld(l)),p);if(!d.changed){snapshot();d.changed=true;}const original=normalizeGradient(l.gradient)||gradientDefaultsFor(l);const gr={...original,x1:rnd(d.localStart.x,3),y1:rnd(d.localStart.y,3),x2:rnd(end.x,3),y2:rnd(end.y,3)};l.gradient=gr;d.preview=gr;renderStage();return;}if(!d){if(S.pen.length)renderStage();return;}
 if(d.type==='draw'||d.type==='line'){d.shift=e.shiftKey;renderStage();return;}
 if(d.type==='brush'){if(dist(d.points.at(-1),p)>1.4){d.points.push(p);if(d.points.length>Math.max(100,S.brushMaxPoints*6))d.points=simplifyFreehandToLimit(d.points,S.brushMaxPoints*3);}renderStage();return;}
 if(d.type==='multiMove'){moveMultiSelection(d,p);return;}
 if(d.type==='move'){const l=layerBy(d.id);if(!l)return;const a=matApply(d.parentInv,d.start),b=matApply(d.parentInv,p);if(!d.changed&&dist(a,b)<.6)return;const proposed={x:d.original.x+b.x-a.x,y:d.original.y+b.y-a.y};const snapped=smartSnapPosition(l,d.original,proposed);editPoseDuringDrag(d,{x:rnd(snapped.x,2),y:rnd(snapped.y,2)});return;}
 if(d.type==='scale'){
  const pos=matApply(d.parentInv,p),delta={x:pos.x-d.anchorParent.x,y:pos.y-d.anchorParent.y};
  const radians=num(d.original.r)*Math.PI/180,c=Math.cos(radians),sin=Math.sin(radians);
  const unrotated={x:c*delta.x+sin*delta.y,y:-sin*delta.x+c*delta.y};
  const dx=d.deltaLocal.x,dy=d.deltaLocal.y;
  if(Math.abs(dx)<.0001||Math.abs(dy)<.0001)return;
  let sx=unrotated.x/dx,sy=unrotated.y/dy;
  const oldSx=d.original.sx,oldSy=d.original.sy;
  const keepSign=(v,original)=>Math.sign(original||1)*clamp(v*Math.sign(original||1),.025,50);
  sx=keepSign(sx,oldSx);sy=keepSign(sy,oldSy);
  if(S.constrainSelection||e.shiftKey){const ratio=Math.max(Math.abs(sx/(oldSx||1)),Math.abs(sy/(oldSy||1)));
   sx=keepSign(oldSx*ratio,oldSx);sy=keepSign(oldSy*ratio,oldSy);}
  const origin=d.anchorLocal,pivot=d.pivot;
  const ox=(origin.x-pivot.x)*sx,oy=(origin.y-pivot.y)*sy;
  const x=d.anchorParent.x-pivot.x-(c*ox-sin*oy),y=d.anchorParent.y-pivot.y-(sin*ox+c*oy);
  if(!d.changed&&Math.abs(sx-oldSx)<.005&&Math.abs(sy-oldSy)<.005)return;
  const snappedScale=smartSnapScale(layerBy(d.id),d,{...d.original,sx,sy,x,y});editPoseDuringDrag(d,{sx:rnd(snappedScale.sx,4),sy:rnd(snappedScale.sy,4),x:rnd(snappedScale.x,2),y:rnd(snappedScale.y,2)});return;
 }
 if(d.type==='rotate'){const a=Math.atan2(p.y-d.pivotWorld.y,p.x-d.pivotWorld.x)*180/Math.PI;if(!d.changed&&Math.abs(a-d.startAngle)<.3)return;const angle=d.original.r+a-d.startAngle;const nearest=Math.round(angle/15)*15;const snapped=S.smartGuides&&Math.abs(nearest-angle)<3?nearest:angle;S.smartGuideLines=[];editPoseDuringDrag(d,{r:rnd(snapped,2)});return;}
 if(d.type==='pivot'){const l=layerBy(d.id);if(!l)return;const point=matApply(matInv(getWorld(l)),p);l.pivot={x:rnd(point.x,2),y:rnd(point.y,2)};renderStage();return;}
 if(d.type==='morph'||d.type==='mesh'){editDeformPoint(d,p);return;}
 if(d.type==='bezier'){const l=layerBy(d.id);if(!l)return;const points=S.activeContour>0&&l.shape.extraContours?.[S.activeContour-1]?l.shape.extraContours[S.activeContour-1]:l.shape.points,pt=points[d.index],local=matApply(matInv(getWorld(l)),p),dx=rnd(local.x-pt.x,3),dy=rnd(local.y-pt.y,3);if(!d.changed){snapshot();d.changed=true;}pt[d.side+'X']=dx;pt[d.side+'Y']=dy;if(pt.nodeType!=='corner'){const other=d.side==='in'?'out':'in';pt[other+'X']=-dx;pt[other+'Y']=-dy;}renderStage();return;}
 if(d.type==='node'){const l=layerBy(d.id);if(!l)return;const point=matApply(matInv(getWorld(l)),p),newPoint={x:rnd(point.x,2),y:rnd(point.y,2)},delta={x:newPoint.x-d.original[d.index].x,y:newPoint.y-d.original[d.index].y};if(!d.changed&&Math.hypot(delta.x,delta.y)>.1){snapshot();d.changed=true;}const points=d.contour>0&&l.shape.extraContours?.[d.contour-1]?l.shape.extraContours[d.contour-1]:l.shape.points;Object.assign(points[d.index],newPoint);if(d.contour===0&&l.morphKeys)Object.values(l.morphKeys).forEach(k=>{k.points[d.index]={x:rnd(k.points[d.index].x+delta.x,2),y:rnd(k.points[d.index].y+delta.y,2)};});d.original[d.index]={...newPoint};renderStage();return;}
}
function pointerUp(e){const d=S.drag;if(!d)return;if(d.type==='raster'){if(e.pointerId!==d.pointerId)return;if(e.type==='pointerup')rasterMove(e);d.ended=true;if(d.ready)rasterFinish(d);if(ART.hasPointerCapture(e.pointerId))ART.releasePointerCapture(e.pointerId);return;}S.drag=null;S.smartGuideLines=[];if(ART.hasPointerCapture(e.pointerId))ART.releasePointerCapture(e.pointerId);
 if(d.type==='gradient'){if(d.changed){saveLocal();renderAll();toast('グラデーションを適用しました。');}else{renderStage();renderInspector();}return;}
 if(d.type==='cropSelect'){S.cropSelection={rect:cropSelectionRect(d.start,ptFromEvent(e))};if(S.cropSelection.rect.w<2||S.cropSelection.rect.h<2)S.cropSelection=null;renderStage();renderInspector();return;}
 if(d.type==='line'){const q=lineEnd(d.start,ptFromEvent(e),e.shiftKey);if(dist(d.start,q)>=3){pointsToLayer([d.start,q],{closed:false,smooth:false,name:'直線',lineArt:true});}else renderStage();return;}
 if(d.type==='draw'){const p=ptFromEvent(e),{x,y,w,h}=drawShapeBounds(d.start,p,d.lock||e.shiftKey);if(w>=3&&h>=3){snapshot();const isTri=['triangle','triangleUp','triangleDown'].includes(d.tool);const triDown=d.tool==='triangleDown'||(d.tool==='triangle'&&S.triangleDirection==='down');const shape=isTri?{type:'path',points:trianglePoints(-w/2,-h/2,w,h,triDown),closed:true,smooth:false,pathMode:'line'}:d.tool==='rect'?{type:'rect',x:-w/2,y:-h/2,w:rnd(w,2),h:rnd(h,2),rx:0}:{type:'ellipse',cx:0,cy:0,rx:rnd(w/2,2),ry:rnd(h/2,2)};newLayer(shape,rnd(x+w/2,2),rnd(y+h/2,2),isTri?(triDown?'三角形 ▼':'三角形 △'):d.tool==='rect'?'四角形':'楕円',{worldCoordinates:true});mutated();}else renderStage();return;}
 if(d.type==='brush'){const end=ptFromEvent(e);if(dist(d.points.at(-1),end)>1.4)d.points.push(end);const mode=d.brushMode||S.brushMode,closed=mode!=='line',points=processedFreehandStroke(d.points,mode);if(points.length>=(closed?3:2)&&(closed||dist(points[0],points.at(-1))>2))pointsToLayer(points,{closed,smooth:S.brushAutoSmooth,name:closed?'フリーハンド（塗り）':'フリーハンド（線画）',lineArt:!closed,keepToolTab:true});else renderStage();return;}
 if(d.type==='multiMove'||d.type==='move'||d.type==='rotate'||d.type==='scale'||d.type==='node'||d.type==='bezier'||d.type==='pivot'||d.type==='morph'||d.type==='mesh'){if(d.changed||d.type!=='morph'&&d.type!=='mesh')saveLocal();renderAll();return;}
}
function insertNodeAt(p){const l=sel();if(!l||l.locked||l.shape.type!=='path')return;const pts=S.activeContour>0&&l.shape.extraContours?.[S.activeContour-1]?l.shape.extraContours[S.activeContour-1]:l.shape.points,local=matApply(matInv(getWorld(l)),p),closed=l.shape.closed,bezier=l.shape.pathMode==='bezier';let best=Infinity,index=-1,projected=null,bestT=.5;
 const n=closed?pts.length:pts.length-1;
 const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
 const cubic=(a,b,c,d,t)=>{const q=lerp(a,b,t),r=lerp(b,c,t),u=lerp(c,d,t);return lerp(lerp(q,r,t),lerp(r,u,t),t);};
 for(let i=0;i<n;i++){const a=pts[i],b=pts[(i+1)%pts.length],c1={x:a.x+num(a.outX),y:a.y+num(a.outY)},c2={x:b.x+num(b.inX),y:b.y+num(b.inY)};
  if(bezier){for(let j=1;j<=40;j++){const t=j/41,v=cubic(a,c1,c2,b,t),d=dist(local,v);if(d<best){best=d;index=i+1;projected=v;bestT=t;}}}
  else{const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy,t=den?clamp(((local.x-a.x)*dx+(local.y-a.y)*dy)/den,0,1):0,v={x:a.x+t*dx,y:a.y+t*dy},d=dist(local,v);if(d<best){best=d;index=i+1;projected=v;bestT=t;}}
 }
 if(best>25||index<0)return;snapshot();if(bezier){const ai=index-1,bi=index%pts.length,a=pts[ai],b=pts[bi],P0={x:a.x,y:a.y},P1={x:a.x+num(a.outX),y:a.y+num(a.outY)},P2={x:b.x+num(b.inX),y:b.y+num(b.inY)},P3={x:b.x,y:b.y},t=bestT;
 const Q0=lerp(P0,P1,t),Q1=lerp(P1,P2,t),Q2=lerp(P2,P3,t),R0=lerp(Q0,Q1,t),R1=lerp(Q1,Q2,t),M=lerp(R0,R1,t);
 a.outX=rnd(Q0.x-P0.x,3);a.outY=rnd(Q0.y-P0.y,3);b.inX=rnd(Q2.x-P3.x,3);b.inY=rnd(Q2.y-P3.y,3);
 projected={x:rnd(M.x,2),y:rnd(M.y,2),inX:rnd(R0.x-M.x,3),inY:rnd(R0.y-M.y,3),outX:rnd(R1.x-M.x,3),outY:rnd(R1.y-M.y,3),nodeType:'smooth'};
 }
 if(l.shape.lineArt){const prev=pts[Math.max(0,index-1)],next=pts[index%pts.length];projected.widthScale=clamp(num(prev?.widthScale,1)*(1-bestT)+num(next?.widthScale,1)*bestT,.05,15);}pts.splice(index,0,projected);if(S.activeContour===0&&l.morphKeys)Object.values(l.morphKeys).forEach(k=>{const arr=k.points,a=arr[index-1],b=arr[index%arr.length];arr.splice(index,0,{x:rnd(a.x+(b.x-a.x)*bestT,2),y:rnd(a.y+(b.y-a.y)*bestT,2)});});S.nodeIndex=index;mutated();}

function insertNodesBetweenSelected(){
 const l=sel();if(!l||effectiveLocked(l)||l.shape.type!=='path'){toast('ベクターパスを選択してください。');return;}
 const indices=[...S.nodeSelected].sort((a,b)=>a-b),pts=S.activeContour>0?l.shape.extraContours?.[S.activeContour-1]:l.shape.points;
 if(indices.length!==2||!pts){toast('Shift＋クリックで2つの頂点を選択してください。');return;}
 let [first,second]=indices;const n=pts.length,closed=l.shape.closed;
 if(closed&&first===0&&second===n-1){first=n-1;second=0;}
 else if(second!==first+1){toast('同じ輪郭上で隣り合う2つの頂点を選択してください。');return;}
 const count=clamp(Math.round(num(S.nodeInsertCount,1)),1,100),insertAt=first+1,bezier=l.shape.pathMode==='bezier';
 snapshot();
 const a=pts[first],b=pts[second],lerp=(p,q,t)=>({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});
 const mixWidth=t=>clamp(num(a.widthScale,1)*(1-t)+num(b.widthScale,1)*t,.05,15);
 let added=[];
 if(bezier){
  const P0={x:a.x,y:a.y},P1={x:a.x+num(a.outX),y:a.y+num(a.outY)},P2={x:b.x+num(b.inX),y:b.y+num(b.inY)},P3={x:b.x,y:b.y};
  let p0=P0,p1=P1,p2=P2,p3=P3;
  for(let j=1;j<=count;j++){
   const t=1/(count-j+2),q0=lerp(p0,p1,t),q1=lerp(p1,p2,t),q2=lerp(p2,p3,t),r0=lerp(q0,q1,t),r1=lerp(q1,q2,t),mid=lerp(r0,r1,t);
   if(j===1){a.outX=rnd(q0.x-P0.x,3);a.outY=rnd(q0.y-P0.y,3);}
   else{const prev=added.at(-1);prev.outX=rnd(q0.x-prev.x,3);prev.outY=rnd(q0.y-prev.y,3);}
   added.push({x:rnd(mid.x,3),y:rnd(mid.y,3),inX:rnd(r0.x-mid.x,3),inY:rnd(r0.y-mid.y,3),outX:rnd(r1.x-mid.x,3),outY:rnd(r1.y-mid.y,3),nodeType:'smooth',widthScale:mixWidth(j/(count+1))});
   p0=mid;p1=r1;p2=q2;
  }
  const last=added.at(-1);last.outX=rnd(p1.x-last.x,3);last.outY=rnd(p1.y-last.y,3);
  b.inX=rnd(p2.x-P3.x,3);b.inY=rnd(p2.y-P3.y,3);
 }else{for(let j=1;j<=count;j++){const t=j/(count+1),p=lerp(a,b,t);added.push({x:rnd(p.x,3),y:rnd(p.y,3),widthScale:mixWidth(t)});}}
 pts.splice(insertAt,0,...added);
 if(S.activeContour===0&&l.morphKeys){for(const key of Object.values(l.morphKeys)){
  const arr=key.points;if(!arr||arr.length!==n)continue;const aa=arr[first],bb=arr[second];const inserts=[];
  for(let j=1;j<=count;j++){const t=j/(count+1);inserts.push({x:rnd(aa.x+(bb.x-aa.x)*t,3),y:rnd(aa.y+(bb.y-aa.y)*t,3)});}
  arr.splice(insertAt,0,...inserts);
 }}
 S.nodeSelected.clear();S.nodeIndex=insertAt;S.nodeSelected.add(insertAt);S.vertexSelected=true;
 mutated();toast(`${count}個の頂点を追加しました。`);
}
function deleteNode(index){const l=sel();if(!l||l.locked||l.shape.type!=='path')return;const pts=S.activeContour>0&&l.shape.extraContours?.[S.activeContour-1]?l.shape.extraContours[S.activeContour-1]:l.shape.points;if(pts.length<=(l.shape.closed?3:2)){toast('これ以上点を削除できません。');return;}snapshot();pts.splice(index,1);if(S.activeContour===0&&l.morphKeys)Object.values(l.morphKeys).forEach(k=>k.points.splice(index,1));mutated();}
const ALLOWED_TAGS=new Set('svg g path rect circle ellipse polygon polyline line defs lineargradient radialgradient stop clippath mask title desc'.split(' '));
const ALLOWED_ATTRS=new Set('d fill stroke stroke-width stroke-linecap stroke-linejoin stroke-dasharray fill-rule clip-rule opacity transform viewBox x y width height cx cy rx ry r points id gradientUnits gradientTransform offset stop-color stop-opacity spreadMethod preserveAspectRatio clip-path mask vector-effect stroke-opacity fill-opacity'.toLowerCase().split(' '));
function sanitizeSvgNode(node){if(node.nodeType!==1)return null;const t=node.localName.toLowerCase();if(!ALLOWED_TAGS.has(t))return null;const n=document.createElementNS('http://www.w3.org/2000/svg',node.localName);
 for(const a of Array.from(node.attributes)){const k=a.localName.toLowerCase(),v=a.value;if(k==='style'){let safe=[];for(const rule of v.split(';')){let [name,...parts]=rule.split(':');if(!name||!parts.length)continue;name=name.trim().toLowerCase();const value=parts.join(':').trim();if(['fill','stroke','stroke-width','opacity','stroke-linecap','stroke-linejoin','fill-rule','fill-opacity','stroke-opacity'].includes(name)&&!/[<>;]|(?:url\s*\(\s*(?!#))|expression/i.test(value))safe.push(`${name}:${value}`);}if(safe.length)n.setAttribute('style',safe.join(';'));}
 else if(ALLOWED_ATTRS.has(k)&&!/[<>]|javascript:|data:|https?:|expression\s*\(/i.test(v))n.setAttribute(a.name,v);
 }
 for(const child of node.children){const safe=sanitizeSvgNode(child);if(safe)n.appendChild(safe);}return n;
}
function sanitizeSVG(text){const parsed=new DOMParser().parseFromString(text,'image/svg+xml');const root=parsed.documentElement;if(root.localName!=='svg'||parsed.querySelector('parsererror'))throw Error('SVGの形式を認識できません');let vb=(root.getAttribute('viewBox')||'').split(/[\s,]+/).map(Number);if(vb.length!==4||!vb.every(Number.isFinite)||vb[2]<=0||vb[3]<=0){vb=[0,0,parseFloat(root.getAttribute('width'))||512,parseFloat(root.getAttribute('height'))||512];}
 const parts=[];for(const node of root.children){const safe=sanitizeSvgNode(node);if(safe)parts.push(new XMLSerializer().serializeToString(safe));}if(!parts.length)throw Error('読み込めるパスや図形がありません');return {type:'svg',markup:parts.join(''),vx:vb[0],vy:vb[1],w:vb[2],h:vb[3]};}
function readAsDataURL(file){return new Promise((resolve,reject)=>{const fr=new FileReader;fr.onload=()=>resolve(fr.result);fr.onerror=()=>reject(fr.error);fr.readAsDataURL(file);});}
function getImageSize(data){return new Promise((resolve,reject)=>{const i=new Image;i.onload=()=>resolve({w:i.naturalWidth,h:i.naturalHeight});i.onerror=reject;i.src=data;});}
async function importAssets(files){if(!files?.length)return;let count=0;for(const file of files){try{let sh;if(/\.svg$/i.test(file.name)||file.type==='image/svg+xml')sh=sanitizeSVG(await file.text());else if(/\.png$/i.test(file.name)||file.type==='image/png'){const data=await readAsDataURL(file),size=await getImageSize(data);sh={type:'image',data,...size};}else continue;
 snapshot();const scale=Math.min(1,doc.width*.7/sh.w,doc.height*.7/sh.h);if(scale<1){sh.w=rnd(sh.w*scale,2);sh.h=rnd(sh.h*scale,2);if(sh.type==='svg'){/* preserve original SVG coordinate scale via a wrapper */sh.markup=`<g transform="scale(${scale})">${sh.markup}</g>`;sh.vx*=scale;sh.vy*=scale;}}
 newLayer(sh,doc.width/2,doc.height/2,file.name.replace(/\.[^.]+$/,''),{worldCoordinates:true});count++;}catch(e){toast(`${file.name}: ${e.message}`);}}
 if(count){mutated();toast(`${count}個の素材をパーツとして読み込みました。`);}}
function totalForDoc(d){return Math.max(1,Math.round(d.fps*d.seconds));}
function normalizeDoc(d){if(!d||!Array.isArray(d.layers))throw Error('有効なプロジェクトではありません');const o=emptyDoc();for(const key of ['name','width','height','fps','seconds','background','transparent','gridVisible','gridSize','gridTransparency','gridColor'])if(d[key]!==undefined)o[key]=d[key];o.width=clamp(Math.round(num(o.width,960)),64,3840);o.height=clamp(Math.round(num(o.height,540)),64,2160);o.fps=clamp(Math.round(num(o.fps,12)),1,30);o.seconds=clamp(Math.round(num(o.seconds,6)),1,20);o.gridVisible=o.gridVisible!==false;o.gridSize=clamp(Math.round(num(o.gridSize,40)/4)*4,8,256);o.gridTransparency=clamp(Math.round(num(o.gridTransparency,0)),0,100);o.gridColor=/^#[0-9a-f]{6}$/i.test(o.gridColor||'')?o.gridColor:'#867567';
 o.fonts=Array.isArray(d.fonts)?d.fonts.map(cleanCustomFont).filter(Boolean).slice(0,32):[];
 o.references=Array.isArray(d.references)?d.references.filter(r=>r&&typeof r.data==='string'&&/^data:image\/(?:png|jpeg|webp|gif|bmp);base64,/i.test(r.data)).slice(0,30).map(r=>({id:String(r.id||uid()),name:String(r.name||'資料画像').slice(0,128),data:r.data})):[];
 o.audio=Array.isArray(d.audio)?d.audio.filter(a=>a&&typeof a.data==='string'&&a.data.startsWith('data:')&&a.data.includes(';base64,')).slice(0,30).map(a=>({id:a.id||uid(),name:String(a.name||'音声'),data:a.data,type:String(a.type||'audio/*'),start:clamp(Math.round(num(a.start)),0,totalForDoc(o)-1),volume:clamp(num(a.volume,1),0,1),muted:!!a.muted,duration:Math.max(0,num(a.duration)),peaks:Array.isArray(a.peaks)?a.peaks.slice(0,2000):[]})):[];o.layers=d.layers.map(l=>({...l,id:l.id||uid(),visible:l.visible!==false,locked:!!l.locked,parent:l.parent||null,folderId:l.folderId||null,pivot:l.pivot||{x:0,y:0},keys:l.keys&&Object.keys(l.keys).length?l.keys:{'0':basePose()},fill:l.fill||'#c78b7b',stroke:l.stroke||'#47332b',strokeWidth:num(l.strokeWidth,2),clipToBelow:!!l.clipToBelow,repeat:normalizeRepeat(l.repeat),gradient:normalizeGradient(l.gradient),texture:normalizeTexture(l.texture),fillHidden:!!l.fillHidden,lineStyle:normalizeOutline(l.lineStyle||{color:l.stroke||'#47332b'}),effects:normalizeEffects(l.effects),outline:normalizeOutline(l.outline),effectKeys:l.effectKeys&&typeof l.effectKeys==='object'?Object.fromEntries(Object.entries(l.effectKeys).filter(([f,v])=>Number.isInteger(+f)&&+f>=0&&+f<totalForDoc(o)&&v&&typeof v==='object').map(([f,v])=>[f,{...normalizeEffects(v),ease:['ease','linear','easeIn','easeOut','hold'].includes(v.ease)?v.ease:'ease'}])):{} }));
 o.layers.forEach(l=>{if(l.shape?.type==='clone'){l.shape={type:'clone',sourceId:String(l.shape.sourceId||'').slice(0,120)};l.paintOverride=l.paintOverride===true;}});
 o.layers.forEach(l=>{if(l.shape?.type==='text')l.shape=normalizeTextShape(l.shape);if(l.shape?.type==='path'&&Array.isArray(l.shape.extraContours))l.shape.extraContours=l.shape.extraContours.filter(a=>Array.isArray(a)&&a.length>=3&&a.length<=1000).slice(0,60);if(l.crop){const c=l.crop;if(!['rect','object'].includes(c.kind)){delete l.crop;return;}c.expand=clamp(num(c.expand),-100,100);c.targetInverse=Array.isArray(c.targetInverse)&&c.targetInverse.length===6&&c.targetInverse.every(x=>Number.isFinite(Number(x)))?c.targetInverse.map(Number):matI();if(c.kind==='rect'){const r=c.rect||{};c.rect={x:num(r.x),y:num(r.y),w:Math.max(0,num(r.w)),h:Math.max(0,num(r.h))};}else{c.snapshot=sanitizeCropSnapshot(c.snapshot);if(!c.snapshot)delete l.crop;}}});
 o.layers.forEach(l=>{if(l.shape?.type==='path'&&Array.isArray(l.shape.points))l.shape.points=l.shape.points.map(p=>({...p,widthScale:clamp(num(p.widthScale,1),.05,15)}));});
 o.layers.forEach(l=>{if(l.shape?.type==='path')l.shape.cornerRadius=clamp(num(l.shape.cornerRadius,0),0,400);if(l.shape?.type==='rect'){const sh=l.shape;sh.insetRadius=clamp(num(sh.insetRadius,0),0,Math.max(0,Math.min(num(sh.w),num(sh.h))/2));sh.rx=clamp(num(sh.rx,0),0,Math.max(0,Math.min(num(sh.w),num(sh.h))/2));sh.insetCorners=[...new Set((Array.isArray(sh.insetCorners)?sh.insetCorners:['tr']).filter(v=>['tl','tr','bl','br'].includes(v)))];}});
 const ids=new Set(o.layers.map(l=>l.id)),folders=new Set(o.layers.filter(l=>isFolder(l)).map(l=>l.id));o.layers.forEach(l=>{if(!ids.has(l.parent))l.parent=null;if(!folders.has(l.folderId)||l.folderId===l.id)l.folderId=null;if(isFolder(l)){l.shape={type:'folder'};l.type='folder';l.parent=null;l.mergeGroup=l.mergeGroup===true;}else delete l.mergeGroup;});
 for(const l of o.layers){let seen=new Set([l.id]),at=l.folderId;while(at){if(seen.has(at)){l.folderId=null;break;}seen.add(at);at=o.layers.find(x=>x.id===at)?.folderId||null;}}
 o.layers.forEach(l=>{if(l.shape?.type==='merged'){const sh=l.shape;const markup=sanitizeMergedArtwork(sh.markup);l.shape=markup?{type:'merged',markup,w:Math.max(.01,num(sh.w,10)),h:Math.max(.01,num(sh.h,10)),fontFamilies:Array.isArray(sh.fontFamilies)?sh.fontFamilies.filter(f=>typeof f==='string'&&f.length<180).slice(0,24):[]}: {type:'rect',x:-20,y:-20,w:40,h:40,rx:0};}if(l.shape?.type==='svg')l.shape=sanitizeLoadedSvg(l.shape);if(l.morphKeys&&l.shape?.type!=='path')delete l.morphKeys;if(l.shape?.type==='path'&&l.morphKeys)Object.entries(l.morphKeys).forEach(([f,k])=>{if(!Array.isArray(k?.points)||k.points.length!==l.shape.points.length)delete l.morphKeys[f];});if(l.mesh){l.mesh.cols=clamp(Math.round(num(l.mesh.cols,2)),2,4);l.mesh.rows=clamp(Math.round(num(l.mesh.rows,2)),2,4);const b=l.mesh.bounds;l.mesh.bounds={x:num(b?.x),y:num(b?.y),w:Math.max(1,num(b?.w,40)),h:Math.max(1,num(b?.h,40))};const rest=meshRest(l.mesh);if(!l.mesh.keys||typeof l.mesh.keys!=='object')l.mesh.keys={};Object.entries(l.mesh.keys).forEach(([f,k])=>{if(!Array.isArray(k?.points)||k.points.length!==rest.length)delete l.mesh.keys[f];});if(!l.mesh.keys['0'])l.mesh.keys['0']={points:rest,ease:'ease'};}});o.version=20;return o;}
// A merged object's markup is rendered by our own SVG renderer.  Preserve its
// vector paints, clip/mask/filter defs, text, and embedded PNGs when reloading.
// Untrusted FMS JSON is still sanitized: no scripts, event handlers, external URLs.
function sanitizeMergedArtwork(markup){
 if(typeof markup!=='string'||markup.length>45000000)return'';
 const parsed=new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`,'image/svg+xml');
 if(parsed.querySelector('parsererror'))return'';
 const allowed=new Set('g defs rect circle ellipse path line polyline polygon image text tspan clippath mask filter femorphology fegaussianblur feflood fecomposite femerge femergenode feoffset fecolormatrix lineargradient radialgradient stop'.split(' '));
 const attrs=new Set('d fill stroke stroke-width stroke-linecap stroke-linejoin stroke-dasharray fill-rule clip-rule opacity transform viewbox x y width height cx cy rx ry r x1 y1 x2 y2 fx fy points id gradientunits gradienttransform offset stop-color stop-opacity spreadmethod preserveaspectratio clip-path mask vector-effect stroke-opacity fill-opacity filter filterunits maskunits maskcontentunits marker-start marker-mid marker-end in in2 stddeviation dx dy operator result radius flood-color flood-opacity color-interpolation-filters font-family font-size font-weight text-anchor dominant-baseline letter-spacing'.split(' '));
 const validUrl=v=>!/url\(/i.test(v)||/^(?:url\(\s*#[a-z0-9_.:-]+\s*\))$/i.test(v);
 function clean(el){const tag=el.localName.toLowerCase();if(!allowed.has(tag))return null;
  const out=document.createElementNS('http://www.w3.org/2000/svg',el.localName);
  for(const a of el.attributes){const key=a.localName.toLowerCase(),value=a.value;
   if(key==='href'){
    if(tag==='image'&&/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value))out.setAttribute('href',value);
    continue;
   }
   if(key==='style'){
    if(/^\s*mask-type\s*:\s*alpha\s*;?\s*$/i.test(value))out.setAttribute('style','mask-type:alpha');
    continue;
   }
   if(!attrs.has(key)||/[<>]|(?:javascript:|https?:|file:|blob:|data:|expression\s*\()/i.test(value)||!validUrl(value))continue;
   out.setAttribute(a.name,value);
  }
  if(tag==='text'||tag==='tspan')for(const ch of el.childNodes)if(ch.nodeType===Node.TEXT_NODE)out.appendChild(document.createTextNode(ch.textContent||''));
  for(const child of el.children){const c=clean(child);if(c)out.appendChild(c);}
  return out;
 }
 const wrap=document.createElementNS('http://www.w3.org/2000/svg','g');
 for(const child of parsed.documentElement.children){const c=clean(child);if(c)wrap.appendChild(c);}
 return wrap.innerHTML;
}
function sanitizeLoadedSvg(shape){try{let text=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${shape.vx||0} ${shape.vy||0} ${shape.w||512} ${shape.h||512}">${shape.markup||''}</svg>`;return sanitizeSVG(text);}catch(e){return {type:'rect',x:-20,y:-20,w:40,h:40,rx:0};}}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function safeName(){return String(doc.name||'flat-motion').replace(/[\\/:*?"<>|]/g,'_').slice(0,70)||'flat-motion';}
function saveProject(){doc.name=($('#projectName')?.value||doc.name).trim()||'新しいアニメーション';download(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}),safeName()+'.fms.json');saveLocal();toast('編集可能なプロジェクトを保存しました。');}
async function loadProject(file){if(!file)return;try{const d=normalizeDoc(JSON.parse(await file.text()));stopPlayback();audioDataCache.clear();subviewLoaded.clear();referenceDataCache.clear();doc=d;S.frame=0;setSingleSelection(null);S.pen=[];S.history=[];S.future=[];S.collapsedFolders=new Set();await prepareProjectAudio();await prepareSubviewReferences();await prepareProjectFonts();mutated();fitCanvas();toast('プロジェクトを読み込みました。');}catch(e){toast(`読み込みエラー: ${e.message}`);}}
function frameAsCanvas(frame,scale=1){return new Promise((resolve,reject)=>{const markup=svgForFrame(frame),url=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml;charset=utf-8'}));const im=new Image;im.onload=()=>{const cv=document.createElement('canvas');cv.width=Math.round(doc.width*scale);cv.height=Math.round(doc.height*scale);const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);ctx.drawImage(im,0,0,cv.width,cv.height);URL.revokeObjectURL(url);resolve(cv);};im.onerror=()=>{URL.revokeObjectURL(url);reject(Error('SVGを画像へ変換できませんでした'));};im.src=url;});}
function canvasBlob(canvas,type='image/png'){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('画像を書き出せませんでした')),type));}

function svgAsCanvas(markup){return new Promise((resolve,reject)=>{
 const url=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml;charset=utf-8'})),im=new Image();
 im.onload=()=>{try{const c=document.createElement('canvas');c.width=doc.width;c.height=doc.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(im,0,0);resolve(c);}catch(e){reject(e);}finally{URL.revokeObjectURL(url);}};
 im.onerror=()=>{URL.revokeObjectURL(url);reject(Error('レイヤーをラスター化できませんでした。'));};im.src=url;
});}
function psdLayerMarkup(layer,frame){
 const prefix='psd_'+doc.layers.indexOf(layer),crop=layer.crop?cropMaskMarkup(layer,frame,prefix+'_cut'):'';
 const cropAttr=crop?` mask="url(#${cropMaskId(layer,prefix+'_cut')})"`:'';
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}">${customFontCss()}${crop}<g${cropAttr}>${renderStackItem(layer,frame,false,prefix,false)}</g></svg>`;
}
function croppedPsdPixels(cv){const w=cv.width,h=cv.height,pixels=cv.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;let left=w,top=h,right=-1,bottom=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const alpha=pixels[(y*w+x)*4+3];if(alpha){if(left>x)left=x;if(right<x)right=x;if(top>y)top=y;if(bottom<y)bottom=y;}}
 if(right<left)return{left:0,top:0,width:1,height:1,rgba:new Uint8Array(4)};
 const width=right-left+1,height=bottom-top+1,rgba=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++){const slice=pixels.subarray(((y+top)*w+left)*4,((y+top)*w+right+1)*4);rgba.set(slice,y*width*4);}
 return {left,top,width,height,rgba};
}
// PSD layer records are stored from the bottom of the layer panel upwards.
// A folder is represented by its invisible bounding divider, followed by its
// contents, followed by the visible (open/closed) folder record.  Reversing this
// bracket order makes some editors show apparently empty groups.
async function exportPSD(){
 if(S.recording)return;
 if(!window.FlatMotionPSD)throw Error('PSD書き出しモジュールを読み込めませんでした。');
 if(!doc.layers.length){toast('書き出すレイヤーがありません。');return;}
 if(doc.width*doc.height>6500000&&!confirm('高解像度のPSD生成にはメモリが必要です。続けますか？'))return;
 S.recording=true;
 const frame=S.frame,exportLayers=[];let done=0;
 const emit=async layer=>{
  if(isFolder(layer)&&!layer.mergeGroup){
   // PSD stores layers from BOTTOM to TOP, unlike the usual UI ordering.
   exportLayers.push({type:'groupEnd',name:'</Layer group>',visible:false,opacity:1});
   for(const child of directChildren(layer.id))await emit(child);
   exportLayers.push({type:'groupStart',name:layer.name,visible:layer.visible!==false,clip:!!layer.clipToBelow,locked:!!layer.locked,opacity:clamp(getPose(layer,frame).opacity,0,1)});
  }else{
   // A merged object is intentionally rasterized as ONE PSD layer, but its
   // original editable parts remain in the saved .fms.json document.
   const cv=await svgAsCanvas(psdLayerMarkup(layer,frame));
   const pixels=croppedPsdPixels(cv);
   exportLayers.push({type:'pixel',name:layer.name,visible:layer.visible!==false,clip:!!layer.clipToBelow,locked:!!layer.locked,opacity:1,...pixels});
   done++;
  }
  if(done&&done%2===0){$('#stageStatus').textContent=`PSDを書き出し中… ${done}レイヤー`;await new Promise(r=>setTimeout(r,0));}
 };
 try{
  if(!doc.transparent){
   const bg=document.createElement('canvas');bg.width=doc.width;bg.height=doc.height;
   const context=bg.getContext('2d');context.fillStyle=doc.background;
   context.fillRect(0,0,doc.width,doc.height);
   exportLayers.push({type:'pixel',name:'背景',locked:true,visible:true,opacity:1,...croppedPsdPixels(bg)});
  }
  for(const layer of directChildren(null))await emit(layer);
  const composite=await frameAsCanvas(frame);
  const rgba=composite.getContext('2d',{willReadFrequently:true}).getImageData(0,0,doc.width,doc.height).data;
  const output=FlatMotionPSD.write({width:doc.width,height:doc.height,layers:exportLayers,composite:rgba});
  download(output,`${safeName()}_frame_${String(frame+1).padStart(4,'0')}.psd`);
  toast(`PSD書き出し：${done}レイヤー（グループ階層・統合・クリッピング対応）`);
 }finally{S.recording=false;$('#stageStatus').textContent='準備完了';}
}
async function exportPNG(){const cv=await frameAsCanvas(S.frame);download(await canvasBlob(cv),`${safeName()}_frame_${String(S.frame+1).padStart(4,'0')}.png`);toast('PNGを書き出しました。');}
// Editable SVG: the live renderer uses anonymous wrapper groups for selection,
// mask composition and animation.  Export a DOCUMENT HIERARCHY instead: one
// named Inkscape layer for every FMS layer, with a folder containing its children
// and a non-destructive merged object containing named vector parts.
// Only complex paint (repeat / combined masks) retains auxiliary wrappers.
function svgForEditableExport(frame=S.frame){
 const head=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}">`;
 // The correct Inkscape extension namespace is http://www.inkscape.org/namespaces/inkscape.
 const background=doc.transparent?'':`<rect id="fm-background" width="${doc.width}" height="${doc.height}" fill="${esc(doc.background)}"/>`;
 function stack(parentId,insideMerged=false,depth=0){
  if(depth>30)return'';
  let out='';const defined=new Set();const prefix='svg_layer_'+(parentId||'root').replace(/[^a-zA-Z0-9_-]/g,'_')+'_';
  for(const layer of directChildren(parentId)){
   const i=doc.layers.indexOf(layer),key=prefix+i;
   let before='',clip='',crop='';
   if(layer.clipToBelow){
    const base=clipBaseFor(layer);
    if(base&&effectiveVisible(base)){
     const maskId=clipMaskId(base,prefix);
     if(!defined.has(maskId)){before+=`<defs>${clipMaskMarkup(base,frame,prefix)}</defs>`;defined.add(maskId);}
     clip=maskId;
    }
   }
   if(layer.crop){
    before+=cropMaskMarkup(layer,frame,key+'_cut');
    crop=cropMaskId(layer,key+'_cut');
   }
   const fx=effectFilterMarkup(layer,key,frame);
   if(fx)before+=fx;
   const attr=` id="fm-layer-${i}"`+(insideMerged?` data-merge-part="${esc(layer.name)}"`:` inkscape:groupmode="layer" inkscape:label="${esc(layer.name)}"`)+
    (layer.visible===false?' display="none"':'')+(clip?` mask="url(#${clip})"`:'')+(fx?` filter="url(#${effectFilterId(layer,key)})"`:'');
   const repeater=normalizeRepeat(layer.repeat).enabled&&normalizeRepeat(layer.repeat).copies>0;
   let painted='';
   if(repeater){
    // Repeated source instances need their own transforms and paint ids.
    painted=renderStackItem(layer,frame,false,key+'_repeat',true);
   }else if(layer.shape?.type==='clone'){
    painted=renderStackItem(layer,frame,false,key+'_clone',true);
   }else if(isFolder(layer)){
    const children=stack(layer.id,insideMerged||!!layer.mergeGroup,depth+1);
    const opacity=rnd(clamp(getPose(layer,frame).opacity,0,1),4);
    painted=`<g opacity="${opacity}">${children}${layerOutline(layer).on?cloneFolderOutlineMarkup(layer,{...layer,fillHidden:true},frame):''}</g>`;
   }else{
    const pose=getPose(layer,frame),opacity=rnd(clamp(pose.opacity,0,1),4);
    painted=`<g transform="${matString(getWorld(layer,frame))}" opacity="${opacity}">${layerMarkup(layer,frame,key)}</g>`;
   }
   // A second mask (inverse crop) must be nested: SVG mask is single-valued.
   if(crop)painted=`<g mask="url(#${crop})">${painted}</g>`;
   // With no filters or masks, fold the redundant inner transform wrapper into
   // the named layer.  This makes ordinary shapes ONE SVG layer node each.
   if(!isFolder(layer)&&layer.shape?.type!=='clone'&&!repeater&&!fx&&!clip&&!crop){
    const pose=getPose(layer,frame),opacity=rnd(clamp(pose.opacity,0,1),4);
    painted=layerMarkup(layer,frame,key);
    out+=before+`<g${attr} transform="${matString(getWorld(layer,frame))}" opacity="${opacity}">${painted}</g>`;
   }else if(isFolder(layer)&&!repeater&&!fx&&!clip&&!crop){
    const opacity=rnd(clamp(getPose(layer,frame).opacity,0,1),4);
    out+=before+`<g${attr} opacity="${opacity}">${stack(layer.id,insideMerged||!!layer.mergeGroup,depth+1)}${layerOutline(layer).on?cloneFolderOutlineMarkup(layer,{...layer,fillHidden:true},frame):''}</g>`;
   }else out+=before+`<g${attr}>${painted}</g>`;
  }
  return out;
 }
 return head+customFontCss()+background+stack(null)+'</svg>';
}
function exportSVG(){
 const markup=svgForEditableExport(S.frame);
 download(new Blob([markup],{type:'image/svg+xml;charset=utf-8'}),`${safeName()}_frame_${String(S.frame+1).padStart(4,'0')}.svg`);
 toast('SVGを書き出しました（グループ階層を整理・各レイヤーに名前を付与）。');
}
function exportHTML(){
 // The player embeds the same SVG renderer as the editor, not pre-rendered raster frames.
 // As a result morph, mesh, parenting, and easing all remain fully vector-driven.
 const fnNames={clamp,num,rnd,esc,basePose,matI,matMul,matT,matR,matS,matApply,matInv,matString,
 getPose,getWorld,getParentWorld,getBBox,customFontCss,normalizeTextShape,textCharacters,textVerticalCharacter,textVerticalOffset,textFontString,textAdvance,textGlyphLayout,textLocalBounds,textSvgMarkup,glyphCompoundD,layerBy,isFolder,folderParent,folderAncestry,isFolderAncestorOfLayer,memberOfFolder,effectiveVisible,effectiveLocked,effectiveOpacity,layerTree,drawableLayers,directChildren,copyPts,interpolatePoints,getMorphPoints,meshRest,getMeshPoints,
 affineFromTriangles,pathD,roundedPathD,cleanGradientColor,normalizeGradient,isGradientTarget,gradientId,gradientSvg,normalizeTexture,textureSvg,vertexPressure,variableStrokeSamples,variableStrokePointAt,variableStrokeShape,variableWidthLineMarkup,lineArtStrokeAttrs,lineArtMarkup,rectWorldScale,rectCornerSpec,rectPathD,rectShapeSvg,rectContourPoints,normalizeEffects,normalizeOutline,layerEffects,layerOutline,fxColorMix,getEffectsAt,effectFilterId,effectFilterMarkup,outlineConfig,vectorOutlineSvg,shapeMarkup,meshMarkup,layerMarkup,clipBaseFor,clipMaskId,clipMaskMarkup,renderStackItem,cropMaskId,cropShapeMarkup,cropMaskMarkup,normalizeRepeat,repeatFootprint,repeatPoints,repeatMatrix,repeatBBox,renderRepeatSource,renderStack,drawLayers,svgForFrame,cloneSourceLayer,clonePartMarkup,cloneMarkup,cloneMergedSilhouetteMarkup,fmCloneVectorContours,fmOpenStrokeContours,fmSvgNodeMatrix,fmSvgPathContours,fmSvgMarkupContours,fmOutlinePointIn,fmOutlineArea,fmBzL,fmBzSplit,fmBzPart,fmBzAt,fmBzTan,fmBzReverse,fmBzLine,fmBzParse,fmBzContours,fmBzFlat,fmBzSample,fmBzPoly,fmBzIntersection,fmBzMerge,fmBzPoints,cloneFolderOutlineMarkup,easingT};
 const runtime=Object.entries(fnNames).map(([name,fn])=>`const ${name} = ${fn.toString()};`).join('\n');
 const payload=JSON.stringify(doc).replace(/</g,'\\u003c').replace(/\u2028|\u2029/g,' ');
 const html=`<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(doc.name)} — FLAT MOTION</title><style>*{box-sizing:border-box}body{background:#eae1d8;color:#5d4136;font:14px sans-serif;margin:0;min-height:100vh;display:grid;place-items:center}.app{width:min(96vw,1200px)}.title{font-weight:bold;letter-spacing:.05em;margin:12px 0}.stage{width:100%;background:#fffaf6;box-shadow:0 10px 32px #553b3133;line-height:0}.stage svg{display:block;width:100%;height:auto;max-height:80vh}.controls{display:flex;align-items:center;gap:12px;background:#fff9f2;padding:13px 16px;margin-top:10px;border-radius:10px}button{background:#67493c;border:0;border-radius:6px;color:white;padding:9px 14px;cursor:pointer}input{flex:1;accent-color:#9e6c59}.time{font-family:monospace;color:#7f675a;white-space:nowrap}</style></head><body><div class="app"><div class="title">${esc(doc.name)}</div><div class="stage" id="output"></div><div class="controls"><button id="play">Ⅱ 一時停止</button><input type="range" id="seek" min="0" max="${total()-1}" value="0" step="1"><span class="time" id="time">0.00s</span><button id="restart">↶ 最初から</button></div></div><script>
'use strict';const doc=${payload},S={frame:0};const total=Math.max(1,Math.round(doc.fps*doc.seconds));let frame=0,playing=false,last=performance.now();
${runtime}
const playerAudio=(doc.audio||[]).map(clip=>{const audio=new Audio(clip.data);audio.preload='auto';audio.volume=Math.max(0,Math.min(1,Number(clip.volume??1)));audio.muted=!!clip.muted;return {clip,audio};});
function syncPlayerAudio(){const t=frame/doc.fps;for(const {clip,audio} of playerAudio){const at=t-(clip.start||0)/doc.fps;const shouldPlay=playing&&at>=0&&at<Math.min(clip.duration||Infinity,audio.duration||Infinity);if(!shouldPlay){audio.pause();continue;}try{if(Math.abs((audio.currentTime||0)-at)>.15)audio.currentTime=at;}catch(e){}if(audio.paused)audio.play().catch(()=>{});}}
function render(){document.getElementById('output').innerHTML=svgForFrame(frame);document.getElementById('seek').value=frame;document.getElementById('time').textContent=(frame/doc.fps).toFixed(2)+'s / '+doc.seconds+'s';syncPlayerAudio();}
function loop(now){if(playing){const advance=(now-last)*doc.fps/1000;if(advance>=1){frame=(frame+Math.floor(advance))%total;last=now;render();}}else last=now;requestAnimationFrame(loop);}
document.getElementById('play').onclick=()=>{playing=!playing;document.getElementById('play').textContent=playing?'Ⅱ 一時停止':'▶ 再生';last=performance.now();syncPlayerAudio();};
document.getElementById('restart').onclick=()=>{frame=0;last=performance.now();render();};
document.getElementById('seek').oninput=e=>{frame=+e.target.value;last=performance.now();render();};
document.getElementById('play').textContent='▶ 再生';render();requestAnimationFrame(loop);
<\/script></body></html>`;
 download(new Blob([html],{type:'text/html;charset=utf-8'}),safeName()+'_animation.html');toast('変形アニメーション対応の再生HTMLを書き出しました。');
}
const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(buf){let c=0xffffffff;for(let i=0;i<buf.length;i++)c=crcTable[(c^buf[i])&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function zipBytes(entries){const chunks=[],central=[];let offset=0;const te=new TextEncoder();for(const {name,bytes} of entries){const filename=te.encode(name),size=bytes.byteLength,crc=crc32(bytes);const local=new Uint8Array(30+filename.length),v=new DataView(local.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(8,0,true);v.setUint32(14,crc,true);v.setUint32(18,size,true);v.setUint32(22,size,true);v.setUint16(26,filename.length,true);local.set(filename,30);chunks.push(local,bytes);
 const cd=new Uint8Array(46+filename.length),w=new DataView(cd.buffer);w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x0800,true);w.setUint16(10,0,true);w.setUint32(16,crc,true);w.setUint32(20,size,true);w.setUint32(24,size,true);w.setUint16(28,filename.length,true);w.setUint32(42,offset,true);cd.set(filename,46);central.push(cd);offset+=local.length+size;}
 const centralSize=central.reduce((s,x)=>s+x.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);return new Blob([...chunks,...central,end],{type:'application/zip'});}
async function exportFrames(){if(S.recording)return;let n=total();if(n>240&&!confirm(`${n}枚のPNGを生成します。枚数が多いため時間とメモリを使用します。続けますか？`))return;S.recording=true;try{const entries=[];for(let f=0;f<n;f++){const canvas=await frameAsCanvas(f);const bytes=new Uint8Array(await(await canvasBlob(canvas)).arrayBuffer());entries.push({name:`${safeName()}_${String(f+1).padStart(4,'0')}.png`,bytes});if(f%4===0){$('#stageStatus').textContent=`PNG連番を書き出しています… ${f+1}/${n}`;await new Promise(r=>setTimeout(r,0));}}const zip=zipBytes(entries);download(zip,safeName()+'_PNG_sequence.zip');toast(`${n}フレームのPNG連番ZIPを書き出しました。`);}finally{S.recording=false;$('#stageStatus').textContent='準備完了';}}
async function exportWEBM(){
 if(S.recording)return;
 if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){toast('このブラウザはWebMに対応していません。');return;}
 const withAudio=(doc.audio||[]).some(a=>audioBuffers.has(a.id));
 const types=withAudio?['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']:['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
 const mime=types.find(t=>MediaRecorder.isTypeSupported(t));if(!mime){toast('WebMを作成できるコーデックがありません。');return;}
 stopPlayback();S.recording=true;const canvas=document.createElement('canvas');canvas.width=doc.width;canvas.height=doc.height;
 const ctx2d=canvas.getContext('2d'),stream=canvas.captureStream(0),videoTrack=stream.getVideoTracks()[0];
 let recorder,mixStream=null;try{
  const tracks=[videoTrack];
  if(withAudio){const audioCtx=getAudioContext();await audioCtx.resume();mixStream=audioCtx.createMediaStreamDestination();tracks.push(...mixStream.stream.getAudioTracks());}
  const completeStream=new MediaStream(tracks),chunks=[];
  recorder=new MediaRecorder(completeStream,{mimeType:mime,videoBitsPerSecond:6000000});
  const done=new Promise((resolve,reject)=>{recorder.onstop=()=>resolve(new Blob(chunks,{type:'video/webm'}));recorder.onerror=e=>reject(e.error||Error('動画の録画に失敗'));});
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.start(500);
  if(mixStream){stopAudio();scheduleAudioAt(0,mixStream,getAudioContext());}
  const t0=performance.now(),count=total();
  for(let f=0;f<count;f++){
   const deadline=t0+f*1000/doc.fps,wait=deadline-performance.now();if(wait>1)await new Promise(r=>setTimeout(r,wait));
   const image=await frameAsCanvas(f);ctx2d.clearRect(0,0,canvas.width,canvas.height);ctx2d.drawImage(image,0,0);if(typeof videoTrack.requestFrame==='function')videoTrack.requestFrame();
   $('#stageStatus').textContent=`音声付きWebMを書き出しています… ${f+1}/${count}`;
  }
  const tail=t0+count*1000/doc.fps-performance.now();if(tail>0)await new Promise(r=>setTimeout(r,tail));
  recorder.stop();const blob=await done;if(!blob.size)throw Error('動画が空です');
  download(blob,safeName()+'_animation.webm');toast(withAudio?'音声付きWebMを書き出しました。':'WebM動画を書き出しました。');
 }finally{stopAudio();if(recorder&&recorder.state!=='inactive')recorder.stop();stream.getTracks().forEach(t=>t.stop());if(mixStream)mixStream.stream.getTracks().forEach(t=>t.stop());S.recording=false;$('#stageStatus').textContent='準備完了';}
}
function runExport(which){$('#exportPopup').classList.add('hidden');try{const result=({exportPNG,exportPSD,exportSVG,exportHTML,exportFrames,exportWEBM})[which]?.();if(result&&typeof result.catch==='function')result.catch(err=>{toast(`書き出し失敗: ${err.message}`);S.recording=false;});}catch(e){toast(`書き出し失敗: ${e.message}`);}}
function togglePlayback(){if(S.playing)stopPlayback();else startPlayback();}
async function startPlayback(){if(S.playing)return;try{const ctx=getAudioContext();await ctx.resume();stopAudio();scheduleAudioAt(S.frame,null,ctx);}catch(e){toast('音声の再生を開始できません: '+e.message);}S.playing=true;S.playFrame=S.frame;S.playStart=performance.now();updateButtons();requestAnimationFrame(playTick);}
function playTick(t){if(!S.playing)return;let target=S.playFrame+Math.floor((t-S.playStart)*doc.fps/1000),n=total();if(target>=n){target=target%n;S.playFrame=target;S.playStart=t;stopAudio();try{scheduleAudioAt(target);}catch(e){console.warn(e);}}if(target!==S.frame)frameTo(target);requestAnimationFrame(playTick);}
function stopPlayback(){stopAudio();if(!S.playing)return;S.playing=false;renderAll();}
let toastTimeout;function toast(message){let el=$('#toast');el.textContent=message;el.classList.remove('hidden');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.add('hidden'),3600);}
function openModal(title,body){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=body;$('#modal').classList.remove('hidden');}
function closeModal(){$('#modal').classList.add('hidden');}
// Comprehensive in-app manual. The content is also distributed as MANUAL.html.
const FM_MANUAL_CHAPTERS = [{"id":"guide-01","category":"はじめに","title":"画面構成と基本の流れ","summary":"初めて使うときの作業順序","body":"<p>FLAT MOTIONは、ブラウザでベクターパーツの描画、レイヤーの組み合わせ、キーフレームアニメーション、音声同期と書き出しを行う制作ツールです。</p>\n<ol><li>右側の<b>キャンバス</b>タブで作品名・幅・高さ・FPS・秒数を決めます。</li><li>上部ツールで形を描くか、左の<b>＋素材</b>からSVG・PNGを取り込みます。</li><li>レイヤーで表示順と親子関係を整え、<b>回転軸</b>を関節の位置に合わせます。</li><li>タイムライン上のフレームを移動して姿勢や形を変え、キーを記録します。</li><li>再生で確認し、上部の<b>保存</b>で編集可能なFMSプロジェクトを保存します。完成後に形式を選んで書き出します。</li></ol>\n<p class=\"fm-manual-note\">作品のアートワークは中央、色とレイヤーは左、設定は右、時間の編集は下です。グリッドやサブビューは補助表示で、書き出し画像に直接写りません。</p>"},{"id":"guide-02","category":"はじめに","title":"画面の各エリア","summary":"ヘッダー・左右パネル・キャンバス・タイムライン","body":"<ul><li><b>上部ヘッダー：</b>描画ツール、Undo/Redo、サブビュー、グリッド、全体表示・ズーム、新規・開く・保存・書き出し・ヘルプ。</li><li><b>左上 カラーパレット：</b>プリセット色、現在の描画色、カラーピッカー。</li><li><b>左下 キャラクターパーツ：</b>レイヤー・フォルダー、複数チェック、順序、表示/非表示、ロック、クリッピング、複製・削除。</li><li><b>中央 アートボード：</b>形状の作画、選択ハンドル、頂点・メッシュ・回転軸の直接操作。</li><li><b>右側：</b>「レイヤー」「モーション」「ツール」「キャンバス」の4タブ。項目の見出しをクリックすると個別に折りたためます。</li><li><b>下部 タイムライン：</b>フレーム・キー・音声波形・再生の操作。</li></ul>"},{"id":"guide-03","category":"描画ツール","title":"選択ツール","summary":"移動・回転・拡大縮小、比率固定","body":"<ol><li>上部の<b>選択</b>（V）を押し、キャンバスのパーツをクリックします。</li><li>内部をドラッグして位置を変更します。外側の<b>回転ハンドル</b>で回転、<b>四隅のハンドル</b>で拡大縮小します。</li><li>右側の<b>ツール</b>タブで「縦横比を維持して拡大縮小」をONにすると比率を保ちます。OFFなら縦横を独立して伸縮できます。Shiftを押しながらでも比率固定できます。</li><li>角丸・凹み角を設定した四角形は、伸縮中も角の見た目の半径が変わりにくいよう補正されます。</li></ol>\n<p class=\"fm-manual-note\">位置・回転・倍率の数値は右側の<b>モーション</b>タブでも編集できます。アニメーションのフレームを動かしてから変形すると、設定に応じてキーフレームが作られます。</p>"},{"id":"guide-04","category":"描画ツール","title":"ベジェ（塗り）","summary":"点打ち、開いたパス、直線・ベジェ変換","body":"<ol><li>上部の<b>ベジェ塗り</b>（P）を選択します。</li><li>アートボードをクリックして頂点を順に追加します。作図中は輪郭と点が表示されます。</li><li>3点以上で<b>「塗りを確定」</b>すると閉じた塗り形状になります。2点以上で<b>「開いた線で確定」</b>も選択できます。</li><li>作成後はパスの<b>線の種類</b>で「直線」「ベジェ曲線」「自動スムーズ」を選び直せます。ベジェモードでは頂点と制御ハンドルで形を編集します。</li></ol>\n<p><b>Enter</b>で確定、<b>Esc</b>で作図を中止。作図中の専用ボタンで1点戻すこともできます。点数が足りない場合は確定できません。</p>"},{"id":"guide-05","category":"描画ツール","title":"ベジェ（線画）","summary":"輪郭線専用のパスを作成","body":"<ol><li><b>ベジェ線画</b>（K）を選び、クリックで2点以上を打ちます。</li><li><b>Enter</b>または<b>「線画を確定」</b>で開いた線を作成します。塗りのない独立したベクターパスとして管理します。</li><li>レイヤーの<b>線画オプション</b>で実線・破線・点線を選び、カラー、太さ、破線の長さ・間隔、点の大きさ・間隔を変更します。</li><li><b>頂点</b>ツールで後から点を移動・追加・削除し、曲線の形を調整できます。</li></ol>\n<p class=\"fm-manual-note\">塗り用パスの「アウトライン」と、線画レイヤーの「線画オプション」は異なる設定です。線だけ描きたいときは線画ツールが便利です。</p>"},{"id":"guide-06","category":"描画ツール","title":"直線ツール","summary":"まっすぐな線・角度固定・後編集","body":"<p><b>直線</b>（L）を選び、キャンバスで始点から終点までドラッグします。<b>Shift</b>を押したままなら45°刻みで角度を固定できます。</p>\n<p>描いた直線もベクターパスなので、線画オプションで<b>実線／破線／点線</b>に変更でき、色・太さ・線の間隔を調整できます。頂点を追加したり、パスの線種をベジェ曲線へ切り替えて曲げることもできます。</p>"},{"id":"guide-07","category":"描画ツール","title":"フリーハンド","summary":"マウスやペンで輪郭を描く","body":"<p><b>フリーハンド</b>（B）を選ぶと右側の<b>ツール</b>タブに作画前の設定が表示されます。<b>塗りつぶし／線画</b>のラジオボタンで描画モードを選び、キャンバス上をドラッグして描きます。</p><ol><li><b>塗りつぶし：</b>ドラッグ経路を閉じたベクター形状として作成します。</li><li><b>線画：</b>塗りのない開いたベクターパスを作成します。線幅や実線・破線・点線はレイヤータブの「線画オプション」で変更します。頂点ごとの線幅強弱にも対応します。</li><li><b>最大ポイント数：</b>10〜800点からスライダーで設定します。形状をなるべく維持しながら線を簡略化し、保存されるパスの頂点数を制限します。</li><li><b>自動補正：</b>チェックでON/OFFし、補正の強さを0〜100%で調整します。ドラッグ中の手ぶれを平滑化し、曲線をなめらかにします。角を意図的に残したい場合は弱めるかOFFにします。</li></ol><p>完成後は通常のベクターレイヤーとして移動・回転・頂点編集・モーション設定ができます。設定は次に描く線へ適用され、既存のパスを勝手に書き換えません。</p>\n<p>線画専用の筆線ではなく、連続した点を使って形を作るツールです。線を正確に整えたい場合は<b>ベジェ（線画）</b>や<b>直線</b>を、面を塗りつぶしたい場合は<b>ベジェ（塗り）</b>を使用します。</p>"},{"id":"guide-08","category":"描画ツール","title":"四角形・楕円","summary":"作図時の1:1固定、角丸・凹み角","body":"<ol><li><b>四角形</b>（R）または<b>楕円</b>（E）を選び、ドラッグして描画します。</li><li>右側の<b>ツール</b>タブにある<b>「図形を1:1の比率で描画」</b>をONにすると正方形・正円になります。作図中のShiftでも一時的に固定できます。</li><li>四角形では<b>角を丸める</b>スライダーと<b>角をへこませる</b>スライダーが使用できます。凹ませる角は左上・右上・左下・右下から指定でき、画像のように内側へ丸く削った形にできます。</li></ol>\n<p>通常の角丸と凹み角は併用できます。図形をベジェ頂点として編集したい場合は<b>パスに変換</b>を使用してください。元の四角形専用パラメーターではなく頂点編集になります。</p>"},{"id":"guide-09","category":"描画ツール","title":"頂点・ベジェハンドル","summary":"基本形状、滑らかな曲線、ポイント削減","body":"<ol><li>編集したいパスを選択して<b>頂点</b>（N / M）に切り替えます。</li><li>点をドラッグして位置を変えます。ベジェモードでは入出力ハンドルもドラッグしてカーブを編集します。</li><li>角の点／滑らかな点を切り替えられます。<b>ダブルクリック</b>で頂点を追加、<b>Alt＋クリック</b>で頂点を削除できます。</li><li>右側のパス編集には<b>ポイント数を減らす</b>スライダーがあり、細かすぎる点を減らして簡略化できます。</li></ol>\n<p>最初のフレームでは基本形状の編集、後のフレームでは輪郭モーフの変形キーを作る操作になります。詳細は「輪郭モーフ」を参照してください。</p>"},{"id":"guide-10","category":"描画ツール","title":"パスの角丸","summary":"直角や鋭角を後から丸くする","body":"<p>塗りベジェ・線画ベジェ・折れ線など、角のあるパスを選択し、右側の<b>レイヤー → パスの角丸</b>を使います。半径スライダーは<b>0〜200px</b>で、0に戻すと元の角に戻せます。</p>\n<p>元の頂点やハンドルは削除せず、描画時に丸めます。直線・ベジェ曲線モードで使用し、<b>自動スムーズモードでは角丸処理を適用しません</b>。キーフレームで頂点を動かしても設定を維持できます。</p>"},{"id":"guide-11","category":"描画ツール","title":"メッシュ変形","summary":"格子でPNG・SVG・ベクターを変形する","body":"<ol><li>変形したいレイヤーを選び、右側の<b>モーション → 変形アニメーション</b>に移動します。</li><li>メッシュ分割を<b>2×2、3×3、4×4</b>から選択し、<b>メッシュを作成／編集</b>します。</li><li>上部の<b>メッシュ</b>（G）で交点をドラッグし、髪・服などを曲げたり伸ばしたりします。</li><li>別のフレームで変形すればその時刻にメッシュキーが追加されます。現在の形の初期化・メッシュ解除もできます。</li></ol>\n<p class=\"fm-manual-note\">頂点モーフと異なり、PNGや読み込みSVGにも使える格子変形です。分割数を変更すると既存のメッシュ変形キーが初期化される場合があります。</p>"},{"id":"guide-12","category":"描画ツール","title":"回転軸・手のひら","summary":"関節の位置、ビューの移動・回転・ズーム","body":"<p><b>回転軸</b>（J）：パーツを選んだ状態で中心の軸ハンドルをドラッグし、肩・肘・首などの関節位置へ移します。以後の回転はこの軸を中心に行います。</p>\n<p><b>手のひら</b>（H）：右側<b>ツール</b>タブで<b>移動／回転／拡大縮小</b>をラジオボタンで切り替えます。移動はドラッグ、回転は左右ドラッグ、ズームは上下ドラッグです。回転操作はShiftで15°ごとに固定できます。</p>\n<p>表示の回転・ズームは作品の実データには影響しません。<b>全体表示</b>で表示を整え、上部の＋／−で倍率を変えられます。全体表示の最大倍率は100%です。</p>"},{"id":"guide-13","category":"描画ツール","title":"グラデーション","summary":"線状・円状、色から透明・2色","body":"<ol><li>上部の<b>グラデーション</b>を選び、対象オブジェクトをクリックします。</li><li>対象上でドラッグすると、線状ならドラッグ方向に、円状なら中心から外側へグラデーションを設定できます。</li><li>右側の<b>ツール</b>タブで<b>線状／円状</b>、<b>色→透明／色→色</b>を切り替えます。</li><li>始点色・終点色はカラーピッカーで変更します。適用後もドラッグで方向や広がりを変え、解除することもできます。</li></ol>\n<p>ベクター図形・パスだけでなく読み込んだSVGやPNGへの設定にも対応しています。グラデーションの向きは対象とともに移動・回転・拡大縮小されます。</p>"},{"id":"guide-14","category":"描画ツール","title":"切り抜きツール","summary":"選択範囲の内側／交差部分を削除する","body":"<p><b>切り抜き</b>（C）は指定箇所を<b>透明にして消す</b>機能です。クリッピングとは逆に、<b>内側が消えて外側が残ります</b>。元画像やパスは保持するため、切り抜き解除やCtrl+Zで戻せます。</p>\n<ol><li>上部の<b>切り抜き</b>を選び、右の<b>ツール</b>タブで<b>選択範囲／交差</b>を選択します。</li><li><b>選択範囲：</b>「四角形ドラッグ」ならキャンバス上をドラッグ。「オブジェクト指定」ならプルダウンで選択元を選びます。さらに<b>切り抜き対象</b>を指定します。</li><li>選択範囲のスライダーは<b>−100〜＋100px</b>。0が基準、右に動かすほど削除範囲が広がり、左に動かすほど狭くなります。</li><li><b>交差：</b>①削除したい対象、②削除範囲の元となるオブジェクトをプルダウンで指定します。2つが重なる部分だけを消します。選択範囲の指定は不要です。</li><li><b>「内側を切り抜く」</b>で確定します。<b>対象の切り抜き解除</b>、<b>選択範囲を解除</b>も利用できます。</li></ol>\n<p class=\"fm-manual-note\">フォルダー全体も対象にできます。交差の元は適用時の形状を基準にします。「下のレイヤーにクリッピング」は描画する範囲を残す処理なので用途が異なります。</p>"},{"id":"guide-15","category":"レイヤーと見た目","title":"レイヤーの基本操作","summary":"表示順、複製、名前変更、ロック","body":"<ul><li><b>＋素材：</b>外部SVG/PNGを追加します。作成したパーツは左の一覧に表示されます。</li><li><b>クリック：</b>対象を編集するレイヤーとして選択。<b>レイヤー名をダブルクリック</b>するとその場で変更できます（Enterで確定、Escで取り消し）。</li><li><b>目：</b>表示／非表示。<b>鍵：</b>編集ロック。<b>↳：</b>クリッピングを切り替えます。</li><li><b>複製：</b>選択レイヤーのコピーを作ります。<b>上下ボタン：</b>重なり順を変更。<b>削除：</b>対象を取り除きます。</li></ul>\n<p>重なり順はアニメーションの見え方に影響します。影・肌・衣服のように別レイヤーを作り、必要ならクリッピングを使ってください。</p>"},{"id":"guide-16","category":"レイヤーと見た目","title":"チェック式複数選択","summary":"フォルダー化せずにまとめて移動","body":"<ol><li>左のレイヤーパネルの<b>先頭チェックボックス</b>を複数ONにします。</li><li>選択ツールで選ばれたパーツの1つをドラッグすると、チェックしたレイヤーを<b>一括移動</b>できます。</li><li>この選択は一時的なもので、レイヤーの所属フォルダーや親子関係は変更しません。</li><li>複数選択したまま<b>フォルダー作成ボタン</b>を押すと、選択したパーツをまとめて収納できます。</li></ol>\n<p>フォルダーとその内部のレイヤーを同時にチェックした場合に二重に移動しないよう処理されています。永続的にグループ単位で回転やアニメーションを付けたい場合はフォルダーを作るのがおすすめです。</p>"},{"id":"guide-17","category":"レイヤーと見た目","title":"フォルダーとグループ","summary":"収納、入れ子、変形、キー、表示切り替え","body":"<ol><li>左のフォルダーボタンで<b>新規フォルダー</b>を作ります。選択中のパーツを収納する使い方もできます。</li><li>レイヤーをフォルダーへ<b>ドラッグ＆ドロップ</b>すると収納できます。フォルダーの外へ移すドロップ領域も用意されています。</li><li>フォルダーは<b>入れ子</b>にでき、折りたたみ・展開が可能です。</li><li>フォルダーを選択して移動・回転・拡大縮小すると内部のパーツがまとめて動きます。フォルダー単位でもキーフレームを追加できます。</li><li>フォルダーの表示／非表示とロックは中のパーツにも反映されます。フォルダー解除後は個々のパーツとして扱えます。</li></ol>\n<p>フォルダー内のパーツは個別に編集できます。フォルダーへのクリッピング、フォルダー自身から下のレイヤーへのクリッピングにも対応しています。</p>"},{"id":"guide-18","category":"レイヤーと見た目","title":"クリッピング","summary":"下にあるレイヤー・フォルダーの形で表示を制限","body":"<p>上のレイヤーまたはフォルダーを選び、左の<b>↳</b>、または右側<b>レイヤー</b>タブの<b>「下のレイヤー／フォルダーにクリッピング」</b>をONにします。直下の非クリッピング項目が下地になります。</p>\n<p>例：顔の上に大きめの影形状を描き、その影を<b>肌</b>レイヤーにクリッピングすると、肌の不透明な部分だけに影が表示されます。複数のクリッピング項目が連続する場合は同じ下地を共有します。</p>\n<p>レイヤー→フォルダー、フォルダー→レイヤー、フォルダー→フォルダー、入れ子の組み合わせにも対応しています。</p>\n<p class=\"fm-manual-note\"><b>切り抜きとの違い：</b>クリッピング＝下地の内側を「残す」。切り抜き＝指定範囲の内側を「消す」。</p>"},{"id":"guide-19","category":"レイヤーと見た目","title":"塗り・線画・アウトライン","summary":"塗り非表示、実線・破線・点線","body":"<p>右側の<b>レイヤー</b>タブでは、パーツの塗り色や線色・太さを変更できます。<b>「塗りを非表示」</b>をONにすると内部の塗りだけが消え、アウトラインを残せます。</p>\n<ul><li><b>ベクターのアウトライン：</b>チェックON/OFF、実線・破線（短線の長さと間隔）・点線（丸点の大きさと間隔）、カラー、線幅を指定。オブジェクトの<b>上</b>に描画されます。</li><li><b>線画レイヤー：</b>ベジェ線画・直線で描いた線の線画オプションから、実線・破線・点線・色・幅を変更します。</li><li><b>閉じた形状と開いた線：</b>塗り用と線画用で操作項目が異なります。線画を描きたい場合は線画ツールを使います。</li></ul>"},{"id":"guide-20","category":"レイヤーと見た目","title":"フチ・ドロップシャドウ・ぼかし","summary":"レイヤー・フォルダー共通エフェクト","body":"<p>レイヤーまたはフォルダーを選択し、右側<b>レイヤー → エフェクト</b>からそれぞれON/OFFします。複数を併用できます。</p>\n<ul><li><b>フチ：</b>太さスライダーとカラーピッカー。<b>内側／外側</b>の切り替えができます。</li><li><b>ドロップシャドウ：</b>色、濃度、ぼかしの大きさ、位置ずらし<b>X／Y</b>を調整できます。</li><li><b>ぼかし：</b>ON/OFFと<b>0〜50px</b>の強さスライダー。フォルダーなら中のパーツ全体にかけられます。</li></ul>\n<p>エフェクトの重なりは、基本的に<b>影が最背面、フチがその上、本体が最前面</b>です。影とフチのアニメーションについては「エフェクトアニメーション」を参照してください。</p>"},{"id":"guide-21","category":"モーション","title":"親パーツ・関節リギング","summary":"胴体→腕→前腕などの親子連動","body":"<ol><li>頭・胴体・上腕・前腕などを別パーツとして用意します。</li><li>右側<b>レイヤー → 親パーツ</b>で、子にしたいパーツの親をプルダウンから設定します。</li><li><b>回転軸</b>ツールで肩・肘・首などの関節位置へ軸を移します。</li><li>親を移動・回転すると子も追従し、子自身には独立したキーを設定できます。</li></ol>\n<p>フォルダーでの分類と親子リギングは別の仕組みです。フォルダーは集合全体の変形、親子は関節的な連動に使い分けます。</p>"},{"id":"guide-22","category":"モーション","title":"位置・回転・拡大縮小のキー","summary":"自動キー、手動キー、補間、キーフレーム移動","body":"<ol><li>タイムラインをクリックして作業するフレームへ移動します。</li><li>対象レイヤーを選択し、キャンバスで移動・回転・拡縮するか、右の<b>モーション</b>タブで位置X/Y・回転・倍率・不透明度を入力します。</li><li><b>自動キー</b>をONにすると操作した時点のキーが記録されます。手動なら<b>◆ キー追加</b>を使います。</li><li>キーの<b>補間方式</b>は「なめらか」「一定速度」「加速」「減速」「コマ送り（切替）」から選べます。</li><li>タイムラインのキーを左右にドラッグして時刻を変更できます。最初のフレームのキーは移動できません。</li></ol>\n<p>前後のキーの間は、選択した補間方式で自動的に動きます。右側モーションの<b>キー削除</b>から不要なキーを除けます。</p>"},{"id":"guide-23","category":"モーション","title":"輪郭モーフ（頂点変形）","summary":"パスの形そのものをフレームごとに変える","body":"<ol><li>ベジェパスを選択して<b>頂点</b>ツールにします。四角形・楕円なら先に<b>パスに変換</b>します。</li><li>最初のフレームで基本となる輪郭を作ります。</li><li>別のフレームに移動して頂点をドラッグすると、そのフレームの<b>輪郭モーフキー</b>が作られます。</li><li>複数フレームを設定すると輪郭が補間されます。初期化やモーフキーの削除も可能です。</li></ol>\n<p>モーフは<b>同じ頂点数と並び順</b>を基準に補間します。ポイント数の削減には、対応する変形キーも合わせる処理があります。タイムラインでは通常の姿勢キーと別の色・形で表示されます。</p>"},{"id":"guide-24","category":"モーション","title":"メッシュ変形アニメーション","summary":"格子点にキーを打ち、ゆらぎを作る","body":"<p>メッシュは姿勢キーとは別の変形キーです。現在フレームでメッシュの交点をドラッグするとキーが作成され、前後のメッシュ形状を補間します。</p>\n<p>分割数は<b>2×2／3×3／4×4</b>。軽く動かしたいときは2×2、細かく曲げたいときは4×4が目安です。<b>現在の形を初期化</b>、<b>メッシュ解除</b>、<b>ゆらゆら／ぷにっと伸縮</b>の変形プリセットも使用できます。</p>"},{"id":"guide-25","category":"モーション","title":"エフェクトアニメーション","summary":"影やフチ、ぼかしの変化を記録","body":"<ol><li>対象のレイヤー／フォルダーを選択し、右側<b>レイヤー</b>で影・フチ・ぼかしの見た目を設定します。</li><li>タイムラインを希望のフレームに移動し、右側<b>モーション → エフェクトアニメーション</b>から<b>エフェクトキー</b>を追加します。</li><li>濃度・色・ぼかし・太さ・位置X/Yなどの設定を変えて別のフレームにもキーを置くと、中間フレームで補間されます。</li><li>不要になった現在のエフェクトキーは削除できます。</li></ol>\n<p>色の変化は前後の設定をもとに計算されます。ON/OFFなど連続量でない値は設定が切り替わるタイミングがあります。</p>"},{"id":"guide-26","category":"モーション","title":"簡単モーションと再生","summary":"呼吸・左右振り・浮遊・まばたき","body":"<p>右側<b>モーション → 簡単モーション</b>から、<b>ゆっくり呼吸／左右に振る／浮遊する／まばたき</b>を選択レイヤーに適用できます。プリセットはフレーム上にキーを配置するため、後から数値とタイミングを調整できます。</p>\n<p>下部の<b>▶</b>で再生・停止、先頭・次のフレームのボタンやタイムラインの目盛りで確認します。<b>前フレーム／次フレーム</b>のオニオンスキンをONにすると薄い前後姿勢を重ねて表示します。</p>"},{"id":"guide-27","category":"タイムラインと音声","title":"タイムラインの見方","summary":"トラック、フレーム、キーの種類","body":"<ul><li><b>横軸：</b>時間。FPS設定に応じたフレームで構成され、赤い縦線が現在の再生位置です。</li><li><b>パーツ行：</b>レイヤーやフォルダーごとにキーを表示。通常の姿勢キー、頂点変形キー、メッシュキー、エフェクトキーを区別します。</li><li><b>キー追加／削除：</b>選択した対象と現在フレームに対して操作します。</li><li><b>目盛り・キーのドラッグ：</b>再生位置の変更、キーの時間移動に使います。</li><li><b>自動キー：</b>変形を記録する切り替え。<b>前/次フレーム：</b>オニオンスキン表示。</li></ul>"},{"id":"guide-28","category":"タイムラインと音声","title":"音声トラック","summary":"MP3/WAVの読み込み、波形、同期と音量","body":"<ol><li>下部の<b>＋ 音声</b>を押し、MP3・WAV・OGG等の音声ファイルを選びます。複数ファイルを追加できます。</li><li>タイムラインに波形が表示されます。<b>音声クリップを左右ドラッグ</b>して開始フレームを調整します。</li><li>各クリップの音量スライダー、ミュート、削除で調整します。途中フレームからの再生にも対応します。</li><li>WebM書き出し時は対応ブラウザで音声を含められます。FMS保存には音源のデータも埋め込まれます。</li></ol>\n<p class=\"fm-manual-note\">1ファイルあたり26MBを超える音声は読み込みできません。音声・参考画像が増えるとFMSファイルが大きくなるため、定期的にファイル保存してください。</p>"},{"id":"guide-29","category":"キャンバスと資料","title":"カラーパレットとスポイト","summary":"色選択、サブビューからの色取得","body":"<p>左側の丸い色見本をクリックすると描画色が変わります。<b>描画色</b>のカラーピッカーから好きな色も指定できます。</p>\n<p>上部<b>サブビュー</b>を開くと、資料画像を複数登録できます。サムネイルや前・次ボタンで画像を切り替え、<b>スポイト</b>モードで画像をクリックするとクリック位置の色を取得します。カラーコードの表示・コピー、現在の描画色への反映ができます。</p>\n<p>資料を<b>手のひら</b>モードで移動し、ホイールや＋/−で拡大縮小できます。サブビュー自体も移動・サイズ変更可能です。<b>「選択中の塗りに反映」</b>で対象レイヤーの塗りにも適用できます。資料は作画レイヤーとは独立しています。</p>"},{"id":"guide-30","category":"キャンバスと資料","title":"キャンバス・グリッド設定","summary":"作品サイズ、FPS、透明背景、マス目の見た目","body":"<p>右側<b>キャンバス</b>タブでは、<b>作品名、幅・高さ、FPS、再生秒数、背景色、背景透明</b>を設定できます。</p>\n<p><b>グリッド設定</b>には、表示／非表示、マス目サイズ（<b>8〜256px</b>）、透明度（<b>0〜100%</b>）、グリッド色があります。透明度0%が最も濃く、100%は透明です。</p>\n<p>グリッドはズームやビュー回転に追従しますが、PNG・SVG・動画に直接書き出されません。画面上部の<b>▦</b>ボタンでも表示切替ができます。</p>"},{"id":"guide-31","category":"保存と書き出し","title":"プロジェクトの保存・読込","summary":"編集可能なFMS・ブラウザ内の一時保存","body":"<ol><li>上部の<b>保存</b>から作品を<b>.fms.json</b>形式で保存します。形状、レイヤー、各種設定、キー、音声や資料画像を再編集できます。</li><li><b>開く</b>で過去に保存したJSONを読み込みます。<b>新規</b>は現在のプロジェクトを閉じて新規作成します。</li><li>ブラウザ内にも編集データの保存を試みますが、容量制限・ブラウザの設定・キャッシュ削除などで復元できない場合があります。<b>必ずファイルとして保存</b>してください。</li></ol>\n<p>編集の<b>Ctrl+Z／Ctrl+Y</b>は操作履歴のUndo/Redoです。元データを安全に残したい場合はプロジェクトの別名コピーを作成してください。</p>"},{"id":"guide-32","category":"保存と書き出し","title":"書き出し形式","summary":"SVG・PNG・PNG連番・HTML・WebM","body":"<ul><li><b>PNG画像：</b>現在のフレームを静止画として出力。背景透明設定に対応します。</li><li><b>SVGベクター：</b>現在フレームをSVGに出力。形状をベクターデータとして扱えます。</li><li><b>PNG連番 ZIP：</b>アニメーションの全フレームを連番PNGにしてZIPへ保存。動画編集ソフトへ持ち込む場合に便利です。</li><li><b>アニメーションHTML：</b>ブラウザで単体再生できるHTML。キーフレームや音声再生を含みます。</li><li><b>WebM動画：</b>対応ブラウザでアニメーションを動画化。音声を含めた出力にも対応します。</li></ul>\n<p>書き出しメニューは<b>上部の「書き出し」</b>、または<b>キャンバス</b>タブ内にあります。静止画は現在のフレーム、連番・動画・再生HTMLは全体が対象です。</p>\n<p class=\"fm-manual-note\">動画出力はブラウザのMediaRecorder/コーデックの対応状況に依存します。必要な形式が使えない場合はPNG連番を出力して動画編集ソフトで組み立ててください。</p>"},{"id":"guide-33","category":"リファレンス","title":"ショートカット一覧","summary":"キー操作をすぐに確認","body":"<table class=\"fm-manual-table\"><thead><tr><th>キー</th><th>動作</th></tr></thead><tbody>\n<tr><td>V / C</td><td>選択 / 切り抜き</td></tr><tr><td>N または M</td><td>頂点</td></tr><tr><td>P / K / L</td><td>ベジェ（塗り） / ベジェ（線画） / 直線</td></tr><tr><td>B / R / E</td><td>フリーハンド / 四角形 / 楕円</td></tr><tr><td>G / J / H</td><td>メッシュ / 回転軸 / 手のひら</td></tr><tr><td>Enter / Esc</td><td>パス確定 / パス作図キャンセル</td></tr><tr><td>Space</td><td>再生・停止</td></tr><tr><td>← / →</td><td>1フレーム戻る / 進む</td></tr><tr><td>Delete / Backspace</td><td>選択パーツを削除</td></tr><tr><td>Ctrl+Z / Ctrl+Y</td><td>元に戻す / やり直し</td></tr><tr><td>Ctrl+S</td><td>FMSプロジェクト保存</td></tr><tr><td>Shift＋四隅ドラッグ</td><td>縦横比を維持して変形</td></tr><tr><td>Shift＋直線ドラッグ</td><td>45°刻みの角度固定</td></tr><tr><td>頂点上でAlt＋クリック</td><td>頂点削除</td></tr><tr><td>頂点ツールでダブルクリック</td><td>頂点追加</td></tr></tbody></table>\n<p>テキスト入力欄にフォーカスがある場合は通常の文字入力を優先します。ショートカットによって選択パーツや現在フレームが変わるため、意図しない場合はCtrl+Zで戻してください。</p>"},{"id":"guide-34","category":"リファレンス","title":"よくある疑問・トラブル","summary":"描けない・見えない・動かないとき","body":"<ul><li><b>ベジェが何も描けない：</b>クリックで2点以上（塗り確定は3点以上）を打ち、Enterまたは画面上の確定ボタンを押してください。</li><li><b>アウトラインが見えない：</b>塗り非表示だけでなく、アウトラインのONと線幅・色を確認します。線画レイヤーは線画オプションを見ます。</li><li><b>選択したのに動かせない：</b>レイヤーの鍵、フォルダーの鍵、編集中のツール、クリッピングの可視状態を確認します。</li><li><b>全体表示が100%なのは：</b>自動全体表示の最大値が100%に設定されているためです。手動の＋操作ならさらに拡大できます。</li><li><b>グリッドが見えない：</b>キャンバスタブでグリッド表示と透明度を確認します。透明度100%は見えません。</li><li><b>切り抜きで残る側が逆：</b>切り抜きは選択内側の削除、クリッピングは下地の内側だけ残す処理です。</li><li><b>サブビューの画像が出ない：</b>画像形式を確認し、追加後にサムネイルを選びます。サブビューのズームを全体表示に戻してみてください。</li><li><b>書き出しができない：</b>動画コーデックやブラウザ権限、音声のデコード、メモリ不足の可能性があります。まずPNG・SVGを試してください。</li><li><b>保存したつもりなのに消えた：</b>ブラウザ内保存は保証されません。必ず「保存」からFMSファイルを作成してください。</li></ul>"},{"id":"guide-35","category":"リファレンス","title":"作例：表情が動くキャラクター","summary":"描く→親子設定→モーション→動画","body":"<ol><li>キャンバスで顔の土台を楕円やベジェ塗りで作り、目・口・眉毛を別レイヤーに描きます。</li><li>顔フォルダーを作ってパーツを収納し、必要なら顔の回転軸を首の位置へ移します。</li><li>目の線画パスは「ベジェ線画」、ほおの影は別の塗りベジェを使い、肌へクリッピングします。</li><li>0フレームで通常の表情、途中フレームで目の形を頂点モーフで変えます。必要ならまばたきプリセットを使用します。</li><li>フォルダーごと顔を左右へ回転させて姿勢キーを追加します。</li><li>タイムラインにBGMやSEを置き、▶で確認。FMS保存後、PNG連番・WebM・再生HTMLなどへ書き出します。</li></ol>\n<p class=\"fm-manual-note\">作画・色・関節・動きの設定はレイヤーごとに保持されます。後から修正しやすいよう、役割ごとにパーツを分けてください。</p>"}];
FM_MANUAL_CHAPTERS.push({id:'guide-36',category:'レイヤー・グループ',title:'複製配置：四角形／円形／直線',summary:'数・角度・間隔を調整して並べる',body:'<ol><li>複製したいレイヤーまたはフォルダーを選びます。</li><li>右側の<b>レイヤー</b>タブから<b>複製配置</b>を展開します。</li><li><b>複製配置を使用する</b>にチェックし、形状を四角形（周囲）・円形（円周）・直線から選択します。</li><li>複製数（元のオブジェクトを除く）と、各オブジェクトの角度をスライダーで調整します。</li><li>形状の幅・高さ・半径・長さで配置位置を設定します。<b>複製間隔</b>はオブジェクトの端から次のオブジェクトの端までの余白を調整します。円形の半径は変化せず、円周上で並ぶ角度が変化します。</li><li>不要になったらチェックを外して元の一つの形に戻します。</li></ol><p class="fm-manual-note">非破壊の複製です。設定だけ保存され、元の頂点やベクター形状は消えません。フォルダーへ設定すると中のパーツがまとめて並び、アニメーションやSVG・PNG出力にも反映されます。</p>'});
FM_MANUAL_CHAPTERS.push({id:'guide-37',category:'描画ツール',title:'テキスト・縦書き・円形／アーチ配置とパス化',summary:'文字を編集し、ロゴをベクターの頂点に変換する',body:"<ol><li>上部の<b>テキスト</b>を選び、キャンバスをクリックして文字レイヤーを作成します。</li><li>右側<b>レイヤー → 文字・レイアウト</b>に文章を入力。フォント・サイズ・字間・太さを設定します。日本語のゴシック・明朝も選べます。</li><li><b>文字の向き</b>を横書きまたは縦書き（右の列から左へ）に切り替えられます。縦書きでは句読点・括弧の縦組み置換、英数字の90°回転、行の長さ・列間隔を調整できます。</li><li><b>配置</b>を直線・円形・アーチ状から選択します。円形/アーチ状では半径、アーチ角度、開始位置をスライダーで変更できます。</li><li>テキストレイヤーの<b>複製配置</b>も使用できます。元の文字を修正すると複製へ反映されます。</li><li>ロゴを輪郭編集したい場合は文字を選択して<b>文字をパスに変換</b>を押します。フォルダー内に1文字ずつ編集可能なベクターパーツが作られます。</li><li>変換した文字パーツを選び、<b>頂点</b>ツールで輪郭をドラッグ。内側の穴などは<b>パス・ベジェ編集 → 編集する輪郭</b>で切り替えます。</li></ol><p class=\"fm-manual-note\">パス化はブラウザ上の文字の輪郭を画像から近似抽出して生成する方式です。元フォントの制御点とは一致しない場合があります。変換前の文字レイヤーは非表示で保持されます。端末内のフォントに加え、手持ちのフォントを読み込んで使用することもできます。</p>"});
FM_MANUAL_CHAPTERS.push({id:'guide-38',category:'テキスト・ロゴ制作',title:'手持ちフォントの登録と頂点の表示サイズ',summary:'フォントの持ち込み・パス化・細かい頂点編集',body:"<ol><li><b>テキスト</b>ツールで文字レイヤーを作ります。</li><li>レイヤータブの<b>文字・レイアウト → 手持ちのフォント</b>で<b>＋ フォントファイルを登録</b>をクリック。TTF／OTF／WOFF／WOFF2を選びます（1ファイル16MB以下）。</li><li>読み込み後は「フォント」プルダウンに登録名が追加されます。複数登録もでき、選択中の文字レイヤーへ適用できます。</li><li><b>文字をパス化（頂点編集）</b>する場合は、フォントの読み込み完了後に実行します。フォントの輪郭を近似トレースするため、元フォントの編集用制御点とは一致しません。</li><li>パス化した1文字のレイヤーを選び、上部の<b>頂点</b>ツールへ切り替えます。右側の<b>ツール</b>タブで<b>頂点の表示サイズ</b>（1～7px）を調整できます。最初は2.5px、点を見やすく小さくしてもクリックできる範囲は残ります。</li></ol><p class=\"fm-manual-note\">登録フォントはFMSプロジェクト内に埋め込まれます。ブラウザのフォント一覧でも再利用できます（保存領域が利用できる場合）。SVGへの書き出しにもフォントの情報を含みます。外部配布する作品でフォントを使用する場合は、各フォントのライセンスと埋め込み・再配布条件を確認してください。</p>"});
FM_MANUAL_CHAPTERS.push({id:'guide-39',category:'線画・頂点編集',title:'頂点ごとに線の太さを変える',summary:'線全体と頂点ごとの線幅・強弱を調整',body:'<ol><li><b>ベジェ（線画）</b>または<b>直線</b>で描いた線画レイヤーを選びます。</li><li><b>選択ツール</b>でレイヤーを選んだ状態では、「ツール」タブの「線全体の太さ」スライダー、またはレイヤータブの「線画オプション」で、線全体の基準幅を変更できます。</li><li><b>頂点ツール</b>に切り替え、太さを変えたい頂点の丸をクリックします。</li><li>レイヤータブの「選択頂点の線幅」またはツールタブの「選択頂点の線の太さ」をスライダーで調整します。選んだ頂点だけ変化し、隣接する頂点へ滑らかに補間されます。</li><li>別の頂点を選んで同様に調整すると、太いところと細いところのある線になります。線全体の幅を再変更しても、頂点同士の強弱比率は保たれます。</li></ol><p class="fm-manual-note">頂点をまだ選択していない場合は、線全体の設定が表示されます。実線・破線・点線に対応し、FMS保存・SVG/PNG・動画・再生HTMLにも強弱を反映します。通常の均一な線は従来のSVGストロークで描画します。</p>'});

FM_MANUAL_CHAPTERS.push({"id":"guide-auto-vertex-correction","category":"描画と編集","title":"編集後の頂点自動補正","summary":"線画・ベジェの細かな揺れを選択ツールから整える","body":"<p>頂点を編集したあと、<b>選択ツール</b>で線画ベジェ・塗りベジェ・フリーハンドのパスを選び、右の<b>ツール</b>タブにある「頂点の自動補正」を開きます。</p><ol><li>補正の強度を0〜100%から設定します。弱くすると輪郭を保ち、強くすると小さな凸凹を積極的に整えます。</li><li>「自動補正を適用」をクリックします。補正後も同じパスを編集できます。</li><li>やり直す場合はCtrl+Z（Undo）で元に戻し、別の強度で再実行します。</li></ol><p class=\"fm-manual-note\">開いた線の始点と終点、鋭い角、頂点数、頂点ごとの線幅強弱を維持します。直線モードはベジェ曲線に変換されます。2点だけの線やPNG・SVG・文字レイヤーは直接補正できません。文字はパス化してから選択してください。</p><p>フレーム0で補正すると元の輪郭と既存の変形キーに同じ補正量を反映し、それ以降では現在のフレームの頂点変形キーとして保存します。</p>"});
FM_MANUAL_CHAPTERS.push({"id": "guide-39", "category": "レイヤー・グループ", "title": "素材ライブラリ：登録・整理・別プロジェクトへ配置", "summary": "プロジェクト共通素材／フォルダー／検索／JSONバックアップ", "body": "<p>左側のパネルは<b>レイヤー／素材</b>タブで切り替えられます。素材ライブラリは作品のFMSファイルとは別に、同じブラウザ・同じ公開URLに保存されます。別プロジェクトへ作品を切り替えても登録素材を使えます。</p>\n<ol><li><b>登録：</b>レイヤータブで素材化したいレイヤーまたはフォルダーを選択（複数チェックにも対応）→素材タブ→<b>＋ 登録</b>→名前を入力します。フォルダー内のパーツ、キーフレーム、クリッピング、エフェクト、テキストで使用した登録フォントも一緒に保存されます。</li><li><b>配置：</b>素材タブの<b>＋ 配置</b>をクリックすると現在のキャンバス中央へ追加できます。素材をキャンバスへドラッグすると、その位置へ配置できます。元の素材とは独立したコピーなので配置後も編集できます。</li><li><b>整理：</b><b>＋ フォルダー</b>でフォルダーを作成します。フォルダーを開くと中身を表示。素材を別のフォルダーへドラッグするか、行の上下にドラッグすると並び替えできます。上部の「すべて」などパンくずにもドラッグでき、フォルダーを出し入れできます。</li><li><b>検索：</b>検索欄へファイル名・素材名やフォルダー名を入力します。検索中も「＋ 配置」から素材を追加できます。</li><li><b>名前変更・削除：</b>行の名前をダブルクリックして変更、×から削除します。フォルダーを削除すると中の素材も削除されます。</li><li><b>バックアップ：</b><b>JSON保存</b>でライブラリ専用の<code>FlatMotion_MaterialLibrary.json</code>を作成します。<b>JSON読込</b>は「追加する」（現在のデータと結合）または「置き換え」を選択できます。</li></ol>\n<p class=\"fm-manual-note\">FMSプロジェクトファイルには素材ライブラリそのものを含めません。別の端末・ブラウザ・ドメインで使う場合は、必ずライブラリ専用JSONを保存して読み込んでください。ローカルストレージの自動保存はブラウザ側のデータ消去で失われる可能性があり、バックアップを推奨します。</p>"});

FM_MANUAL_CHAPTERS.push({"id":"guide-merge-objects","category":"レイヤー・グループ","title":"オブジェクト統合（非破壊・編集可能）","summary":"色・ベジェパスを保持した統合と統合解除","body":"<ol><li>レイヤー一覧で、同じフォルダー内にある重なり順が連続した2つ以上のレイヤーのチェックをONにします。</li><li><b>「◇ オブジェクトを統合」</b>を押すと編集可能な統合オブジェクトになります。元の色・頂点・キーフレームは消えません。</li><li>レイヤー左の▶を開くか、右の<b>「中のパーツを編集」</b>を押し、内部レイヤーを選んで色やパスを変更できます。</li><li>統合したまま全体を移動・回転できます。個々のパーツに戻す場合は<b>「統合解除」</b>を使ってください。</li></ol><p>従来バージョンで作った<b>焼き込み済みの統合オブジェクト</b>には、元の色・頂点の独立情報が保存されていないため、統合解除できません。新しい統合から非破壊方式になります。見た目や親子・クリッピングを壊す選択は統合を中止して通知します。</p>"});

function openFullManual(){
 let box=document.getElementById('fmManualOverlay');
 if(!box){
   box=document.createElement('div');box.id='fmManualOverlay';box.className='fm-manual-overlay';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','FLAT MOTION 完全マニュアル');
   box.innerHTML=`<div class="fm-manual-panel"><header class="fm-manual-header"><div class="fm-manual-brand"><img src="assets/help.png" alt=""><div><span class="fm-manual-eyebrow">FLAT MOTION / GUIDE BOOK</span><h1>使い方・完全マニュアル</h1></div></div><div class="fm-manual-header-actions"><button type="button" id="fmManualExpand">すべて開く</button><button type="button" id="fmManualClose" aria-label="マニュアルを閉じる">×</button></div></header><div class="fm-manual-searchbox"><span aria-hidden="true">⌕</span><input type="search" id="fmManualSearch" placeholder="ツール名・操作・機能から検索" aria-label="マニュアル内を検索"><span id="fmManualCount"></span></div><div class="fm-manual-layout"><nav class="fm-manual-nav" id="fmManualNav" aria-label="マニュアルの目次"></nav><div class="fm-manual-content" id="fmManualContent" tabindex="0"></div></div><footer class="fm-manual-footer"><span>操作と仕様はこのバージョンに対応しています。FMS保存を忘れずに。</span><button type="button" id="fmManualBackTop">最初へ戻る ↑</button></footer></div>`;
   document.body.appendChild(box);
   const nav=box.querySelector('#fmManualNav'),content=box.querySelector('#fmManualContent');let lastCategory='';
   FM_MANUAL_CHAPTERS.forEach((ch,i)=>{
    if(ch.category!==lastCategory){const label=document.createElement('div');label.className='fm-manual-nav-category';label.textContent=ch.category;nav.appendChild(label);lastCategory=ch.category;}
    const anchor=document.createElement('button');anchor.type='button';anchor.className='fm-manual-nav-link';anchor.dataset.manualLink=ch.id;anchor.textContent=ch.title;nav.appendChild(anchor);
    const section=document.createElement('section');section.className='fm-manual-chapter';section.id=ch.id;section.dataset.manualChapter=ch.id;section.dataset.searchText=(ch.category+' '+ch.title+' '+ch.summary+' '+ch.body.replace(/<[^>]+>/g,' ')).toLowerCase();
    section.innerHTML=`<div class="fm-manual-chapter-head"><span class="fm-manual-chapter-number">${String(i+1).padStart(2,'0')}</span><div class="fm-manual-chapter-heading"><span>${ch.category}</span><h2>${ch.title}</h2><p>${ch.summary}</p></div><button class="fm-manual-chapter-toggle" type="button" aria-expanded="true" aria-label="${ch.title}を折りたたむ">−</button></div><div class="fm-manual-chapter-body">${ch.body}</div>`;
    content.appendChild(section);
   });
   function toggleChapter(section,open){section.classList.toggle('is-folded',!open);const toggle=section.querySelector('.fm-manual-chapter-toggle');toggle.textContent=open?'−':'＋';toggle.setAttribute('aria-expanded',String(open));}
   box.querySelector('#fmManualClose').addEventListener('click',closeFullManual);
   box.addEventListener('pointerdown',e=>{if(e.target===box)closeFullManual();});
   content.addEventListener('click',e=>{const btn=e.target.closest('.fm-manual-chapter-toggle');if(btn)toggleChapter(btn.closest('.fm-manual-chapter'),btn.getAttribute('aria-expanded')!=='true');});
   nav.addEventListener('click',e=>{const target=e.target.closest('[data-manual-link]');if(!target)return;const section=document.getElementById(target.dataset.manualLink);if(!section||section.hidden)return;toggleChapter(section,true);content.scrollTo({top:section.offsetTop-content.offsetTop-8,behavior:'smooth'});nav.querySelectorAll('.fm-manual-nav-link').forEach(b=>b.classList.toggle('is-active',b===target));});
   const search=box.querySelector('#fmManualSearch');search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase(),sections=[...content.querySelectorAll('.fm-manual-chapter')];let shown=0;sections.forEach((section,i)=>{const matched=!q||section.dataset.searchText.includes(q);section.hidden=!matched;const link=nav.querySelector(`[data-manual-link="${section.id}"]`);if(link)link.hidden=!matched;if(matched){shown++;if(q)toggleChapter(section,true);}});[...nav.querySelectorAll('.fm-manual-nav-category')].forEach(cat=>{let next=cat.nextElementSibling,any=false;while(next&&!next.classList.contains('fm-manual-nav-category')){if(!next.hidden)any=true;next=next.nextElementSibling;}cat.hidden=!any;});box.querySelector('#fmManualCount').textContent=`${shown} / ${sections.length} 項目`;content.scrollTop=0;});
   let allExpanded=true;box.querySelector('#fmManualExpand').addEventListener('click',()=>{allExpanded=!allExpanded;content.querySelectorAll('.fm-manual-chapter:not([hidden])').forEach(section=>toggleChapter(section,allExpanded));box.querySelector('#fmManualExpand').textContent=allExpanded?'すべて閉じる':'すべて開く';});
   box.querySelector('#fmManualBackTop').addEventListener('click',()=>{content.scrollTo({top:0,behavior:'smooth'});});
 }
 box.style.display='flex';document.body.classList.add('fm-manual-open');const search=box.querySelector('#fmManualSearch');search.value='';search.dispatchEvent(new Event('input'));box.querySelector('#fmManualContent').scrollTop=0;box.querySelectorAll('.fm-manual-chapter').forEach(s=>{s.classList.remove('is-folded');const b=s.querySelector('.fm-manual-chapter-toggle');b.textContent='−';b.setAttribute('aria-expanded','true');});box.querySelector('#fmManualExpand').textContent='すべて閉じる';box.querySelector('#fmManualNav .fm-manual-nav-link')?.classList.add('is-active');search.focus({preventScroll:true});
}
function closeFullManual(){const box=document.getElementById('fmManualOverlay');if(box)box.style.display='none';document.body.classList.remove('fm-manual-open');document.querySelector('button[data-action="help"]')?.focus({preventScroll:true});}
function help(){openFullManual();}

function newProject(){if((doc.layers.length||doc.audio?.length||doc.references?.length)&&!confirm('現在のプロジェクトを閉じて新規作成しますか？ 保存していない変更は失われます。'))return;stopPlayback();audioBuffers.clear();audioDataCache.clear();subviewLoaded.clear();referenceDataCache.clear();doc=emptyDoc();subview.selectedId=null;refreshSubviewUI();drawSubview();S.frame=0;setSingleSelection(null);S.pen=[];S.history=[];S.future=[];S.collapsedFolders=new Set();void prepareProjectFonts();mutated();fitCanvas();}

// Subview references are independent of artwork: they never appear in animation exports.
const subviewLoaded=new Map(); // id -> {img, source, ctx} (source pixels are sampled at native resolution)
const subview={open:false,selectedId:null,mode:'pick',zoom:1,panX:0,panY:0,drag:null,hex:'#C78B7B',alpha:255,drawScheduled:false};
function subviewSelected(){return (doc.references||[]).find(r=>r.id===subview.selectedId)||null;}
function openSubview(open){subview.open=!!open;$('#subviewWindow').classList.toggle('is-hidden',!subview.open);$('#subviewToggle').classList.toggle('active',subview.open);$('#subviewToggle').setAttribute('aria-expanded',String(subview.open));if(subview.open){refreshSubviewUI();requestAnimationFrame(()=>drawSubview());}}
function subviewSelect(id){if(!doc.references?.some(r=>r.id===id))id=doc.references?.[0]?.id||null;subview.selectedId=id;subview.zoom=1;subview.panX=0;subview.panY=0;refreshSubviewUI();drawSubview();}
function refreshSubviewUI(){const refs=doc.references||[],ref=subviewSelected();$('#subviewCount').textContent=refs.length?`${Math.max(1,refs.findIndex(r=>r.id===subview.selectedId)+1)} / ${refs.length}`:'0 / 0';
 $('#subviewThumbs').innerHTML=refs.map(r=>`<button class="subview-thumb${r.id===subview.selectedId?' active':''}" data-subview-ref="${esc(r.id)}" title="${esc(r.name)}" aria-label="${esc(r.name)}を表示"><img src="${esc(r.data)}" alt=""></button>`).join('');
 $('#subviewEmpty').classList.toggle('is-hidden',!!ref);$('#subviewFilename').textContent=ref?.name||'';$('#subviewZoomLabel').textContent=`${Math.round(subview.zoom*100)}%`;
 $('#subviewPrev').disabled=refs.length<2;$('#subviewNext').disabled=refs.length<2;$('#subviewDelete').disabled=!ref;$('#subviewZoomIn').disabled=!ref;$('#subviewZoomOut').disabled=!ref;$('#subviewFit').disabled=!ref;
 $('#subviewWindow').dataset.mode=subview.mode;$$('[data-subview-mode]').forEach(b=>b.classList.toggle('active',b.dataset.subviewMode===subview.mode));
 $('#subviewSampleSwatch').style.background=subview.hex;$('#subviewHex').textContent=subview.hex;
}
function scheduleSubviewDraw(){if(subview.drawScheduled)return;subview.drawScheduled=true;requestAnimationFrame(()=>{subview.drawScheduled=false;drawSubview();});}
function subviewGeometry(){const canvas=$('#subviewCanvas'),bounds=canvas.getBoundingClientRect(),w=Math.max(1,bounds.width),h=Math.max(1,bounds.height),current=subviewLoaded.get(subview.selectedId);if(!current)return null;const sw=current.img.naturalWidth,sh=current.img.naturalHeight;const fit=Math.min(w/sw,h/sh),scale=fit*subview.zoom;
 return {w,h,sw,sh,scale,x:(w-sw*scale)/2+subview.panX,y:(h-sh*scale)/2+subview.panY};}
function drawSubview(){if(!subview.open)return;const c=$('#subviewCanvas'),box=c.getBoundingClientRect();if(box.width<1||box.height<1)return;const pixelRatio=Math.min(2,window.devicePixelRatio||1),w=Math.max(1,Math.round(box.width*pixelRatio)),h=Math.max(1,Math.round(box.height*pixelRatio));if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
 const ctx=c.getContext('2d',{alpha:true});ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);const loaded=subviewLoaded.get(subview.selectedId),g=subviewGeometry();if(loaded&&g){ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(loaded.img,g.x,g.y,g.sw*g.scale,g.sh*g.scale);}
 $('#subviewZoomLabel').textContent=`${Math.round(subview.zoom*100)}%`;
}
async function subviewDecode(ref){const old=subviewLoaded.get(ref.id);if(old)return old;return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const source=document.createElement('canvas');source.width=img.naturalWidth;source.height=img.naturalHeight;try{const ctx=source.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const result={img,source,ctx};subviewLoaded.set(ref.id,result);referenceDataCache.set(ref.id,ref.data);resolve(result);}catch(e){reject(e);}};img.onerror=()=>reject(new Error('画像を読み込めませんでした'));img.src=ref.data;});}
async function prepareSubviewReferences(){for(const ref of doc.references||[]){if(!subviewLoaded.has(ref.id))try{await subviewDecode(ref);}catch(e){console.warn('FLAT MOTION subview',e);}}
 const ids=new Set((doc.references||[]).map(r=>r.id));for(const id of subviewLoaded.keys())if(!ids.has(id))subviewLoaded.delete(id);
 if(!ids.has(subview.selectedId))subview.selectedId=doc.references?.[0]?.id||null;
 refreshSubviewUI();scheduleSubviewDraw();}
async function importSubviewFiles(files){const items=Array.from(files||[]),types=['image/png','image/jpeg','image/webp','image/gif','image/bmp'];if(!items.length)return;let count=0;let first=null;for(const file of items){if(!types.includes(file.type)&&!/\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name))continue;
 if((doc.references||[]).length>=30){toast('サブビューの画像は30枚まで追加できます。');break;}
 if(file.size>20*1024*1024){toast(`${file.name}: 20MBを超える画像は読み込めません。`);continue;}
 try{const data=await readAsDataURL(file);if(!/^data:image\/(?:png|jpeg|webp|gif|bmp);base64,/i.test(data))throw new Error('PNG・JPG・WebP・GIF・BMPのみ対応');const ref={id:uid(),name:file.name.slice(0,128),data};await subviewDecode(ref);snapshot();(doc.references??=[]).push(ref);count++;if(!first)first=ref.id;}
 catch(e){toast(`${file.name}: 読み込めませんでした（${e.message}）`);}}
 if(count){saveLocal();subviewSelect(first);openSubview(true);toast(`${count}枚の資料を追加しました。クリックした色は描画色に反映されます。`);}}
function subviewRemove(){const ref=subviewSelected();if(!ref)return;const index=doc.references.findIndex(r=>r.id===ref.id);snapshot();doc.references.splice(index,1);subviewLoaded.delete(ref.id);saveLocal();subviewSelect(doc.references[Math.min(index,doc.references.length-1)]?.id||null);toast('資料画像を一覧から削除しました。');}
function subviewNavigate(step){const refs=doc.references||[];if(!refs.length)return;const i=Math.max(0,refs.findIndex(r=>r.id===subview.selectedId));subviewSelect(refs[(i+step+refs.length)%refs.length].id);}
function subviewZoomTo(value,pt){if(!subviewSelected())return;const before=subviewGeometry(),newZoom=clamp(value,.15,12);if(before&&pt){const pixelX=(pt.x-before.x)/before.scale,pixelY=(pt.y-before.y)/before.scale,newScale=before.scale*(newZoom/subview.zoom);subview.panX=pt.x-(before.w-before.sw*newScale)/2-pixelX*newScale;subview.panY=pt.y-(before.h-before.sh*newScale)/2-pixelY*newScale;}
 subview.zoom=newZoom;drawSubview();}
function sampleSubviewColor(ev){const ref=subviewSelected(),loaded=ref&&subviewLoaded.get(ref.id),g=subviewGeometry();if(!loaded||!g)return;const bounds=$('#subviewCanvas').getBoundingClientRect(),px=ev.clientX-bounds.left,py=ev.clientY-bounds.top,x=Math.floor((px-g.x)/g.scale),y=Math.floor((py-g.y)/g.scale);
 if(x<0||x>=g.sw||y<0||y>=g.sh)return;const data=loaded.ctx.getImageData(x,y,1,1).data;if(!data[3]){$('#subviewColorHint').textContent='透明部分です（色を取得できません）';return;}
 const hex='#'+[data[0],data[1],data[2]].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();subview.hex=hex;subview.alpha=data[3];S.color=hex;renderPalette();$('#subviewSampleSwatch').style.background=hex;$('#subviewHex').textContent=hex;$('#subviewColorHint').textContent=`RGB ${data[0]}, ${data[1]}, ${data[2]}${data[3]<255?' ／ 透明度 '+Math.round(data[3]/255*100)+'%':''}`;}
async function copySubviewHex(){try{await navigator.clipboard.writeText(subview.hex);toast(`${subview.hex} をコピーしました。`);}catch(e){const input=document.createElement('textarea');input.value=subview.hex;document.body.appendChild(input);input.select();document.execCommand('copy');input.remove();toast('カラーコードをコピーしました。');}}
function applySubviewColorToSelection(){const layer=sel();if(!layer||!['path','rect','ellipse'].includes(layer.shape?.type)||effectiveLocked(layer)){toast('塗りを変更できるベクターレイヤーを選択してください。');return;}
 snapshot();layer.fill=subview.hex;S.color=subview.hex;mutated();toast(`選択中の塗りを ${subview.hex} に変更しました。`);}
function initSubview(){const canvas=$('#subviewCanvas'),win=$('#subviewWindow');
 $('#subviewAdd').addEventListener('click',()=>$('#subviewFiles').click());$('#subviewEmptyAdd').addEventListener('click',()=>$('#subviewFiles').click());$('#subviewClose').addEventListener('click',()=>openSubview(false));
 $('#subviewFiles').addEventListener('change',e=>{void importSubviewFiles(e.target.files);e.target.value='';});
 $('#subviewThumbs').addEventListener('click',e=>{const thumb=e.target.closest('[data-subview-ref]');if(thumb)subviewSelect(thumb.dataset.subviewRef);});
 $('#subviewPrev').addEventListener('click',()=>subviewNavigate(-1));$('#subviewNext').addEventListener('click',()=>subviewNavigate(1));$('#subviewDelete').addEventListener('click',subviewRemove);
 $$('[data-subview-mode]').forEach(b=>b.addEventListener('click',()=>{subview.mode=b.dataset.subviewMode;refreshSubviewUI();}));
 $('#subviewZoomIn').addEventListener('click',()=>subviewZoomTo(subview.zoom*1.25));$('#subviewZoomOut').addEventListener('click',()=>subviewZoomTo(subview.zoom/1.25));
 $('#subviewFit').addEventListener('click',()=>{subview.zoom=1;subview.panX=0;subview.panY=0;drawSubview();});
 $('#subviewCopyColor').addEventListener('click',()=>{void copySubviewHex();});$('#subviewApplyColor').addEventListener('click',applySubviewColorToSelection);
 canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerdown',e=>{if(!subviewSelected()||![0,1,2].includes(e.button))return;const pan=subview.mode==='pan'||e.button!==0||e.altKey;subview.drag={id:e.pointerId,pan,startX:e.clientX,startY:e.clientY,startPanX:subview.panX,startPanY:subview.panY,moved:false};canvas.setPointerCapture(e.pointerId);win.classList.toggle('is-panning',pan);e.preventDefault();});
 canvas.addEventListener('pointermove',e=>{const d=subview.drag;if(!d||e.pointerId!==d.id)return;const dx=e.clientX-d.startX,dy=e.clientY-d.startY;if(Math.hypot(dx,dy)>4)d.moved=true;if(d.pan){subview.panX=d.startPanX+dx;subview.panY=d.startPanY+dy;scheduleSubviewDraw();}});
 const end=e=>{const d=subview.drag;if(!d||e.pointerId!==d.id)return;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);subview.drag=null;win.classList.remove('is-panning');if(e.type==='pointerup'&&!d.pan&&!d.moved)sampleSubviewColor(e);};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
 canvas.addEventListener('wheel',e=>{if(!subviewSelected())return;e.preventDefault();const b=canvas.getBoundingClientRect();subviewZoomTo(subview.zoom*(e.deltaY<0?1.14:1/1.14),{x:e.clientX-b.left,y:e.clientY-b.top});},{passive:false});
 let dragTitle=null;const bar=$('#subviewTitlebar');bar.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button'))return;const b=win.getBoundingClientRect();win.style.left=b.left+'px';win.style.top=b.top+'px';win.style.right='auto';dragTitle={id:e.pointerId,x:e.clientX,y:e.clientY,left:b.left,top:b.top};bar.setPointerCapture(e.pointerId);e.preventDefault();});
 bar.addEventListener('pointermove',e=>{if(!dragTitle||dragTitle.id!==e.pointerId)return;win.style.left=clamp(dragTitle.left+e.clientX-dragTitle.x,0,Math.max(0,window.innerWidth-120))+'px';win.style.top=clamp(dragTitle.top+e.clientY-dragTitle.y,0,Math.max(0,window.innerHeight-60))+'px';});
 const endTitle=e=>{if(!dragTitle||dragTitle.id!==e.pointerId)return;if(bar.hasPointerCapture(e.pointerId))bar.releasePointerCapture(e.pointerId);dragTitle=null;};bar.addEventListener('pointerup',endTitle);bar.addEventListener('pointercancel',endTitle);
 for(const el of [$('#subviewImageArea'),$('#subviewThumbs')]){el.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();$('#subviewImageArea').classList.add('dragover');}});el.addEventListener('dragleave',()=>$('#subviewImageArea').classList.remove('dragover'));el.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();$('#subviewImageArea').classList.remove('dragover');void importSubviewFiles(e.dataTransfer.files);});}
 if('ResizeObserver'in window)new ResizeObserver(()=>scheduleSubviewDraw()).observe($('#subviewImageArea'));else window.addEventListener('resize',scheduleSubviewDraw);
 refreshSubviewUI();}

document.addEventListener('input',e=>{if(e.target.id==='fmOffsetSlider'){S.offsetDistance=num(e.target.value);const box=$('#fmOffsetAmount');if(box)box.value=e.target.value;}else if(e.target.id==='fmOffsetAmount'){S.offsetDistance=clamp(num(e.target.value),-200,200);const slider=$('#fmOffsetSlider');if(slider)slider.value=S.offsetDistance;}});
const actions={flipHorizontal:()=>flipSelectedObjects('horizontal'),flipVertical:()=>flipSelectedObjects('vertical'),alignLeft:()=>alignSelection('left'),alignCenterX:()=>alignSelection('centerX'),alignRight:()=>alignSelection('right'),alignTop:()=>alignSelection('top'),alignCenterY:()=>alignSelection('centerY'),alignBottom:()=>alignSelection('bottom'),distributeLeft:()=>alignSelection('distStartX'),distributeCenterX:()=>alignSelection('distCenterX'),distributeRight:()=>alignSelection('distEndX'),distributeTop:()=>alignSelection('distStartY'),distributeCenterY:()=>alignSelection('distCenterY'),distributeBottom:()=>alignSelection('distEndY'),distributeGapX:()=>alignSelection('gapX'),distributeGapY:()=>alignSelection('gapY'),createLinkedClone, fmInsertBetweenNodes:insertNodesBetweenSelected,toggleSmartGuides:()=>{S.smartGuides=!S.smartGuides;S.smartGuideLines=[];const b=$('#fmSmartGuidesToggle');if(b){b.textContent=S.smartGuides?'吸着 ON':'吸着 OFF';b.classList.toggle('fm-snap-active',S.smartGuides);b.setAttribute('aria-pressed',String(S.smartGuides));}renderStage();},pathUnion:()=>pathfinderOperation('union'),pathSubtract:()=>pathfinderOperation('subtract'),pathIntersect:()=>pathfinderOperation('intersect'),pathDivide:()=>pathfinderOperation('divide'),offsetPath:offsetSelectedPath,create3D:()=>{void open3DLayer(false);},edit3D:()=>{void open3DLayer(true);},toggleInspector:toggleInspectorPanel,toggleTimeline:toggleTimelinePanel,togglePalette:togglePalettePanel,createRaster:createRasterLayer,unlockSelected:()=>{const l=sel();if(l?.locked){snapshot();l.locked=false;mutated();}else if(l&&lockedFolderAncestor(l)){selectLayer(lockedFolderAncestor(l).id);}},autoCorrectVertices:autoCorrectSelectedVertices,importFonts:()=>$('#fileFonts').click(),outlineText:()=>{void convertSelectedTextToPaths();},toggleSubview:()=>openSubview(!subview.open),resetGradient(){const l=sel();if(!isGradientTarget(l)||!l.gradient||effectiveLocked(l))return;snapshot();delete l.gradient;mutated();toast('グラデーションを解除しました。');},applyCrop,clearCrop,clearCropRange:()=>{S.cropSelection=null;S.cropGrow=0;renderStage();renderInspector();},addEffectKey:()=>addEffectKey(),removeEffectKey:()=>removeEffectKey(),finishPenClosed:()=>finishPen(true),finishPenOpen:()=>finishPen(false),cancelPen:()=>{S.pen=[];S.cursor=null;renderStage();},undoPenPoint:()=>{S.pen.pop();renderStage();},editPathNodes:()=>{S.nodeIndex=0;setTool('node');},pointCorner:()=>changePointType(false),pointSmooth:()=>changePointType(true),new:newProject,importAudio:()=>$('#fileAudio').click(),load:()=>$('#fileProject').click(),save:saveProject,import:()=>$('#fileAssets').click(),exportMenu:()=>$('#exportPopup').classList.toggle('hidden'),help,closeModal,exportPNG:()=>runExport('exportPNG'),exportPSD:()=>runExport('exportPSD'),exportSVG:()=>runExport('exportSVG'),exportHTML:()=>runExport('exportHTML'),exportFrames:()=>runExport('exportFrames'),exportWEBM:()=>runExport('exportWEBM'),
 morphTool:()=>{const l=sel();if(!l)return;if(l.shape.type!=='path'){toast('先に「パスに変換」を選んでください。');return;}setTool('node');},
 meshTool:()=>{const l=sel();if(!l||l.locked)return;if(!l.mesh){snapshot();initMesh(l,+$('#meshDivisions')?.value||2);mutated();}setTool('mesh');},
 convertPath:()=>{const l=sel();if(!l||l.locked)return;snapshot();if(convertToPath(l)){mutated();setTool('node');}else toast('この素材の輪郭は直接パス変換できません。メッシュをご利用ください。');},
 morphReset:()=>resetDeformFrame('morph'),meshReset:()=>resetDeformFrame('mesh'),morphClear:()=>clearDeform('morph'),meshClear:()=>{clearDeform('mesh');if(S.tool==='mesh')setTool('select');},
 clip:(b)=>{const l=layerBy(b.dataset.id);if(l)toggleClip(l,!l.clipToBelow);},undo,redo,fit:fitCanvas,resetView:fitCanvas,resetRotation:resetViewRotation,zoomIn:()=>setViewZoom(S.zoom*1.25),zoomOut:()=>setViewZoom(S.zoom/1.25),toggleGrid:()=>{snapshot();doc.gridVisible=doc.gridVisible===false;saveLocal();renderStage();updateButtons();const input=$('#gridVisibleCheck');if(input)input.checked=doc.gridVisible;},duplicate,mergeLayers:mergeSelectedLayers,unmergeLayers:unmergeSelectedLayers,unmergeThis:(b)=>{const l=layerBy(b.dataset.id);if(l?.mergeGroup){setSingleSelection(l.id);unmergeSelectedLayers();}},expandMerged:expandMergedGroup,newFolder:createFolder,addFolderChild:()=>$('#fileAssets').click(),ungroup:()=>{const l=sel();if(isFolder(l))ungroupFolder(l);},clearLayerContents, toggleFolder:(b)=>{const id=b.dataset.id;if(effectiveLocked(layerBy(id))){toast('ロックを解除すると展開できます。');return;}S.collapsedFolders.has(id)?S.collapsedFolders.delete(id):S.collapsedFolders.add(id);renderLayers();renderTimeline();},delete:deleteSelected,up:()=>reorder(1),down:()=>reorder(-1),addKey,removeKey,play:togglePlayback,first:()=>{stopPlayback();frameTo(0,{timeline:true});},next:()=>{stopPlayback();frameTo(S.frame+1,{timeline:true});},demo:makeDemo,clear:()=>{if(doc.layers.length&&!confirm('すべてのパーツを削除しますか？'))return;snapshot();doc.layers=[];setSingleSelection(null);S.frame=0;mutated();},visibility:(b)=>{const l=layerBy(b.dataset.id);if(!l)return;snapshot();l.visible=l.visible===false;mutated();},lock:(b)=>{const l=layerBy(b.dataset.id);if(!l||lockedFolderAncestor(l))return;snapshot();l.locked=!l.locked;if(l.locked&&isFolder(l)){S.collapsedFolders.add(l.id);if(sel()&&memberOfFolder(sel(),l.id))setSingleSelection(l.id);}if(l.locked&&S.selected===l.id){S.tool='select';S.pen=[];S.vertexSelected=false;}mutated();toast(l.locked?'ロックしました。位置移動のみ可能です。':'ロックを解除しました。編集・展開できます。');}};
let lastLayerNameClick={id:'',at:0};
document.addEventListener('change',e=>{if(e.target.name==='fmTriangleDirection'){S.triangleDirection=e.target.value==='down'?'down':'up';try{localStorage.setItem('flatmotion.triangle.direction',S.triangleDirection);}catch(_){}renderInspector();renderStage();return;}if(e.target.name==='fmNodeMode'){S.nodeMode=e.target.value;S.nodeSelected.clear();S.vertexSelected=false;renderStage();renderInspector();}else if(e.target.id==='fmNodeInsertCount'){S.nodeInsertCount=clamp(Math.round(num(e.target.value,1)),1,100);renderInspector();}});
document.addEventListener('click',e=>{const remove=e.target.closest('[data-font-delete]');if(remove){e.stopPropagation();void removeCustomFont(remove.dataset.fontDelete);return;}
 if(e.target.closest('[data-layer-check], .layer-rename-input'))return;
 const layerLabel=e.target.closest('[data-rename-layer]');if(layerLabel){const id=layerLabel.dataset.renameLayer,at=performance.now();if(e.detail>=2||(lastLayerNameClick.id===id&&at-lastLayerNameClick.at<430)){lastLayerNameClick={id:'',at:0};e.preventDefault();e.stopPropagation();beginInlineLayerRename(id);return;}lastLayerNameClick={id,at};}
 const sectionToggle=e.target.closest('button[data-collapse-section]');
 if(sectionToggle){
  const key=sectionToggle.dataset.collapseSection,body=sectionToggle.nextElementSibling;
  const collapsed=sectionToggle.getAttribute('aria-expanded')==='true';
  sectionToggle.setAttribute('aria-expanded',String(!collapsed));if(body)body.hidden=collapsed;
  if(collapsed)S.inspectorCollapsed.add(key);else S.inspectorCollapsed.delete(key);
  try{localStorage.setItem(INSPECTOR_COLLAPSE_KEY,JSON.stringify([...S.inspectorCollapsed]));}catch(e){}
  return;
 }
 const inspectorTab=e.target.closest('button[data-inspector-tab]');if(inspectorTab){S.inspectorTab=inspectorTab.dataset.inspectorTab;applyInspectorTab();$('#inspector').scrollTop=0;return;}
 const audioMute=e.target.closest('[data-audio-mute]');if(audioMute){modifyAudio(audioMute.dataset.audioMute,'mute');return;}const audioRemove=e.target.closest('[data-audio-remove]');if(audioRemove){modifyAudio(audioRemove.dataset.audioRemove,'remove');return;}const action=e.target.closest('[data-action]');if(action){e.stopPropagation();const name=action.dataset.action;const fn=actions[name];if(fn)fn(action);return;}
 const tool=e.target.closest('button.tool-btn[data-tool]');if(tool){setTool(tool.dataset.tool);return;}
 const swatch=e.target.closest('[data-color]');if(swatch){S.color=swatch.dataset.color;const l=sel();if(l&&!effectiveLocked(l)&&['path','rect','ellipse','text'].includes(l.shape.type)){snapshot();l.fill=S.color;mutated();}else renderPalette();return;}
 const deformPreset=e.target.closest('[data-deform-preset]');if(deformPreset){applyDeformPreset(deformPreset.dataset.deformPreset);return;}
 const preset=e.target.closest('[data-preset]');if(preset){applyPreset(preset.dataset.preset);return;}
 const key=e.target.closest('[data-key]');if(key){stopPlayback();setSingleSelection(key.dataset.id);frameTo(+key.dataset.key);renderAll();return;}
 const select=e.target.closest('[data-select]');if(select){const id=select.dataset.select;if(e.target.closest('[data-rename-layer]')&&S.multiSelected.size>1&&S.multiSelected.has(id)){S.selected=id;renderInspector();renderStage();return;}selectLayer(id);return;}
});
let draggedLayerId=null;
$('#layerList').addEventListener('dblclick',e=>{const label=e.target.closest('[data-rename-layer]');if(!label)return;e.preventDefault();e.stopPropagation();beginInlineLayerRename(label.dataset.renameLayer);});
$('#layerList').addEventListener('dragstart',e=>{if(e.target.closest('input,.layer-rename-input')){e.preventDefault();return;}const row=e.target.closest('[data-layer-row]');if(!row)return;if(effectiveLocked(layerBy(row.dataset.layerRow))){e.preventDefault();return;}draggedLayerId=row.dataset.layerRow;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',draggedLayerId);row.classList.add('dragging');document.body.classList.add('layer-dragging');});
$('#layerList').addEventListener('dragend',()=>{draggedLayerId=null;document.body.classList.remove('layer-dragging');$$('.layer-row.drop-over,.folder-drop-root.drop-over').forEach(e=>e.classList.remove('drop-over'));});
$('#layerList').addEventListener('dragover',e=>{const row=e.target.closest('[data-layer-row]');$$('.layer-row.drop-over').forEach(el=>el.classList.remove('drop-over'));if(!row)return;const target=layerBy(row.dataset.layerRow);if(!isFolder(target)||effectiveLocked(target)||!draggedLayerId||target.id===draggedLayerId)return;e.preventDefault();e.dataTransfer.dropEffect='move';row.classList.add('drop-over');});
$('#layerList').addEventListener('drop',e=>{const row=e.target.closest('[data-layer-row]');if(!row)return;const target=layerBy(row.dataset.layerRow),part=layerBy(draggedLayerId);if(isFolder(target)&&part&&part!==target){e.preventDefault();if(!rehomeLayer(part,target.id))toast('そのフォルダーには移動できません。');}draggedLayerId=null;document.body.classList.remove('layer-dragging');});
$('#folderDropRoot').addEventListener('dragover',e=>{if(!draggedLayerId)return;e.preventDefault();e.dataTransfer.dropEffect='move';e.currentTarget.classList.add('drop-over');});
$('#folderDropRoot').addEventListener('dragleave',e=>e.currentTarget.classList.remove('drop-over'));
$('#folderDropRoot').addEventListener('drop',e=>{e.preventDefault();const l=layerBy(draggedLayerId);e.currentTarget.classList.remove('drop-over');if(l)rehomeLayer(l,null);draggedLayerId=null;document.body.classList.remove('layer-dragging');});
function applyFxUI(input,first=false){const l=sel();if(!l||effectiveLocked(l))return;
 const field=input.dataset.effect;let v=input.value;if(['shadowOn','edgeOn','blurOn'].includes(field))v=!!input.checked;
 else if(field==='shadowOpacity')v=clamp(num(v)/100,0,1);
 else if(['shadowBlur','edgeSize','shadowX','shadowY','blurAmount'].includes(field))v=num(v);
 if(first)snapshot();setFxKey(l,field,v);renderStage();
 const label=document.querySelector(`[data-value-for="${field}"]`);if(label)label.textContent=(field==='shadowOpacity'?Math.round(v*100):rnd(num(v),1))+(field==='shadowOpacity'?'%': 'px');
}
function commitFxUI(input){if(!input.dataset.liveDirty){applyFxUI(input,true);}delete input.dataset.liveDirty;saveLocal();renderTimeline();renderInspector();}

function updateVariableWidth(input,commit=false){const l=sel();if(!l||l.shape?.type!=='path'||!l.shape.lineArt||effectiveLocked(l))return;
 const value=clamp(num(input.value,4),.5,120),style=normalizeOutline(l.lineStyle),local=S.tool==='node'&&S.vertexSelected,baseline=style.style==='dot'?style.dotSize:style.width;
 if(!input.dataset.liveDirty){snapshot();input.dataset.liveDirty='1';}
 if(local){const pt=l.shape.points[clamp(S.nodeIndex,0,l.shape.points.length-1)];if(pt)pt.widthScale=clamp(value/Math.max(.1,baseline),.05,15);}
 else {style[style.style==='dot'?'dotSize':'width']=value;l.lineStyle=style;}
 document.querySelectorAll('[data-variable-width-label]').forEach(node=>node.textContent=rnd(value,1)+'px');document.querySelectorAll('[data-variable-width]').forEach(el=>{if(el!==input)el.value=String(value);});renderStage();if(commit){delete input.dataset.liveDirty;saveLocal();renderInspector();}}

// Opacity is a layer-level pose property: realtime canvas preview and one Undo step per drag.
function changeLayerOpacitySlider(input,final=false){
 const l=sel();if(!l||!isOpacitySliderLayer(l)||effectiveLocked(l))return;
 const value=clamp(Math.round(num(input.value,100)),0,100);
 if(!input.dataset.liveDirty){snapshot();input.dataset.liveDirty='1';}
 const frame=S.frame;let key;
 if(S.autoKey||Object.hasOwn(l.keys,String(frame))||frame===0)key=frame;
 else key=Object.keys(l.keys).map(Number).filter(f=>f<=frame).sort((a,b)=>b-a)[0]||0;
 if(!Object.hasOwn(l.keys,String(key)))l.keys[key]=getPose(l,frame);
 l.keys[key].opacity=value/100;
 const out=document.getElementById('fmLayerOpacityValue');if(out)out.textContent=value+'%';
 renderStage();
 if(final){delete input.dataset.liveDirty;saveLocal();renderInspector();renderTimeline();}
}
document.addEventListener('input',e=>{if(e.target.dataset.layerOpacity){changeLayerOpacitySlider(e.target,false);return;}if(e.target.dataset.texture){changeTextureInput(e.target,false);return;}if(e.target.id==='rasterSize'){S.rasterSizes[S.rasterMode]=clamp(+e.target.value,1,150);$('#rasterSizeValue').textContent=S.rasterSizes[S.rasterMode];saveRasterPreferences();return;}if(e.target.id==='rasterStabilize'){S.rasterStabilize=clamp(+e.target.value,0,100);$('#rasterStabilizeValue').textContent=S.rasterStabilize;saveRasterPreferences();return;}if(e.target.id==='vertexAutoCorrectionStrength'){S.autoVertexCorrectionStrength=clamp(Math.round(num(e.target.value,45)),0,100);const out=$('#vertexAutoCorrectionValue');if(out)out.textContent=S.autoVertexCorrectionStrength+'%';try{localStorage.setItem('flatmotion.vertex.autocorrect.strength',String(S.autoVertexCorrectionStrength));}catch(e){}return;}if(e.target.dataset.variableWidth){updateVariableWidth(e.target,false);return;}if(e.target.dataset.globalStrokeWidth){updateGlobalStrokeWidth(e.target,false);return;}if(e.target.dataset.repeat&&e.target.type==='range'){updateRepeatInput(e.target,true);return;}if(e.target.dataset.gradient&&e.target.type==='color'){updateGradientSetting(e.target,{live:true});return;}if(e.target.id==='cropExpand'){S.cropGrow=Number(e.target.value)||0;const label=$('#cropExpandValue');if(label)label.textContent=(S.cropGrow>0?'+':'')+S.cropGrow+' px';renderStage();return;}if(e.target.id==='gridTransparencyRange'){const input=e.target;if(!input.dataset.liveDirty){snapshot();input.dataset.liveDirty='1';}doc.gridTransparency=clamp(Math.round(num(input.value,0)),0,100);const out=$('#gridTransparencyValue');if(out)out.textContent=doc.gridTransparency+'%';renderStage();saveLocal();return;}if(e.target.id==='gridColorPicker'){const input=e.target;if(!input.dataset.liveDirty){snapshot();input.dataset.liveDirty='1';}doc.gridColor=/^#[0-9a-f]{6}$/i.test(input.value)?input.value:'#867567';const out=$('#gridColorValue');if(out)out.textContent=doc.gridColor.toUpperCase();renderStage();saveLocal();return;}if(e.target.id==='gridSizeRange'){const input=e.target;if(!input.dataset.liveDirty){snapshot();input.dataset.liveDirty='1';}doc.gridSize=clamp(Math.round(num(input.value,40)),8,256);const out=$('#gridSizeValue');if(out)out.textContent=doc.gridSize+' px';renderStage();saveLocal();return;}if(e.target.dataset.rectShape){const input=e.target;applyRectangleUI(input,!input.dataset.liveDirty);input.dataset.liveDirty='1';return;}if(e.target.id==='pathCornerRadius'){const input=e.target;applyPathCornerUI(input,!input.dataset.liveDirty);input.dataset.liveDirty='1';return;}if(e.target.dataset.effect){const input=e.target;applyFxUI(input,!input.dataset.liveDirty);input.dataset.liveDirty='1';return;}if(e.target.dataset.audioVolume){const clip=(doc.audio||[]).find(a=>a.id===e.target.dataset.audioVolume);if(clip){clip.volume=clamp(+e.target.value/100,0,1);updateAudioGains();e.target.title='音量 '+e.target.value+'%';}return;}if(e.target.id==='simplifyPoints')simplifyPointsLive(+e.target.value);});
document.addEventListener('change',e=>{const input=e.target;if(input.dataset.layerOpacity){changeLayerOpacitySlider(input,true);return;}if(input.dataset.texture){changeTextureInput(input,true);return;}
 if(input.name==='rasterMode'){S.rasterMode=input.value==='eraser'?'eraser':'pen';renderInspector();return;}
 if(input.id==='rasterPressure'){S.rasterPressure=input.checked;saveRasterPreferences();return;}
 if(input.id==='rasterSize'||input.id==='rasterStabilize'){saveRasterPreferences();return;}
 if(input.name==='freehandMode'){S.brushMode=input.value==='line'?'line':'fill';saveFreehandSettings();renderInspector();renderStage();return;}
 if(input.id==='freehandAutoSmooth'){S.brushAutoSmooth=input.checked;saveFreehandSettings();renderInspector();renderStage();return;}
 if(input.id==='freehandMaxPoints'||input.id==='freehandSmoothStrength'){saveFreehandSettings();return;}
 if(input.dataset.variableWidth){updateVariableWidth(input,true);return;}if(input.dataset.globalStrokeWidth){updateGlobalStrokeWidth(input,true);return;}if(input.dataset.repeat){if(input.type==='range'&&input.dataset.repeatEditing){delete input.dataset.repeatEditing;renderInspector();saveLocal();}else updateRepeatInput(input,false);return;}if(input.dataset.gradient){updateGradientSetting(input,{live:false});return;}if(input.dataset.layerCheck){updateCheckedSelection(input.dataset.layerCheck,input.checked);return;}const l=sel();if(input.name==='cropMode'){S.cropMode=input.value;renderStage();renderInspector();return;}if(input.name==='cropSelectionMode'){S.cropSelectionMode=input.value;renderStage();renderInspector();return;}if(input.dataset.crop){if(input.dataset.crop==='target')S.cropTargetId=input.value;else S.cropSourceId=input.value;renderStage();renderInspector();return;}if(input.id==='cropExpand'){return;}if(input.id==='gridTransparencyRange'||input.id==='gridColorPicker'){delete input.dataset.liveDirty;saveLocal();return;}if(input.id==='gridSizeRange'){input.dataset.liveDirty='';saveLocal();return;}if(input.id==='gridVisibleCheck'){snapshot();doc.gridVisible=input.checked;renderStage();updateButtons();saveLocal();return;}if(input.dataset.rectShape||input.dataset.insetCorner){commitRectangleUI(input);return;}if(input.id==='pathCornerRadius'){commitPathCornerUI(input);return;}if(input.dataset.audioVolume){saveLocal();return;}if(input.name==='viewMode'){S.viewMode=input.value;renderInspector();updateButtons();return;}if(input.id==='constrainShape'){S.constrainShape=input.checked;try{localStorage.setItem('flatmotion.shape.1to1',String(S.constrainShape));}catch(e){}return;}if(input.id==='constrainSelection'){S.constrainSelection=input.checked;try{localStorage.setItem('flatmotion.selection.keepAspect',String(S.constrainSelection));}catch(e){}return;}if(input.id==='simplifyPoints'){endSimplifyPoints();return;}if(input.id==='pathMode'){changePathMode(input.value);return;}if(input.id==='textContour'){S.activeContour=Math.max(0,Math.round(+input.value));S.nodeIndex=0;S.vertexSelected=false;renderStage();renderInspector();return;}if(input.id==='meshDivisions'){if(l&&!l.locked){const div=+input.value;if(l.mesh&&(Object.keys(l.mesh.keys).length>1)&&!confirm('分割数の変更で既存のメッシュ変形キーは初期化されます。続けますか？')){renderInspector();return;}snapshot();initMesh(l,div);mutated();setTool('mesh');}return;}if(input.id==='drawColor'){S.color=input.value;if(l&&!effectiveLocked(l)&&['path','rect','ellipse','text'].includes(l.shape.type)){snapshot();l.fill=S.color;mutated();}else renderPalette();return;}
 if(input.id==='autoKey'){S.autoKey=input.checked;return;}if(input.id==='onionPrev'){S.onionPrev=input.checked;renderStage();return;}if(input.id==='onionNext'){S.onionNext=input.checked;renderStage();return;}
 if(input.id==='projectName'){doc.name=input.value.trim()||'新しいアニメーション';saveLocal();return;}
 if(input.dataset.doc){changeDuration(input.dataset.doc,input.type==='checkbox'?input.checked:input.value);return;}
 if(!l)return;
 if(effectiveLocked(l)&&!(input.dataset.pose&&['x','y'].includes(input.dataset.pose))){renderInspector();return;}
 if(input.dataset.field){const field=input.dataset.field;if(field==='clipToBelow'){toggleClip(l,input.checked);return;}if(field==='name'){snapshot();l.name=input.value.trim()||l.name;mutated();}
 else if(field==='parent')changeParent(l,input.value);else if(field==='folderId')rehomeLayer(l,input.value);
 else if(field==='ease'){snapshot();const previous=Object.keys(l.keys).map(Number).filter(f=>f<=S.frame).sort((a,b)=>b-a)[0]||0;l.keys[previous].ease=input.value;mutated();}return;}
 if(input.dataset.textField){applyTextField(input,false);return;}
 if(input.dataset.pose){let prop=input.dataset.pose,v=num(input.value,getPose(l)[prop]);if(prop==='opacity')v=v/100;writePose(l,{[prop]:v});renderAll();return;}
 if(input.dataset.pivot){snapshot();l.pivot[input.dataset.pivot]=num(input.value);mutated();return;}
 if(input.dataset.effect){commitFxUI(input);return;}
 if(input.dataset.lineStyle){if(l.shape?.type==='path'&&l.shape.lineArt&&!effectiveLocked(l)){snapshot();const o=normalizeOutline(l.lineStyle||{color:l.stroke});const f=input.dataset.lineStyle;if(f==='style'||f==='color')o[f]=input.value;else o[f]=num(input.value);l.lineStyle=normalizeOutline(o);mutated();renderInspector();}return;}
 if(input.dataset.clonePaint){snapshot();l.paintOverride=input.checked;mutated();return;}
 if(input.dataset.outline){snapshot();const o=layerOutline(l),field=input.dataset.outline;if(field==='on')o.on=input.checked;else if(field==='style')o.style=input.value;else if(field==='color'||field==='placement')o[field]=input.value;else o[field]=num(input.value);l.outline=normalizeOutline(o);mutated();renderInspector();return;}
 if(input.dataset.style){snapshot();let field=input.dataset.style;if(field==='smooth'||field==='closed')l.shape[field]=input.checked;else if(field==='strokeOn')l.strokeOn=input.checked;else if(field==='fillHidden'){l.fillHidden=input.checked;if(input.checked&&!l.strokeOn&&!l.outline?.on)l.outline=normalizeOutline({...l.outline,on:true});}else if(field==='strokeWidth')l.strokeWidth=clamp(num(input.value,2),.1,100);else l[field]=input.value;mutated();return;}
});
document.addEventListener('input',e=>{
 const input=e.target;
 if(input.id==='freehandMaxPoints'){
  S.brushMaxPoints=clamp(Math.round(num(input.value,250)),10,800);
  const label=$('#freehandMaxPointsValue');if(label)label.textContent=S.brushMaxPoints;
  saveFreehandSettings();if(S.drag?.type==='brush')renderStage();return;
 }
 if(input.id==='freehandSmoothStrength'){
  S.brushSmoothStrength=clamp(Math.round(num(input.value,55)),0,100);
  const label=$('#freehandSmoothStrengthValue');if(label)label.textContent=S.brushSmoothStrength;
  saveFreehandSettings();if(S.drag?.type==='brush')renderStage();return;
 }
 if(e.target.id==='nodeHandleSize'){S.nodeHandleSize=clamp(num(e.target.value,2.5),1,7);const out=$('#nodeHandleSizeValue');if(out)out.textContent=S.nodeHandleSize;renderStage();try{localStorage.setItem('flatmotion.node.handlesize',String(S.nodeHandleSize));}catch(e){}return;}if(e.target.matches?.('[data-text-field]'))applyTextField(e.target,true);});
document.addEventListener('input',e=>{if(e.target.id==='projectName'){doc.name=e.target.value;saveLocal();}});
// Capture gestures on the whole stage, including the empty gray area.
// Capture phase intercepts the hand tool before the SVG's drawing handlers.
$('#stageViewport').addEventListener('pointerdown',e=>{if((S.tool==='hand'||e.button===1)&&[0,1].includes(e.button))beginViewGesture(e);},true);
$('#stageViewport').addEventListener('pointermove',moveViewGesture);
$('#stageViewport').addEventListener('pointerup',endViewGesture);
$('#stageViewport').addEventListener('pointercancel',endViewGesture);
// Delete nodes only on an explicit physical mouse right-button press. Browsers
// also dispatch `contextmenu` for a long press (touch/pen) and during some
// captured drags, so deletion must never be driven by `contextmenu`.
function deleteNodeOnExplicitRightClick(e){
 if(e.button!==2||e.pointerType!=='mouse'||S.tool!=='node'||S.drag)return false;
 const marker=e.target.closest?.('[data-handle="node"]');
 if(!marker||!ART.contains(marker))return false;
 const l=sel();
 if(!l||l.shape?.type!=='path'||effectiveLocked(l))return false;
 const index=Number(marker.dataset.point);
 const contour=S.activeContour;
 const points=contour>0&&l.shape.extraContours?.[contour-1]?l.shape.extraContours[contour-1]:l.shape.points;
 if(!Number.isInteger(index)||index<0||index>=points.length)return false;
 e.preventDefault();
 e.stopPropagation();
 if(points.length<=(contour>0||l.shape.closed?3:2)){
  toast('これ以上点を削除できません。');return true;
 }
 deleteNode(index);
 const updated=contour>0&&l.shape.extraContours?.[contour-1]?l.shape.extraContours[contour-1]:l.shape.points;
 S.nodeSelected.clear();
 if(updated?.length){S.nodeIndex=Math.min(index,updated.length-1);S.nodeSelected.add(S.nodeIndex);S.vertexSelected=true;}
 else S.vertexSelected=false;
 renderStage();renderInspector();
 return true;
}
$('#artboard').addEventListener('pointerdown',e=>{
 if(e.button===2){deleteNodeOnExplicitRightClick(e);return;}
 if(e.button!==0&&e.button!==1)return;
 if(e.altKey&&e.button===0&&S.tool==='node'){
  const target=e.target.closest('[data-handle="node"]');
  if(target){e.preventDefault();deleteNode(+target.dataset.point);return;}
 }
 pointerDown(e);
});
$('#artboard').addEventListener('pointermove',pointerMove);
$('#artboard').addEventListener('pointerup',pointerUp);
$('#artboard').addEventListener('pointercancel',pointerUp);
$('#artboard').addEventListener('dblclick',e=>{if(S.tool==='node'&&S.nodeMode==='edit')insertNodeAt(ptFromEvent(e));});
// Keep the browser menu suppressed over the canvas, but do not mutate geometry.
$('#artboard').addEventListener('contextmenu',e=>e.preventDefault());
$('#stageViewport').addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();setViewZoom(S.zoom*(e.deltaY>0?.88:1.12));},{passive:false});
$('#fileProject').addEventListener('change',e=>{void loadProject(e.target.files[0]);e.target.value='';});
$('#fileAssets').addEventListener('change',e=>{void importAssets([...e.target.files]);e.target.value='';});
$('#fileAudio').addEventListener('change',e=>{void importAudio([...e.target.files]);e.target.value='';});
$('#fileFonts').addEventListener('change',e=>{void importCustomFonts([...e.target.files]);e.target.value='';});
$('#timelineScroller').addEventListener('dragover',e=>{if([...e.dataTransfer.types].includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy';}});
$('#timelineScroller').addEventListener('drop',e=>{if(e.dataTransfer.files.length){e.preventDefault();void importAudio([...e.dataTransfer.files]);}});
$('#stageViewport').addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';});
$('#stageViewport').addEventListener('drop',e=>{e.preventDefault();void importAssets([...e.dataTransfer.files]);});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal'))closeModal();});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#exportPopup')&&!e.target.closest('[data-action="exportMenu"]'))$('#exportPopup').classList.add('hidden');});
let timelineDrag=false,keyDrag=null;function timelineHit(e){const target=e.target.closest('[data-ruler],[data-track-id]');if(!target)return;const r=target.getBoundingClientRect();const f=clamp(Math.round((e.clientX-r.left)/FRW),0,total()-1);if(target.dataset.trackId)setSingleSelection(target.dataset.trackId);stopPlayback();frameTo(f);renderLayers();renderInspector();}
let audioDrag=null;$('#timelineScroller').addEventListener('pointerdown',e=>{if(e.button!==0)return;const clipEl=e.target.closest('[data-audio-clip]');if(clipEl){const clip=(doc.audio||[]).find(a=>a.id===clipEl.dataset.audioClip);if(!clip)return;stopPlayback();audioDrag={id:clip.id,from:clip.start,to:clip.start,startX:e.clientX,el:clipEl};clipEl.classList.add('dragging');e.preventDefault();return;}if(e.target.closest('[data-audio-track]')){const r=e.target.closest('[data-audio-track]').getBoundingClientRect();stopPlayback();frameTo(clamp(Math.round((e.clientX-r.left)/FRW),0,total()-1));return;}const key=e.target.closest('[data-key]');if(key){if(effectiveLocked(layerBy(key.dataset.id)))return;keyDrag={id:key.dataset.id,kind:key.dataset.kind||"pose",from:+key.dataset.key,to:+key.dataset.key,startX:e.clientX,el:key,moved:false};return;}if(e.target.closest('[data-select]'))return;if(!e.target.closest('[data-ruler],[data-track-id]'))return;timelineDrag=true;timelineHit(e);});
window.addEventListener('pointermove',e=>{if(audioDrag){const d=audioDrag;d.to=clamp(d.from+Math.round((e.clientX-d.startX)/FRW),0,total()-1);d.el.style.left=(d.to*FRW)+'px';return;}if(keyDrag){const k=keyDrag;let next=clamp(k.from+Math.round((e.clientX-k.startX)/FRW),0,total()-1);if(k.from===0)next=0;if(next!==k.from){k.moved=true;k.to=next;k.el.style.left=(next*FRW)+'px';k.el.title='フレーム '+(next+1);}else{k.to=k.from;k.el.style.left=(k.from*FRW)+'px';}return;}if(timelineDrag)timelineHit(e);});
window.addEventListener('pointerup',()=>{if(audioDrag){const d=audioDrag;audioDrag=null;modifyAudio(d.id,'move',d.to);}if(keyDrag){const k=keyDrag;keyDrag=null;const layer=layerBy(k.id);if(k.moved&&k.from===0){toast('最初のキーは移動できません。');renderTimeline();}else if(layer&&k.to!==k.from){const store=k.kind==='morph'?layer.morphKeys:k.kind==='mesh'?layer.mesh?.keys:k.kind==='effect'?layer.effectKeys:layer.keys;if(!store){renderTimeline();return;}if(Object.hasOwn(store,String(k.to))){toast('移動先にはすでにキーフレームがあります。');renderTimeline();}else{snapshot();store[k.to]=store[k.from];delete store[k.from];setSingleSelection(layer.id);S.frame=k.to;mutated();}}}if(timelineDrag){timelineDrag=false;renderTimeline();}});
document.addEventListener('keydown',e=>{if(document.body.classList.contains('fm-manual-open')){if(e.key==='Escape'){e.preventDefault();closeFullManual();}return;}const focused=e.target.closest('input,textarea,select,[contenteditable]');if(e.ctrlKey||e.metaKey){if(e.key.toLowerCase()==='s'){e.preventDefault();saveProject();}if(e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo();}if(e.key.toLowerCase()==='y'){e.preventDefault();redo();}return;}
 if(focused)return;
 if(e.key==='Escape'){S.pen=[];S.cursor=null;$('#exportPopup').classList.add('hidden');closeModal();renderStage();return;}
 if(e.key==='Enter'&&['pen','strokePen'].includes(S.tool)){e.preventDefault();finishPen(S.tool==='pen'&&S.pen.length>=3);return;}
 if(e.key===' '){e.preventDefault();togglePlayback();return;}
 if(e.key==='ArrowRight'){e.preventDefault();stopPlayback();frameTo(S.frame+1,{timeline:true});return;}
 if(e.key==='ArrowLeft'){e.preventDefault();stopPlayback();frameTo(S.frame-1,{timeline:true});return;}
 if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();deleteSelected();return;}
 let map={t:'text',c:'crop',v:'select',n:'node',m:'node',g:'mesh',p:'pen',k:'strokePen',l:'line',b:'brush',r:'rect',e:'ellipse',j:'pivot',h:'hand'};if(map[e.key.toLowerCase()])setTool(map[e.key.toLowerCase()]);
});
// ---- Independent reusable materials library -------------------------------
// Stored separately from .fms projects. Import/export is a standalone JSON.
const FM_LIBRARY_DB='flatmotion-material-library-v1';
const FM_LIBRARY_KEY='material-library';
const materialUI={tab:'layers',folderId:null,search:'',drag:null,renaming:null};
let materialLibrary={version:1,folders:[],assets:[]};
let materialSaveChain=Promise.resolve();
const freshLibrary=()=>({version:1,folders:[],assets:[]});
const libraryCopy=x=>JSON.parse(JSON.stringify(x));
const materialFolder=id=>materialLibrary.folders.find(f=>f.id===id)||null;
const materialAsset=id=>materialLibrary.assets.find(a=>a.id===id)||null;
const libraryChildren=id=>[...materialLibrary.folders.map(f=>({...f,kind:'folder'})),...materialLibrary.assets.map(a=>({...a,kind:'asset'}))].filter(e=>(e.folderId||null)===(id||null)).sort((a,b)=>(a.order??0)-(b.order??0));
function libraryPath(id){const parts=[],seen=new Set();while(id&&!seen.has(id)){seen.add(id);const f=materialFolder(id);if(!f)break;parts.unshift(f);id=f.folderId;}return parts;}
function libraryFolderIsDescendant(id,ancestor){return libraryPath(id).some(f=>f.id===ancestor);}
function libraryValid(raw){if(!raw||!Array.isArray(raw.folders)||!Array.isArray(raw.assets))throw Error('素材ライブラリのJSONではありません。');if(raw.folders.length>3000||raw.assets.length>10000)throw Error('素材の件数が多すぎます。');
 const folders=raw.folders.filter(f=>f&&typeof f.name==='string').map(f=>({id:String(f.id||uid()),name:String(f.name).slice(0,100),folderId:f.folderId?String(f.folderId):null,order:num(f.order,0)}));
 const assets=raw.assets.filter(a=>a&&typeof a.name==='string'&&Array.isArray(a.layers)&&a.layers.length&&a.layers.length<=2000).map(a=>({id:String(a.id||uid()),name:String(a.name).slice(0,120),folderId:a.folderId?String(a.folderId):null,order:num(a.order,0),layers:a.layers,roots:Array.isArray(a.roots)?a.roots.map(String):[],bounds:a.bounds||{x:0,y:0,w:200,h:160},thumb:typeof a.thumb==='string'&&a.thumb.startsWith('data:image/png;base64,')?a.thumb:'',fonts:Array.isArray(a.fonts)?a.fonts:[],createdAt:a.createdAt||'',fps:clamp(num(a.fps,12),1,30),seconds:clamp(num(a.seconds,6),1,20)}));
 const ids=new Set(folders.map(f=>f.id));folders.forEach(f=>{if(!ids.has(f.folderId)||f.folderId===f.id)f.folderId=null;});for(const f of folders){let t=f.folderId,visited=new Set([f.id]);while(t){if(visited.has(t)){f.folderId=null;break;}visited.add(t);t=folders.find(x=>x.id===t)?.folderId||null;}}
 assets.forEach(a=>{if(!ids.has(a.folderId))a.folderId=null;});return {version:1,folders,assets};}
function libraryOpenDB(){return new Promise((resolve,reject)=>{if(!window.indexedDB)return reject(Error('IndexedDB is not available'));const request=indexedDB.open(FM_LIBRARY_DB,1);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('settings'))db.createObjectStore('settings');};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('database open failed'));});}
async function libraryReadDB(){const db=await libraryOpenDB();try{return await new Promise((resolve,reject)=>{const tr=db.transaction('settings','readonly'),req=tr.objectStore('settings').get(FM_LIBRARY_KEY);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}finally{db.close();}}
async function libraryWriteDB(data){const db=await libraryOpenDB();try{await new Promise((resolve,reject)=>{const tr=db.transaction('settings','readwrite');tr.oncomplete=resolve;tr.onerror=()=>reject(tr.error);tr.objectStore('settings').put(data,FM_LIBRARY_KEY);});}finally{db.close();}}
async function loadMaterialLibrary(){try{let raw;try{raw=await libraryReadDB();}catch(e){try{raw=localStorage.getItem(FM_LIBRARY_DB);}catch(_){}}
 if(raw){materialLibrary=libraryValid(typeof raw==='string'?JSON.parse(raw):raw);}else materialLibrary=freshLibrary();}
 catch(e){materialLibrary=freshLibrary();toast('ライブラリを読み込めませんでした。JSONから再読み込みできます。');}
 renderMaterialLibrary();}
function saveMaterialLibrary(){const data=JSON.stringify(materialLibrary);materialSaveChain=materialSaveChain.catch(()=>{}).then(async()=>{try{await libraryWriteDB(data);}catch(e){try{localStorage.setItem(FM_LIBRARY_DB,data);}catch(e2){toast('保存容量が不足しました。JSONでバックアップしてください。');}}});return materialSaveChain;}
function materialMutated(){saveMaterialLibrary();renderMaterialLibrary();}
function showMaterialTab(tab){materialUI.tab=tab==='library'?'library':'layers';$('.left-sidebar').classList.toggle('library-mode',materialUI.tab==='library');$('#layerPanel').classList.toggle('hidden',materialUI.tab!=='layers');$('#libraryPanel').classList.toggle('hidden',materialUI.tab!=='library');$$('[data-library-tab]').forEach(b=>{const active=b.dataset.libraryTab===materialUI.tab;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});if(materialUI.tab==='library')renderMaterialLibrary();}
function materialRenumber(id){libraryChildren(id).forEach((entry,i)=>{const target=entry.kind==='folder'?materialFolder(entry.id):materialAsset(entry.id);if(target)target.order=i;});}
function libraryCurrentFolder(){if(materialUI.folderId&&!materialFolder(materialUI.folderId))materialUI.folderId=null;return materialUI.folderId;}
function renderMaterialLibrary(){const host=$('#libraryList');if(!host)return;const current=libraryCurrentFolder(),search=materialUI.search.trim().toLowerCase();const entries=search?[...materialLibrary.folders.map(f=>({...f,kind:'folder'})),...materialLibrary.assets.map(a=>({...a,kind:'asset'}))].filter(e=>e.name.toLocaleLowerCase().includes(search)).sort((a,b)=>a.name.localeCompare(b.name,'ja')):libraryChildren(current);
 const crumbs=[{id:null,name:'すべて'},...libraryPath(current).map(f=>({id:f.id,name:f.name}))];$('#libraryBreadcrumbs').innerHTML=crumbs.map((f,i)=>`${i?'<span>›</span>':''}<button type="button" data-library-folder-nav="${esc(f.id||'')}" title="このフォルダーへ移動／ここへドロップ">${esc(f.name)}</button>`).join('');
 $('#libraryInfo').textContent=`${materialLibrary.assets.length} 素材 / ${materialLibrary.folders.length} フォルダー　・　JSONバックアップ対応`;
 if(!entries.length){host.innerHTML=`<div class="library-placeholder">${search?'一致する素材がありません。':'素材はまだありません。<br>レイヤーを選択して「＋ 登録」すると、別プロジェクトでも使えます。'}</div>`;return;}
 host.innerHTML=entries.map(e=>{const folder=e.kind==='folder',n=folder?libraryChildren(e.id).length:e.layers.length;const src=!folder&&e.thumb?`<img src="${e.thumb}" alt="" loading="lazy">`:folder?`<img src="${FOLDER_IMAGE}" alt="" draggable="false">`:'<span aria-hidden="true">✦</span>';const path=search?`${libraryPath(e.folderId).map(f=>f.name).join(' / ')||'すべて'} · `:'';
 return `<div class="library-item" draggable="true" data-library-kind="${e.kind}" data-library-id="${esc(e.id)}">
 <div class="library-preview">${src}</div><div class="library-details">${search?`<span class="library-result-path">${esc(path)}</span>`:''}
 <button type="button" class="library-name" data-library-rename="${esc(e.id)}" data-library-kind="${e.kind}" title="ダブルクリックで名前を変更">${esc(e.name)}</button><span class="library-sub">${folder?`フォルダー ・ ${n} 件`:`レイヤー ${n} 件 ・ ダブルクリックで配置`}</span></div>
 <div class="library-btns">${folder?`<button type="button" data-library-open="${esc(e.id)}">開く</button>`:`<button type="button" data-library-place="${esc(e.id)}" title="現在のキャンバスへ追加">＋ 配置</button>`}<button type="button" class="library-delete" data-library-delete="${esc(e.id)}" data-library-kind="${e.kind}" title="削除">×</button></div></div>`;}).join('');}
function libraryCreateFolder(){const name=prompt('新しい素材フォルダー名','新しいフォルダー');if(name===null)return;const trimmed=name.trim();if(!trimmed)return;const id=libraryCurrentFolder();const order=libraryChildren(id).length;materialLibrary.folders.push({id:uid(),name:trimmed.slice(0,100),folderId:id,order});materialMutated();}
function libraryRename(id,kind){const e=kind==='folder'?materialFolder(id):materialAsset(id);if(!e)return;const v=prompt(`${kind==='folder'?'フォルダー':'素材'}の名前`,e.name);if(v===null||!v.trim())return;e.name=v.trim().slice(0,120);materialMutated();}
function libraryDelete(id,kind){const e=kind==='folder'?materialFolder(id):materialAsset(id);if(!e)return;if(kind==='folder'){
 const children=[...materialLibrary.folders.filter(f=>libraryFolderIsDescendant(f.id,id)),e];const removeIds=new Set(children.map(f=>f.id)),numAssets=materialLibrary.assets.filter(a=>removeIds.has(a.folderId)).length;
 if(!confirm(`フォルダー「${e.name}」と、その中の${numAssets}個の素材を削除しますか？`))return;
 materialLibrary.folders=materialLibrary.folders.filter(f=>!removeIds.has(f.id));materialLibrary.assets=materialLibrary.assets.filter(a=>!removeIds.has(a.folderId));if(removeIds.has(materialUI.folderId))materialUI.folderId=null;
 }else{if(!confirm(`素材「${e.name}」をライブラリから削除しますか？`))return;materialLibrary.assets=materialLibrary.assets.filter(a=>a.id!==id);}
 materialMutated();}
// Capture only selected roots and descendants. Remove references outside the asset;
// root animation keys are converted to world space so saved folders can be reused.
function materialCapture(){const roots=selectedRoots().length?selectedRoots():sel()?[sel()]:[];if(!roots.length)throw Error('レイヤーまたはフォルダーを選択してください。');const included=new Set();for(const r of roots){included.add(r.id);if(isFolder(r))for(const child of doc.layers)if(memberOfFolder(child,r.id))included.add(child.id);}
 const source=doc.layers.filter(l=>included.has(l.id));const baseFrame=S.frame;const boundsPoints=[];
 for(const l of source){if(isFolder(l))continue;const m=getWorld(l,baseFrame),b=getBBox(l);for(const p of [{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:b.x,y:b.y+b.h}])boundsPoints.push(matApply(m,p));}
 const bounds=boundsPoints.length?(()=>{const xs=boundsPoints.map(p=>p.x),ys=boundsPoints.map(p=>p.y),x=Math.min(...xs),y=Math.min(...ys);return {x,y,w:Math.max(1,Math.max(...xs)-x),h:Math.max(1,Math.max(...ys)-y)};})():{x:0,y:0,w:160,h:120};
 const copies=source.map(l=>libraryCopy(l));for(let i=0;i<copies.length;i++){const copy=copies[i],original=source[i];const insideParent=original.parent&&included.has(original.parent),insideFolder=original.folderId&&included.has(original.folderId);
  if(!insideParent&&!insideFolder){const frames=new Set([0,...Object.keys(original.keys||{}).map(Number)]);let a=layerBy(original.parent)||folderParent(original);const seen=new Set();while(a&&!seen.has(a.id)){seen.add(a.id);Object.keys(a.keys||{}).forEach(f=>frames.add(+f));a=layerBy(a.parent)||folderParent(a);}
   const newKeys={};for(const f of [...frames].sort((a,b)=>a-b)){const originalPose=getPose(original,f),world=getWorld(original,f),pose=poseFromAffine(world,original.pivot||{x:0,y:0});newKeys[f]={...originalPose,x:pose.x,y:pose.y,r:pose.r,sx:pose.sx,sy:pose.sy};}
   copy.keys=newKeys;
  }
  if(!insideFolder)copy.folderId=null;
  if(!insideParent)copy.parent=null;
  if(copy.clipToBelow){const base=clipBaseFor(original);if(!base||!included.has(base.id))copy.clipToBelow=false;}
 }
 const rootIds=roots.map(l=>l.id);const fonts=(doc.fonts||[]).filter(f=>copies.some(l=>l.shape?.type==='text'&&l.shape.fontFamily===f.family)).map(libraryCopy);
 return {layers:copies,roots:rootIds,bounds,fonts,fps:doc.fps,seconds:doc.seconds};}
async function materialThumbnail(asset){try{const previous=doc;let svg;try{doc={...previous,layers:asset.layers,fonts:asset.fonts,transparent:true};svg=svgForFrame(S.frame);}finally{doc=previous;}
 const b=asset.bounds,pad=Math.max(12,Math.max(b.w,b.h)*.12),x=b.x-pad,y=b.y-pad,w=b.w+pad*2,h=b.h+pad*2;svg=svg.replace(/width="[^"]+" height="[^"]+" viewBox="[^"]+"/,`width="220" height="160" viewBox="${x} ${y} ${w} ${h}"`);
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});const canvas=document.createElement('canvas');canvas.width=180;canvas.height=120;canvas.getContext('2d').drawImage(img,0,0,180,120);return canvas.toDataURL('image/png');}finally{URL.revokeObjectURL(url);}}
 catch(e){return'';}}
async function libraryRegisterSelection(){let snap;try{snap=materialCapture();}catch(e){toast(e.message);showMaterialTab('layers');return;}
 const name=prompt('素材ライブラリへ登録する名前',snap.roots.length===1?sel()?.name||'素材':`${snap.roots.length}点の組み合わせ`);if(name===null||!name.trim())return;
 const at=libraryCurrentFolder(),asset={id:uid(),name:name.trim().slice(0,120),folderId:at,order:libraryChildren(at).length,createdAt:new Date().toISOString(),...snap,thumb:''};
 asset.thumb=await materialThumbnail(asset);materialLibrary.assets.push(asset);materialMutated();showMaterialTab('library');toast(`「${asset.name}」を素材ライブラリに登録しました。`);}
function libraryInstallFonts(asset){const existing=new Set((doc.fonts||[]).map(f=>f.family));const mapping=new Map();doc.fonts=doc.fonts||[];for(const font of asset.fonts||[]){if(!font?.family||!font.data)continue;let family=font.family;if(existing.has(family)){
 const found=doc.fonts.find(f=>f.family===family);if(found?.data===font.data)continue;
 family='FMUser_'+uid().replace(/[^A-Za-z0-9_]/g,'_');mapping.set(font.family,family);
 }
 doc.fonts.push({...libraryCopy(font),id:uid(),family});existing.add(family);}
 return mapping;}
function materialPlace(id,where=null){const asset=materialAsset(id);if(!asset)return;const old=asset.layers;if(!old?.length)return;const center={x:asset.bounds.x+asset.bounds.w/2,y:asset.bounds.y+asset.bounds.h/2},destination=where||{x:doc.width/2,y:doc.height/2};const delta={x:destination.x-center.x,y:destination.y-center.y};
 snapshot();const map=new Map(old.map(l=>[l.id,uid()]));const copies=old.map(raw=>{const l=libraryCopy(raw);l.id=map.get(raw.id);l.parent=map.get(raw.parent)||null;l.folderId=map.get(raw.folderId)||null;l.locked=false;
  if((asset.roots||[]).includes(raw.id)){for(const k of Object.values(l.keys||{})){k.x=num(k.x)+delta.x;k.y=num(k.y)+delta.y;}}
  return l;});
 const fontMap=libraryInstallFonts(asset);for(const l of copies){if(l.shape?.type==='text'&&fontMap.has(l.shape.fontFamily))l.shape.fontFamily=fontMap.get(l.shape.fontFamily);}
 // Use the same sanitizing and defaulting as native FMS loading.
 const sourceFps=clamp(num(asset.fps,doc.fps),1,30);
 if(sourceFps!==doc.fps){for(const l of copies){for(const table of [l.keys,l.morphKeys,l.effectKeys,l.mesh?.keys]){if(!table)continue;const old=Object.entries(table);Object.keys(table).forEach(k=>delete table[k]);for(const [f,key] of old){const at=Math.max(0,Math.round(Number(f)*doc.fps/sourceFps));table[at]=key;}}}}
 const validated=normalizeDoc({...emptyDoc(),fps:doc.fps,seconds:Math.max(doc.seconds,Math.min(20,Math.ceil(num(asset.seconds,6)*doc.fps/sourceFps))),layers:copies}).layers;
 doc.layers.push(...validated);const rootIds=(asset.roots||[]).map(original=>map.get(original)).filter(Boolean);const selectedIds=rootIds.length?rootIds:[validated[0].id];setSingleSelection(selectedIds.at(-1));S.multiSelected=new Set(selectedIds);mutated();void prepareProjectFonts();toast(`「${asset.name}」をキャンバスへ配置しました。`);}
function libraryBackup(){const data=JSON.stringify({...materialLibrary,format:'flatmotion-library',exportedAt:new Date().toISOString()},null,2);download(new Blob([data],{type:'application/json'}),'FlatMotion_MaterialLibrary.json');toast('ライブラリ専用JSONを保存しました。');}
async function libraryRestore(file){if(!file)return;if(file.size>150*1024*1024){toast('JSONが150MBを超えています。');return;}let incoming;try{incoming=libraryValid(JSON.parse(await file.text()));}catch(e){toast(e.message);return;}
 const mode=$('#libraryImportMode').value;if(mode==='replace'){if(!confirm('現在の素材ライブラリを全件置き換えます。よろしいですか？'))return;materialLibrary=incoming;materialUI.folderId=null;}
 else {const idMap=new Map(incoming.folders.map(f=>[f.id,uid()]));incoming.folders.forEach(f=>{const oldId=f.id;f.id=idMap.get(oldId);f.folderId=idMap.get(f.folderId)||null;f.order+=libraryChildren(f.folderId).length;materialLibrary.folders.push(f);});incoming.assets.forEach(a=>{a.id=uid();a.folderId=idMap.get(a.folderId)||null;a.order+=libraryChildren(a.folderId).length;materialLibrary.assets.push(a);});}
 materialMutated();toast(`${incoming.assets.length}件の素材を${mode==='replace'?'復元':'追加'}しました。`);}
function libraryMove(drag,target,position){if(!drag||!target||drag.id===target.id)return;const entity=drag.kind==='folder'?materialFolder(drag.id):materialAsset(drag.id);if(!entity)return;
 const targetEntity=target.kind==='folder'?materialFolder(target.id):materialAsset(target.id);if(!targetEntity)return;
 const destFolder=position==='inside'&&target.kind==='folder'?target.id:targetEntity.folderId||null;
 if(drag.kind==='folder'&&(destFolder===drag.id||libraryFolderIsDescendant(destFolder,drag.id)))return;
 const oldFolder=entity.folderId||null;entity.folderId=destFolder;
 if(oldFolder!==destFolder)materialRenumber(oldFolder);
 let peers=libraryChildren(destFolder).filter(e=>e.id!==entity.id);const index=position==='inside'&&target.kind==='folder'?peers.length:peers.findIndex(e=>e.id===target.id)+(position==='after'?1:0);
 peers.splice(Math.max(0,index),0,{...entity,kind:drag.kind});peers.forEach((e,i)=>{const r=e.kind==='folder'?materialFolder(e.id):materialAsset(e.id);if(r)r.order=i;});materialMutated();}
function libraryMoveInto(id,kind,destFolder){const entity=kind==='folder'?materialFolder(id):materialAsset(id);if(!entity||destFolder===id||kind==='folder'&&libraryFolderIsDescendant(destFolder,id))return;
 const old=entity.folderId||null;entity.folderId=destFolder||null;materialRenumber(old);entity.order=libraryChildren(destFolder).filter(e=>e.id!==id).length;materialMutated();}
function initMaterialLibrary(){
 $('#materialTabLayers').addEventListener('click',()=>showMaterialTab('layers'));
 $('#materialTabLibrary').addEventListener('click',()=>showMaterialTab('library'));
 $('#librarySearch').addEventListener('input',e=>{materialUI.search=e.target.value;renderMaterialLibrary();});
 $('#libraryPanel').addEventListener('click',e=>{
  const nav=e.target.closest('[data-library-folder-nav]');if(nav){materialUI.folderId=nav.dataset.libraryFolderNav||null;materialUI.search='';$('#librarySearch').value='';renderMaterialLibrary();return;}
  const open=e.target.closest('[data-library-open]');if(open){materialUI.folderId=open.dataset.libraryOpen;materialUI.search='';$('#librarySearch').value='';renderMaterialLibrary();return;}
  const place=e.target.closest('[data-library-place]');if(place){materialPlace(place.dataset.libraryPlace);return;}
  const del=e.target.closest('[data-library-delete]');if(del){libraryDelete(del.dataset.libraryDelete,del.dataset.libraryKind);return;}
  const action=e.target.closest('[data-library-action]');if(action){const a=action.dataset.libraryAction;if(a==='register')void libraryRegisterSelection();else if(a==='new-folder')libraryCreateFolder();else if(a==='export')libraryBackup();else if(a==='import')$('#libraryJsonFile').click();else if(a==='clear-search'){$('#librarySearch').value='';materialUI.search='';renderMaterialLibrary();}return;}
 });
 $('#libraryList').addEventListener('dblclick',e=>{const rename=e.target.closest('[data-library-rename]');if(rename){libraryRename(rename.dataset.libraryRename,rename.dataset.libraryKind);return;}const row=e.target.closest('[data-library-kind][data-library-id]');if(row){if(row.dataset.libraryKind==='folder'){materialUI.folderId=row.dataset.libraryId;renderMaterialLibrary();}else materialPlace(row.dataset.libraryId);}});
 $('#libraryJsonFile').addEventListener('change',e=>{void libraryRestore(e.target.files?.[0]);e.target.value='';});
 $('#libraryList').addEventListener('dragstart',e=>{const row=e.target.closest('[data-library-kind][data-library-id]');if(!row||e.target.closest('button'))return;materialUI.drag={kind:row.dataset.libraryKind,id:row.dataset.libraryId};row.classList.add('is-dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','flatmotion-material:'+materialUI.drag.id);});
 $('#libraryList').addEventListener('dragover',e=>{if(!materialUI.drag)return;e.preventDefault();$$('.library-item').forEach(r=>r.classList.remove('drop-before','drop-after','drop-inside'));const row=e.target.closest('[data-library-kind][data-library-id]');if(!row)return;const r=row.getBoundingClientRect(),t=(e.clientY-r.top)/r.height;row.classList.add(row.dataset.libraryKind==='folder'&&t>.26&&t<.74?'drop-inside':t>.5?'drop-after':'drop-before');});
 $('#libraryList').addEventListener('drop',e=>{if(!materialUI.drag)return;e.preventDefault();const row=e.target.closest('[data-library-kind][data-library-id]');if(row){const box=row.getBoundingClientRect(),t=(e.clientY-box.top)/box.height;const position=row.dataset.libraryKind==='folder'&&t>.26&&t<.74?'inside':t>.5?'after':'before';libraryMove(materialUI.drag,{kind:row.dataset.libraryKind,id:row.dataset.libraryId},position);}else libraryMoveInto(materialUI.drag.id,materialUI.drag.kind,libraryCurrentFolder());materialUI.drag=null;renderMaterialLibrary();});
 $('#libraryBreadcrumbs').addEventListener('dragover',e=>{if(materialUI.drag&&e.target.closest('[data-library-folder-nav]'))e.preventDefault();});
 $('#libraryBreadcrumbs').addEventListener('drop',e=>{if(!materialUI.drag)return;const nav=e.target.closest('[data-library-folder-nav]');if(!nav)return;e.preventDefault();libraryMoveInto(materialUI.drag.id,materialUI.drag.kind,nav.dataset.libraryFolderNav||null);materialUI.drag=null;});
 $('#libraryList').addEventListener('dragend',()=>{materialUI.drag=null;$$('.library-item').forEach(r=>r.classList.remove('drop-before','drop-after','drop-inside','is-dragging'));});
 $('#stageViewport').addEventListener('dragover',e=>{if(materialUI.drag?.kind==='asset')e.preventDefault();});
 $('#stageViewport').addEventListener('drop',e=>{if(materialUI.drag?.kind!=='asset')return;e.preventDefault();const item=materialUI.drag;materialUI.drag=null;materialPlace(item.id,ptFromEvent(e));});
 void loadMaterialLibrary();showMaterialTab('layers');
}

function init(){initSubview();try{S.constrainShape=localStorage.getItem('flatmotion.shape.1to1')==='true';S.constrainSelection=localStorage.getItem('flatmotion.selection.keepAspect')==='true';S.triangleDirection=localStorage.getItem('flatmotion.triangle.direction')==='down'?'down':'up';}catch(e){}try{const raw=localStorage.getItem(SAVE_KEY);if(raw)doc=normalizeDoc(JSON.parse(raw));}catch(e){/* storage may be unavailable on local files; keep the current document */}
 S.collapsedFolders=new Set(doc.layers.filter(l=>l.mergeGroup).map(l=>l.id));
 $('#autoKey').checked=S.autoKey;$('#onionPrev').checked=S.onionPrev;$('#onionNext').checked=S.onionNext;syncWorkspaceLayout();renderAll();void prepareProjectAudio();void prepareSubviewReferences();void prepareProjectFonts();requestAnimationFrame(fitCanvas);if('ResizeObserver'in window){let previous='';const ro=new ResizeObserver(()=>{const vp=$('#stageViewport'),size=`${vp.clientWidth}x${vp.clientHeight}`;if(size!==previous){previous=size;refitOnResize();}});ro.observe($('#stageViewport'));}else window.addEventListener('resize',refitOnResize);
 $('#stageStatus').textContent='操作はブラウザ内で完結します';initMaterialLibrary();}
init();
})();
