/* FlatMotion PSD writer — offline PSD v1, 8-bit RGBA, layer groups & native clipping.
   Layers are rasterized by the editor at the chosen frame; group hierarchy is kept.
   Adobe PSD specification: 8BPS header; layer & mask information; lsct/luni tags. */
(function(root){'use strict';
 const enc=new TextEncoder();
 function b(...items){return Uint8Array.from(items);}
 function u16(v){return b(v>>>8&255,v&255);}
 function u32(v){return b(v>>>24&255,v>>>16&255,v>>>8&255,v&255);}
 function s16(v){return u16(v&65535);}
 function s32(v){return u32(v>>>0);}
 function ascii(str){return Uint8Array.from([...str].map(c=>c.charCodeAt(0)&255));}
 function join(parts){const length=parts.reduce((s,p)=>s+p.length,0),out=new Uint8Array(length);let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;}
 function block(signature,key,content){const even=content.length&1?join([content,b(0)]):content;return join([ascii(signature),ascii(key),u32(content.length),even]);}
 function pascal(name){const raw=enc.encode(name),take=raw.subarray(0,255),p=join([b(take.length),take]);return join([p,new Uint8Array((4-p.length%4)%4)]);}
 function unicode(name){const chars=String(name||''),arr=[u32(chars.length)];for(let i=0;i<chars.length;i++)arr.push(u16(chars.charCodeAt(i)));return join(arr);}
 function packBits(bytes){const out=[];let i=0;while(i<bytes.length){let run=1;while(i+run<bytes.length&&bytes[i+run]===bytes[i]&&run<128)run++;
   if(run>=3){out.push((257-run)&255,bytes[i]);i+=run;continue;}
   const start=i;i+=run;
   while(i<bytes.length&&i-start<128){let rep=1;while(i+rep<bytes.length&&bytes[i+rep]===bytes[i]&&rep<128)rep++;if(rep>=3)break;i+=Math.min(rep,128-(i-start));}
   out.push(i-start-1);for(let k=start;k<i;k++)out.push(bytes[k]);
  }return Uint8Array.from(out);}
 // PSD composite channels are planar; layers are PackBits RLE-compressed by scanline.
 function channelsFor(layer){const {rgba,width,height}=layer,channelIds=[-1,0,1,2],content=[];for(const id of channelIds){const channel=id===-1?3:id;const sizes=[],rows=[];
   for(let y=0;y<height;y++){const values=new Uint8Array(width);for(let x=0;x<width;x++)values[x]=rgba[(y*width+x)*4+channel];
    const r=packBits(values);if(r.length>65535)throw Error('PSDの圧縮行が大きすぎます。');sizes.push(u16(r.length));rows.push(r);
   }
   const data=join([u16(1),...sizes,...rows]);content.push({id,data});
  }return content;}
 function record(layer){const type=layer.type||'pixel',group=type!=='pixel';const left=group?0:layer.left||0,top=group?0:layer.top||0,right=group?0:left+layer.width,bottom=group?0:top+layer.height;
  // Even section-divider records without pixels must describe image channels.
  // Photoshop tolerates zero channels here, but CLIP STUDIO PAINT and
  // Procreate may reject the file or load empty layers. Use four empty
  // raw-compressed channels for the zero-sized group records.
  const channels=group?[-1,0,1,2].map(id=>({id,data:u16(0)})):channelsFor(layer);
  const name=layer.name||'Layer';const section=type==='groupStart'?1:type==='groupEnd'?3:0;
  const additional=[block('8BIM','luni',unicode(name))];
  if(group)additional.push(block('8BIM','lsct',join([u32(section),ascii('8BIM'),ascii(section===1?'pass':'norm')])));
  if(layer.locked&&!group)additional.push(block('8BIM','lspf',u32(2)));
  const extra=join([u32(0),u32(0),pascal(name),...additional]);
  const flags=(layer.visible===false?2:0)|(layer.locked&&group?0:0);
  const header=join([s32(top),s32(left),s32(bottom),s32(right),u16(channels.length),...channels.map(x=>join([s16(x.id),u32(x.data.length)])),ascii('8BIM'),ascii('norm'),b(Math.min(255,Math.max(0,Math.round((layer.opacity??1)*255)))),b(layer.clip?1:0),b(flags),b(0),u32(extra.length),extra]);
  return {header,bytes:channels.map(x=>x.data)};
 }
 function compositeRaw(rgba,width,height){const n=width*height,parts=[u16(0)];for(let c=0;c<4;c++){const data=new Uint8Array(n);for(let i=0;i<n;i++)data[i]=rgba[i*4+c];parts.push(data);}return join(parts);}
 function write({width,height,layers,composite}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>30000||height>30000)throw Error('PSDに使用できない画像サイズです。');
  if(layers.length>3000)throw Error('レイヤー数がPSDの上限を超えています。');
  const records=layers.map(record),headers=records.map(r=>r.header),pixels=records.flatMap(r=>r.bytes);
  const info=join([s16(-layers.length),...headers,...pixels]);const infoPadded=(info.length&1)?join([info,b(0)]):info;
  const masks=join([u32(infoPadded.length),infoPadded,u32(0)]);
  const header=join([ascii('8BPS'),u16(1),new Uint8Array(6),u16(4),u32(height),u32(width),u16(8),u16(3)]);
  return new Blob([header,u32(0),u32(0),u32(masks.length),masks,compositeRaw(composite,width,height)],{type:'image/vnd.adobe.photoshop'});
 }
 root.FlatMotionPSD={write};
})(window);
