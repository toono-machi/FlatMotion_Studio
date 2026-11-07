/* FlatMotion Studio — multi-object 3D sketch layer. */
let enginePromise;
const base='https://cdn.jsdelivr.net/npm/three@0.170.0/';
function loadEngine(){return enginePromise ||= Promise.all([
 import(base+'build/three.module.js'),
 import(base+'examples/jsm/loaders/OBJLoader.js'),
 import(base+'examples/jsm/loaders/FBXLoader.js'),
 import(base+'examples/jsm/loaders/GLTFLoader.js'),
 import(base+'examples/jsm/controls/TransformControls.js')
]).then(([THREE,obj,fbx,gltf,transform])=>({THREE,OBJLoader:obj.OBJLoader,FBXLoader:fbx.FBXLoader,GLTFLoader:gltf.GLTFLoader,TransformControls:transform.TransformControls})).catch(e=>{enginePromise=null;throw e;});}
const $=s=>document.querySelector(s),rad=d=>d*Math.PI/180;
const defaultTransform=()=>({pos:[0,0,0],rot:[0,0,0],scale:1,bones:{},wire:false});
const defaultScene=()=>({camera:[0,12,2.7],wire:false});
const TOOL_NAMES={hand:'ハンド',move:'移動',rotate:'回転',camera:'カメラ'};
let session=null, serial=0;
function report(t){const e=$('#fm3dStatus');if(e)e.textContent=t;}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function show(){$('#fm3dModal').hidden=false;}
function hide(){$('#fm3dModal').hidden=true;if(session){session.resizeObserver?.disconnect();session.transform?.dispose();session.renderer?.dispose();session=null;}}
function bytesFromDataUrl(data){const str=atob(data.split(',')[1]),b=new Uint8Array(str.length);for(let i=0;i<str.length;i++)b[i]=str.charCodeAt(i);return b;}
function arrayBufferToDataURL(buf){const b=new Uint8Array(buf);let str='';for(let i=0;i<b.length;i+=32768)str+=String.fromCharCode(...b.subarray(i,i+32768));return 'data:application/octet-stream;base64,'+btoa(str);}
const readableError=e=>String(e?.message||e||'不明なエラー');
async function parseModel(source,format,THREE,loaders){
 const b=bytesFromDataUrl(source),array=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
 if(format==='obj'){
  const obj=new loaders.OBJLoader().parse(new TextDecoder().decode(b));
  obj.traverse(x=>{if(x.isMesh)x.material=new THREE.MeshStandardMaterial({color:0xc5afa0,side:THREE.DoubleSide,roughness:.95,metalness:0});});return obj;
 }
 if(format==='fbx'){
  const model=new loaders.FBXLoader().parse(array,'');
  model.traverse(x=>{if(!x.isMesh)return;for(const mat of (Array.isArray(x.material)?x.material:[x.material])){if(!mat)continue;mat.side=THREE.DoubleSide;if(mat.color&&mat.color.r+mat.color.g+mat.color.b<.025)mat.color.set(0xc5afa0);mat.needsUpdate=true;}});return model;
 }
 if(['vrm','glb','gltf'].includes(format)){
  const result=await new Promise((resolve,reject)=>new loaders.GLTFLoader().parse(array,'',resolve,reject));return result.scene;
 }
 throw Error('未対応形式');
}
function normalizeModel(item,s){
 const THREE=s.THREE;item.model.updateMatrixWorld(true);const bounds=new THREE.Box3();let meshCount=0;
 item.model.traverse(o=>{if(!o.isMesh||!o.geometry)return;meshCount++;o.geometry.computeBoundingBox();const box=o.geometry.boundingBox;if(box&&Number.isFinite(box.min.x)&&Number.isFinite(box.max.x))bounds.union(box.clone().applyMatrix4(o.matrixWorld));});
 if(bounds.isEmpty())throw Error('表示できるメッシュがありません');
 const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),length=Math.max(size.x,size.y,size.z);
 if(!Number.isFinite(length)||length<=0)throw Error('モデルのスケールが不正です');
 const scale=1.75/length;item.normalizer.scale.setScalar(scale);item.normalizer.position.copy(center).multiplyScalar(-scale);item.meshCount=meshCount;
}
function makeBones(item){
 item.bones=[];item.model.traverse(o=>{if(o.isBone)item.bones.push(o);});
 item.restBones=item.bones.map(b=>b.rotation.clone());
 for(const [index,angles]of Object.entries(item.settings.bones||{})){
  const b=item.bones[+index],r=item.restBones[+index];if(b&&r&&Array.isArray(angles))b.rotation.set(r.x+rad(angles[0]||0),r.y+rad(angles[1]||0),r.z+rad(angles[2]||0));
 }
}
function selected(s){return s?.items.find(x=>x.id===s.selectedId)||null;}
function initCanvas(s){
 const {THREE}=s,canvas=$('#fm3dCanvas');canvas.width=840;canvas.height=570;
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(840,570,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);scene.add(new THREE.HemisphereLight(0xffffff,0x98847a,2.35));
 const light=new THREE.DirectionalLight(0xffffff,2.4);light.position.set(4,8,5);scene.add(light);
 const camera=new THREE.OrthographicCamera(-1.5,1.5,1.02,-1.02,.01,500);
 Object.assign(s,{renderer,scene,root,camera});
 const transform=new s.loaders.TransformControls(camera,canvas);
 transform.setSize(.82);
 scene.add(transform.getHelper());
 transform.addEventListener('dragging-changed',e=>{s.transformDragging=e.value;if(!e.value){syncInputs(s);draw(s);}});
 transform.addEventListener('objectChange',()=>{
  const item=selected(s);if(!item)return;
  item.settings.pos=item.group.position.toArray().map(v=>Math.round(v*10000)/10000);
  item.settings.rot=[item.group.rotation.x,item.group.rotation.y,item.group.rotation.z].map(v=>Math.round(v*180/Math.PI*100)/100);
  syncInputs(s);draw(s);
 });
 s.transform=transform;
 canvas.oncontextmenu=e=>e.preventDefault();
 canvas.onpointerdown=e=>{
  if(e.button!==0&&e.button!==2||s.transformDragging)return;
  // TransformControls listens directly to the canvas. Its gizmo captures move/rotate drags.
  if(e.button===0&&(s.tool==='move'||s.tool==='rotate')&&transform.axis)return;
  e.preventDefault();canvas.setPointerCapture(e.pointerId);
  const mode=e.button===2?'hand':s.tool;
  const obj=selected(s);
  s.drag={id:e.pointerId,mode,x:e.clientX,y:e.clientY,moved:false,a:s.cameraSettings[0],p:s.cameraSettings[1],target:s.cameraTarget.clone(),pos:obj?[...obj.settings.pos]:null,itemId:obj?.id,rot:obj?[...obj.settings.rot]:null};
  updateCursor(s);
 };
 canvas.onpointermove=e=>{
  const d=s.drag;if(!d||e.pointerId!==d.id||s.transformDragging)return;
  const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(dx,dy)>3)d.moved=true;
  const rect=canvas.getBoundingClientRect();
  if(d.mode==='hand'){
   const scale=s.cameraSettings[2]*1.2/Math.max(1,rect.height);
   const right=new THREE.Vector3().setFromMatrixColumn(s.camera.matrixWorld,0);
   const up=new THREE.Vector3().setFromMatrixColumn(s.camera.matrixWorld,1);
   s.cameraTarget.copy(d.target).addScaledVector(right,-dx*scale).addScaledVector(up,dy*scale);
  } else if(d.mode==='camera'){
   s.cameraSettings[0]=d.a+dx*.5;
   s.cameraSettings[1]=Math.max(-89,Math.min(89,d.p+dy*.45));
  } else if(d.mode==='rotate'&&objFromDrag(s,d)){
   const item=objFromDrag(s,d),axis=s.rotationAxis==='vertical'?0:s.rotationAxis==='horizontal'?1:2;
   const rotation=[...d.rot];rotation[axis]=d.rot[axis]+(dx-dy*.25)*.65;
   item.settings.rot=rotation;
  }
  syncInputs(s);draw(s);
 };
 const finish=e=>{
  if(!s.drag||e.pointerId!==s.drag.id)return;
  const wasClick=e.type==='pointerup'&&e.button===0&&!s.drag.moved;
  s.drag=null;if(wasClick)pickItem(s,e);
  updateCursor(s);try{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}catch{}
 };
 canvas.onpointerup=finish;canvas.onpointercancel=finish;canvas.onlostpointercapture=()=>{s.drag=null;updateCursor(s);};
 canvas.onwheel=e=>{e.preventDefault();s.cameraSettings[2]=Math.max(.3,Math.min(40,s.cameraSettings[2]*(e.deltaY>0?1.08:.92)));syncInputs(s);draw(s);};
 const container=canvas.parentElement;const resize=()=>{if(session!==s)return;const r=container.getBoundingClientRect();const w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));if(s.renderer.domElement.width!==w||s.renderer.domElement.height!==h){s.renderer.setSize(w,h,false);draw(s);}};s.resizeObserver=new ResizeObserver(resize);s.resizeObserver.observe(container);requestAnimationFrame(resize);
}
function objFromDrag(s,d){return s.items.find(x=>x.id===d.itemId);}
function updateCursor(s){if(!s?.renderer)return;const canvas=s.renderer.domElement;canvas.dataset.tool=s.tool;canvas.classList.toggle('is-panning',!!s.drag&&s.drag.mode==='hand');}
function updateTransform(s){
 if(!s?.transform)return;const item=selected(s);
 if((s.tool==='move'||s.tool==='rotate')&&item&&item.visible){
  s.transform.attach(item.group);s.transform.setMode(s.tool==='move'?'translate':'rotate');
  s.transform.setSpace('world');
  const axis=s.rotationAxis==='vertical'?'X':s.rotationAxis==='horizontal'?'Y':'Z';
  s.transform.showX=s.tool==='move'||axis==='X';s.transform.showY=s.tool==='move'||axis==='Y';s.transform.showZ=s.tool==='move'||axis==='Z';
 }else s.transform.detach();
 s.transform.getHelper().visible=(s.tool==='move'||s.tool==='rotate')&&!!item&&item.visible;
 updateCursor(s);
 document.querySelectorAll('[data-fm3d-tool]').forEach(b=>{const active=b.dataset.fm3dTool===s.tool;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 const rad=$('#fm3dAxisChoice');if(rad)rad.hidden=s.tool!=='rotate';
 $('#fm3dNoteText').textContent=s.tool==='hand'?'ドラッグ：視点を上下左右に平行移動／右ドラッグ：視点移動／ホイール：ズーム':s.tool==='move'?'矢印ハンドル：軸方向に移動／色付き平面：2軸同時移動／モデルクリック：選択':s.tool==='rotate'?'回転軸を選択し、リングをドラッグして回転／モデルクリック：選択':'ドラッグ：視点角度を変更／右ドラッグ：視点移動／ホイール：ズーム';
}
function pickItem(s,event){
 if(!s?.renderer)return;const rect=s.renderer.domElement.getBoundingClientRect();if(!rect.width||!rect.height)return;
 const pointer=new s.THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height*2-1));
 const caster=new s.THREE.Raycaster();caster.setFromCamera(pointer,s.camera);
 const intersections=caster.intersectObjects(s.items.filter(item=>item.visible).map(item=>item.group),true);
 for(const hit of intersections){let node=hit.object;while(node){const item=s.items.find(item=>item.group===node);if(item){selectItem(s,item.id);report('選択中：'+item.filename);return;}node=node.parent;}}
}
function draw(s){if(!s?.renderer)return;
 for(const item of s.items){item.group.visible=item.visible;item.group.position.set(...item.settings.pos);item.group.rotation.set(...item.settings.rot.map(rad));item.group.scale.setScalar(Math.max(0.01,Number(item.settings.scale)||1));
  item.model.traverse(m=>{if(!m.isMesh||!m.material)return;for(const mat of Array.isArray(m.material)?m.material:[m.material]){if(mat)mat.wireframe=!!(s.wire||item.settings.wire);}});
 }
 const yaw=rad(s.cameraSettings[0]),pitch=rad(s.cameraSettings[1]),distance=s.cameraSettings[2];
 s.camera.position.set(distance*Math.sin(yaw)*Math.cos(pitch),distance*Math.sin(pitch),distance*Math.cos(yaw)*Math.cos(pitch)).add(s.cameraTarget);s.camera.lookAt(s.cameraTarget);
 const view=distance*.6,aspect=Math.max(1,s.renderer.domElement.width)/Math.max(1,s.renderer.domElement.height);s.camera.left=-view*aspect;s.camera.right=view*aspect;s.camera.top=view;s.camera.bottom=-view;s.camera.updateProjectionMatrix();s.camera.updateMatrixWorld();s.renderer.render(s.scene,s.camera);
}
function renderItems(s){
 const list=$('#fm3dObjects');list.innerHTML=s.items.map((item,i)=>`<div class="fm3d-object-row ${item.id===s.selectedId?'selected':''}" data-3d-id="${item.id}">
  <button type="button" data-3d-action="select" title="このモデルを編集" class="fm3d-object-name">${escapeHtml(item.filename)}</button>
  <button type="button" data-3d-action="visible" class="fm3d-eye" title="表示切替" aria-label="${item.visible?'非表示にする':'表示する'}"><img src="assets/${item.visible?'eye-visible':'eye-hidden'}.png" alt="" draggable="false"></button>
  <button type="button" data-3d-action="up" title="順序を上へ" ${i===0?'disabled':''}>↑</button>
  <button type="button" data-3d-action="down" title="順序を下へ" ${i===s.items.length-1?'disabled':''}>↓</button>
  <button type="button" data-3d-action="delete" class="fm3d-delete" title="削除">×</button></div>`).join('');
 $('#fm3dObjectCount').textContent=String(s.items.length);
 $('#fm3dFilename').textContent=`${s.items.length}個のモデル（${selected(s)?.filename||'未選択'}）`;
 $('#fm3dCommit').disabled=!s.items.length;
 $('#fm3dSelectedTools').hidden=!selected(s);
 renderBones(s);updateTransform(s);
}
function renderBones(s){
 const item=selected(s),sel=$('#fm3dBone');sel.innerHTML='<option value="">ボーンを選択</option>'+(item?.bones||[]).map((b,i)=>`<option value="${i}">${i+1}. ${escapeHtml(b.name||'Bone')}</option>`).join('');
 $('#fm3dBoneCount').textContent=`${item?.bones.length||0}本のボーン`;
 document.querySelectorAll('[data-three-bone]').forEach(el=>el.value=0);
}
function syncInputs(s){if(!s)return;const obj=selected(s);
 for(const el of document.querySelectorAll('#fm3dModal [data-three-setting]')){
  const [key,i]=el.dataset.threeSetting.split(':'),v=key==='camera'?s.cameraSettings[+i]:key==='scale'?obj?.settings.scale:obj?.settings[key]?.[+i];
  el.disabled=key!=='camera'&&!obj;if(v===undefined)continue;
  if(el.type==='range'){el.min=Math.min(+el.min,Math.floor(v)-1);el.max=Math.max(+el.max,Math.ceil(v)+1);}
  el.value=v;const out=document.querySelector(`[data-three-output="${key}:${i}"]`);if(out)out.textContent=Number(v).toFixed(key==='pos'||key==='scale'?2:0);
 }
 $('#fm3dWire').checked=!!s.wire;
 const n=$('#fm3dBone').value;if(n!==''){const a=obj?.settings.bones[n]||[0,0,0];document.querySelectorAll('[data-three-bone]').forEach(el=>el.value=a[+el.dataset.threeBone]||0);}
}
function selectItem(s,id){s.selectedId=id;renderItems(s);syncInputs(s);draw(s);}
async function addModel(s,meta,{select=true}={}){
 const model=await parseModel(meta.source,meta.format,s.THREE,s.loaders);
 const item={id:++serial,source:meta.source,filename:meta.filename,format:meta.format,settings:{...defaultTransform(),...structuredClone(meta.settings||{})},visible:meta.visible!==false,model,group:new s.THREE.Group(),normalizer:new s.THREE.Group()};
 item.normalizer.add(model);item.group.add(item.normalizer);
 normalizeModel(item,s);makeBones(item);s.root.add(item.group);s.items.push(item);
 if(select)s.selectedId=item.id;renderItems(s);syncInputs(s);draw(s);return item;
}
async function open({layer=null,onSave,documentWidth,documentHeight}){
 show();report('3Dエンジンを準備中…');$('#fm3dCommit').disabled=true;
 try{
  const {THREE,...loaders}=await loadEngine();if(session)session.renderer?.dispose();
  const saved=layer?.shape?.threeD||{};const s={THREE,loaders,layer,onSave,documentWidth,documentHeight,items:[],selectedId:null,cameraSettings:[...(saved.camera||saved.settings?.camera||defaultScene().camera)],wire:!!(saved.wire||saved.settings?.wire),tool:'camera',rotationAxis:'horizontal',cameraTarget:new THREE.Vector3(...(saved.cameraTarget||[0,0,0])),transformDragging:false};
  session=s;initCanvas(s);
  const old=saved.source?[{source:saved.source,filename:saved.filename,format:saved.format,settings:saved.settings}]:[];
  const metas=Array.isArray(saved.models)?saved.models:old;
  for(const meta of metas){try{await addModel(s,meta);}catch(e){report('一部モデルを復元できませんでした：'+readableError(e));}}
  renderItems(s);syncInputs(s);updateTransform(s);draw(s);
  if(!metas.length)report('「＋ モデルを追加」からOBJ / FBX / VRM / GLBを読み込んでください。');
  else if(s.items.length===metas.length)report(`${s.items.length}個のモデルを復元しました。モデルを選んで個別に操作できます。`);
 }catch(e){report('エンジン読み込み失敗：'+readableError(e)+'。ネット接続とGitHub Pages/localhostを確認してください。');}
}
async function fileChanged(files){const s=session;if(!s||!files?.length)return;for(const file of files){
 const format=(file.name.split('.').pop()||'').toLowerCase();
 if(!['obj','fbx','vrm','glb','gltf'].includes(format)){report(file.name+'：未対応の形式です');continue;}
 if(file.size>80*1024*1024){report(file.name+'：80MBを超えています');continue;}
 try{report(file.name+' を読み込み中…');const source=arrayBufferToDataURL(await file.arrayBuffer());if(session!==s)return;
  const item=await addModel(s,{source,format,filename:file.name});report(`${s.items.length}個のモデル／選択中：${item.filename}（${item.meshCount}メッシュ・${item.bones.length}ボーン）`);
 }catch(e){report(file.name+' の読み込みに失敗：'+readableError(e));console.error('[FlatMotion 3D]',e);}
}}
function applyBone(s){const item=selected(s),n=$('#fm3dBone').value;if(!item||n==='')return;const b=item.bones[+n],r=item.restBones[+n],a=item.settings.bones[n]||[0,0,0];if(b&&r)b.rotation.set(r.x+rad(a[0]),r.y+rad(a[1]),r.z+rad(a[2]));draw(s);}
async function commit(){const s=session;if(!s?.items.length)return;$('#fm3dCommit').disabled=true;report('合成画像を生成中…');try{
 draw(s);s.transform.getHelper().visible=false;s.renderer.render(s.scene,s.camera);const data=s.renderer.domElement.toDataURL('image/png');const models=s.items.map(({source,format,filename,settings,visible})=>({source,format,filename,settings,visible}));
 const first=models[0];s.onSave({data,threeD:{models,camera:[...s.cameraSettings],wire:s.wire,cameraTarget:s.cameraTarget.toArray(),filename:models.length===1?first.filename:`${models.length}モデル`,format:'multi'},width:Math.min(s.documentWidth,s.documentHeight*s.renderer.domElement.width/s.renderer.domElement.height,1600),height:Math.min(s.documentWidth*s.renderer.domElement.height/s.renderer.domElement.width,s.documentHeight,1600*s.renderer.domElement.height/s.renderer.domElement.width)});hide();
 }catch(e){report('反映できません：'+readableError(e));}finally{if(session===s){updateTransform(s);draw(s);}$('#fm3dCommit').disabled=false;}}
$('#fm3dClose').addEventListener('click',hide);$('#fm3dCancel').addEventListener('click',hide);
$('#fm3dFile').addEventListener('change',e=>{void fileChanged([...e.target.files]);e.target.value='';});
$('#fm3dCommit').addEventListener('click',()=>void commit());
$('#fm3dObjects').addEventListener('click',e=>{const button=e.target.closest('[data-3d-action]'),row=button?.closest('[data-3d-id]'),s=session;if(!row||!s)return;
 const id=+row.dataset['3dId'],index=s.items.findIndex(x=>x.id===id);if(index<0)return;const item=s.items[index],action=button.dataset['3dAction'];
 if(action==='select')selectItem(s,id);
 else if(action==='visible'){item.visible=!item.visible;renderItems(s);draw(s);}
 else if(action==='delete'){s.root.remove(item.group);s.items.splice(index,1);if(s.selectedId===id)s.selectedId=s.items[Math.min(index,s.items.length-1)]?.id||null;renderItems(s);syncInputs(s);draw(s);}
 else if(action==='up'||action==='down'){const j=index+(action==='up'?-1:1);if(j<0||j>=s.items.length)return;[s.items[index],s.items[j]]=[s.items[j],s.items[index]];renderItems(s);}
});
$('#fm3dReset').addEventListener('click',()=>{const s=session;if(!s)return;const item=selected(s);if(item){item.settings=defaultTransform();item.bones.forEach((b,i)=>b.rotation.copy(item.restBones[i]));}else{s.cameraSettings=[...defaultScene().camera];s.cameraTarget.set(0,0,0);}renderBones(s);syncInputs(s);draw(s);});
$('#fm3dModal').addEventListener('input',e=>{const s=session;if(!s)return;const el=e.target,item=selected(s);
 if(el.matches('[data-three-setting]')){const [key,i]=el.dataset.threeSetting.split(':');if(key==='camera')s.cameraSettings[+i]=+el.value;else if(item){if(key==='scale')item.settings.scale=+el.value;else item.settings[key][+i]=+el.value;}syncInputs(s);draw(s);}
 else if(el.matches('[data-three-bone]')){const n=$('#fm3dBone').value;if(n===''||!item)return;(item.settings.bones[n]||=[0,0,0])[+el.dataset.threeBone]=+el.value;applyBone(s);}
 else if(el.id==='fm3dWire'){s.wire=el.checked;draw(s);}
});
$('#fm3dBone').addEventListener('change',()=>syncInputs(session));
document.querySelectorAll('[data-fm3d-tool]').forEach(b=>b.addEventListener('click',()=>{if(!session)return;session.tool=b.dataset.fm3dTool;updateTransform(session);draw(session);}));
document.querySelectorAll('input[name=fm3dRotateAxis]').forEach(b=>b.addEventListener('change',()=>{if(!session||!b.checked)return;session.rotationAxis=b.value;updateTransform(session);draw(session);}));
window.FlatMotion3D={open};
