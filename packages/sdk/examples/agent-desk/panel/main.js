(()=>{var E="openchamber.sdk",g=2;var ge="openchamber:guest-bootstrap",Fo=(e,r,s)=>{let{window:i,MessageChannel:d}=globalThis;if(!i||!d)return;try{let T=new d,_=T.port1,S=!1,U=!1,w=null,F=(C)=>{try{C.close()}catch{}},Y=(C=[])=>{for(let P of C)F(P);if(!S)S=!0,F(_)},j=(C)=>{let P=new CustomEvent(s,{detail:C,cancelable:!0});if(!i.dispatchEvent(P))return;F(C),S=!0};i.addEventListener(s,(C)=>{if(!("detail"in C)||C.detail!==null)return;if(U=!0,w){let P=w;w=null,j(P)}}),_.addEventListener("message",(C)=>{if(S)return;let P=C.data,V=C.ports??[];if(!P||P.channel!==e||P.v!==r||P.type!=="connect-port"||V.length!==1){Y(V);return}let z=V[0];if(S=!0,F(_),z.start(),!U){w=z;return}j(z)}),_.start(),i.parent.postMessage({channel:e,v:r,type:"bootstrap"},"*",[T.port2])}catch{}},Vo=`(${Fo.toString()})(${JSON.stringify("openchamber.guest-bootstrap")}, 2, ${JSON.stringify("openchamber:guest-bootstrap")});`;var je=`
:root {
  /* Quiet at rest like the app's own thumbs; hover gives a clear grab target. */
  --oc-scrollbar-thumb: color-mix(in srgb, var(--oc-muted, currentColor) 18%, transparent);
  --oc-scrollbar-thumb-hover: color-mix(in srgb, var(--oc-muted, currentColor) 36%, transparent);
  scrollbar-gutter: stable;
}
* {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
:hover, [data-oc-scrolling] {
  scrollbar-color: var(--oc-scrollbar-thumb) transparent;
}
/* Chromium's standard scrollbar properties otherwise override its pseudo-elements. */
@supports selector(::-webkit-scrollbar) {
  *, :hover, [data-oc-scrolling] { scrollbar-width: auto; scrollbar-color: auto; }
  ::-webkit-scrollbar { width: 6px; height: 6px; background: transparent; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 999px;
    min-width: 24px;
    min-height: 24px;
  }
  :hover::-webkit-scrollbar-thumb, [data-oc-scrolling]::-webkit-scrollbar-thumb { background: var(--oc-scrollbar-thumb); }
  ::-webkit-scrollbar-thumb:hover { background: var(--oc-scrollbar-thumb-hover); }
  ::-webkit-scrollbar-corner { background: transparent; }
  ::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
}
@media (forced-colors: active) {
  *, :hover, [data-oc-scrolling] { scrollbar-color: auto; }
  ::-webkit-scrollbar-thumb, ::-webkit-scrollbar-thumb:hover { background: CanvasText; }
}
`;function ze(e){let r=e.documentElement;if(r.hasAttribute("data-oc-scrollbar-activity"))return;r.setAttribute("data-oc-scrollbar-activity","");let s=new WeakMap;e.addEventListener("scroll",(i)=>{let d=i.target===e?r:i.target;if(!(d instanceof Element))return;if(!d.hasAttribute("data-oc-scrolling"))d.setAttribute("data-oc-scrolling","");let T=s.get(d);if(T!==void 0)clearTimeout(T);s.set(d,setTimeout(()=>{s.delete(d),d.removeAttribute("data-oc-scrolling")},1000))},{capture:!0,passive:!0})}var Xo=`(${ze.toString()})(document);`;var Je=128,Qe=65536;var be=128;var ve=65536;var zt=/^[a-z][a-z0-9-]{0,39}$/;var $t=(e)=>Object(e)===e&&!Array.isArray(e),Ye=(e,r)=>Object.keys(e).every((s)=>r.includes(s)),Kt=(e)=>String(e)===e&&e.length>=1&&e.length<=60,jt=(e)=>String(e)===e&&e.length>=1&&e.length<=80,Jt=(e)=>{if(!Array.isArray(e)||e.length>4)return!1;let r=new Set;for(let s of e){if(!$t(s)||!zt.test(s.id)||!Kt(s.label))return!1;if(s.disabled!==void 0&&s.disabled!==!0&&s.disabled!==!1)return!1;if(r.has(s.id))return!1;if(r.add(s.id),s.kind==="button"){if(!Ye(s,["kind","id","label","disabled"]))return!1;continue}if(s.kind!=="select"||!Ye(s,["kind","id","label","value","options","disabled"]))return!1;if(!jt(s.value)||!Array.isArray(s.options)||s.options.length<1||s.options.length>16)return!1;let i=new Set;for(let d of s.options){if(!$t(d)||!Ye(d,["value","label"])||!jt(d.value)||!Kt(d.label)||i.has(d.value))return!1;i.add(d.value)}if(!i.has(s.value))return!1}return!0};var Qt=["{id}","{segment}","{segments+}"];var hr=new Set(Qt);var Yt=["turn-finished","turn-failed","permission-asked","question-asked","turn-started","session-created","session-archived","session-deleted"];var vr=new Set(Yt);var xe=20000000,Oe=256;var Ze=(e)=>("bytes"in e)?e.bytes.byteLength:e.content.length,Zt=(e,r)=>{if(e.path!==r.path||e.readOnly!==r.readOnly)return!1;if(e.encoding==="text"||r.encoding==="text")return e.encoding==="text"&&r.encoding==="text"&&e.content===r.content;if(e.bytes.byteLength!==r.bytes.byteLength)return!1;for(let s=0;s<e.bytes.byteLength;s+=1)if(e.bytes[s]!==r.bytes[s])return!1;return!0};var eo=/^[A-Za-z0-9_-]{1,80}$/;var to=["left","right","top","bottom"];var oo=(e,r=0,s={remaining:16000})=>{if(--s.remaining<0||r>=32)return!1;if(e===null)return!0;let i=Array.isArray(e)?e:Object(e)===e?Object.values(e):[];for(let d of i)if(!oo(d,r+1,s))return!1;return!0},et=(e)=>{if(e===null||e===!0||e===!1)return!0;if(Array.isArray(e))return Object.keys(e).every((r)=>/^(0|[1-9]\d*)$/.test(r)&&Number(r)<e.length)&&e.every(et);if(Object(e)===e){let r=Object.getPrototypeOf(e);return(r===null||r===Object.prototype)&&Object.values(e).every(et)}return String(e)===e||Number.isFinite(e)},tt=(e)=>{try{if(String(e.id)!==e.id||!eo.test(e.id)||!Number.isFinite(e.anchor.x)||Math.abs(e.anchor.x)>1e5||!Number.isFinite(e.anchor.y)||Math.abs(e.anchor.y)>1e5||!Number.isFinite(e.anchor.width)||!Number.isFinite(e.anchor.height)||e.anchor.width<=0||e.anchor.height<=0||e.anchor.width>1e5||e.anchor.height>1e5||!Number.isInteger(e.width)||e.width<160||e.width>640||!Number.isInteger(e.height)||e.height<48||e.height>480||e.side!==void 0&&!to.includes(e.side)||e.focus!==void 0&&e.focus!==!0&&e.focus!==!1||!oo(e.data)||!et(e.data))return!1;return JSON.stringify(e.data).length<=16000}catch{return!1}};var rt=2000;var so=["file","directory","other","missing"],st=(e)=>Boolean(e&&"sessionId"in e),nt=(e)=>Boolean(e&&"sent"in e&&!("sessionId"in e));var no=/^[0-9a-f]{7,64}$/i,it=(e)=>no.test(e),Ae=500,Ce=32000,io=16000,ao=128,lo=200,uo=2000,co=16000,po=80,So=200,Eo=16000;var go=2000;var at=20000,ke=1024,Ie=2000000;var Pe=64000,Ge=8000,lt=4000;var ut=960000;var _o=999,To=1e4,_e=500,mo=["HOST_UNAVAILABLE","HOST_TIMEOUT","HOST_REJECTED","DISCONNECTED","DISABLED","BAD_PATH","NO_INTEGRATION","NO_SERVICE","SERVICE_FAILED","REQUEST_FAILED","RESPONSE_TOO_LARGE","NO_SESSION","SESSION_BUSY","NOT_GRANTED","NO_DIRECTORY","NOT_FOUND","FILE_TOO_LARGE","DENIED","NO_MODEL","MODEL_FAILED","UNSUPPORTED"],fo=["stopped","starting","ready","failed"],Wo=new Set(mo),Ro=(e)=>Wo.has(e),yo=(e)=>e&&Ro(e)?e:"HOST_REJECTED",re=(e)=>{if(e===void 0)return!1;if(e===null||e===!0||e===!1)return!0;if(String(e)===e)return!0;if(Number(e)===e)return Number.isFinite(e);if(Array.isArray(e))return e.every(re);if(Object(e)===e)return Object.values(e).every(re);return!1},ho=(e)=>re(e)&&JSON.stringify(e).length<=Eo,ro=(e)=>e?.trim().slice(0,So)??"",se=(e)=>{let r=e.id.trim().slice(0,ao),s=e.title.trim().slice(0,lo),i=e.url.trim().slice(0,uo),d=e.text?.trim().slice(0,co),T=e.author?.trim().slice(0,po),_=e.kind==="pull"?"pull":"issue",S={providerId:e.providerId.trim(),id:r,title:s||r,url:i,kind:_};if(d)S.text=d;if(T)S.author=T;if(_==="pull"){let U=ro(e.branches?.head),w=ro(e.branches?.base);if(U&&w)S.branches={head:U,base:w}}if(ho(e.data))S.data=e.data;return S},ct=(e)=>{let r=se(e);if(e.projectId)r.projectId=e.projectId;if(e.navigation)r.navigation=e.navigation;if(e.worktree)r.worktree=e.worktree;return r},pt=(e)=>{let r={text:e.text.trim().slice(0,io)};if(e.send)r.send=!0;return r},dt=(e)=>{if(e===null||!Number.isFinite(e))return null;return Math.min(_o,Math.max(0,Math.round(e)))},St=(e)=>{if(!Number.isFinite(e))return 0;return Math.min(To,Math.max(0,Math.ceil(e)))};var ne=(e)=>e.length>0&&e.length<=ke&&!e.includes("\x00")&&!e.includes("\\");var Me=(e)=>{if(!e.startsWith("/")||e.includes("\x00")||e.includes("\\")||e.includes("://"))return!1;if(e.length>go)return!1;return!e.split("/").some((s)=>s==="."||s==="..")},$o=new Set(fo),Et=(e)=>Boolean(e&&"status"in e&&$o.has(String(e.status))&&!("body"in e)),Ue=(e)=>Boolean(e&&"status"in e&&"body"in e&&Number.isInteger(e.status)),gt=(e)=>Boolean(e&&"content"in e&&String(e.content)===e.content),_t=(e)=>Boolean(e&&"written"in e&&e.written===!0),Tt=(e)=>Boolean(e&&"entries"in e&&Array.isArray(e.entries)),Ko=new Set(so),mt=(e)=>Boolean(e&&"kind"in e&&"size"in e&&Ko.has(String(e.kind))&&Number.isFinite(e.size)),ft=(e)=>Boolean(e&&"text"in e&&String(e.text)===e.text&&!("status"in e)),jo=new Set(["workspace","shells","ready","directory","session","connection","settings","session-lifecycle","item","resolve","action","service-event","status-control-event","popover-closed","file-open","file-snapshot","file-saved","generate-late"]),zo=(e)=>Object(e)===e?e:null,ot=(e)=>String(e)===e&&e.length>0,Jo=(e)=>{if(!ot(e.id))return null;if(e.ok===!0){let r={channel:E,v:g,type:"result",id:e.id,ok:!0};if(Object(e.payload)===e.payload)r.payload=e.payload;return r}if(e.ok===!1&&ot(e.error))return{channel:E,v:g,type:"result",id:e.id,ok:!1,error:e.error,code:yo(ot(e.code)?e.code:void 0)};return null},Rt=(e)=>{let r=zo(e);if(!r||r.channel!==E||r.v!==g)return null;if(r.type==="result")return Jo(r);if(!jo.has(String(r.type))||Object(r.payload)!==r.payload)return null;return r};var bo=(e)=>("key"in e)&&("metaKey"in e)&&("ctrlKey"in e),Qo=(e)=>(e.metaKey||e.ctrlKey)&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==="s";class u extends Error{code;constructor(e,r){super(r);this.name="HostRequestError",this.code=e}}var vo=()=>Promise.reject(new u("BAD_PATH",'Request path must start with "/" and stay on the declared origin.')),we=()=>Promise.reject(new u("BAD_PATH",`File path must be 1 to ${ke} characters without NUL or backslash.`)),Ne=(e)=>{if(e===void 0)return;if(Object(e)!==e||Array.isArray(e)||e.scope!==void 0&&e.scope!=="instance"&&e.scope!=="device")throw new u("HOST_REJECTED",'Storage scope must be "instance" or "device".');return e.scope==="device"?"device":void 0},p=(e)=>(e.value+=1,`oc-${e.value}`),yt=(e={})=>{let r=e.target??("window"in globalThis?window:null);if(!r)throw new u("HOST_UNAVAILABLE","No window. connectHost runs in a browser frame.");let s=e.requestTimeoutMs??at,i=e.acceptSource??((t)=>t===r.parent),d=new Set,T=new Set,_=new Set,S=new Set,U=new Set,w=new Set,F=new Set,Y=new Set,j=new Set,C=new Set,P=new Set,V=new Set,z=[],ue=null,ce=null,me=new Set,fe=new Set,pe=null,de=null,Xe=!1,Z=new Map,ee=new Map,te=new Map,D=!1,c={value:0},l=null,X=null,Se=!1,Ee=!1,wt=null,Nt=(t)=>{if(!t)return null;return{sessionId:t.id,phase:t.busy?"started":"completed"}},oe=null,qe=[],L=(t)=>{if(D)return;if(oe){oe.postMessage(t);return}qe.push(t)},Lt=()=>{if(D||Object.is(r.parent,r)||V.size===0||l?.features?.lateGenerateResults!==!0)return;L({channel:E,v:g,type:"generate-late-listen"})},y=(t,o)=>{for(let n of t)try{n(o)}catch(a){console.error(a)}},Lo=(t)=>{if(!("data"in t))return;let o=Rt(t.data);if(!o)return;if(o.type==="workspace"){let a=ee.get(o.payload.subscriptionId);if(a)y([a],o.payload.snapshot);return}if(o.type==="shells"){let a=te.get(o.payload.subscriptionId);if(a)y([a],o.payload.snapshot);return}if(o.type==="ready"){if(l=o.payload,X=Nt(o.payload.session),y(d,o.payload),y(T,o.payload.directory),y(_,o.payload.session),X)y(S,X);if(y(U,o.payload.connection),y(w,o.payload.settings),y(F,o.payload.item),o.payload.block)y(Y,o.payload.block);Lt();return}if(o.type==="service-event"){y(j,o.payload);return}if(o.type==="generate-late"){if(V.size===0)z.push(o.payload);else y(V,o.payload);return}if(o.type==="directory"){if(l)l={...l,directory:o.payload.directory};y(T,o.payload.directory);return}if(o.type==="session"){if(l)l={...l,session:o.payload.session};if(!o.payload.session)X=null;else if(X?.sessionId!==o.payload.session.id)X=Nt(o.payload.session);y(_,o.payload.session);return}if(o.type==="session-lifecycle"){X=o.payload,y(S,o.payload);return}if(o.type==="connection"){if(l)l={...l,connection:o.payload.connection};y(U,o.payload.connection);return}if(o.type==="settings"){if(l)l={...l,settings:o.payload.settings};y(w,o.payload.settings);return}if(o.type==="item"){if(l)l={...l,item:o.payload.item};y(F,o.payload.item);return}if(o.type==="status-control-event"){y(C,o.payload);return}if(o.type==="popover-closed"){y(P,o.payload);return}if(o.type==="action"){let a=(m)=>{if(!D)L({channel:E,v:g,type:"action-result",id:o.id,payload:m})},f=ce;if(!f){a({ok:!1,error:"This extension does not handle background actions."});return}Promise.resolve().then(()=>f(o.payload)).then(()=>a({ok:!0}),(m)=>{let O=(m instanceof Error?m.message:String(m)).trim();a({ok:!1,error:(O||"Action failed.").slice(0,_e)})});return}if(o.type==="file-open"){let a=o.payload;if(de&&Zt(de,a))return;de=a,y(me,o.payload);return}if(o.type==="file-saved"){y(fe,o.payload.version);return}if(o.type==="file-snapshot"){let a=(O)=>{if(!D)L({channel:E,v:g,type:"file-snapshot-result",id:o.id,payload:O})},f=(O)=>a({error:(O.trim()||"Could not read the edited file.").slice(0,_e)}),m=pe;if(!m){f("This extension does not edit files.");return}Promise.resolve().then(()=>m(o.payload.purpose)).then((O)=>{if(Ze(O)>xe){f(`The file is over ${xe} ${"bytes"in O?"bytes":"characters"}.`);return}if(O.version.length>Oe){f(`The snapshot version is over ${Oe} characters.`);return}a({snapshot:"bytes"in O?{bytes:O.bytes,version:O.version}:{content:O.content,version:O.version}})},(O)=>f(O instanceof Error?O.message:String(O)));return}if(o.type==="resolve"){let a=(m)=>{L({channel:E,v:g,type:"resolve-result",id:o.id,payload:m})},f=ue;if(!f){a({error:"This extension does not resolve commands."});return}Promise.resolve().then(()=>f(o.payload)).then((m)=>a({item:m?se(m):null}),(m)=>{let O=(m instanceof Error?m.message:String(m)).trim();a({error:(O||"Command failed.").slice(0,_e)})});return}let n=Z.get(o.id);if(!n)return;if(clearTimeout(n.timer),Z.delete(o.id),o.ok){n.resolve(o.payload);return}n.reject(new u(o.code,o.error))},Do=(t)=>{if(!("source"in t))return!0;return i(t.source)},Dt=(t)=>{if(!Do(t)||!("detail"in t))return;let o=t.detail;if(!(o instanceof MessagePort))return;t.preventDefault(),t.stopImmediatePropagation(),oe?.close(),oe=o,o.addEventListener("message",Lo),o.start(),o.postMessage({channel:E,v:g,type:"hello"});for(let n of qe.splice(0))o.postMessage(n)};r.addEventListener(ge,Dt),r.dispatchEvent?.(new CustomEvent(ge,{detail:null}));let G=(t,o=s)=>{if(D||Object.is(r.parent,r))return Promise.reject(new u("HOST_UNAVAILABLE","No host frame. This page is not in an iframe."));return new Promise((n,a)=>{let f=setTimeout(()=>{Z.delete(t.id),a(new u("HOST_TIMEOUT","Host did not answer in time."))},o);Z.set(t.id,{resolve:n,reject:a,timer:f}),L(t)})},v=(t)=>G(t).then(()=>{return}),x={channel:E,v:g},We=(t)=>{if(!D&&!Object.is(r.parent,r))L(t)},Ht=()=>We({...x,type:"file-save"}),Bt=(t)=>{if(!bo(t)||!Qo(t))return;t.preventDefault(),Ht()},Ft=(t)=>{if(!bo(t)||t.key!=="Escape"||l?.surface!=="popover"||!l.popover)return;t.preventDefault(),qt(l.popover.id,"escape").catch(()=>{return})},Re=()=>{let t=l?.surface==="popover"?l.popover:void 0;if(!t)return;let o=Se||Ee;if(wt===o)return;wt=o,Wt(t.id,o).catch(()=>{return})},ye=()=>{if(l?.surface!=="popover"||Se)return;Se=!0,Re()},Vt=(t)=>{if(l?.surface!=="popover"||t.relatedTarget!==null||!Se)return;Se=!1,Re()},Xt=()=>{if(l?.surface!=="popover"||Ee)return;Ee=!0,Re()},Ho=()=>{if(l?.surface!=="popover"||!Ee)return;Ee=!1,Re()},H=(t,o=1024)=>{if(!t.trim()||t.length>o)throw new u("HOST_REJECTED",`Identity must contain 1 to ${o} characters.`)},$e=async(t)=>{if(t.kind!=="projects")H(t.projectId);let o=await G({...x,type:"workspace-read",id:p(c),payload:t});if(!o||!("kind"in o)||!("state"in o)||o.kind!==t.kind)throw new u("HOST_REJECTED","Host did not return workspace data.");return o},Ke=async(t,o)=>{if(t.kind!=="projects")H(t.projectId);let n=p(c);ee.set(n,o);try{await v({...x,type:"workspace-subscribe",id:p(c),payload:{subscriptionId:n,query:t}})}catch(a){if(ee.delete(n),!D)L({...x,type:"workspace-unsubscribe",id:p(c),payload:{subscriptionId:n}});throw a}return()=>{if(!ee.delete(n)||D)return;L({...x,type:"workspace-unsubscribe",id:p(c),payload:{subscriptionId:n}})}},Bo=async(t,o)=>{if(t.kind==="session")H(t.sessionId);if(t.kind==="project")H(t.projectId);let n=p(c);te.set(n,o);try{await v({...x,type:"shells-subscribe",id:p(c),payload:{subscriptionId:n,scope:t}})}catch(a){if(te.delete(n),!D)L({...x,type:"shells-unsubscribe",id:p(c),payload:{subscriptionId:n}});throw a}return()=>{if(!te.delete(n)||D)return;L({...x,type:"shells-unsubscribe",id:p(c),payload:{subscriptionId:n}})}},he=async(t)=>{if("key"in t&&(t.key.length===0||t.key.length>Je))throw new u("HOST_REJECTED","Storage key must contain 1 to 128 characters.");if(t.op==="set"&&!re(t.value))throw new u("HOST_REJECTED","Storage values must be JSON.");if(t.op==="set"&&new TextEncoder().encode(JSON.stringify(t.value)).length>Qe)throw new u("HOST_REJECTED","Storage value exceeds 64 KiB.");if(t.scope==="device"&&l?.features?.deviceStorage!==!0)throw new u("UNSUPPORTED","This host does not support device storage.");let o=await G({...x,type:"storage",id:p(c),payload:t});if(!o||!("storage"in o)||o.op!==t.op)throw new u("HOST_REJECTED","Host did not return storage data.");return o},qt=(t,o)=>l?.features?.popovers!==!0&&!(l?.surface==="popover"&&l.popover?.id===t)?Promise.reject(new u("UNSUPPORTED","This host does not support popovers.")):v({...x,type:"popover-close",id:p(c),payload:o?{id:t,reason:o}:{id:t}}),Wt=(t,o)=>l?.features?.popovers!==!0&&!(l?.surface==="popover"&&l.popover?.id===t)?Promise.reject(new u("UNSUPPORTED","This host does not support popovers.")):v({...x,type:"popover-anchor",id:p(c),payload:{id:t,active:o}});return r.addEventListener("keydown",Ft,!0),r.addEventListener("pointerover",ye),r.addEventListener("pointermove",ye),r.addEventListener("pointerout",Vt),r.addEventListener("focus",Xt),r.addEventListener("blur",Ho),{onAction:(t)=>(ce=t,()=>{if(ce===t)ce=null}),listProjects:async()=>{let t=await $e({kind:"projects"});if(t.kind!=="projects")throw new u("HOST_REJECTED","Expected projects.");return t},listWorktrees:async(t)=>{let o=await $e({kind:"worktrees",projectId:t});if(o.kind!=="worktrees")throw new u("HOST_REJECTED","Expected worktrees.");return o},listSessions:async(t)=>{let o=await $e({kind:"sessions",projectId:t});if(o.kind!=="sessions")throw new u("HOST_REJECTED","Expected sessions.");return o},onProjects:(t)=>Ke({kind:"projects"},(o)=>{if(o.kind==="projects")t(o)}),onWorktrees:(t,o)=>Ke({kind:"worktrees",projectId:t},(n)=>{if(n.kind==="worktrees")o(n)}),onSessions:(t,o)=>Ke({kind:"sessions",projectId:t},(n)=>{if(n.kind==="sessions")o(n)}),onRunningShells:(t,o)=>Bo(t,o),readShellOutput:async(t,o)=>{H(t,be);let n=o?.cursor;if(n!==void 0&&(!Number.isInteger(n)||n<0))throw new u("HOST_REJECTED","Shell output cursor must be a non-negative integer.");let a=o?.tailBytes;if(a!==void 0&&(!Number.isInteger(a)||a<1||a>ve))throw new u("HOST_REJECTED",`Shell output tailBytes must be an integer between 1 and ${ve}.`);let m=await G({...x,type:"shell-output",id:p(c),payload:{shellId:t,cursor:n,tailBytes:a}});if(!m||typeof m.output!=="string"||!Number.isFinite(m.cursor))throw new u("HOST_REJECTED","Host did not return shell output.");return m},stopShell:async(t)=>{if(H(t,be),(await G({...x,type:"shell-stop",id:p(c),payload:{shellId:t}}))?.stopped!==!0)throw new u("HOST_REJECTED","Host did not stop the shell.");return{stopped:!0}},openSession:async(t)=>{H(t),await v({...x,type:"open-session",id:p(c),payload:{sessionId:t}})},storage:{get:async(t,o)=>{let n=Ne(o),a={op:"get",key:t};if(n)a.scope=n;let f=await he(a);return f.op==="get"&&f.found?f.value:void 0},set:async(t,o,n)=>{let a=Ne(n),f={op:"set",key:t,value:o};if(a)f.scope=a;await he(f)},delete:async(t,o)=>{let n=Ne(o),a={op:"delete",key:t};if(n)a.scope=n;await he(a)},keys:async(t)=>{let o=Ne(t),n={op:"keys"};if(o)n.scope=o;let a=await he(n);if(a.op!=="keys")throw new u("HOST_REJECTED","Expected storage keys.");return a.keys}},onReady:(t)=>{if(d.add(t),l)t(l);return()=>{d.delete(t)}},onDirectory:(t)=>{if(T.add(t),l)t(l.directory);return()=>{T.delete(t)}},onSession:(t)=>{if(_.add(t),l)t(l.session);return()=>{_.delete(t)}},onSessionLifecycle:(t)=>{if(S.add(t),X)t(X);return()=>{S.delete(t)}},onConnection:(t)=>{if(U.add(t),l)t(l.connection);return()=>{U.delete(t)}},onSettings:(t)=>{if(w.add(t),l)t(l.settings);return()=>{w.delete(t)}},onItem:(t)=>{if(F.add(t),l)t(l.item);return()=>{F.delete(t)}},onBlock:(t)=>{if(Y.add(t),l?.block)t(l.block);return()=>{Y.delete(t)}},onServiceEvent:(t)=>(j.add(t),()=>{j.delete(t)}),onStatusControl:(t)=>(C.add(t),()=>{C.delete(t)}),onPopoverClosed:(t)=>(P.add(t),()=>{P.delete(t)}),onLateGenerateResult:(t)=>{V.add(t);for(let o of z.splice(0))y([t],o);return Lt(),()=>{V.delete(t)}},setStatusControls:(t)=>{if(l?.features?.statusControls!==!0)return Promise.reject(new u("UNSUPPORTED","This host does not support status controls."));if(!Jt(t))return Promise.reject(new u("HOST_REJECTED","Status controls must have unique bounded ids and valid selected options."));return v({...x,type:"status-controls",id:p(c),payload:{controls:t}})},openPopover:(t)=>{if(l?.features?.popovers!==!0)return Promise.reject(new u("UNSUPPORTED","This host does not support popovers."));if(!tt(t))return Promise.reject(new u("HOST_REJECTED","Popover requests need bounded geometry and JSON data."));return v({...x,type:"popover-open",id:p(c),payload:t})},closePopover:qt,setPopoverAnchorActive:Wt,onResolve:(t)=>(ue=t,()=>{if(ue===t)ue=null}),toast:(t)=>{let o=t.message.trim();if(!o||o.length>Ae)return Promise.reject(new u("HOST_REJECTED",`Toast message must contain 1 to ${Ae} characters.`));if(t.copy&&t.copy!==!0&&(!t.copy.text.length||t.copy.text.length>Ce))return Promise.reject(new u("HOST_REJECTED",`Toast copy text must contain 1 to ${Ce} characters.`));return v({channel:E,v:g,type:"toast",id:p(c),payload:{...t,message:o}})},openUrl:(t)=>v({channel:E,v:g,type:"open-url",id:p(c),payload:{url:t}}),openCommit:(t)=>it(t)?v({channel:E,v:g,type:"open-commit",id:p(c),payload:{sha:t}}):Promise.reject(new u("HOST_REJECTED","Commit id must be 7 to 64 hex characters.")),answerBlock:(t)=>v({channel:E,v:g,type:"block-answer",id:p(c),payload:{text:t.trim().slice(0,rt)}}),openSurface:(t)=>v({channel:E,v:g,type:"open-surface",id:p(c),payload:{surfaceId:t}}),writeClipboard:(t)=>v({channel:E,v:g,type:"clipboard-write",id:p(c),payload:{text:t}}),compose:(t)=>v({channel:E,v:g,type:"compose",id:p(c),payload:t}),attach:(t)=>v({channel:E,v:g,type:"attach",id:p(c),payload:se(t)}),startSession:async(t)=>{if(t.projectId!==void 0)H(t.projectId);let o=t.worktree;if(o&&o!==!0)if(o.kind==="existing")H(o.directory);else{if(o.name!==void 0)H(o.name,200);if(o.baseBranch!==void 0)H(o.baseBranch,200)}let n=await G({channel:E,v:g,type:"start-session",id:p(c),payload:ct(t)},e.requestTimeoutMs??180000);if(!st(n))throw new u("HOST_REJECTED","Host did not return a session.");return n},prompt:(t)=>G({channel:E,v:g,type:"prompt",id:p(c),payload:pt(t)}).then((o)=>{if(!nt(o))throw new u("HOST_REJECTED","Host did not return a prompt result.");return o}),sessionLink:(t)=>v({channel:E,v:g,type:"session-link",id:p(c),payload:se(t)}),close:()=>v({channel:E,v:g,type:"close",id:p(c)}),oauthStart:()=>v({channel:E,v:g,type:"oauth-start",id:p(c)}),oauthDisconnect:()=>v({channel:E,v:g,type:"oauth-disconnect",id:p(c)}),request:(t)=>(Me(t.path)?G({channel:E,v:g,type:"request",id:p(c),payload:t}):vo()).then((o)=>{if(!Ue(o))throw new u("HOST_REJECTED","Host request result was empty.");return o}),serviceRequest:(t)=>(Me(t.path)?G({channel:E,v:g,type:"service-request",id:p(c),payload:t}):vo()).then((o)=>{if(!Ue(o))throw new u("HOST_REJECTED","Host service request result was empty.");return o}),serviceStatus:()=>G({channel:E,v:g,type:"service-status",id:p(c)}).then((t)=>{if(!Et(t))throw new u("HOST_REJECTED","Host did not return service status.");return t}),readFile:(t)=>(ne(t)?G({channel:E,v:g,type:"file-read",id:p(c),payload:{path:t}}):we()).then((o)=>{if(!gt(o))throw new u("HOST_REJECTED","Host did not return file content.");return o}),writeFile:(t,o)=>{if(!ne(t))return we();if(o.length>Ie)return Promise.reject(new u("FILE_TOO_LARGE",`Content is over ${Ie} characters.`));return G({channel:E,v:g,type:"file-write",id:p(c),payload:{path:t,content:o}}).then((n)=>{if(!_t(n))throw new u("HOST_REJECTED","Host did not confirm the write.");return n})},listDir:(t)=>(ne(t)?G({channel:E,v:g,type:"file-list",id:p(c),payload:{path:t}}):we()).then((o)=>{if(!Tt(o))throw new u("HOST_REJECTED","Host did not return directory entries.");return o}),stat:(t)=>(ne(t)?G({channel:E,v:g,type:"file-stat",id:p(c),payload:{path:t}}):we()).then((o)=>{if(!mt(o))throw new u("HOST_REJECTED","Host did not return file status.");return o}),generate:(t)=>{let o=t.prompt.trim(),n=t.system?.trim();if(o.length===0||o.length>Pe)return Promise.reject(new u("HOST_REJECTED",`Prompt must be 1 to ${Pe} characters.`));if(n!==void 0&&(n.length===0||n.length>Ge))return Promise.reject(new u("HOST_REJECTED",`System prompt must be 1 to ${Ge} characters.`));let a=t.maxOutputTokens===void 0?void 0:Math.min(lt,Math.max(1,Math.floor(t.maxOutputTokens)));if(a!==void 0&&!Number.isFinite(a))return Promise.reject(new u("HOST_REJECTED","maxOutputTokens must be a number."));let f={prompt:o};if(n!==void 0)f.system=n;if(a!==void 0)f.maxOutputTokens=a;return G({channel:E,v:g,type:"generate",id:p(c),payload:f},e.requestTimeoutMs??ut).then((m)=>{if(!ft(m))throw new u("HOST_REJECTED","Host did not return generated text.");return m})},setBadge:(t)=>v({channel:E,v:g,type:"badge",id:p(c),payload:{count:dt(t)}}),setHeight:(t)=>v({channel:E,v:g,type:"resize",id:p(c),payload:{height:St(t)}}),onFileOpen:(t)=>{if(me.add(t),!Xe)Xe=!0,r.addEventListener("keydown",Bt,!0);if(de)t(de);return()=>{me.delete(t)}},onFileSnapshot:(t)=>(pe=t,()=>{if(pe===t)pe=null}),onFileSaved:(t)=>(fe.add(t),()=>{fe.delete(t)}),reportFileChange:(t)=>We({...x,type:"file-change",payload:{dirty:t.dirty,edited:t.edited}}),requestFileSave:Ht,reportFileUnsupported:()=>We({...x,type:"file-unsupported"}),dispose:()=>{for(let t of ee.keys())L({...x,type:"workspace-unsubscribe",id:p(c),payload:{subscriptionId:t}});ee.clear();for(let t of te.keys())L({...x,type:"shells-unsubscribe",id:p(c),payload:{subscriptionId:t}});if(te.clear(),D=!0,ue=null,ce=null,pe=null,me.clear(),fe.clear(),Xe)r.removeEventListener("keydown",Bt,!0);r.removeEventListener(ge,Dt),r.removeEventListener("keydown",Ft,!0),r.removeEventListener("pointerover",ye),r.removeEventListener("pointermove",ye),r.removeEventListener("pointerout",Vt),r.removeEventListener("focus",Xt),oe?.close(),oe=null,qe.length=0;for(let t of Z.values())clearTimeout(t.timer),t.reject(new u("HOST_UNAVAILABLE","Host client was disposed."));Z.clear(),d.clear(),T.clear(),_.clear(),S.clear(),U.clear(),w.clear(),F.clear(),Y.clear(),j.clear(),C.clear(),P.clear(),V.clear(),z.length=0}}};var xo=["browser.open","browser.snapshot","browser.click","browser.type","browser.select","browser.scroll","browser.back","browser.forward","browser.inspect","browser.capture","browser.resize","browser.close"];var Br=new Set(xo);var Oo=["none","agent","user"];var Vr=new Set(Oo);var Yo=[["--oc-bg","background"],["--oc-elevated","elevated"],["--oc-fg","foreground"],["--oc-muted","muted"],["--oc-subtle","subtle"],["--oc-border","border"],["--oc-hover","hover"],["--oc-selection","selection"],["--oc-focus","focus"],["--oc-primary","primary"],["--oc-muted-surface","mutedSurface"],["--oc-elevated-fg","elevatedForeground"],["--oc-active","active"],["--oc-selection-fg","selectionForeground"],["--oc-primary-fg","primaryForeground"],["--oc-primary-text","primaryText"],["--oc-success-text","successText"],["--oc-warning-text","warningText"],["--oc-error-text","errorText"],["--oc-info-text","infoText"],["--oc-success","success"],["--oc-warning","warning"],["--oc-error","error"],["--oc-info","info"],["--oc-font","font"],["--oc-mono","mono"],["--oc-radius","radius"],["--surface-background","background"],["--surface-elevated","elevated"],["--surface-foreground","foreground"],["--surface-muted-foreground","muted"],["--surface-subtle","subtle"],["--interactive-border","border"],["--interactive-hover","hover"],["--interactive-selection","selection"],["--interactive-focus-ring","focus"],["--primary","primary"],["--surface-muted","mutedSurface"],["--surface-elevated-foreground","elevatedForeground"],["--interactive-active","active"],["--interactive-selection-foreground","selectionForeground"],["--primary-foreground","primaryForeground"],["--primary-text","primaryText"],["--success-text","successText"],["--warning-text","warningText"],["--error-text","errorText"],["--info-text","infoText"],["--status-success","success"],["--status-warning","warning"],["--status-error","error"],["--status-info","info"],["--font-sans","font"],["--font-mono","mono"],["--radius","radius"]],Zo=[["--oc-syntax-keyword","--syntax-keyword","syntaxKeyword"],["--oc-syntax-string","--syntax-string","syntaxString"],["--oc-syntax-number","--syntax-number","syntaxNumber"],["--oc-syntax-function","--syntax-function","syntaxFunction"],["--oc-syntax-type","--syntax-type","syntaxType"],["--oc-syntax-comment","--syntax-comment","syntaxComment"],["--oc-syntax-variable","--syntax-variable","syntaxVariable"],["--oc-syntax-operator","--syntax-operator","syntaxOperator"]],Ao=(e,r)=>{r.style.colorScheme=e.mode;for(let[s,i]of Yo)r.style.setProperty(s,e.tokens[i]);for(let[s,i,d]of Zo){let T=e.tokens[d]??"";r.style.setProperty(s,T),r.style.setProperty(i,T)}r.style.setProperty("font-family",e.tokens.font),r.style.setProperty("font-size","0.875rem"),r.style.setProperty("line-height","1.45"),r.style.setProperty("color",e.tokens.foreground)},ht=(e,r)=>{if(Ao(e.theme,r),r.dataset)r.dataset.ocSurface=e.surface,r.dataset.ocTheme=e.theme.mode};var er={"surface-background":"bg","surface-elevated":"elevated","surface-elevated-foreground":"elevated-fg","surface-foreground":"fg","surface-muted-foreground":"muted","surface-muted":"muted-surface","surface-subtle":"subtle","interactive-border":"border","interactive-hover":"hover","interactive-active":"active","interactive-selection":"selection","interactive-selection-foreground":"selection-fg","interactive-focus-ring":"focus",primary:"primary","primary-foreground":"primary-fg","primary-text":"primary-text","success-text":"success-text","warning-text":"warning-text","error-text":"error-text","info-text":"info-text","status-success":"success","status-warning":"warning","status-error":"error","status-info":"info","font-sans":"font","font-mono":"mono",radius:"radius"},R=(e,r)=>`var(--${e}, var(--oc-${er[e]}, ${r}))`,W=R("surface-background","transparent"),De=R("surface-elevated","transparent"),ie=R("surface-elevated-foreground","inherit"),N=R("surface-foreground","inherit"),h=R("surface-muted-foreground","gray"),tr=R("surface-muted","transparent"),J=R("interactive-border","currentColor"),M=R("interactive-hover","transparent"),Q=R("interactive-active","transparent"),bt=R("interactive-selection","transparent"),vt=R("interactive-selection-foreground","inherit"),q=R("primary","currentColor"),xt=R("primary-text","inherit"),Ot=R("error-text","inherit"),or=R("font-sans","inherit"),At=R("font-mono","monospace"),Po=R("radius","9px"),Ct=`calc(${Po} - 2px)`,Co=`calc(${Po} - 4px)`,b=(e,r,s="transparent")=>`color-mix(in srgb, ${e} ${r}%, ${s})`,ko=`background-image: linear-gradient(${M}, ${M});`,kt=(e,r="0.5px")=>`box-shadow: inset 0 0 0 ${r} ${e}, var(--oc-sdk-field-lift);`,It="border-color: var(--oc-sdk-edge); box-shadow: var(--oc-sdk-raised-lift);",Io="box-shadow: var(--oc-sdk-lit);",Pt=`inset 0 0.5px 0 0 ${b(N,8)}, 0 1px 2px 0 rgb(0 0 0 / 0.4)`,rr=`
:root {
  --oc-sdk-edge: ${b(N,16)};
  --oc-sdk-field-bg: ${De};
  --oc-sdk-raised-bg: ${W};
  --oc-sdk-field-lift: inset 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --oc-sdk-raised-lift: 0 1px 1.5px 0 rgb(0 0 0 / 0.08);
  --oc-sdk-lit: inset 0 1px 0 0 rgb(255 255 255 / 0.2), 0 1px 1.5px 0 rgb(0 0 0 / 0.1);
  --oc-sdk-float-edge: rgb(0 0 0 / 0.14);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.7), 0 1px 2px -0.5px rgb(0 0 0 / 0.06), 0 4px 8px -2px rgb(0 0 0 / 0.08), 0 12px 20px -4px rgb(0 0 0 / 0.06);
}
:root[data-oc-theme="dark"] {
  --oc-sdk-edge: ${b(N,14)};
  --oc-sdk-field-bg: ${b(W,50,De)};
  --oc-sdk-raised-bg: ${De};
  --oc-sdk-field-lift: ${Pt};
  --oc-sdk-raised-lift: ${Pt};
  --oc-sdk-lit: ${Pt};
  --oc-sdk-float-edge: rgb(0 0 0 / 0.55);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.04), inset 0 0 0 0.5px rgb(255 255 255 / 0.08), 0 8px 16px 0 rgb(0 0 0 / 0.25), 0 4px 8px 0 rgb(0 0 0 / 0.25);
}`,Le=(e)=>{let r=R(`status-${e}`,"currentColor");return`
.oc-sdk[data-tone="${e}"], .oc-sdk [data-tone="${e}"] { --oc-sdk-tone: ${r}; --oc-sdk-tone-text: ${R(`${e}-text`,"inherit")}; }`},sr=`
.oc-sdk { box-sizing: border-box; font-size: 0.875rem; line-height: 1.45; }
.oc-sdk *, .oc-sdk *::before, .oc-sdk *::after { box-sizing: border-box; }
/* :where() keeps the reset at zero specificity so every primitive class below overrides it. */
:where(.oc-sdk) :where(button, input, textarea), :where(button.oc-sdk, input.oc-sdk, textarea.oc-sdk) { font: inherit; color: inherit; margin: 0; }
:where(.oc-sdk) :where(button), :where(button.oc-sdk) { cursor: pointer; background: none; border: 0; padding: 0; }
.oc-sdk button:disabled, button.oc-sdk:disabled, .oc-sdk[aria-disabled="true"], .oc-sdk [aria-disabled="true"] { opacity: .5; pointer-events: none; }

.oc-sdk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 32px; padding: 0 12px; border: 1px solid transparent; font-size: 0.875rem; font-weight: 500; line-height: 1; white-space: nowrap; }
.oc-sdk-btn[data-size="sm"] { gap: 6px; height: 28px; padding: 0 10px; font-size: 0.8125rem; }
.oc-sdk-btn[data-size="xs"] { gap: 4px; height: 24px; padding: 0 8px; font-size: 0.75rem; }
.oc-sdk-btn[data-loading="true"] { opacity: .5; pointer-events: none; }
.oc-sdk-btn > .oc-sdk-spinner-ring { width: 14px; height: 14px; }

.oc-sdk-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-field-label { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-field-note { font-size: 0.75rem; }
.oc-sdk-input { display: block; width: 100%; min-width: 0; height: 32px; padding: 0 10px; border: 0; font-size: 0.875rem; line-height: 1.45; appearance: none; }
textarea.oc-sdk-input { height: auto; padding: 8px 10px; resize: vertical; }

.oc-sdk-search { position: relative; min-width: 0; }
.oc-sdk-search .oc-sdk-input { padding-left: 34px; padding-right: 34px; }
.oc-sdk-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.oc-sdk-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: 24px; height: 24px; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-clear { display: inline-flex; }

.oc-sdk-select { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-trigger { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; width: auto; max-width: 100%; min-width: 0; height: 28px; padding: 0 10px; border: 1px solid transparent; font-size: 0.8125rem; text-align: left; }
.oc-sdk-trigger-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-trigger-chevron { flex: 0 0 auto; }
.oc-sdk-popup { position: fixed; z-index: 50; display: flex; flex-direction: column; gap: 2px; min-width: 160px; max-width: calc(100vw - 16px); max-height: min(320px, calc(100vh - 16px)); overflow: auto; padding: 4px; border: 1px solid transparent; }
.oc-sdk-popup-search { flex: 0 0 auto; padding: 2px 2px 4px; }
.oc-sdk-popup-search .oc-sdk-input { height: 28px; font-size: 0.8125rem; }
.oc-sdk-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; font-size: 0.8125rem; text-align: left; }
.oc-sdk-option-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-option-hint { flex: 0 0 auto; font-size: 0.75rem; }
.oc-sdk-option-check { flex: 0 0 auto; display: inline-flex; width: 14px; visibility: hidden; }
.oc-sdk-option[aria-selected="true"] > .oc-sdk-option-check { visibility: visible; }
.oc-sdk-popup-empty { padding: 8px; font-size: 0.8125rem; }

.oc-sdk-check { display: inline-flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left; }
.oc-sdk-check-box { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-top: 3px; border: 1px solid transparent; }
.oc-sdk-check-box > svg { display: none; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box > svg { display: block; }
.oc-sdk-check-thumb { flex: 0 0 auto; position: relative; width: 36px; height: 20px; }
.oc-sdk-check-thumb::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; }
.oc-sdk-check-text { display: flex; flex-direction: column; min-width: 0; }
.oc-sdk-check-label { font-size: 0.875rem; }
.oc-sdk-check-desc { font-size: 0.75rem; }

.oc-sdk-tabs { display: inline-flex; gap: 2px; padding: 2px; max-width: 100%; overflow: auto; }
.oc-sdk-tab { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid transparent; font-size: 0.8125rem; font-weight: 500; white-space: nowrap; }
.oc-sdk-tab-count { font-size: 0.75rem; font-variant-numeric: tabular-nums; }

.oc-sdk-badge { display: inline-flex; align-items: center; padding: 1px 6px; font-size: 11px; font-weight: 500; line-height: 16px; white-space: nowrap; }

.oc-sdk-list { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.oc-sdk-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; text-align: left; }
.oc-sdk-row-lead { flex: 0 0 auto; width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }
.oc-sdk-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.oc-sdk-row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-row-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; }
.oc-sdk-row-meta { flex: 0 0 auto; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.oc-sdk-list-empty { padding: 16px 8px; text-align: center; font-size: 0.8125rem; }

.oc-sdk-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 40px 16px; text-align: center; }
.oc-sdk-empty-title { margin: 0; font-size: 0.8125rem; font-weight: 600; }
.oc-sdk-empty-body { margin: 0; max-width: 32rem; font-size: 0.8125rem; }
.oc-sdk-empty-action { margin-top: 12px; }

@keyframes oc-sdk-spin { to { transform: rotate(360deg); } }
.oc-sdk-spinner { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; }
.oc-sdk-spinner-ring { width: 16px; height: 16px; border: 2px solid transparent; animation: oc-sdk-spin .8s linear infinite; }
.oc-sdk-spinner[data-size="sm"] .oc-sdk-spinner-ring { width: 12px; height: 12px; }

.oc-sdk-banner { display: flex; align-items: flex-start; gap: 12px; padding: 8px 12px; border: 1px solid transparent; }
.oc-sdk-banner-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.oc-sdk-banner-title { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-banner-body { font-size: 0.8125rem; }
.oc-sdk-banner-action { flex: 0 0 auto; }

.oc-sdk-separator { display: flex; align-items: center; gap: 8px; width: 100%; margin: 8px 0; font-size: 0.75rem; }
.oc-sdk-separator::before, .oc-sdk-separator::after { content: ""; flex: 1 1 auto; height: 1px; }
.oc-sdk-separator[data-labeled="false"]::after { display: none; }
.oc-sdk-popup > .oc-sdk-separator { margin: 4px 0; }

.oc-sdk-progress { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-progress-label { display: flex; justify-content: space-between; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.oc-sdk-progress-track { height: 6px; overflow: hidden; }
.oc-sdk-progress-fill { height: 100%; transform-origin: left; transition: transform 200ms ease-out; }
.oc-sdk-progress-value { display: inline-flex; align-items: center; gap: 2px; }
.oc-sdk-progress[data-done="true"] .oc-sdk-progress-value { font-weight: 600; }

.oc-sdk-menu { position: relative; display: inline-flex; }

.oc-sdk-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.oc-sdk-text img { display: block; max-width: 100%; margin: 8px 0; }
`,Go=`${rr}
.oc-sdk { color: ${N}; font-family: ${or}; }
.oc-sdk :focus-visible, .oc-sdk:focus-visible { outline: none; }
.oc-sdk :where(button, a[href], [role="button"], [role="tab"], [role="option"]):focus-visible, button.oc-sdk:focus-visible { ${ko} }
.oc-sdk-mono { font-family: ${At}; }
.oc-sdk-muted { color: ${h}; }
${Le("success")}${Le("warning")}${Le("error")}${Le("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${q}; --oc-sdk-tone-text: ${xt}; }

.oc-sdk-btn { border-radius: ${Ct}; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="xs"] { border-radius: ${Co}; }
.oc-sdk-btn[data-variant="default"] { color: ${xt}; background: ${b(q,10,W)}; border-color: ${b(q,12)}; ${Io} }
.oc-sdk-btn[data-variant="default"]:hover { background: ${b(q,16,W)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${b(q,22,W)}; box-shadow: none; }
.oc-sdk-btn[data-variant="secondary"] { background: ${tr}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${M}, ${M}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${Q}, ${Q}); }
.oc-sdk-btn[data-variant="outline"] { background: var(--oc-sdk-raised-bg); color: ${ie}; ${It} }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${M}, ${M}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${Q}, ${Q}); box-shadow: none; }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${M}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${Q}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${R("status-error","red")}; color: ${Ot}; background: ${b("var(--oc-sdk-tone)",7,W)}; border-color: ${b("var(--oc-sdk-tone)",12)}; ${Io} }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${b("var(--oc-sdk-tone)",9,W)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${b("var(--oc-sdk-tone)",11,W)}; box-shadow: none; }

.oc-sdk-field-note { color: ${h}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${Ot}; }
.oc-sdk-input { border-radius: ${Ct}; background: var(--oc-sdk-field-bg); color: ${ie}; ${kt("var(--oc-sdk-edge)")} transition: background 150ms ease-out; }
.oc-sdk-input::placeholder { color: ${h}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${M}, ${M}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { ${kt(b(N,26),"1px")} }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input, .oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { ${kt(R("status-error","red"),"1px")} }
.oc-sdk-input[data-mono="true"] { font-family: ${At}; }

.oc-sdk-search-icon { color: ${h}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${q}; }
.oc-sdk-search-clear { border-radius: ${Co}; color: ${h}; }
.oc-sdk-search-clear:hover { background: ${M}; color: ${N}; }

.oc-sdk-trigger { border-radius: ${Ct}; background: var(--oc-sdk-raised-bg); color: ${ie}; ${It} transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${M}, ${M}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${Q}, ${Q}); }
.oc-sdk-trigger-value[data-empty="true"] { color: ${h}; }
.oc-sdk-trigger-chevron { color: ${h}; }
/* The app's floating level: the glass edge (a hairline ring and a lit top line, dark outside and light inside in dark themes) over soft shadows. The outer ring is the border, over the page like the app's. */
.oc-sdk-popup { --surface-foreground: ${ie}; border-color: var(--oc-sdk-float-edge); border-radius: 12px; background: ${De}; background-clip: padding-box; color: ${ie}; box-shadow: var(--oc-sdk-float); }
.oc-sdk-option { border-radius: 8px; }
.oc-sdk-option[data-active="true"] { background: ${M}; }
/* A selected option shows a check mark in the text colour, like the app's own pickers. Options without the mark come
   from bundles built before it existed and keep the selection fill as their only sign of the choice. */
.oc-sdk-option[aria-selected="true"]:not([data-mark]) { background: ${bt}; color: ${vt}; }
.oc-sdk-option-check { color: ${N}; }
.oc-sdk-option[data-destructive="true"] { color: ${Ot}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${b(R("status-error","red"),10)}; }
.oc-sdk-option-hint { color: ${h}; }
.oc-sdk-popup-empty { color: ${h}; }

/* Checked stays neutral: the mark carries the state, and the primary colour stays with primary actions. */
.oc-sdk-check-box { border-color: ${J}; border-radius: 4px; color: ${N}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${b(N,60,J)}; }
.oc-sdk-check-thumb { border-radius: 9999px; background: ${J}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { border-radius: 9999px; background: ${W}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${q}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${ko} }
.oc-sdk-check-desc { color: ${h}; }

.oc-sdk-tabs { border-radius: 10px; }
.oc-sdk-tabs[data-track="true"] { background: ${b(N,4)}; box-shadow: inset 0 1px 2px 0 rgb(0 0 0 / 0.16); }
.oc-sdk-tab { border-radius: 8px; color: ${h}; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${N}; }
.oc-sdk-tab[aria-selected="true"] { color: ${vt}; background: ${bt}; border-color: ${J}; }
.oc-sdk-tabs[data-track="true"] .oc-sdk-tab[aria-selected="true"] { color: ${ie}; background: var(--oc-sdk-raised-bg); ${It} }
.oc-sdk-tab-count { color: ${h}; }

/* The app's neutral badge: a step of the text colour, the same in every theme. */
.oc-sdk-badge { border-radius: 9999px; background: ${b(N,6)}; color: ${h}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${b("var(--oc-sdk-tone)",15)}; }

.oc-sdk-row { border-radius: 6px; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${M}; }
.oc-sdk-row[aria-selected="true"] { background: ${bt}; color: ${vt}; }
.oc-sdk-row-lead { font-family: ${At}; color: ${h}; }
.oc-sdk-row-sub { color: ${h}; }
.oc-sdk-row-meta { color: ${h}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { color: ${h}; }

.oc-sdk-empty-body { color: ${h}; }

.oc-sdk-spinner { color: ${h}; }
.oc-sdk-spinner-ring { border-color: ${J}; border-top-color: ${q}; border-radius: 9999px; }

/* Set apart by its tint alone, like the app's banners. */
.oc-sdk-banner { border-color: transparent; border-radius: 8px; background: ${b("var(--oc-sdk-tone)",10)}; }
.oc-sdk-banner-title { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { color: ${h}; }

.oc-sdk-separator { color: ${h}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { background: ${b(J,40)}; }

.oc-sdk-progress-label { color: ${h}; }
/* The app's progress: a groove a step of the text colour, green once done. Older bundles mark done only through aria-valuenow. */
.oc-sdk-progress-track { border-radius: 9999px; background: ${b(N,6)}; }
.oc-sdk-progress-fill { border-radius: 9999px; background: var(--oc-sdk-tone, ${q}); }
.oc-sdk-progress-track[aria-valuenow="100"] > .oc-sdk-progress-fill:not([data-tone]) { background: ${R("status-success","currentColor")}; }
.oc-sdk-progress[data-done="true"] .oc-sdk-progress-value { color: ${R("success-text","inherit")}; }

.oc-sdk-text a { color: ${xt}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { border-radius: 8px; border: 1px solid ${b(J,60)}; }
`,k=`
${je}
${sr}
${Go}`;var Mo="oc-sdk-ui-style",ae=(e)=>{while(e.firstChild)e.removeChild(e.firstChild)},I=(e)=>{let r=document.getElementById(Mo);if(r instanceof HTMLStyleElement){if(r.textContent!==e)r.textContent=e;return}ze(document);let s=document.createElement("style");s.id=Mo,s.textContent=e,document.head.appendChild(s)},A=(e,r)=>{let s=document.createElement(e);if(r)s.className=r;return s},K=(e)=>{let r=A("button",e);return r.type="button",r},B=(e,r)=>{let s=r??"";if(e.textContent!==s)e.textContent=s};var nr=()=>{let e=document.createElement("span");return e.className="oc-sdk-spinner-ring",e.setAttribute("aria-hidden","true"),e},le=(e,r)=>{I(k);let s=r,i=K("oc-sdk oc-sdk-btn"),d=nr(),T=document.createElement("span");i.append(T),e.append(i);let _=()=>{if(i.dataset.variant=s.variant??"default",i.dataset.size=s.size??"default",i.disabled=Boolean(s.disabled)||Boolean(s.loading),i.dataset.loading=s.loading?"true":"false",i.setAttribute("aria-busy",s.loading?"true":"false"),s.loading&&d.parentNode!==i)i.prepend(d);else if(!s.loading&&d.parentNode===i)d.remove();B(T,s.label)},S=()=>{if(s.disabled||s.loading)return;s.onClick()};return i.addEventListener("click",S),_(),{update:(U)=>{s={...s,...U},_()},dispose:()=>{i.removeEventListener("click",S),i.remove()}}};var cr=/(!?)\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g,pr=(e)=>{try{let r=new URL(e);return r.protocol==="http:"||r.protocol==="https:"}catch{return!1}},Uo=(e)=>{let r=[],s=0;for(let i of e.matchAll(cr)){let d=i.index??0;if(d>s)r.push({kind:"text",text:e.slice(s,d)});let T=i[1]??"",_=(i[2]??"").trim(),S=i[3]??"";if(!pr(S))r.push({kind:"text",text:i[0]});else if(T==="!")r.push({kind:"image",src:S,alt:_});else r.push({kind:"link",href:S,label:_||S});s=d+i[0].length}if(s<e.length)r.push({kind:"text",text:e.slice(s)});return r},Gt=(e,r)=>{I(k);let s=r,i=A("div","oc-sdk oc-sdk-text");e.append(i);let d=(_)=>{if(!(_.target instanceof HTMLAnchorElement)||!s.onOpenUrl)return;_.preventDefault(),s.onOpenUrl(_.target.href)},T=()=>{ae(i);for(let _ of Uo(s.text))if(_.kind==="text")i.append(document.createTextNode(_.text));else if(_.kind==="link"){let S=A("a");S.href=_.href,S.rel="noopener noreferrer",S.target="_blank",S.textContent=_.label,i.append(S)}else{let S=A("img");S.src=_.src,S.alt=_.alt,S.loading="lazy",S.referrerPolicy="no-referrer",i.append(S)}};return i.addEventListener("click",d),T(),{update:(_)=>{s={...s,..._},T()},dispose:()=>{i.removeEventListener("click",d),i.remove()}}};var Mt=yt(),Ve=document.querySelector("#root");if(!Ve)throw Error("Agent Desk: missing root");var No=document.createElement("div"),Ut=(e)=>{let r=document.createElement("div");r.textContent=e,No.prepend(r)},wo=!1;Mt.onReady((e)=>{if(ht(e,document.documentElement),wo)return;wo=!0,Gt(Ve,{text:"Agent Desk"}),le(Ve,{label:"Start a session",onClick:()=>{Mt.serviceRequest({method:"POST",path:"/start",body:JSON.stringify({directory:e.directory})}).then((r)=>Ut(r.body)).catch(()=>Ut("The service did not answer."))}}),Ve.append(No)});Mt.onServiceEvent(({topic:e,data:r})=>Ut(`${e}: ${JSON.stringify(r)}`));})();
