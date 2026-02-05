import{I as p,U as dt,T as ce,ab as ht,ad as Fe,ae as Re,a2 as P,a0 as M,X as Ue,aj as w,a8 as R,aF as te,aa as re,K as j,ai as Be,aC as O,aD as Me,W as D,V as C,Q as W,aM as de,aq as q,aN as B,a1 as I,aO as ft,ax as Ge,aP as he,S as E,ag as V,aQ as pt,aR as ne,am as Q,aS as z,a7 as ie,aw as J,a3 as De,a5 as Ae,aH as ze,aJ as ke,a4 as mt,a6 as gt,aI as xt,aK as _t,aL as vt,aT as bt,aU as yt,aV as Z,aW as Tt,aX as wt,aY as fe,L as y,aZ as Ct}from"./DGzaAEZi.js";import{c as L,a as Pt,b as St,B as Oe}from"./BXaCBwVl.js";class Ie{static init(e){Object.defineProperty(this,"resizeTo",{configurable:!0,set(t){globalThis.removeEventListener("resize",this.queueResize),this._resizeTo=t,t&&(globalThis.addEventListener("resize",this.queueResize),this.resize())},get(){return this._resizeTo}}),this.queueResize=()=>{this._resizeTo&&(this._cancelResize(),this._resizeId=requestAnimationFrame(()=>this.resize()))},this._cancelResize=()=>{this._resizeId&&(cancelAnimationFrame(this._resizeId),this._resizeId=null)},this.resize=()=>{if(!this._resizeTo)return;this._cancelResize();let t,r;if(this._resizeTo===globalThis.window)t=globalThis.innerWidth,r=globalThis.innerHeight;else{const{clientWidth:n,clientHeight:i}=this._resizeTo;t=n,r=i}this.renderer.resize(t,r),this.render()},this._resizeId=null,this._resizeTo=null,this.resizeTo=e.resizeTo||null}static destroy(){globalThis.removeEventListener("resize",this.queueResize),this._cancelResize(),this._cancelResize=null,this.queueResize=null,this.resizeTo=null,this.resize=null}}Ie.extension=p.Application;class Ee{static init(e){e=Object.assign({autoStart:!0,sharedTicker:!1},e),Object.defineProperty(this,"ticker",{configurable:!0,set(t){this._ticker&&this._ticker.remove(this.render,this),this._ticker=t,t&&t.add(this.render,this,dt.LOW)},get(){return this._ticker}}),this.stop=()=>{this._ticker.stop()},this.start=()=>{this._ticker.start()},this._ticker=null,this.ticker=e.sharedTicker?ce.shared:new ce,e.autoStart&&this.start()}static destroy(){if(this._ticker){const e=this._ticker;this.ticker=null,e.destroy()}}}Ee.extension=p.Application;var Ft=`in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`,Rt=`in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
void main() {
    finalColor = texture(uTexture, vTextureCoord);
}
`,pe=`struct GlobalFilterUniforms {
  uInputSize: vec4<f32>,
  uInputPixel: vec4<f32>,
  uInputClamp: vec4<f32>,
  uOutputFrame: vec4<f32>,
  uGlobalFrame: vec4<f32>,
  uOutputTexture: vec4<f32>,
};

@group(0) @binding(0) var <uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;

struct VSOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>
};

fn filterVertexPosition(aPosition: vec2<f32>) -> vec4<f32>
{
    var position = aPosition * gfu.uOutputFrame.zw + gfu.uOutputFrame.xy;

    position.x = position.x * (2.0 / gfu.uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * gfu.uOutputTexture.z / gfu.uOutputTexture.y) - gfu.uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

fn filterTextureCoord(aPosition: vec2<f32>) -> vec2<f32>
{
    return aPosition * (gfu.uOutputFrame.zw * gfu.uInputSize.zw);
}

@vertex
fn mainVertex(
  @location(0) aPosition: vec2<f32>,
) -> VSOutput {
  return VSOutput(
   filterVertexPosition(aPosition),
   filterTextureCoord(aPosition)
  );
}

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
) -> @location(0) vec4<f32> {
    return textureSample(uTexture, uSampler, uv);
}
`;class Ut extends ht{constructor(){const e=Fe.from({vertex:{source:pe,entryPoint:"mainVertex"},fragment:{source:pe,entryPoint:"mainFragment"},name:"passthrough-filter"}),t=Re.from({vertex:Ft,fragment:Rt,name:"passthrough-filter"});super({gpuProgram:e,glProgram:t})}}class Ve{constructor(e){this._renderer=e}push(e,t,r){this._renderer.renderPipes.batch.break(r),r.add({renderPipeId:"filter",canBundle:!1,action:"pushFilter",container:t,filterEffect:e})}pop(e,t,r){this._renderer.renderPipes.batch.break(r),r.add({renderPipeId:"filter",action:"popFilter",canBundle:!1})}execute(e){e.action==="pushFilter"?this._renderer.filter.push(e):e.action==="popFilter"&&this._renderer.filter.pop()}destroy(){this._renderer=null}}Ve.extension={type:[p.WebGLPipes,p.WebGPUPipes,p.CanvasPipes],name:"filter"};const me=new P;function Bt(o,e){e.clear();const t=e.matrix;for(let r=0;r<o.length;r++){const n=o[r];if(n.globalDisplayStatus<7)continue;const i=n.renderGroup??n.parentRenderGroup;i?.isCachedAsTexture?e.matrix=me.copyFrom(i.textureOffsetInverseTransform).append(n.worldTransform):i?._parentCacheAsTextureRenderGroup?e.matrix=me.copyFrom(i._parentCacheAsTextureRenderGroup.inverseWorldTransform).append(n.groupTransform):e.matrix=n.worldTransform,e.addBounds(n.bounds)}return e.matrix=t,e}const Mt=new te({attributes:{aPosition:{buffer:new Float32Array([0,0,1,0,1,1,0,1]),format:"float32x2",stride:8,offset:0}},indexBuffer:new Uint32Array([0,1,2,0,2,3])});class Gt{constructor(){this.skip=!1,this.inputTexture=null,this.backTexture=null,this.filters=null,this.bounds=new Be,this.container=null,this.blendRequired=!1,this.outputRenderSurface=null,this.globalFrame={x:0,y:0,width:0,height:0},this.firstEnabledIndex=-1,this.lastEnabledIndex=-1}}class We{constructor(e){this._filterStackIndex=0,this._filterStack=[],this._filterGlobalUniforms=new M({uInputSize:{value:new Float32Array(4),type:"vec4<f32>"},uInputPixel:{value:new Float32Array(4),type:"vec4<f32>"},uInputClamp:{value:new Float32Array(4),type:"vec4<f32>"},uOutputFrame:{value:new Float32Array(4),type:"vec4<f32>"},uGlobalFrame:{value:new Float32Array(4),type:"vec4<f32>"},uOutputTexture:{value:new Float32Array(4),type:"vec4<f32>"}}),this._globalFilterBindGroup=new Ue({}),this.renderer=e}get activeBackTexture(){return this._activeFilterData?.backTexture}push(e){const t=this.renderer,r=e.filterEffect.filters,n=this._pushFilterData();n.skip=!1,n.filters=r,n.container=e.container,n.outputRenderSurface=t.renderTarget.renderSurface;const i=t.renderTarget.renderTarget.colorTexture.source,s=i.resolution,a=i.antialias;if(r.every(f=>!f.enabled)){n.skip=!0;return}const l=n.bounds;if(this._calculateFilterArea(e,l),this._calculateFilterBounds(n,t.renderTarget.rootViewPort,a,s,1),n.skip)return;const u=this._getPreviousFilterData(),h=this._findFilterResolution(s);let c=0,d=0;u&&(c=u.bounds.minX,d=u.bounds.minY),this._calculateGlobalFrame(n,c,d,h,i.width,i.height),this._setupFilterTextures(n,l,t,u)}generateFilteredTexture({texture:e,filters:t}){const r=this._pushFilterData();this._activeFilterData=r,r.skip=!1,r.filters=t;const n=e.source,i=n.resolution,s=n.antialias;if(t.every(f=>!f.enabled))return r.skip=!0,e;const a=r.bounds;if(a.addRect(e.frame),this._calculateFilterBounds(r,a.rectangle,s,i,0),r.skip)return e;const l=i;this._calculateGlobalFrame(r,0,0,l,n.width,n.height),r.outputRenderSurface=w.getOptimalTexture(a.width,a.height,r.resolution,r.antialias),r.backTexture=R.EMPTY,r.inputTexture=e,this.renderer.renderTarget.finishRenderPass(),this._applyFiltersToTexture(r,!0);const d=r.outputRenderSurface;return d.source.alphaMode="premultiplied-alpha",d}pop(){const e=this.renderer,t=this._popFilterData();t.skip||(e.globalUniforms.pop(),e.renderTarget.finishRenderPass(),this._activeFilterData=t,this._applyFiltersToTexture(t,!1),t.blendRequired&&w.returnTexture(t.backTexture),w.returnTexture(t.inputTexture))}getBackTexture(e,t,r){const n=e.colorTexture.source._resolution,i=w.getOptimalTexture(t.width,t.height,n,!1);let s=t.minX,a=t.minY;r&&(s-=r.minX,a-=r.minY),s=Math.floor(s*n),a=Math.floor(a*n);const l=Math.ceil(t.width*n),u=Math.ceil(t.height*n);return this.renderer.renderTarget.copyToTexture(e,i,{x:s,y:a},{width:l,height:u},{x:0,y:0}),i}applyFilter(e,t,r,n){const i=this.renderer,s=this._activeFilterData,l=s.outputRenderSurface===r,u=i.renderTarget.rootRenderTarget.colorTexture.source._resolution,h=this._findFilterResolution(u);let c=0,d=0;if(l){const m=this._findPreviousFilterOffset();c=m.x,d=m.y}this._updateFilterUniforms(t,r,s,c,d,h,l,n);const f=e.enabled?e:this._getPassthroughFilter();this._setupBindGroupsAndRender(f,t,i)}calculateSpriteMatrix(e,t){const r=this._activeFilterData,n=e.set(r.inputTexture._source.width,0,0,r.inputTexture._source.height,r.bounds.minX,r.bounds.minY),i=t.worldTransform.copyTo(P.shared),s=t.renderGroup||t.parentRenderGroup;return s&&s.cacheToLocalTransform&&i.prepend(s.cacheToLocalTransform),i.invert(),n.prepend(i),n.scale(1/t.texture.orig.width,1/t.texture.orig.height),n.translate(t.anchor.x,t.anchor.y),n}destroy(){this._passthroughFilter?.destroy(!0),this._passthroughFilter=null}_getPassthroughFilter(){return this._passthroughFilter??(this._passthroughFilter=new Ut),this._passthroughFilter}_setupBindGroupsAndRender(e,t,r){if(r.renderPipes.uniformBatch){const n=r.renderPipes.uniformBatch.getUboResource(this._filterGlobalUniforms);this._globalFilterBindGroup.setResource(n,0)}else this._globalFilterBindGroup.setResource(this._filterGlobalUniforms,0);this._globalFilterBindGroup.setResource(t.source,1),this._globalFilterBindGroup.setResource(t.source.style,2),e.groups[0]=this._globalFilterBindGroup,r.encoder.draw({geometry:Mt,shader:e,state:e._state,topology:"triangle-list"}),r.type===re.WEBGL&&r.renderTarget.finishRenderPass()}_setupFilterTextures(e,t,r,n){if(e.backTexture=R.EMPTY,e.inputTexture=w.getOptimalTexture(t.width,t.height,e.resolution,e.antialias),e.blendRequired){r.renderTarget.finishRenderPass();const i=r.renderTarget.getRenderTarget(e.outputRenderSurface);e.backTexture=this.getBackTexture(i,t,n?.bounds)}r.renderTarget.bind(e.inputTexture,!0),r.globalUniforms.push({offset:t})}_calculateGlobalFrame(e,t,r,n,i,s){const a=e.globalFrame;a.x=t*n,a.y=r*n,a.width=i*n,a.height=s*n}_updateFilterUniforms(e,t,r,n,i,s,a,l){const u=this._filterGlobalUniforms.uniforms,h=u.uOutputFrame,c=u.uInputSize,d=u.uInputPixel,f=u.uInputClamp,m=u.uGlobalFrame,x=u.uOutputTexture;a?(h[0]=r.bounds.minX-n,h[1]=r.bounds.minY-i):(h[0]=0,h[1]=0),h[2]=e.frame.width,h[3]=e.frame.height,c[0]=e.source.width,c[1]=e.source.height,c[2]=1/c[0],c[3]=1/c[1],d[0]=e.source.pixelWidth,d[1]=e.source.pixelHeight,d[2]=1/d[0],d[3]=1/d[1],f[0]=.5*d[2],f[1]=.5*d[3],f[2]=e.frame.width*c[2]-.5*d[2],f[3]=e.frame.height*c[3]-.5*d[3];const g=this.renderer.renderTarget.rootRenderTarget.colorTexture;m[0]=n*s,m[1]=i*s,m[2]=g.source.width*s,m[3]=g.source.height*s,t instanceof R&&(t.source.resource=null);const _=this.renderer.renderTarget.getRenderTarget(t);this.renderer.renderTarget.bind(t,!!l),t instanceof R?(x[0]=t.frame.width,x[1]=t.frame.height):(x[0]=_.width,x[1]=_.height),x[2]=_.isRoot?-1:1,this._filterGlobalUniforms.update()}_findFilterResolution(e){let t=this._filterStackIndex-1;for(;t>0&&this._filterStack[t].skip;)--t;return t>0&&this._filterStack[t].inputTexture?this._filterStack[t].inputTexture.source._resolution:e}_findPreviousFilterOffset(){let e=0,t=0,r=this._filterStackIndex;for(;r>0;){r--;const n=this._filterStack[r];if(!n.skip){e=n.bounds.minX,t=n.bounds.minY;break}}return{x:e,y:t}}_calculateFilterArea(e,t){if(e.renderables?Bt(e.renderables,t):e.filterEffect.filterArea?(t.clear(),t.addRect(e.filterEffect.filterArea),t.applyMatrix(e.container.worldTransform)):e.container.getFastGlobalBounds(!0,t),e.container){const n=(e.container.renderGroup||e.container.parentRenderGroup).cacheToLocalTransform;n&&t.applyMatrix(n)}}_applyFiltersToTexture(e,t){const r=e.inputTexture,n=e.bounds,i=e.filters,s=e.firstEnabledIndex,a=e.lastEnabledIndex;if(this._globalFilterBindGroup.setResource(r.source.style,2),this._globalFilterBindGroup.setResource(e.backTexture.source,3),s===a)i[s].apply(this,r,e.outputRenderSurface,t);else{let l=e.inputTexture;const u=w.getOptimalTexture(n.width,n.height,l.source._resolution,!1);let h=u;for(let c=s;c<a;c++){const d=i[c];if(!d.enabled)continue;d.apply(this,l,h,!0);const f=l;l=h,h=f}i[a].apply(this,l,e.outputRenderSurface,t),w.returnTexture(u)}}_calculateFilterBounds(e,t,r,n,i){const s=this.renderer,a=e.bounds,l=e.filters;let u=1/0,h=0,c=!0,d=!1,f=!1,m=!0,x=-1,g=-1;for(let _=0;_<l.length;_++){const v=l[_];if(!v.enabled)continue;if(x===-1&&(x=_),g=_,u=Math.min(u,v.resolution==="inherit"?n:v.resolution),h+=v.padding,v.antialias==="off"?c=!1:v.antialias==="inherit"&&c&&(c=r),v.clipToViewport||(m=!1),!!!(v.compatibleRenderers&s.type)){f=!1;break}if(v.blendRequired&&!(s.backBuffer?.useBackBuffer??!0)){j("Blend filter requires backBuffer on WebGL renderer to be enabled. Set `useBackBuffer: true` in the renderer options."),f=!1;break}f=!0,d||(d=v.blendRequired)}if(!f){e.skip=!0;return}if(m&&a.fitBounds(0,t.width/n,0,t.height/n),a.scale(u).ceil().scale(1/u).pad((h|0)*i),!a.isPositive){e.skip=!0;return}e.antialias=c,e.resolution=u,e.blendRequired=d,e.firstEnabledIndex=x,e.lastEnabledIndex=g}_popFilterData(){return this._filterStackIndex--,this._filterStack[this._filterStackIndex]}_getPreviousFilterData(){let e,t=this._filterStackIndex-1;for(;t>0&&(t--,e=this._filterStack[t],!!e.skip););return e}_pushFilterData(){let e=this._filterStack[this._filterStackIndex];return e||(e=this._filterStack[this._filterStackIndex]=new Gt),this._filterStackIndex++,e}}We.extension={type:[p.WebGLSystem,p.WebGPUSystem],name:"filter"};const Le=class Ye extends te{constructor(...e){let t=e[0]??{};t instanceof Float32Array&&(O(Me,"use new MeshGeometry({ positions, uvs, indices }) instead"),t={positions:t,uvs:e[1],indices:e[2]}),t={...Ye.defaultOptions,...t};const r=t.positions||new Float32Array([0,0,1,0,1,1,0,1]);let n=t.uvs;n||(t.positions?n=new Float32Array(r.length):n=new Float32Array([0,0,1,0,1,1,0,1]));const i=t.indices||new Uint32Array([0,1,2,0,2,3]),s=t.shrinkBuffersToFit,a=new D({data:r,label:"attribute-mesh-positions",shrinkToFit:s,usage:C.VERTEX|C.COPY_DST}),l=new D({data:n,label:"attribute-mesh-uvs",shrinkToFit:s,usage:C.VERTEX|C.COPY_DST}),u=new D({data:i,label:"index-mesh-buffer",shrinkToFit:s,usage:C.INDEX|C.COPY_DST});super({attributes:{aPosition:{buffer:a,format:"float32x2",stride:8,offset:0},aUV:{buffer:l,format:"float32x2",stride:8,offset:0}},indexBuffer:u,topology:t.topology}),this.batchMode="auto"}get positions(){return this.attributes.aPosition.buffer.data}set positions(e){this.attributes.aPosition.buffer.data=e}get uvs(){return this.attributes.aUV.buffer.data}set uvs(e){this.attributes.aUV.buffer.data=e}get indices(){return this.indexBuffer.data}set indices(e){this.indexBuffer.data=e}};Le.defaultOptions={topology:"triangle-list",shrinkBuffersToFit:!1};let se=Le,U=null,S=null;function Dt(o,e){U||(U=W.get().createCanvas(256,128),S=U.getContext("2d",{willReadFrequently:!0}),S.globalCompositeOperation="copy",S.globalAlpha=1),(U.width<o||U.height<e)&&(U.width=de(o),U.height=de(e))}function ge(o,e,t){for(let r=0,n=4*t*e;r<e;++r,n+=4)if(o[n+3]!==0)return!1;return!0}function xe(o,e,t,r,n){const i=4*e;for(let s=r,a=r*i+4*t;s<=n;++s,a+=i)if(o[a+3]!==0)return!1;return!0}function At(...o){let e=o[0];e.canvas||(e={canvas:o[0],resolution:o[1]});const{canvas:t}=e,r=Math.min(e.resolution??1,1),n=e.width??t.width,i=e.height??t.height;let s=e.output;if(Dt(n,i),!S)throw new TypeError("Failed to get canvas 2D context");S.drawImage(t,0,0,n,i,0,0,n*r,i*r);const l=S.getImageData(0,0,n,i).data;let u=0,h=0,c=n-1,d=i-1;for(;h<i&&ge(l,n,h);)++h;if(h===i)return q.EMPTY;for(;ge(l,n,d);)--d;for(;xe(l,n,u,h,d);)++u;for(;xe(l,n,c,h,d);)--c;return++c,++d,S.globalCompositeOperation="source-over",S.strokeRect(u,h,c-u,d-h),S.globalCompositeOperation="copy",s??(s=new q),s.set(u/r,h/r,(c-u)/r,(d-h)/r),s}const _e=new q;class zt{getCanvasAndContext(e){const{text:t,style:r,resolution:n=1}=e,i=r._getFinalPadding(),s=B.measureText(t||" ",r),a=Math.ceil(Math.ceil(Math.max(1,s.width)+i*2)*n),l=Math.ceil(Math.ceil(Math.max(1,s.height)+i*2)*n),u=I.getOptimalCanvasAndContext(a,l);this._renderTextToCanvas(t,r,i,n,u);const h=r.trim?At({canvas:u.canvas,width:a,height:l,resolution:1,output:_e}):_e.set(0,0,a,l);return{canvasAndContext:u,frame:h}}returnCanvasAndContext(e){I.returnCanvasAndContext(e)}_renderTextToCanvas(e,t,r,n,i){const{canvas:s,context:a}=i,l=ft(t),u=B.measureText(e||" ",t),h=u.lines,c=u.lineHeight,d=u.lineWidths,f=u.maxLineWidth,m=u.fontProperties,x=s.height;if(a.resetTransform(),a.scale(n,n),a.textBaseline=t.textBaseline,t._stroke?.width){const T=t._stroke;a.lineWidth=T.width,a.miterLimit=T.miterLimit,a.lineJoin=T.join,a.lineCap=T.cap}a.font=l;let g,_;const v=t.dropShadow?2:1;for(let T=0;T<v;++T){const A=t.dropShadow&&T===0,F=A?Math.ceil(Math.max(1,x)+r*2):0,G=F*n;if(A){a.fillStyle="black",a.strokeStyle="black";const b=t.dropShadow,ut=b.color,lt=b.alpha;a.shadowColor=Ge.shared.setValue(ut).setAlpha(lt).toRgbaString();const ct=b.blur*n,le=b.distance*n;a.shadowBlur=ct,a.shadowOffsetX=Math.cos(b.angle)*le,a.shadowOffsetY=Math.sin(b.angle)*le+G}else{if(a.fillStyle=t._fill?he(t._fill,a,u,r*2):null,t._stroke?.width){const b=t._stroke.width*.5+r*2;a.strokeStyle=he(t._stroke,a,u,b)}a.shadowColor="black"}let oe=(c-m.fontSize)/2;c-m.fontSize<0&&(oe=0);const ue=t._stroke?.width??0;for(let b=0;b<h.length;b++)g=ue/2,_=ue/2+b*c+m.ascent+oe,t.align==="right"?g+=f-d[b]:t.align==="center"&&(g+=(f-d[b])/2),t._stroke?.width&&this._drawLetterSpacing(h[b],t,i,g+r,_+r-F,!0),t._fill!==void 0&&this._drawLetterSpacing(h[b],t,i,g+r,_+r-F)}}_drawLetterSpacing(e,t,r,n,i,s=!1){const{context:a}=r,l=t.letterSpacing;let u=!1;if(B.experimentalLetterSpacingSupported&&(B.experimentalLetterSpacing?(a.letterSpacing=`${l}px`,a.textLetterSpacing=`${l}px`,u=!0):(a.letterSpacing="0px",a.textLetterSpacing="0px")),l===0||u){s?a.strokeText(e,n,i):a.fillText(e,n,i);return}let h=n;const c=B.graphemeSegmenter(e);let d=a.measureText(e).width,f=0;for(let m=0;m<c.length;++m){const x=c[m];s?a.strokeText(x,h,i):a.fillText(x,h,i);let g="";for(let _=m+1;_<c.length;++_)g+=c[_];f=a.measureText(g).width,h+=d-f+l,d=f}}}const Y=new zt,ve="http://www.w3.org/2000/svg",be="http://www.w3.org/1999/xhtml";class Xe{constructor(){this.svgRoot=document.createElementNS(ve,"svg"),this.foreignObject=document.createElementNS(ve,"foreignObject"),this.domElement=document.createElementNS(be,"div"),this.styleElement=document.createElementNS(be,"style");const{foreignObject:e,svgRoot:t,styleElement:r,domElement:n}=this;e.setAttribute("width","10000"),e.setAttribute("height","10000"),e.style.overflow="hidden",t.appendChild(e),e.appendChild(r),e.appendChild(n),this.image=W.get().createImage()}destroy(){this.svgRoot.remove(),this.foreignObject.remove(),this.styleElement.remove(),this.domElement.remove(),this.image.src="",this.image.remove(),this.svgRoot=null,this.foreignObject=null,this.styleElement=null,this.domElement=null,this.image=null,this.canvasAndContext=null}}let ye;function kt(o,e,t,r){r||(r=ye||(ye=new Xe));const{domElement:n,styleElement:i,svgRoot:s}=r;n.innerHTML=`<style>${e.cssStyle};</style><div style='padding:0'>${o}</div>`,n.setAttribute("style","transform-origin: top left; display: inline-block"),t&&(i.textContent=t),document.body.appendChild(s);const a=n.getBoundingClientRect();s.remove();const l=e.padding*2;return{width:a.width-l,height:a.height-l}}class Ot{constructor(){this.batches=[],this.batched=!1}destroy(){this.batches.forEach(e=>{V.return(e)}),this.batches.length=0}}class He{constructor(e,t){this.state=E.for2d(),this.renderer=e,this._adaptor=t,this.renderer.runners.contextChange.add(this)}contextChange(){this._adaptor.contextChange(this.renderer)}validateRenderable(e){const t=e.context,r=!!e._gpuData,n=this.renderer.graphicsContext.updateGpuContext(t);return!!(n.isBatchable||r!==n.isBatchable)}addRenderable(e,t){const r=this.renderer.graphicsContext.updateGpuContext(e.context);e.didViewUpdate&&this._rebuild(e),r.isBatchable?this._addToBatcher(e,t):(this.renderer.renderPipes.batch.break(t),t.add(e))}updateRenderable(e){const r=this._getGpuDataForRenderable(e).batches;for(let n=0;n<r.length;n++){const i=r[n];i._batcher.updateElement(i)}}execute(e){if(!e.isRenderable)return;const t=this.renderer,r=e.context;if(!t.graphicsContext.getGpuContext(r).batches.length)return;const i=r.customShader||this._adaptor.shader;this.state.blendMode=e.groupBlendMode;const s=i.resources.localUniforms.uniforms;s.uTransformMatrix=e.groupTransform,s.uRound=t._roundPixels|e._roundPixels,L(e.groupColorAlpha,s.uColor,0),this._adaptor.execute(this,e)}_rebuild(e){const t=this._getGpuDataForRenderable(e),r=this.renderer.graphicsContext.updateGpuContext(e.context);t.destroy(),r.isBatchable&&this._updateBatchesForRenderable(e,t)}_addToBatcher(e,t){const r=this.renderer.renderPipes.batch,n=this._getGpuDataForRenderable(e).batches;for(let i=0;i<n.length;i++){const s=n[i];r.addToBatch(s,t)}}_getGpuDataForRenderable(e){return e._gpuData[this.renderer.uid]||this._initGpuDataForRenderable(e)}_initGpuDataForRenderable(e){const t=new Ot;return e._gpuData[this.renderer.uid]=t,t}_updateBatchesForRenderable(e,t){const r=e.context,n=this.renderer.graphicsContext.getGpuContext(r),i=this.renderer._roundPixels|e._roundPixels;t.batches=n.batches.map(s=>{const a=V.get(pt);return s.copyTo(a),a.renderable=e,a.roundPixels=i,a})}destroy(){this.renderer=null,this._adaptor.destroy(),this._adaptor=null,this.state=null}}He.extension={type:[p.WebGLPipes,p.WebGPUPipes,p.CanvasPipes],name:"graphics"};const Ke=class $e extends se{constructor(...e){super({});let t=e[0]??{};typeof t=="number"&&(O(Me,"PlaneGeometry constructor changed please use { width, height, verticesX, verticesY } instead"),t={width:t,height:e[1],verticesX:e[2],verticesY:e[3]}),this.build(t)}build(e){e={...$e.defaultOptions,...e},this.verticesX=this.verticesX??e.verticesX,this.verticesY=this.verticesY??e.verticesY,this.width=this.width??e.width,this.height=this.height??e.height;const t=this.verticesX*this.verticesY,r=[],n=[],i=[],s=this.verticesX-1,a=this.verticesY-1,l=this.width/s,u=this.height/a;for(let c=0;c<t;c++){const d=c%this.verticesX,f=c/this.verticesX|0;r.push(d*l,f*u),n.push(d/s,f/a)}const h=s*a;for(let c=0;c<h;c++){const d=c%s,f=c/s|0,m=f*this.verticesX+d,x=f*this.verticesX+d+1,g=(f+1)*this.verticesX+d,_=(f+1)*this.verticesX+d+1;i.push(m,x,g,x,_,g)}this.buffers[0].data=new Float32Array(r),this.buffers[1].data=new Float32Array(n),this.indexBuffer.data=new Uint32Array(i),this.buffers[0].update(),this.buffers[1].update(),this.indexBuffer.update()}};Ke.defaultOptions={width:100,height:100,verticesX:10,verticesY:10};let It=Ke;class ae{constructor(){this.batcherName="default",this.packAsQuad=!1,this.indexOffset=0,this.attributeOffset=0,this.roundPixels=0,this._batcher=null,this._batch=null,this._textureMatrixUpdateId=-1,this._uvUpdateId=-1}get blendMode(){return this.renderable.groupBlendMode}get topology(){return this._topology||this.geometry.topology}set topology(e){this._topology=e}reset(){this.renderable=null,this.texture=null,this._batcher=null,this._batch=null,this.geometry=null,this._uvUpdateId=-1,this._textureMatrixUpdateId=-1}setTexture(e){this.texture!==e&&(this.texture=e,this._textureMatrixUpdateId=-1)}get uvs(){const t=this.geometry.getBuffer("aUV"),r=t.data;let n=r;const i=this.texture.textureMatrix;return i.isSimple||(n=this._transformedUvs,(this._textureMatrixUpdateId!==i._updateID||this._uvUpdateId!==t._updateID)&&((!n||n.length<r.length)&&(n=this._transformedUvs=new Float32Array(r.length)),this._textureMatrixUpdateId=i._updateID,this._uvUpdateId=t._updateID,i.multiplyUvs(r,n))),n}get positions(){return this.geometry.positions}get indices(){return this.geometry.indices}get color(){return this.renderable.groupColorAlpha}get groupTransform(){return this.renderable.groupTransform}get attributeSize(){return this.geometry.positions.length/2}get indexSize(){return this.geometry.indices.length}}class Te{destroy(){}}class Ne{constructor(e,t){this.localUniforms=new M({uTransformMatrix:{value:new P,type:"mat3x3<f32>"},uColor:{value:new Float32Array([1,1,1,1]),type:"vec4<f32>"},uRound:{value:0,type:"f32"}}),this.localUniformsBindGroup=new Ue({0:this.localUniforms}),this.renderer=e,this._adaptor=t,this._adaptor.init()}validateRenderable(e){const t=this._getMeshData(e),r=t.batched,n=e.batched;if(t.batched=n,r!==n)return!0;if(n){const i=e._geometry;if(i.indices.length!==t.indexSize||i.positions.length!==t.vertexSize)return t.indexSize=i.indices.length,t.vertexSize=i.positions.length,!0;const s=this._getBatchableMesh(e);return s.texture.uid!==e._texture.uid&&(s._textureMatrixUpdateId=-1),!s._batcher.checkAndUpdateTexture(s,e._texture)}return!1}addRenderable(e,t){const r=this.renderer.renderPipes.batch,n=this._getMeshData(e);if(e.didViewUpdate&&(n.indexSize=e._geometry.indices?.length,n.vertexSize=e._geometry.positions?.length),n.batched){const i=this._getBatchableMesh(e);i.setTexture(e._texture),i.geometry=e._geometry,r.addToBatch(i,t)}else r.break(t),t.add(e)}updateRenderable(e){if(e.batched){const t=this._getBatchableMesh(e);t.setTexture(e._texture),t.geometry=e._geometry,t._batcher.updateElement(t)}}execute(e){if(!e.isRenderable)return;e.state.blendMode=ne(e.groupBlendMode,e.texture._source);const t=this.localUniforms;t.uniforms.uTransformMatrix=e.groupTransform,t.uniforms.uRound=this.renderer._roundPixels|e._roundPixels,t.update(),L(e.groupColorAlpha,t.uniforms.uColor,0),this._adaptor.execute(this,e)}_getMeshData(e){var t,r;return(t=e._gpuData)[r=this.renderer.uid]||(t[r]=new Te),e._gpuData[this.renderer.uid].meshData||this._initMeshData(e)}_initMeshData(e){return e._gpuData[this.renderer.uid].meshData={batched:e.batched,indexSize:0,vertexSize:0},e._gpuData[this.renderer.uid].meshData}_getBatchableMesh(e){var t,r;return(t=e._gpuData)[r=this.renderer.uid]||(t[r]=new Te),e._gpuData[this.renderer.uid].batchableMesh||this._initBatchableMesh(e)}_initBatchableMesh(e){const t=new ae;return t.renderable=e,t.setTexture(e._texture),t.transform=e.groupTransform,t.roundPixels=this.renderer._roundPixels|e._roundPixels,e._gpuData[this.renderer.uid].batchableMesh=t,t}destroy(){this.localUniforms=null,this.localUniformsBindGroup=null,this._adaptor.destroy(),this._adaptor=null,this.renderer=null}}Ne.extension={type:[p.WebGLPipes,p.WebGPUPipes,p.CanvasPipes],name:"mesh"};class Et{execute(e,t){const r=e.state,n=e.renderer,i=t.shader||e.defaultShader;i.resources.uTexture=t.texture._source,i.resources.uniforms=e.localUniforms;const s=n.gl,a=e.getBuffers(t);n.shader.bind(i),n.state.set(r),n.geometry.bind(a.geometry,i.glProgram);const u=a.geometry.indexBuffer.data.BYTES_PER_ELEMENT===2?s.UNSIGNED_SHORT:s.UNSIGNED_INT;s.drawElements(s.TRIANGLES,t.particleChildren.length*6,u,0)}}class Vt{execute(e,t){const r=e.renderer,n=t.shader||e.defaultShader;n.groups[0]=r.renderPipes.uniformBatch.getUniformBindGroup(e.localUniforms,!0),n.groups[1]=r.texture.getTextureBindGroup(t.texture);const i=e.state,s=e.getBuffers(t);r.encoder.draw({geometry:s.geometry,shader:t.shader||e.defaultShader,state:i,size:t.particleChildren.length*6})}}function we(o,e=null){const t=o*6;if(t>65535?e||(e=new Uint32Array(t)):e||(e=new Uint16Array(t)),e.length!==t)throw new Error(`Out buffer length is incorrect, got ${e.length} and expected ${t}`);for(let r=0,n=0;r<t;r+=6,n+=4)e[r+0]=n+0,e[r+1]=n+1,e[r+2]=n+2,e[r+3]=n+0,e[r+4]=n+2,e[r+5]=n+3;return e}function Wt(o){return{dynamicUpdate:Ce(o,!0),staticUpdate:Ce(o,!1)}}function Ce(o,e){const t=[];t.push(`

        var index = 0;

        for (let i = 0; i < ps.length; ++i)
        {
            const p = ps[i];

            `);let r=0;for(const i in o){const s=o[i];if(e!==s.dynamic)continue;t.push(`offset = index + ${r}`),t.push(s.code);const a=Q(s.format);r+=a.stride/4}t.push(`
            index += stride * 4;
        }
    `),t.unshift(`
        var stride = ${r};
    `);const n=t.join(`
`);return new Function("ps","f32v","u32v",n)}class Lt{constructor(e){this._size=0,this._generateParticleUpdateCache={};const t=this._size=e.size??1e3,r=e.properties;let n=0,i=0;for(const h in r){const c=r[h],d=Q(c.format);c.dynamic?i+=d.stride:n+=d.stride}this._dynamicStride=i/4,this._staticStride=n/4,this.staticAttributeBuffer=new z(t*4*n),this.dynamicAttributeBuffer=new z(t*4*i),this.indexBuffer=we(t);const s=new te;let a=0,l=0;this._staticBuffer=new D({data:new Float32Array(1),label:"static-particle-buffer",shrinkToFit:!1,usage:C.VERTEX|C.COPY_DST}),this._dynamicBuffer=new D({data:new Float32Array(1),label:"dynamic-particle-buffer",shrinkToFit:!1,usage:C.VERTEX|C.COPY_DST});for(const h in r){const c=r[h],d=Q(c.format);c.dynamic?(s.addAttribute(c.attributeName,{buffer:this._dynamicBuffer,stride:this._dynamicStride*4,offset:a*4,format:c.format}),a+=d.size):(s.addAttribute(c.attributeName,{buffer:this._staticBuffer,stride:this._staticStride*4,offset:l*4,format:c.format}),l+=d.size)}s.addIndex(this.indexBuffer);const u=this.getParticleUpdate(r);this._dynamicUpload=u.dynamicUpdate,this._staticUpload=u.staticUpdate,this.geometry=s}getParticleUpdate(e){const t=Yt(e);return this._generateParticleUpdateCache[t]?this._generateParticleUpdateCache[t]:(this._generateParticleUpdateCache[t]=this.generateParticleUpdate(e),this._generateParticleUpdateCache[t])}generateParticleUpdate(e){return Wt(e)}update(e,t){e.length>this._size&&(t=!0,this._size=Math.max(e.length,this._size*1.5|0),this.staticAttributeBuffer=new z(this._size*this._staticStride*4*4),this.dynamicAttributeBuffer=new z(this._size*this._dynamicStride*4*4),this.indexBuffer=we(this._size),this.geometry.indexBuffer.setDataWithSize(this.indexBuffer,this.indexBuffer.byteLength,!0));const r=this.dynamicAttributeBuffer;if(this._dynamicUpload(e,r.float32View,r.uint32View),this._dynamicBuffer.setDataWithSize(this.dynamicAttributeBuffer.float32View,e.length*this._dynamicStride*4,!0),t){const n=this.staticAttributeBuffer;this._staticUpload(e,n.float32View,n.uint32View),this._staticBuffer.setDataWithSize(n.float32View,e.length*this._staticStride*4,!0)}}destroy(){this._staticBuffer.destroy(),this._dynamicBuffer.destroy(),this.geometry.destroy()}}function Yt(o){const e=[];for(const t in o){const r=o[t];e.push(t,r.code,r.dynamic?"d":"s")}return e.join("_")}var Xt=`varying vec2 vUV;
varying vec4 vColor;

uniform sampler2D uTexture;

void main(void){
    vec4 color = texture2D(uTexture, vUV) * vColor;
    gl_FragColor = color;
}`,Ht=`attribute vec2 aVertex;
attribute vec2 aUV;
attribute vec4 aColor;

attribute vec2 aPosition;
attribute float aRotation;

uniform mat3 uTranslationMatrix;
uniform float uRound;
uniform vec2 uResolution;
uniform vec4 uColor;

varying vec2 vUV;
varying vec4 vColor;

vec2 roundPixels(vec2 position, vec2 targetSize)
{       
    return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
}

void main(void){
    float cosRotation = cos(aRotation);
    float sinRotation = sin(aRotation);
    float x = aVertex.x * cosRotation - aVertex.y * sinRotation;
    float y = aVertex.x * sinRotation + aVertex.y * cosRotation;

    vec2 v = vec2(x, y);
    v = v + aPosition;

    gl_Position = vec4((uTranslationMatrix * vec3(v, 1.0)).xy, 0.0, 1.0);

    if(uRound == 1.0)
    {
        gl_Position.xy = roundPixels(gl_Position.xy, uResolution);
    }

    vUV = aUV;
    vColor = vec4(aColor.rgb * aColor.a, aColor.a) * uColor;
}
`,Pe=`
struct ParticleUniforms {
  uTranslationMatrix:mat3x3<f32>,
  uColor:vec4<f32>,
  uRound:f32,
  uResolution:vec2<f32>,
};

fn roundPixels(position: vec2<f32>, targetSize: vec2<f32>) -> vec2<f32>
{
  return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
}

@group(0) @binding(0) var<uniform> uniforms: ParticleUniforms;

@group(1) @binding(0) var uTexture: texture_2d<f32>;
@group(1) @binding(1) var uSampler : sampler;

struct VSOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv : vec2<f32>,
    @location(1) color : vec4<f32>,
  };
@vertex
fn mainVertex(
  @location(0) aVertex: vec2<f32>,
  @location(1) aPosition: vec2<f32>,
  @location(2) aUV: vec2<f32>,
  @location(3) aColor: vec4<f32>,
  @location(4) aRotation: f32,
) -> VSOutput {
  
   let v = vec2(
       aVertex.x * cos(aRotation) - aVertex.y * sin(aRotation),
       aVertex.x * sin(aRotation) + aVertex.y * cos(aRotation)
   ) + aPosition;

   var position = vec4((uniforms.uTranslationMatrix * vec3(v, 1.0)).xy, 0.0, 1.0);

   if(uniforms.uRound == 1.0) {
       position = vec4(roundPixels(position.xy, uniforms.uResolution), position.zw);
   }

    let vColor = vec4(aColor.rgb * aColor.a, aColor.a) * uniforms.uColor;

  return VSOutput(
   position,
   aUV,
   vColor,
  );
}

@fragment
fn mainFragment(
  @location(0) uv: vec2<f32>,
  @location(1) color: vec4<f32>,
  @builtin(position) position: vec4<f32>,
) -> @location(0) vec4<f32> {

    var sample = textureSample(uTexture, uSampler, uv) * color;
   
    return sample;
}`;class Kt extends ie{constructor(){const e=Re.from({vertex:Ht,fragment:Xt}),t=Fe.from({fragment:{source:Pe,entryPoint:"mainFragment"},vertex:{source:Pe,entryPoint:"mainVertex"}});super({glProgram:e,gpuProgram:t,resources:{uTexture:R.WHITE.source,uSampler:new J({}),uniforms:{uTranslationMatrix:{value:new P,type:"mat3x3<f32>"},uColor:{value:new Ge(16777215),type:"vec4<f32>"},uRound:{value:1,type:"f32"},uResolution:{value:[0,0],type:"vec2<f32>"}}}})}}class je{constructor(e,t){this.state=E.for2d(),this.localUniforms=new M({uTranslationMatrix:{value:new P,type:"mat3x3<f32>"},uColor:{value:new Float32Array(4),type:"vec4<f32>"},uRound:{value:1,type:"f32"},uResolution:{value:[0,0],type:"vec2<f32>"}}),this.renderer=e,this.adaptor=t,this.defaultShader=new Kt,this.state=E.for2d()}validateRenderable(e){return!1}addRenderable(e,t){this.renderer.renderPipes.batch.break(t),t.add(e)}getBuffers(e){return e._gpuData[this.renderer.uid]||this._initBuffer(e)}_initBuffer(e){return e._gpuData[this.renderer.uid]=new Lt({size:e.particleChildren.length,properties:e._properties}),e._gpuData[this.renderer.uid]}updateRenderable(e){}execute(e){const t=e.particleChildren;if(t.length===0)return;const r=this.renderer,n=this.getBuffers(e);e.texture||(e.texture=t[0].texture);const i=this.state;n.update(t,e._childrenDirty),e._childrenDirty=!1,i.blendMode=ne(e.blendMode,e.texture._source);const s=this.localUniforms.uniforms,a=s.uTranslationMatrix;e.worldTransform.copyTo(a),a.prepend(r.globalUniforms.globalUniformData.projectionMatrix),s.uResolution=r.globalUniforms.globalUniformData.resolution,s.uRound=r._roundPixels|e._roundPixels,L(e.groupColorAlpha,s.uColor,0),this.adaptor.execute(this,e)}destroy(){this.renderer=null,this.defaultShader&&(this.defaultShader.destroy(),this.defaultShader=null)}}class qe extends je{constructor(e){super(e,new Et)}}qe.extension={type:[p.WebGLPipes],name:"particle"};class Qe extends je{constructor(e){super(e,new Vt)}}Qe.extension={type:[p.WebGPUPipes],name:"particle"};const Je=class Ze extends It{constructor(e={}){e={...Ze.defaultOptions,...e},super({width:e.width,height:e.height,verticesX:4,verticesY:4}),this.update(e)}update(e){this.width=e.width??this.width,this.height=e.height??this.height,this._originalWidth=e.originalWidth??this._originalWidth,this._originalHeight=e.originalHeight??this._originalHeight,this._leftWidth=e.leftWidth??this._leftWidth,this._rightWidth=e.rightWidth??this._rightWidth,this._topHeight=e.topHeight??this._topHeight,this._bottomHeight=e.bottomHeight??this._bottomHeight,this._anchorX=e.anchor?.x,this._anchorY=e.anchor?.y,this.updateUvs(),this.updatePositions()}updatePositions(){const e=this.positions,{width:t,height:r,_leftWidth:n,_rightWidth:i,_topHeight:s,_bottomHeight:a,_anchorX:l,_anchorY:u}=this,h=n+i,c=t>h?1:t/h,d=s+a,f=r>d?1:r/d,m=Math.min(c,f),x=l*t,g=u*r;e[0]=e[8]=e[16]=e[24]=-x,e[2]=e[10]=e[18]=e[26]=n*m-x,e[4]=e[12]=e[20]=e[28]=t-i*m-x,e[6]=e[14]=e[22]=e[30]=t-x,e[1]=e[3]=e[5]=e[7]=-g,e[9]=e[11]=e[13]=e[15]=s*m-g,e[17]=e[19]=e[21]=e[23]=r-a*m-g,e[25]=e[27]=e[29]=e[31]=r-g,this.getBuffer("aPosition").update()}updateUvs(){const e=this.uvs;e[0]=e[8]=e[16]=e[24]=0,e[1]=e[3]=e[5]=e[7]=0,e[6]=e[14]=e[22]=e[30]=1,e[25]=e[27]=e[29]=e[31]=1;const t=1/this._originalWidth,r=1/this._originalHeight;e[2]=e[10]=e[18]=e[26]=t*this._leftWidth,e[9]=e[11]=e[13]=e[15]=r*this._topHeight,e[4]=e[12]=e[20]=e[28]=1-t*this._rightWidth,e[17]=e[19]=e[21]=e[23]=1-r*this._bottomHeight,this.getBuffer("aUV").update()}};Je.defaultOptions={width:100,height:100,leftWidth:10,topHeight:10,rightWidth:10,bottomHeight:10,originalWidth:100,originalHeight:100};let $t=Je;class Nt extends ae{constructor(){super(),this.geometry=new $t}destroy(){this.geometry.destroy()}}class et{constructor(e){this._renderer=e}addRenderable(e,t){const r=this._getGpuSprite(e);e.didViewUpdate&&this._updateBatchableSprite(e,r),this._renderer.renderPipes.batch.addToBatch(r,t)}updateRenderable(e){const t=this._getGpuSprite(e);e.didViewUpdate&&this._updateBatchableSprite(e,t),t._batcher.updateElement(t)}validateRenderable(e){const t=this._getGpuSprite(e);return!t._batcher.checkAndUpdateTexture(t,e._texture)}_updateBatchableSprite(e,t){t.geometry.update(e),t.setTexture(e._texture)}_getGpuSprite(e){return e._gpuData[this._renderer.uid]||this._initGPUSprite(e)}_initGPUSprite(e){const t=e._gpuData[this._renderer.uid]=new Nt,r=t;return r.renderable=e,r.transform=e.groupTransform,r.texture=e._texture,r.roundPixels=this._renderer._roundPixels|e._roundPixels,e.didViewUpdate||this._updateBatchableSprite(e,r),t}destroy(){this._renderer=null}}et.extension={type:[p.WebGLPipes,p.WebGPUPipes,p.CanvasPipes],name:"nineSliceSprite"};const jt={name:"tiling-bit",vertex:{header:`
            struct TilingUniforms {
                uMapCoord:mat3x3<f32>,
                uClampFrame:vec4<f32>,
                uClampOffset:vec2<f32>,
                uTextureTransform:mat3x3<f32>,
                uSizeAnchor:vec4<f32>
            };

            @group(2) @binding(0) var<uniform> tilingUniforms: TilingUniforms;
            @group(2) @binding(1) var uTexture: texture_2d<f32>;
            @group(2) @binding(2) var uSampler: sampler;
        `,main:`
            uv = (tilingUniforms.uTextureTransform * vec3(uv, 1.0)).xy;

            position = (position - tilingUniforms.uSizeAnchor.zw) * tilingUniforms.uSizeAnchor.xy;
        `},fragment:{header:`
            struct TilingUniforms {
                uMapCoord:mat3x3<f32>,
                uClampFrame:vec4<f32>,
                uClampOffset:vec2<f32>,
                uTextureTransform:mat3x3<f32>,
                uSizeAnchor:vec4<f32>
            };

            @group(2) @binding(0) var<uniform> tilingUniforms: TilingUniforms;
            @group(2) @binding(1) var uTexture: texture_2d<f32>;
            @group(2) @binding(2) var uSampler: sampler;
        `,main:`

            var coord = vUV + ceil(tilingUniforms.uClampOffset - vUV);
            coord = (tilingUniforms.uMapCoord * vec3(coord, 1.0)).xy;
            var unclamped = coord;
            coord = clamp(coord, tilingUniforms.uClampFrame.xy, tilingUniforms.uClampFrame.zw);

            var bias = 0.;

            if(unclamped.x == coord.x && unclamped.y == coord.y)
            {
                bias = -32.;
            }

            outColor = textureSampleBias(uTexture, uSampler, coord, bias);
        `}},qt={name:"tiling-bit",vertex:{header:`
            uniform mat3 uTextureTransform;
            uniform vec4 uSizeAnchor;

        `,main:`
            uv = (uTextureTransform * vec3(aUV, 1.0)).xy;

            position = (position - uSizeAnchor.zw) * uSizeAnchor.xy;
        `},fragment:{header:`
            uniform sampler2D uTexture;
            uniform mat3 uMapCoord;
            uniform vec4 uClampFrame;
            uniform vec2 uClampOffset;
        `,main:`

        vec2 coord = vUV + ceil(uClampOffset - vUV);
        coord = (uMapCoord * vec3(coord, 1.0)).xy;
        vec2 unclamped = coord;
        coord = clamp(coord, uClampFrame.xy, uClampFrame.zw);

        outColor = texture(uTexture, coord, unclamped == coord ? 0.0 : -32.0);// lod-bias very negative to force lod 0

        `}};let X,H;class Qt extends ie{constructor(){X??(X=De({name:"tiling-sprite-shader",bits:[Pt,jt,Ae]})),H??(H=ze({name:"tiling-sprite-shader",bits:[St,qt,ke]}));const e=new M({uMapCoord:{value:new P,type:"mat3x3<f32>"},uClampFrame:{value:new Float32Array([0,0,1,1]),type:"vec4<f32>"},uClampOffset:{value:new Float32Array([0,0]),type:"vec2<f32>"},uTextureTransform:{value:new P,type:"mat3x3<f32>"},uSizeAnchor:{value:new Float32Array([100,100,.5,.5]),type:"vec4<f32>"}});super({glProgram:H,gpuProgram:X,resources:{localUniforms:new M({uTransformMatrix:{value:new P,type:"mat3x3<f32>"},uColor:{value:new Float32Array([1,1,1,1]),type:"vec4<f32>"},uRound:{value:0,type:"f32"}}),tilingUniforms:e,uTexture:R.EMPTY.source,uSampler:R.EMPTY.source.style}})}updateUniforms(e,t,r,n,i,s){const a=this.resources.tilingUniforms,l=s.width,u=s.height,h=s.textureMatrix,c=a.uniforms.uTextureTransform;c.set(r.a*l/e,r.b*l/t,r.c*u/e,r.d*u/t,r.tx/e,r.ty/t),c.invert(),a.uniforms.uMapCoord=h.mapCoord,a.uniforms.uClampFrame=h.uClampFrame,a.uniforms.uClampOffset=h.uClampOffset,a.uniforms.uTextureTransform=c,a.uniforms.uSizeAnchor[0]=e,a.uniforms.uSizeAnchor[1]=t,a.uniforms.uSizeAnchor[2]=n,a.uniforms.uSizeAnchor[3]=i,s&&(this.resources.uTexture=s.source,this.resources.uSampler=s.source.style)}}class Jt extends se{constructor(){super({positions:new Float32Array([0,0,1,0,1,1,0,1]),uvs:new Float32Array([0,0,1,0,1,1,0,1]),indices:new Uint32Array([0,1,2,0,2,3])})}}function Zt(o,e){const t=o.anchor.x,r=o.anchor.y;e[0]=-t*o.width,e[1]=-r*o.height,e[2]=(1-t)*o.width,e[3]=-r*o.height,e[4]=(1-t)*o.width,e[5]=(1-r)*o.height,e[6]=-t*o.width,e[7]=(1-r)*o.height}function er(o,e,t,r){let n=0;const i=o.length/e,s=r.a,a=r.b,l=r.c,u=r.d,h=r.tx,c=r.ty;for(t*=e;n<i;){const d=o[t],f=o[t+1];o[t]=s*d+l*f+h,o[t+1]=a*d+u*f+c,t+=e,n++}}function tr(o,e){const t=o.texture,r=t.frame.width,n=t.frame.height;let i=0,s=0;o.applyAnchorToTexture&&(i=o.anchor.x,s=o.anchor.y),e[0]=e[6]=-i,e[2]=e[4]=1-i,e[1]=e[3]=-s,e[5]=e[7]=1-s;const a=P.shared;a.copyFrom(o._tileTransform.matrix),a.tx/=o.width,a.ty/=o.height,a.invert(),a.scale(o.width/r,o.height/n),er(e,2,0,a)}const k=new Jt;class rr{constructor(){this.canBatch=!0,this.geometry=new se({indices:k.indices.slice(),positions:k.positions.slice(),uvs:k.uvs.slice()})}destroy(){this.geometry.destroy(),this.shader?.destroy()}}class tt{constructor(e){this._state=E.default2d,this._renderer=e}validateRenderable(e){const t=this._getTilingSpriteData(e),r=t.canBatch;this._updateCanBatch(e);const n=t.canBatch;if(n&&n===r){const{batchableMesh:i}=t;return!i._batcher.checkAndUpdateTexture(i,e.texture)}return r!==n}addRenderable(e,t){const r=this._renderer.renderPipes.batch;this._updateCanBatch(e);const n=this._getTilingSpriteData(e),{geometry:i,canBatch:s}=n;if(s){n.batchableMesh||(n.batchableMesh=new ae);const a=n.batchableMesh;e.didViewUpdate&&(this._updateBatchableMesh(e),a.geometry=i,a.renderable=e,a.transform=e.groupTransform,a.setTexture(e._texture)),a.roundPixels=this._renderer._roundPixels|e._roundPixels,r.addToBatch(a,t)}else r.break(t),n.shader||(n.shader=new Qt),this.updateRenderable(e),t.add(e)}execute(e){const{shader:t}=this._getTilingSpriteData(e);t.groups[0]=this._renderer.globalUniforms.bindGroup;const r=t.resources.localUniforms.uniforms;r.uTransformMatrix=e.groupTransform,r.uRound=this._renderer._roundPixels|e._roundPixels,L(e.groupColorAlpha,r.uColor,0),this._state.blendMode=ne(e.groupBlendMode,e.texture._source),this._renderer.encoder.draw({geometry:k,shader:t,state:this._state})}updateRenderable(e){const t=this._getTilingSpriteData(e),{canBatch:r}=t;if(r){const{batchableMesh:n}=t;e.didViewUpdate&&this._updateBatchableMesh(e),n._batcher.updateElement(n)}else if(e.didViewUpdate){const{shader:n}=t;n.updateUniforms(e.width,e.height,e._tileTransform.matrix,e.anchor.x,e.anchor.y,e.texture)}}_getTilingSpriteData(e){return e._gpuData[this._renderer.uid]||this._initTilingSpriteData(e)}_initTilingSpriteData(e){const t=new rr;return t.renderable=e,e._gpuData[this._renderer.uid]=t,t}_updateBatchableMesh(e){const t=this._getTilingSpriteData(e),{geometry:r}=t,n=e.texture.source.style;n.addressMode!=="repeat"&&(n.addressMode="repeat",n.update()),tr(e,r.uvs),Zt(e,r.positions)}destroy(){this._renderer=null}_updateCanBatch(e){const t=this._getTilingSpriteData(e),r=e.texture;let n=!0;return this._renderer.type===re.WEBGL&&(n=this._renderer.context.supports.nonPowOf2wrapping),t.canBatch=r.textureMatrix.isSimple&&(n||r.source.isPowerOfTwo),t.canBatch}}tt.extension={type:[p.WebGLPipes,p.WebGPUPipes,p.CanvasPipes],name:"tilingSprite"};const nr={name:"local-uniform-msdf-bit",vertex:{header:`
            struct LocalUniforms {
                uColor:vec4<f32>,
                uTransformMatrix:mat3x3<f32>,
                uDistance: f32,
                uRound:f32,
            }

            @group(2) @binding(0) var<uniform> localUniforms : LocalUniforms;
        `,main:`
            vColor *= localUniforms.uColor;
            modelMatrix *= localUniforms.uTransformMatrix;
        `,end:`
            if(localUniforms.uRound == 1)
            {
                vPosition = vec4(roundPixels(vPosition.xy, globalUniforms.uResolution), vPosition.zw);
            }
        `},fragment:{header:`
            struct LocalUniforms {
                uColor:vec4<f32>,
                uTransformMatrix:mat3x3<f32>,
                uDistance: f32
            }

            @group(2) @binding(0) var<uniform> localUniforms : LocalUniforms;
         `,main:`
            outColor = vec4<f32>(calculateMSDFAlpha(outColor, localUniforms.uColor, localUniforms.uDistance));
        `}},ir={name:"local-uniform-msdf-bit",vertex:{header:`
            uniform mat3 uTransformMatrix;
            uniform vec4 uColor;
            uniform float uRound;
        `,main:`
            vColor *= uColor;
            modelMatrix *= uTransformMatrix;
        `,end:`
            if(uRound == 1.)
            {
                gl_Position.xy = roundPixels(gl_Position.xy, uResolution);
            }
        `},fragment:{header:`
            uniform float uDistance;
         `,main:`
            outColor = vec4(calculateMSDFAlpha(outColor, vColor, uDistance));
        `}},sr={name:"msdf-bit",fragment:{header:`
            fn calculateMSDFAlpha(msdfColor:vec4<f32>, shapeColor:vec4<f32>, distance:f32) -> f32 {

                // MSDF
                var median = msdfColor.r + msdfColor.g + msdfColor.b -
                    min(msdfColor.r, min(msdfColor.g, msdfColor.b)) -
                    max(msdfColor.r, max(msdfColor.g, msdfColor.b));

                // SDF
                median = min(median, msdfColor.a);

                var screenPxDistance = distance * (median - 0.5);
                var alpha = clamp(screenPxDistance + 0.5, 0.0, 1.0);
                if (median < 0.01) {
                    alpha = 0.0;
                } else if (median > 0.99) {
                    alpha = 1.0;
                }

                // Gamma correction for coverage-like alpha
                var luma: f32 = dot(shapeColor.rgb, vec3<f32>(0.299, 0.587, 0.114));
                var gamma: f32 = mix(1.0, 1.0 / 2.2, luma);
                var coverage: f32 = pow(shapeColor.a * alpha, gamma);

                return coverage;

            }
        `}},ar={name:"msdf-bit",fragment:{header:`
            float calculateMSDFAlpha(vec4 msdfColor, vec4 shapeColor, float distance) {

                // MSDF
                float median = msdfColor.r + msdfColor.g + msdfColor.b -
                                min(msdfColor.r, min(msdfColor.g, msdfColor.b)) -
                                max(msdfColor.r, max(msdfColor.g, msdfColor.b));

                // SDF
                median = min(median, msdfColor.a);

                float screenPxDistance = distance * (median - 0.5);
                float alpha = clamp(screenPxDistance + 0.5, 0.0, 1.0);

                if (median < 0.01) {
                    alpha = 0.0;
                } else if (median > 0.99) {
                    alpha = 1.0;
                }

                // Gamma correction for coverage-like alpha
                float luma = dot(shapeColor.rgb, vec3(0.299, 0.587, 0.114));
                float gamma = mix(1.0, 1.0 / 2.2, luma);
                float coverage = pow(shapeColor.a * alpha, gamma);

                return coverage;
            }
        `}};let K,$;class or extends ie{constructor(e){const t=new M({uColor:{value:new Float32Array([1,1,1,1]),type:"vec4<f32>"},uTransformMatrix:{value:new P,type:"mat3x3<f32>"},uDistance:{value:4,type:"f32"},uRound:{value:0,type:"f32"}});K??(K=De({name:"sdf-shader",bits:[mt,gt(e),nr,sr,Ae]})),$??($=ze({name:"sdf-shader",bits:[xt,_t(e),ir,ar,ke]})),super({glProgram:$,gpuProgram:K,resources:{localUniforms:t,batchSamplers:vt(e)}})}}class ur extends Tt{destroy(){this.context.customShader&&this.context.customShader.destroy(),super.destroy()}}class rt{constructor(e){this._renderer=e}validateRenderable(e){const t=this._getGpuBitmapText(e);return this._renderer.renderPipes.graphics.validateRenderable(t)}addRenderable(e,t){const r=this._getGpuBitmapText(e);Se(e,r),e._didTextUpdate&&(e._didTextUpdate=!1,this._updateContext(e,r)),this._renderer.renderPipes.graphics.addRenderable(r,t),r.context.customShader&&this._updateDistanceField(e)}updateRenderable(e){const t=this._getGpuBitmapText(e);Se(e,t),this._renderer.renderPipes.graphics.updateRenderable(t),t.context.customShader&&this._updateDistanceField(e)}_updateContext(e,t){const{context:r}=t,n=bt.getFont(e.text,e._style);r.clear(),n.distanceField.type!=="none"&&(r.customShader||(r.customShader=new or(this._renderer.limits.maxBatchableTextures)));const i=B.graphemeSegmenter(e.text),s=e._style;let a=n.baseLineOffset;const l=yt(i,s,n,!0),u=s.padding,h=l.scale;let c=l.width,d=l.height+l.offsetY;s._stroke&&(c+=s._stroke.width/h,d+=s._stroke.width/h),r.translate(-e._anchor._x*c-u,-e._anchor._y*d-u).scale(h,h);const f=n.applyFillAsTint?s._fill.color:16777215;let m=n.fontMetrics.fontSize,x=n.lineHeight;s.lineHeight&&(m=s.fontSize/h,x=s.lineHeight/h);let g=(x-m)/2;g-n.baseLineOffset<0&&(g=0);for(let _=0;_<l.lines.length;_++){const v=l.lines[_];for(let T=0;T<v.charPositions.length;T++){const A=v.chars[T],F=n.chars[A];if(F?.texture){const G=F.texture;r.texture(G,f||"black",Math.round(v.charPositions[T]+F.xOffset),Math.round(a+F.yOffset+g),G.orig.width,G.orig.height)}}a+=x}}_getGpuBitmapText(e){return e._gpuData[this._renderer.uid]||this.initGpuText(e)}initGpuText(e){const t=new ur;return e._gpuData[this._renderer.uid]=t,this._updateContext(e,t),t}_updateDistanceField(e){const t=this._getGpuBitmapText(e).context,r=e._style.fontFamily,n=Z.get(`${r}-bitmap`),{a:i,b:s,c:a,d:l}=e.groupTransform,u=Math.sqrt(i*i+s*s),h=Math.sqrt(a*a+l*l),c=(Math.abs(u)+Math.abs(h))/2,d=n.baseRenderedFontSize/e._style.fontSize,f=c*n.distanceField.range*(1/d);t.customShader.resources.localUniforms.uniforms.uDistance=f}destroy(){this._renderer=null}}rt.extension={type:[p.WebGLPipes,p.WebGPUPipes,p.CanvasPipes],name:"bitmapText"};function Se(o,e){e.groupTransform=o.groupTransform,e.groupColorAlpha=o.groupColorAlpha,e.groupColor=o.groupColor,e.groupBlendMode=o.groupBlendMode,e.globalDisplayStatus=o.globalDisplayStatus,e.groupTransform=o.groupTransform,e.localDisplayStatus=o.localDisplayStatus,e.groupAlpha=o.groupAlpha,e._roundPixels=o._roundPixels}class lr extends Oe{constructor(e){super(),this.generatingTexture=!1,this.currentKey="--",this._renderer=e,e.runners.resolutionChange.add(this)}resolutionChange(){const e=this.renderable;e._autoResolution&&e.onViewUpdate()}destroy(){const{htmlText:e}=this._renderer;e.getReferenceCount(this.currentKey)===null?e.returnTexturePromise(this.texturePromise):e.decreaseReferenceCount(this.currentKey),this._renderer.runners.resolutionChange.remove(this),this.texturePromise=null,this._renderer=null}}function ee(o,e){const{texture:t,bounds:r}=o,n=e._style._getFinalPadding();wt(r,e._anchor,t);const i=e._anchor._x*n*2,s=e._anchor._y*n*2;r.minX-=n-i,r.minY-=n-s,r.maxX-=n-i,r.maxY-=n-s}class nt{constructor(e){this._renderer=e}validateRenderable(e){const t=this._getGpuText(e),r=e.styleKey;return t.currentKey!==r}addRenderable(e,t){const r=this._getGpuText(e);if(e._didTextUpdate){const n=e._autoResolution?this._renderer.resolution:e.resolution;(r.currentKey!==e.styleKey||e.resolution!==n)&&this._updateGpuText(e).catch(i=>{console.error(i)}),e._didTextUpdate=!1,ee(r,e)}this._renderer.renderPipes.batch.addToBatch(r,t)}updateRenderable(e){const t=this._getGpuText(e);t._batcher.updateElement(t)}async _updateGpuText(e){e._didTextUpdate=!1;const t=this._getGpuText(e);if(t.generatingTexture)return;const r=t.texturePromise;t.texturePromise=null,t.generatingTexture=!0,e._resolution=e._autoResolution?this._renderer.resolution:e.resolution;let n=this._renderer.htmlText.getTexturePromise(e);r&&(n=n.finally(()=>{this._renderer.htmlText.decreaseReferenceCount(t.currentKey),this._renderer.htmlText.returnTexturePromise(r)})),t.texturePromise=n,t.currentKey=e.styleKey,t.texture=await n;const i=e.renderGroup||e.parentRenderGroup;i&&(i.structureDidChange=!0),t.generatingTexture=!1,ee(t,e)}_getGpuText(e){return e._gpuData[this._renderer.uid]||this.initGpuText(e)}initGpuText(e){const t=new lr(this._renderer);return t.renderable=e,t.transform=e.groupTransform,t.texture=R.EMPTY,t.bounds={minX:0,maxX:1,minY:0,maxY:0},t.roundPixels=this._renderer._roundPixels|e._roundPixels,e._resolution=e._autoResolution?this._renderer.resolution:e.resolution,e._gpuData[this._renderer.uid]=t,t}destroy(){this._renderer=null}}nt.extension={type:[p.WebGLPipes,p.WebGPUPipes,p.CanvasPipes],name:"htmlText"};function cr(){const{userAgent:o}=W.get().getNavigator();return/^((?!chrome|android).)*safari/i.test(o)}const dr=new Be;function it(o,e,t,r){const n=dr;n.minX=0,n.minY=0,n.maxX=o.width/r|0,n.maxY=o.height/r|0;const i=w.getOptimalTexture(n.width,n.height,r,!1);return i.source.uploadMethodId="image",i.source.resource=o,i.source.alphaMode="premultiply-alpha-on-upload",i.frame.width=e/r,i.frame.height=t/r,i.source.emit("update",i.source),i.updateUvs(),i}function hr(o,e){const t=e.fontFamily,r=[],n={},i=/font-family:([^;"\s]+)/g,s=o.match(i);function a(l){n[l]||(r.push(l),n[l]=!0)}if(Array.isArray(t))for(let l=0;l<t.length;l++)a(t[l]);else a(t);s&&s.forEach(l=>{const u=l.split(":")[1].trim();a(u)});for(const l in e.tagStyles){const u=e.tagStyles[l].fontFamily;a(u)}return r}async function fr(o){const t=await(await W.get().fetch(o)).blob(),r=new FileReader;return await new Promise((i,s)=>{r.onloadend=()=>i(r.result),r.onerror=s,r.readAsDataURL(t)})}async function pr(o,e){const t=await fr(e);return`@font-face {
        font-family: "${o.fontFamily}";
        font-weight: ${o.fontWeight};
        font-style: ${o.fontStyle};
        src: url('${t}');
    }`}const N=new Map;async function mr(o){const e=o.filter(t=>Z.has(`${t}-and-url`)).map(t=>{if(!N.has(t)){const{entries:r}=Z.get(`${t}-and-url`),n=[];r.forEach(i=>{const s=i.url,l=i.faces.map(u=>({weight:u.weight,style:u.style}));n.push(...l.map(u=>pr({fontWeight:u.weight,fontStyle:u.style,fontFamily:t},s)))}),N.set(t,Promise.all(n).then(i=>i.join(`
`)))}return N.get(t)});return(await Promise.all(e)).join(`
`)}function gr(o,e,t,r,n){const{domElement:i,styleElement:s,svgRoot:a}=n;i.innerHTML=`<style>${e.cssStyle}</style><div style='padding:0;'>${o}</div>`,i.setAttribute("style",`transform: scale(${t});transform-origin: top left; display: inline-block`),s.textContent=r;const{width:l,height:u}=n.image;return a.setAttribute("width",l.toString()),a.setAttribute("height",u.toString()),new XMLSerializer().serializeToString(a)}function xr(o,e){const t=I.getOptimalCanvasAndContext(o.width,o.height,e),{context:r}=t;return r.clearRect(0,0,o.width,o.height),r.drawImage(o,0,0),t}function _r(o,e,t){return new Promise(async r=>{t&&await new Promise(n=>setTimeout(n,100)),o.onload=()=>{r()},o.src=`data:image/svg+xml;charset=utf8,${encodeURIComponent(e)}`,o.crossOrigin="anonymous"})}class st{constructor(e){this._activeTextures={},this._renderer=e,this._createCanvas=e.type===re.WEBGPU}getTexture(e){return this.getTexturePromise(e)}getManagedTexture(e){const t=e.styleKey;if(this._activeTextures[t])return this._increaseReferenceCount(t),this._activeTextures[t].promise;const r=this._buildTexturePromise(e).then(n=>(this._activeTextures[t].texture=n,n));return this._activeTextures[t]={texture:null,promise:r,usageCount:1},r}getReferenceCount(e){return this._activeTextures[e]?.usageCount??null}_increaseReferenceCount(e){this._activeTextures[e].usageCount++}decreaseReferenceCount(e){const t=this._activeTextures[e];t&&(t.usageCount--,t.usageCount===0&&(t.texture?this._cleanUp(t.texture):t.promise.then(r=>{t.texture=r,this._cleanUp(t.texture)}).catch(()=>{j("HTMLTextSystem: Failed to clean texture")}),this._activeTextures[e]=null))}getTexturePromise(e){return this._buildTexturePromise(e)}async _buildTexturePromise(e){const{text:t,style:r,resolution:n,textureStyle:i}=e,s=V.get(Xe),a=hr(t,r),l=await mr(a),u=kt(t,r,l,s),h=Math.ceil(Math.ceil(Math.max(1,u.width)+r.padding*2)*n),c=Math.ceil(Math.ceil(Math.max(1,u.height)+r.padding*2)*n),d=s.image,f=2;d.width=(h|0)+f,d.height=(c|0)+f;const m=gr(t,r,n,l,s);await _r(d,m,cr()&&a.length>0);const x=d;let g;this._createCanvas&&(g=xr(d,n));const _=it(g?g.canvas:x,d.width-f,d.height-f,n);return i&&(_.source.style=i),this._createCanvas&&(this._renderer.texture.initSource(_.source),I.returnCanvasAndContext(g)),V.return(s),_}returnTexturePromise(e){e.then(t=>{this._cleanUp(t)}).catch(()=>{j("HTMLTextSystem: Failed to clean texture")})}_cleanUp(e){w.returnTexture(e,!0),e.source.resource=null,e.source.uploadMethodId="unknown"}destroy(){this._renderer=null;for(const e in this._activeTextures)this._activeTextures[e]&&this.returnTexturePromise(this._activeTextures[e].promise);this._activeTextures=null}}st.extension={type:[p.WebGLSystem,p.WebGPUSystem,p.CanvasSystem],name:"htmlText"};class vr extends Oe{constructor(e){super(),this._renderer=e,e.runners.resolutionChange.add(this)}resolutionChange(){const e=this.renderable;e._autoResolution&&e.onViewUpdate()}destroy(){const{canvasText:e}=this._renderer;e.getReferenceCount(this.currentKey)>0?e.decreaseReferenceCount(this.currentKey):this.texture&&e.returnTexture(this.texture),this._renderer.runners.resolutionChange.remove(this),this._renderer=null}}class at{constructor(e){this._renderer=e}validateRenderable(e){const t=this._getGpuText(e),r=e.styleKey;return t.currentKey!==r?!0:e._didTextUpdate}addRenderable(e,t){const r=this._getGpuText(e);if(e._didTextUpdate){const n=e._autoResolution?this._renderer.resolution:e.resolution;(r.currentKey!==e.styleKey||e.resolution!==n)&&this._updateGpuText(e),e._didTextUpdate=!1,ee(r,e)}this._renderer.renderPipes.batch.addToBatch(r,t)}updateRenderable(e){const t=this._getGpuText(e);t._batcher.updateElement(t)}_updateGpuText(e){const t=this._getGpuText(e);t.texture&&this._renderer.canvasText.decreaseReferenceCount(t.currentKey),e._resolution=e._autoResolution?this._renderer.resolution:e.resolution,t.texture=this._renderer.canvasText.getManagedTexture(e),t.currentKey=e.styleKey}_getGpuText(e){return e._gpuData[this._renderer.uid]||this.initGpuText(e)}initGpuText(e){const t=new vr(this._renderer);return t.currentKey="--",t.renderable=e,t.transform=e.groupTransform,t.bounds={minX:0,maxX:1,minY:0,maxY:0},t.roundPixels=this._renderer._roundPixels|e._roundPixels,e._gpuData[this._renderer.uid]=t,t}destroy(){this._renderer=null}}at.extension={type:[p.WebGLPipes,p.WebGPUPipes,p.CanvasPipes],name:"text"};class ot{constructor(e){this._activeTextures={},this._renderer=e}getTexture(e,t,r,n){typeof e=="string"&&(O("8.0.0","CanvasTextSystem.getTexture: Use object TextOptions instead of separate arguments"),e={text:e,style:r,resolution:t}),e.style instanceof fe||(e.style=new fe(e.style)),e.textureStyle instanceof J||(e.textureStyle=new J(e.textureStyle)),typeof e.text!="string"&&(e.text=e.text.toString());const{text:i,style:s,textureStyle:a}=e,l=e.resolution??this._renderer.resolution,{frame:u,canvasAndContext:h}=Y.getCanvasAndContext({text:i,style:s,resolution:l}),c=it(h.canvas,u.width,u.height,l);if(a&&(c.source.style=a),s.trim&&(u.pad(s.padding),c.frame.copyFrom(u),c.frame.scale(1/l),c.updateUvs()),s.filters){const d=this._applyFilters(c,s.filters);return this.returnTexture(c),Y.returnCanvasAndContext(h),d}return this._renderer.texture.initSource(c._source),Y.returnCanvasAndContext(h),c}returnTexture(e){const t=e.source;t.resource=null,t.uploadMethodId="unknown",t.alphaMode="no-premultiply-alpha",w.returnTexture(e,!0)}renderTextToCanvas(){O("8.10.0","CanvasTextSystem.renderTextToCanvas: no longer supported, use CanvasTextSystem.getTexture instead")}getManagedTexture(e){e._resolution=e._autoResolution?this._renderer.resolution:e.resolution;const t=e.styleKey;if(this._activeTextures[t])return this._increaseReferenceCount(t),this._activeTextures[t].texture;const r=this.getTexture({text:e.text,style:e.style,resolution:e._resolution,textureStyle:e.textureStyle});return this._activeTextures[t]={texture:r,usageCount:1},r}decreaseReferenceCount(e){const t=this._activeTextures[e];t.usageCount--,t.usageCount===0&&(this.returnTexture(t.texture),this._activeTextures[e]=null)}getReferenceCount(e){return this._activeTextures[e]?.usageCount??0}_increaseReferenceCount(e){this._activeTextures[e].usageCount++}_applyFilters(e,t){const r=this._renderer.renderTarget.renderTarget,n=this._renderer.filter.generateFilteredTexture({texture:e,filters:t});return this._renderer.renderTarget.bind(r,!1),n}destroy(){this._renderer=null;for(const e in this._activeTextures)this._activeTextures[e]&&this.returnTexture(this._activeTextures[e].texture);this._activeTextures=null}}ot.extension={type:[p.WebGLSystem,p.WebGPUSystem,p.CanvasSystem],name:"canvasText"};y.add(Ie);y.add(Ee);y.add(He);y.add(Ct);y.add(Ne);y.add(qe);y.add(Qe);y.add(ot);y.add(at);y.add(rt);y.add(st);y.add(nt);y.add(tt);y.add(et);y.add(We);y.add(Ve);
