(()=>{var S="openchamber.sdk",g=2;var Ee="openchamber:guest-bootstrap",$o=(e,r,s)=>{let{window:i,MessageChannel:l}=globalThis;if(!i||!l)return;try{let m=new l,f=m.port1,E=!1,v=!1,G=null,F=(k)=>{try{k.close()}catch{}},oe=(k=[])=>{for(let U of k)F(U);if(!E)E=!0,F(f)},Q=(k)=>{let U=new CustomEvent(s,{detail:k,cancelable:!0});if(!i.dispatchEvent(U))return;F(k),E=!0};i.addEventListener(s,(k)=>{if(!("detail"in k)||k.detail!==null)return;if(v=!0,G){let U=G;G=null,Q(U)}}),f.addEventListener("message",(k)=>{if(E)return;let U=k.data,V=k.ports??[];if(!U||U.channel!==e||U.v!==r||U.type!=="connect-port"||V.length!==1){oe(V);return}let X=V[0];if(E=!0,F(f),X.start(),!v){G=X;return}Q(X)}),f.start(),i.parent.postMessage({channel:e,v:r,type:"bootstrap"},"*",[m.port2])}catch{}},qo=`(${$o.toString()})(${JSON.stringify("openchamber.guest-bootstrap")}, 2, ${JSON.stringify("openchamber:guest-bootstrap")});`;var Ye=`
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
`;function Qe(e){let r=e.documentElement;if(r.hasAttribute("data-oc-scrollbar-activity"))return;r.setAttribute("data-oc-scrollbar-activity","");let s=new WeakMap;e.addEventListener("scroll",(i)=>{let l=i.target===e?r:i.target;if(!(l instanceof Element))return;if(!l.hasAttribute("data-oc-scrolling"))l.setAttribute("data-oc-scrolling","");let m=s.get(l);if(m!==void 0)clearTimeout(m);s.set(l,setTimeout(()=>{s.delete(l),l.removeAttribute("data-oc-scrolling")},1000))},{capture:!0,passive:!0})}var Wo=`(${Qe.toString()})(document);`;var Ze=128,et=65536;var xe=128;var ve=65536;var Qt=/^[a-z][a-z0-9-]{0,39}$/;var Kt=(e)=>Object(e)===e&&!Array.isArray(e),tt=(e,r)=>Object.keys(e).every((s)=>r.includes(s)),Jt=(e)=>String(e)===e&&e.length>=1&&e.length<=60,Yt=(e)=>String(e)===e&&e.length>=1&&e.length<=80,Zt=(e)=>{if(!Array.isArray(e)||e.length>4)return!1;let r=new Set;for(let s of e){if(!Kt(s)||!Qt.test(s.id)||!Jt(s.label))return!1;if(s.disabled!==void 0&&s.disabled!==!0&&s.disabled!==!1)return!1;if(r.has(s.id))return!1;if(r.add(s.id),s.kind==="button"){if(!tt(s,["kind","id","label","disabled"]))return!1;continue}if(s.kind!=="select"||!tt(s,["kind","id","label","value","options","disabled"]))return!1;if(!Yt(s.value)||!Array.isArray(s.options)||s.options.length<1||s.options.length>16)return!1;let i=new Set;for(let l of s.options){if(!Kt(l)||!tt(l,["value","label"])||!Yt(l.value)||!Jt(l.label)||i.has(l.value))return!1;i.add(l.value)}if(!i.has(s.value))return!1}return!0};var Re=20000000,Oe=256;var ot=(e)=>("bytes"in e)?e.bytes.byteLength:e.content.length,eo=(e,r)=>{if(e.path!==r.path||e.readOnly!==r.readOnly)return!1;if(e.encoding==="text"||r.encoding==="text")return e.encoding==="text"&&r.encoding==="text"&&e.content===r.content;if(e.bytes.byteLength!==r.bytes.byteLength)return!1;for(let s=0;s<e.bytes.byteLength;s+=1)if(e.bytes[s]!==r.bytes[s])return!1;return!0},Ce=(e)=>{let r=e,s=e;return{observe:(i)=>{let l=i!==s;return s=i,{edited:l,dirty:i!==r}},markSaved:(i)=>(r=i,s!==i)}};var to=/^[A-Za-z0-9_-]{1,80}$/;var oo=["left","right","top","bottom"];var ro=(e,r=0,s={remaining:16000})=>{if(--s.remaining<0||r>=32)return!1;if(e===null)return!0;let i=Array.isArray(e)?e:Object(e)===e?Object.values(e):[];for(let l of i)if(!ro(l,r+1,s))return!1;return!0},rt=(e)=>{if(e===null||e===!0||e===!1)return!0;if(Array.isArray(e))return Object.keys(e).every((r)=>/^(0|[1-9]\d*)$/.test(r)&&Number(r)<e.length)&&e.every(rt);if(Object(e)===e){let r=Object.getPrototypeOf(e);return(r===null||r===Object.prototype)&&Object.values(e).every(rt)}return String(e)===e||Number.isFinite(e)},st=(e)=>{try{if(String(e.id)!==e.id||!to.test(e.id)||!Number.isFinite(e.anchor.x)||Math.abs(e.anchor.x)>1e5||!Number.isFinite(e.anchor.y)||Math.abs(e.anchor.y)>1e5||!Number.isFinite(e.anchor.width)||!Number.isFinite(e.anchor.height)||e.anchor.width<=0||e.anchor.height<=0||e.anchor.width>1e5||e.anchor.height>1e5||!Number.isInteger(e.width)||e.width<160||e.width>640||!Number.isInteger(e.height)||e.height<48||e.height>480||e.side!==void 0&&!oo.includes(e.side)||e.focus!==void 0&&e.focus!==!0&&e.focus!==!1||!ro(e.data)||!rt(e.data))return!1;return JSON.stringify(e.data).length<=16000}catch{return!1}};var no=["file","directory","other","missing"],it=(e)=>Boolean(e&&"sessionId"in e),at=(e)=>Boolean(e&&"sent"in e&&!("sessionId"in e));var io=/^[0-9a-f]{7,64}$/i,lt=(e)=>io.test(e),Ae=500,ke=32000,ao=16000,lo=128,co=200,uo=2000,po=16000,So=80,go=200,mo=16000;var Eo=2000;var ct=20000,Ge=1024,Pe=2000000;var Me=64000,we=8000,ut=4000;var pt=90000;var fo=999,ho=1e4,fe=500,yo=["HOST_UNAVAILABLE","HOST_TIMEOUT","HOST_REJECTED","DISCONNECTED","DISABLED","BAD_PATH","NO_INTEGRATION","NO_SERVICE","SERVICE_FAILED","REQUEST_FAILED","RESPONSE_TOO_LARGE","NO_SESSION","SESSION_BUSY","NOT_GRANTED","NO_DIRECTORY","NOT_FOUND","FILE_TOO_LARGE","DENIED","NO_MODEL","MODEL_FAILED","UNSUPPORTED"],_o=["stopped","starting","ready","failed"],zo=new Set(yo),To=(e)=>zo.has(e),bo=(e)=>e&&To(e)?e:"HOST_REJECTED",ae=(e)=>{if(e===void 0)return!1;if(e===null||e===!0||e===!1)return!0;if(String(e)===e)return!0;if(Number(e)===e)return Number.isFinite(e);if(Array.isArray(e))return e.every(ae);if(Object(e)===e)return Object.values(e).every(ae);return!1},xo=(e)=>ae(e)&&JSON.stringify(e).length<=mo,so=(e)=>e?.trim().slice(0,go)??"",le=(e)=>{let r=e.id.trim().slice(0,lo),s=e.title.trim().slice(0,co),i=e.url.trim().slice(0,uo),l=e.text?.trim().slice(0,po),m=e.author?.trim().slice(0,So),f=e.kind==="pull"?"pull":"issue",E={providerId:e.providerId.trim(),id:r,title:s||r,url:i,kind:f};if(l)E.text=l;if(m)E.author=m;if(f==="pull"){let v=so(e.branches?.head),G=so(e.branches?.base);if(v&&G)E.branches={head:v,base:G}}if(xo(e.data))E.data=e.data;return E},dt=(e)=>{let r=le(e);if(e.projectId)r.projectId=e.projectId;if(e.navigation)r.navigation=e.navigation;if(e.worktree)r.worktree=e.worktree;return r},St=(e)=>{let r={text:e.text.trim().slice(0,ao)};if(e.send)r.send=!0;return r},gt=(e)=>{if(e===null||!Number.isFinite(e))return null;return Math.min(fo,Math.max(0,Math.round(e)))},mt=(e)=>{if(!Number.isFinite(e))return 0;return Math.min(ho,Math.max(0,Math.ceil(e)))};var ce=(e)=>e.length>0&&e.length<=Ge&&!e.includes("\x00")&&!e.includes("\\");var Ie=(e)=>{if(!e.startsWith("/")||e.includes("\x00")||e.includes("\\")||e.includes("://"))return!1;if(e.length>Eo)return!1;return!e.split("/").some((s)=>s==="."||s==="..")},Ko=new Set(_o),Et=(e)=>Boolean(e&&"status"in e&&Ko.has(String(e.status))&&!("body"in e)),Ue=(e)=>Boolean(e&&"status"in e&&"body"in e&&Number.isInteger(e.status)),ft=(e)=>Boolean(e&&"content"in e&&String(e.content)===e.content),ht=(e)=>Boolean(e&&"written"in e&&e.written===!0),yt=(e)=>Boolean(e&&"entries"in e&&Array.isArray(e.entries)),Jo=new Set(no),_t=(e)=>Boolean(e&&"kind"in e&&"size"in e&&Jo.has(String(e.kind))&&Number.isFinite(e.size)),Tt=(e)=>Boolean(e&&"text"in e&&String(e.text)===e.text&&!("status"in e)),Yo=new Set(["workspace","shells","ready","directory","session","connection","settings","session-lifecycle","item","resolve","action","status-control-event","popover-closed","file-open","file-snapshot","file-saved","generate-late"]),Qo=(e)=>Object(e)===e?e:null,nt=(e)=>String(e)===e&&e.length>0,Zo=(e)=>{if(!nt(e.id))return null;if(e.ok===!0){let r={channel:S,v:g,type:"result",id:e.id,ok:!0};if(Object(e.payload)===e.payload)r.payload=e.payload;return r}if(e.ok===!1&&nt(e.error))return{channel:S,v:g,type:"result",id:e.id,ok:!1,error:e.error,code:bo(nt(e.code)?e.code:void 0)};return null},bt=(e)=>{let r=Qo(e);if(!r||r.channel!==S||r.v!==g)return null;if(r.type==="result")return Zo(r);if(!Yo.has(String(r.type))||Object(r.payload)!==r.payload)return null;return r};var vo=(e)=>("key"in e)&&("metaKey"in e)&&("ctrlKey"in e),er=(e)=>(e.metaKey||e.ctrlKey)&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==="s";class c extends Error{code;constructor(e,r){super(r);this.name="HostRequestError",this.code=e}}var Ro=()=>Promise.reject(new c("BAD_PATH",'Request path must start with "/" and stay on the declared origin.')),Le=()=>Promise.reject(new c("BAD_PATH",`File path must be 1 to ${Ge} characters without NUL or backslash.`)),Ne=(e)=>{if(e===void 0)return;if(Object(e)!==e||Array.isArray(e)||e.scope!==void 0&&e.scope!=="instance"&&e.scope!=="device")throw new c("HOST_REJECTED",'Storage scope must be "instance" or "device".');return e.scope==="device"?"device":void 0},d=(e)=>(e.value+=1,`oc-${e.value}`),xt=(e={})=>{let r=e.target??("window"in globalThis?window:null);if(!r)throw new c("HOST_UNAVAILABLE","No window. connectHost runs in a browser frame.");let s=e.requestTimeoutMs??ct,i=e.acceptSource??((t)=>t===r.parent),l=new Set,m=new Set,f=new Set,E=new Set,v=new Set,G=new Set,F=new Set,oe=new Set,Q=new Set,k=new Set,U=[],V=null,X=null,he=new Set,ye=new Set,de=null,Se=null,We=!1,re=new Map,se=new Map,ne=new Map,D=!1,p={value:0},u=null,q=null,ge=!1,me=!1,Ht=null,Dt=(t)=>{if(!t)return null;return{sessionId:t.id,phase:t.busy?"started":"completed"}},ie=null,je=[],N=(t)=>{if(D)return;if(ie){ie.postMessage(t);return}je.push(t)},Bt=()=>{if(D||Object.is(r.parent,r)||k.size===0||u?.features?.lateGenerateResults!==!0)return;N({channel:S,v:g,type:"generate-late-listen"})},b=(t,o)=>{for(let n of t)try{n(o)}catch(a){console.error(a)}},Bo=(t)=>{if(!("data"in t))return;let o=bt(t.data);if(!o)return;if(o.type==="workspace"){let a=se.get(o.payload.subscriptionId);if(a)b([a],o.payload.snapshot);return}if(o.type==="shells"){let a=ne.get(o.payload.subscriptionId);if(a)b([a],o.payload.snapshot);return}if(o.type==="ready"){if(u=o.payload,q=Dt(o.payload.session),b(l,o.payload),b(m,o.payload.directory),b(f,o.payload.session),q)b(E,q);b(v,o.payload.connection),b(G,o.payload.settings),b(F,o.payload.item),Bt();return}if(o.type==="generate-late"){if(k.size===0)U.push(o.payload);else b(k,o.payload);return}if(o.type==="directory"){if(u)u={...u,directory:o.payload.directory};b(m,o.payload.directory);return}if(o.type==="session"){if(u)u={...u,session:o.payload.session};if(!o.payload.session)q=null;else if(q?.sessionId!==o.payload.session.id)q=Dt(o.payload.session);b(f,o.payload.session);return}if(o.type==="session-lifecycle"){q=o.payload,b(E,o.payload);return}if(o.type==="connection"){if(u)u={...u,connection:o.payload.connection};b(v,o.payload.connection);return}if(o.type==="settings"){if(u)u={...u,settings:o.payload.settings};b(G,o.payload.settings);return}if(o.type==="item"){if(u)u={...u,item:o.payload.item};b(F,o.payload.item);return}if(o.type==="status-control-event"){b(oe,o.payload);return}if(o.type==="popover-closed"){b(Q,o.payload);return}if(o.type==="action"){let a=(h)=>{if(!D)N({channel:S,v:g,type:"action-result",id:o.id,payload:h})},y=X;if(!y){a({ok:!1,error:"This extension does not handle background actions."});return}Promise.resolve().then(()=>y(o.payload)).then(()=>a({ok:!0}),(h)=>{let C=(h instanceof Error?h.message:String(h)).trim();a({ok:!1,error:(C||"Action failed.").slice(0,fe)})});return}if(o.type==="file-open"){let a=o.payload;if(Se&&eo(Se,a))return;Se=a,b(he,o.payload);return}if(o.type==="file-saved"){b(ye,o.payload.version);return}if(o.type==="file-snapshot"){let a=(C)=>{if(!D)N({channel:S,v:g,type:"file-snapshot-result",id:o.id,payload:C})},y=(C)=>a({error:(C.trim()||"Could not read the edited file.").slice(0,fe)}),h=de;if(!h){y("This extension does not edit files.");return}Promise.resolve().then(()=>h(o.payload.purpose)).then((C)=>{if(ot(C)>Re){y(`The file is over ${Re} ${"bytes"in C?"bytes":"characters"}.`);return}if(C.version.length>Oe){y(`The snapshot version is over ${Oe} characters.`);return}a({snapshot:"bytes"in C?{bytes:C.bytes,version:C.version}:{content:C.content,version:C.version}})},(C)=>y(C instanceof Error?C.message:String(C)));return}if(o.type==="resolve"){let a=(h)=>{N({channel:S,v:g,type:"resolve-result",id:o.id,payload:h})},y=V;if(!y){a({error:"This extension does not resolve commands."});return}Promise.resolve().then(()=>y(o.payload)).then((h)=>a({item:h?le(h):null}),(h)=>{let C=(h instanceof Error?h.message:String(h)).trim();a({error:(C||"Command failed.").slice(0,fe)})});return}let n=re.get(o.id);if(!n)return;if(clearTimeout(n.timer),re.delete(o.id),o.ok){n.resolve(o.payload);return}n.reject(new c(o.code,o.error))},Fo=(t)=>{if(!("source"in t))return!0;return i(t.source)},Ft=(t)=>{if(!Fo(t)||!("detail"in t))return;let o=t.detail;if(!(o instanceof MessagePort))return;t.preventDefault(),t.stopImmediatePropagation(),ie?.close(),ie=o,o.addEventListener("message",Bo),o.start(),o.postMessage({channel:S,v:g,type:"hello"});for(let n of je.splice(0))o.postMessage(n)};r.addEventListener(Ee,Ft),r.dispatchEvent?.(new CustomEvent(Ee,{detail:null}));let w=(t,o=s)=>{if(D||Object.is(r.parent,r))return Promise.reject(new c("HOST_UNAVAILABLE","No host frame. This page is not in an iframe."));return new Promise((n,a)=>{let y=setTimeout(()=>{re.delete(t.id),a(new c("HOST_TIMEOUT","Host did not answer in time."))},o);re.set(t.id,{resolve:n,reject:a,timer:y}),N(t)})},R=(t)=>w(t).then(()=>{return}),O={channel:S,v:g},ze=(t)=>{if(!D&&!Object.is(r.parent,r))N(t)},Vt=()=>ze({...O,type:"file-save"}),Xt=(t)=>{if(!vo(t)||!er(t))return;t.preventDefault(),Vt()},$t=(t)=>{if(!vo(t)||t.key!=="Escape"||u?.surface!=="popover"||!u.popover)return;t.preventDefault(),jt(u.popover.id,"escape").catch(()=>{return})},_e=()=>{let t=u?.surface==="popover"?u.popover:void 0;if(!t)return;let o=ge||me;if(Ht===o)return;Ht=o,zt(t.id,o).catch(()=>{return})},Te=()=>{if(u?.surface!=="popover"||ge)return;ge=!0,_e()},qt=(t)=>{if(u?.surface!=="popover"||t.relatedTarget!==null||!ge)return;ge=!1,_e()},Wt=()=>{if(u?.surface!=="popover"||me)return;me=!0,_e()},Vo=()=>{if(u?.surface!=="popover"||!me)return;me=!1,_e()},B=(t,o=1024)=>{if(!t.trim()||t.length>o)throw new c("HOST_REJECTED",`Identity must contain 1 to ${o} characters.`)},Ke=async(t)=>{if(t.kind!=="projects")B(t.projectId);let o=await w({...O,type:"workspace-read",id:d(p),payload:t});if(!o||!("kind"in o)||!("state"in o)||o.kind!==t.kind)throw new c("HOST_REJECTED","Host did not return workspace data.");return o},Je=async(t,o)=>{if(t.kind!=="projects")B(t.projectId);let n=d(p);se.set(n,o);try{await R({...O,type:"workspace-subscribe",id:d(p),payload:{subscriptionId:n,query:t}})}catch(a){if(se.delete(n),!D)N({...O,type:"workspace-unsubscribe",id:d(p),payload:{subscriptionId:n}});throw a}return()=>{if(!se.delete(n)||D)return;N({...O,type:"workspace-unsubscribe",id:d(p),payload:{subscriptionId:n}})}},Xo=async(t,o)=>{if(t.kind==="session")B(t.sessionId);if(t.kind==="project")B(t.projectId);let n=d(p);ne.set(n,o);try{await R({...O,type:"shells-subscribe",id:d(p),payload:{subscriptionId:n,scope:t}})}catch(a){if(ne.delete(n),!D)N({...O,type:"shells-unsubscribe",id:d(p),payload:{subscriptionId:n}});throw a}return()=>{if(!ne.delete(n)||D)return;N({...O,type:"shells-unsubscribe",id:d(p),payload:{subscriptionId:n}})}},be=async(t)=>{if("key"in t&&(t.key.length===0||t.key.length>Ze))throw new c("HOST_REJECTED","Storage key must contain 1 to 128 characters.");if(t.op==="set"&&!ae(t.value))throw new c("HOST_REJECTED","Storage values must be JSON.");if(t.op==="set"&&new TextEncoder().encode(JSON.stringify(t.value)).length>et)throw new c("HOST_REJECTED","Storage value exceeds 64 KiB.");if(t.scope==="device"&&u?.features?.deviceStorage!==!0)throw new c("UNSUPPORTED","This host does not support device storage.");let o=await w({...O,type:"storage",id:d(p),payload:t});if(!o||!("storage"in o)||o.op!==t.op)throw new c("HOST_REJECTED","Host did not return storage data.");return o},jt=(t,o)=>u?.features?.popovers!==!0&&!(u?.surface==="popover"&&u.popover?.id===t)?Promise.reject(new c("UNSUPPORTED","This host does not support popovers.")):R({...O,type:"popover-close",id:d(p),payload:o?{id:t,reason:o}:{id:t}}),zt=(t,o)=>u?.features?.popovers!==!0&&!(u?.surface==="popover"&&u.popover?.id===t)?Promise.reject(new c("UNSUPPORTED","This host does not support popovers.")):R({...O,type:"popover-anchor",id:d(p),payload:{id:t,active:o}});return r.addEventListener("keydown",$t,!0),r.addEventListener("pointerover",Te),r.addEventListener("pointermove",Te),r.addEventListener("pointerout",qt),r.addEventListener("focus",Wt),r.addEventListener("blur",Vo),{onAction:(t)=>(X=t,()=>{if(X===t)X=null}),listProjects:async()=>{let t=await Ke({kind:"projects"});if(t.kind!=="projects")throw new c("HOST_REJECTED","Expected projects.");return t},listWorktrees:async(t)=>{let o=await Ke({kind:"worktrees",projectId:t});if(o.kind!=="worktrees")throw new c("HOST_REJECTED","Expected worktrees.");return o},listSessions:async(t)=>{let o=await Ke({kind:"sessions",projectId:t});if(o.kind!=="sessions")throw new c("HOST_REJECTED","Expected sessions.");return o},onProjects:(t)=>Je({kind:"projects"},(o)=>{if(o.kind==="projects")t(o)}),onWorktrees:(t,o)=>Je({kind:"worktrees",projectId:t},(n)=>{if(n.kind==="worktrees")o(n)}),onSessions:(t,o)=>Je({kind:"sessions",projectId:t},(n)=>{if(n.kind==="sessions")o(n)}),onRunningShells:(t,o)=>Xo(t,o),readShellOutput:async(t,o)=>{B(t,xe);let n=o?.cursor;if(n!==void 0&&(!Number.isInteger(n)||n<0))throw new c("HOST_REJECTED","Shell output cursor must be a non-negative integer.");let a=o?.tailBytes;if(a!==void 0&&(!Number.isInteger(a)||a<1||a>ve))throw new c("HOST_REJECTED",`Shell output tailBytes must be an integer between 1 and ${ve}.`);let h=await w({...O,type:"shell-output",id:d(p),payload:{shellId:t,cursor:n,tailBytes:a}});if(!h||typeof h.output!=="string"||!Number.isFinite(h.cursor))throw new c("HOST_REJECTED","Host did not return shell output.");return h},stopShell:async(t)=>{if(B(t,xe),(await w({...O,type:"shell-stop",id:d(p),payload:{shellId:t}}))?.stopped!==!0)throw new c("HOST_REJECTED","Host did not stop the shell.");return{stopped:!0}},openSession:async(t)=>{B(t),await R({...O,type:"open-session",id:d(p),payload:{sessionId:t}})},storage:{get:async(t,o)=>{let n=Ne(o),a={op:"get",key:t};if(n)a.scope=n;let y=await be(a);return y.op==="get"&&y.found?y.value:void 0},set:async(t,o,n)=>{let a=Ne(n),y={op:"set",key:t,value:o};if(a)y.scope=a;await be(y)},delete:async(t,o)=>{let n=Ne(o),a={op:"delete",key:t};if(n)a.scope=n;await be(a)},keys:async(t)=>{let o=Ne(t),n={op:"keys"};if(o)n.scope=o;let a=await be(n);if(a.op!=="keys")throw new c("HOST_REJECTED","Expected storage keys.");return a.keys}},onReady:(t)=>{if(l.add(t),u)t(u);return()=>{l.delete(t)}},onDirectory:(t)=>{if(m.add(t),u)t(u.directory);return()=>{m.delete(t)}},onSession:(t)=>{if(f.add(t),u)t(u.session);return()=>{f.delete(t)}},onSessionLifecycle:(t)=>{if(E.add(t),q)t(q);return()=>{E.delete(t)}},onConnection:(t)=>{if(v.add(t),u)t(u.connection);return()=>{v.delete(t)}},onSettings:(t)=>{if(G.add(t),u)t(u.settings);return()=>{G.delete(t)}},onItem:(t)=>{if(F.add(t),u)t(u.item);return()=>{F.delete(t)}},onStatusControl:(t)=>(oe.add(t),()=>{oe.delete(t)}),onPopoverClosed:(t)=>(Q.add(t),()=>{Q.delete(t)}),onLateGenerateResult:(t)=>{k.add(t);for(let o of U.splice(0))b([t],o);return Bt(),()=>{k.delete(t)}},setStatusControls:(t)=>{if(u?.features?.statusControls!==!0)return Promise.reject(new c("UNSUPPORTED","This host does not support status controls."));if(!Zt(t))return Promise.reject(new c("HOST_REJECTED","Status controls must have unique bounded ids and valid selected options."));return R({...O,type:"status-controls",id:d(p),payload:{controls:t}})},openPopover:(t)=>{if(u?.features?.popovers!==!0)return Promise.reject(new c("UNSUPPORTED","This host does not support popovers."));if(!st(t))return Promise.reject(new c("HOST_REJECTED","Popover requests need bounded geometry and JSON data."));return R({...O,type:"popover-open",id:d(p),payload:t})},closePopover:jt,setPopoverAnchorActive:zt,onResolve:(t)=>(V=t,()=>{if(V===t)V=null}),toast:(t)=>{let o=t.message.trim();if(!o||o.length>Ae)return Promise.reject(new c("HOST_REJECTED",`Toast message must contain 1 to ${Ae} characters.`));if(t.copy&&t.copy!==!0&&(!t.copy.text.length||t.copy.text.length>ke))return Promise.reject(new c("HOST_REJECTED",`Toast copy text must contain 1 to ${ke} characters.`));return R({channel:S,v:g,type:"toast",id:d(p),payload:{...t,message:o}})},openUrl:(t)=>R({channel:S,v:g,type:"open-url",id:d(p),payload:{url:t}}),openCommit:(t)=>lt(t)?R({channel:S,v:g,type:"open-commit",id:d(p),payload:{sha:t}}):Promise.reject(new c("HOST_REJECTED","Commit id must be 7 to 64 hex characters.")),openSurface:(t)=>R({channel:S,v:g,type:"open-surface",id:d(p),payload:{surfaceId:t}}),writeClipboard:(t)=>R({channel:S,v:g,type:"clipboard-write",id:d(p),payload:{text:t}}),compose:(t)=>R({channel:S,v:g,type:"compose",id:d(p),payload:t}),attach:(t)=>R({channel:S,v:g,type:"attach",id:d(p),payload:le(t)}),startSession:async(t)=>{if(t.projectId!==void 0)B(t.projectId);let o=t.worktree;if(o&&o!==!0)if(o.kind==="existing")B(o.directory);else{if(o.name!==void 0)B(o.name,200);if(o.baseBranch!==void 0)B(o.baseBranch,200)}let n=await w({channel:S,v:g,type:"start-session",id:d(p),payload:dt(t)},e.requestTimeoutMs??180000);if(!it(n))throw new c("HOST_REJECTED","Host did not return a session.");return n},prompt:(t)=>w({channel:S,v:g,type:"prompt",id:d(p),payload:St(t)}).then((o)=>{if(!at(o))throw new c("HOST_REJECTED","Host did not return a prompt result.");return o}),sessionLink:(t)=>R({channel:S,v:g,type:"session-link",id:d(p),payload:le(t)}),close:()=>R({channel:S,v:g,type:"close",id:d(p)}),oauthStart:()=>R({channel:S,v:g,type:"oauth-start",id:d(p)}),oauthDisconnect:()=>R({channel:S,v:g,type:"oauth-disconnect",id:d(p)}),request:(t)=>(Ie(t.path)?w({channel:S,v:g,type:"request",id:d(p),payload:t}):Ro()).then((o)=>{if(!Ue(o))throw new c("HOST_REJECTED","Host request result was empty.");return o}),serviceRequest:(t)=>(Ie(t.path)?w({channel:S,v:g,type:"service-request",id:d(p),payload:t}):Ro()).then((o)=>{if(!Ue(o))throw new c("HOST_REJECTED","Host service request result was empty.");return o}),serviceStatus:()=>w({channel:S,v:g,type:"service-status",id:d(p)}).then((t)=>{if(!Et(t))throw new c("HOST_REJECTED","Host did not return service status.");return t}),readFile:(t)=>(ce(t)?w({channel:S,v:g,type:"file-read",id:d(p),payload:{path:t}}):Le()).then((o)=>{if(!ft(o))throw new c("HOST_REJECTED","Host did not return file content.");return o}),writeFile:(t,o)=>{if(!ce(t))return Le();if(o.length>Pe)return Promise.reject(new c("FILE_TOO_LARGE",`Content is over ${Pe} characters.`));return w({channel:S,v:g,type:"file-write",id:d(p),payload:{path:t,content:o}}).then((n)=>{if(!ht(n))throw new c("HOST_REJECTED","Host did not confirm the write.");return n})},listDir:(t)=>(ce(t)?w({channel:S,v:g,type:"file-list",id:d(p),payload:{path:t}}):Le()).then((o)=>{if(!yt(o))throw new c("HOST_REJECTED","Host did not return directory entries.");return o}),stat:(t)=>(ce(t)?w({channel:S,v:g,type:"file-stat",id:d(p),payload:{path:t}}):Le()).then((o)=>{if(!_t(o))throw new c("HOST_REJECTED","Host did not return file status.");return o}),generate:(t)=>{let o=t.prompt.trim(),n=t.system?.trim();if(o.length===0||o.length>Me)return Promise.reject(new c("HOST_REJECTED",`Prompt must be 1 to ${Me} characters.`));if(n!==void 0&&(n.length===0||n.length>we))return Promise.reject(new c("HOST_REJECTED",`System prompt must be 1 to ${we} characters.`));let a=t.maxOutputTokens===void 0?void 0:Math.min(ut,Math.max(1,Math.floor(t.maxOutputTokens)));if(a!==void 0&&!Number.isFinite(a))return Promise.reject(new c("HOST_REJECTED","maxOutputTokens must be a number."));let y={prompt:o};if(n!==void 0)y.system=n;if(a!==void 0)y.maxOutputTokens=a;return w({channel:S,v:g,type:"generate",id:d(p),payload:y},e.requestTimeoutMs??pt).then((h)=>{if(!Tt(h))throw new c("HOST_REJECTED","Host did not return generated text.");return h})},setBadge:(t)=>R({channel:S,v:g,type:"badge",id:d(p),payload:{count:gt(t)}}),setHeight:(t)=>R({channel:S,v:g,type:"resize",id:d(p),payload:{height:mt(t)}}),onFileOpen:(t)=>{if(he.add(t),!We)We=!0,r.addEventListener("keydown",Xt,!0);if(Se)t(Se);return()=>{he.delete(t)}},onFileSnapshot:(t)=>(de=t,()=>{if(de===t)de=null}),onFileSaved:(t)=>(ye.add(t),()=>{ye.delete(t)}),reportFileChange:(t)=>ze({...O,type:"file-change",payload:{dirty:t.dirty,edited:t.edited}}),requestFileSave:Vt,reportFileUnsupported:()=>ze({...O,type:"file-unsupported"}),dispose:()=>{for(let t of se.keys())N({...O,type:"workspace-unsubscribe",id:d(p),payload:{subscriptionId:t}});se.clear();for(let t of ne.keys())N({...O,type:"shells-unsubscribe",id:d(p),payload:{subscriptionId:t}});if(ne.clear(),D=!0,V=null,X=null,de=null,he.clear(),ye.clear(),We)r.removeEventListener("keydown",Xt,!0);r.removeEventListener(Ee,Ft),r.removeEventListener("keydown",$t,!0),r.removeEventListener("pointerover",Te),r.removeEventListener("pointermove",Te),r.removeEventListener("pointerout",qt),r.removeEventListener("focus",Wt),ie?.close(),ie=null,je.length=0;for(let t of re.values())clearTimeout(t.timer),t.reject(new c("HOST_UNAVAILABLE","Host client was disposed."));re.clear(),l.clear(),m.clear(),f.clear(),E.clear(),v.clear(),G.clear(),F.clear(),oe.clear(),Q.clear(),k.clear(),U.length=0}}};var Oo=["browser.open","browser.snapshot","browser.click","browser.type","browser.select","browser.scroll","browser.back","browser.forward","browser.inspect","browser.capture","browser.resize","browser.close"];var Hr=new Set(Oo);var Co=["none","agent","user"];var Br=new Set(Co);var tr=[["--oc-bg","background"],["--oc-elevated","elevated"],["--oc-fg","foreground"],["--oc-muted","muted"],["--oc-subtle","subtle"],["--oc-border","border"],["--oc-hover","hover"],["--oc-selection","selection"],["--oc-focus","focus"],["--oc-primary","primary"],["--oc-muted-surface","mutedSurface"],["--oc-elevated-fg","elevatedForeground"],["--oc-active","active"],["--oc-selection-fg","selectionForeground"],["--oc-primary-fg","primaryForeground"],["--oc-primary-text","primaryText"],["--oc-success-text","successText"],["--oc-warning-text","warningText"],["--oc-error-text","errorText"],["--oc-info-text","infoText"],["--oc-success","success"],["--oc-warning","warning"],["--oc-error","error"],["--oc-info","info"],["--oc-font","font"],["--oc-mono","mono"],["--oc-radius","radius"],["--surface-background","background"],["--surface-elevated","elevated"],["--surface-foreground","foreground"],["--surface-muted-foreground","muted"],["--surface-subtle","subtle"],["--interactive-border","border"],["--interactive-hover","hover"],["--interactive-selection","selection"],["--interactive-focus-ring","focus"],["--primary","primary"],["--surface-muted","mutedSurface"],["--surface-elevated-foreground","elevatedForeground"],["--interactive-active","active"],["--interactive-selection-foreground","selectionForeground"],["--primary-foreground","primaryForeground"],["--primary-text","primaryText"],["--success-text","successText"],["--warning-text","warningText"],["--error-text","errorText"],["--info-text","infoText"],["--status-success","success"],["--status-warning","warning"],["--status-error","error"],["--status-info","info"],["--font-sans","font"],["--font-mono","mono"],["--radius","radius"]],or=[["--oc-syntax-keyword","--syntax-keyword","syntaxKeyword"],["--oc-syntax-string","--syntax-string","syntaxString"],["--oc-syntax-number","--syntax-number","syntaxNumber"],["--oc-syntax-function","--syntax-function","syntaxFunction"],["--oc-syntax-type","--syntax-type","syntaxType"],["--oc-syntax-comment","--syntax-comment","syntaxComment"],["--oc-syntax-variable","--syntax-variable","syntaxVariable"],["--oc-syntax-operator","--syntax-operator","syntaxOperator"]],Ao=(e,r)=>{r.style.colorScheme=e.mode;for(let[s,i]of tr)r.style.setProperty(s,e.tokens[i]);for(let[s,i,l]of or){let m=e.tokens[l]??"";r.style.setProperty(s,m),r.style.setProperty(i,m)}r.style.setProperty("font-family",e.tokens.font),r.style.setProperty("font-size","0.875rem"),r.style.setProperty("line-height","1.45"),r.style.setProperty("color",e.tokens.foreground)},vt=(e,r)=>{if(Ao(e.theme,r),r.dataset)r.dataset.ocSurface=e.surface,r.dataset.ocTheme=e.theme.mode};var rr={"surface-background":"bg","surface-elevated":"elevated","surface-elevated-foreground":"elevated-fg","surface-foreground":"fg","surface-muted-foreground":"muted","surface-muted":"muted-surface","surface-subtle":"subtle","interactive-border":"border","interactive-hover":"hover","interactive-active":"active","interactive-selection":"selection","interactive-selection-foreground":"selection-fg","interactive-focus-ring":"focus",primary:"primary","primary-foreground":"primary-fg","primary-text":"primary-text","success-text":"success-text","warning-text":"warning-text","error-text":"error-text","info-text":"info-text","status-success":"success","status-warning":"warning","status-error":"error","status-info":"info","font-sans":"font","font-mono":"mono",radius:"radius"},T=(e,r)=>`var(--${e}, var(--oc-${rr[e]}, ${r}))`,j=T("surface-background","transparent"),De=T("surface-elevated","transparent"),ue=T("surface-elevated-foreground","inherit"),H=T("surface-foreground","inherit"),_=T("surface-muted-foreground","gray"),sr=T("surface-muted","transparent"),z=T("interactive-border","currentColor"),I=T("interactive-hover","transparent"),Z=T("interactive-active","transparent"),Rt=T("interactive-selection","transparent"),Ot=T("interactive-selection-foreground","inherit"),W=T("primary","currentColor"),Ct=T("primary-text","inherit"),At=T("error-text","inherit"),nr=T("font-sans","inherit"),kt=T("font-mono","monospace"),wo=T("radius","9px"),Gt=`calc(${wo} - 2px)`,ko=`calc(${wo} - 4px)`,x=(e,r,s="transparent")=>`color-mix(in srgb, ${e} ${r}%, ${s})`,Go=`background-image: linear-gradient(${I}, ${I});`,Pt=(e)=>`box-shadow: inset 0 0 0 1px ${e}, var(--oc-sdk-field-lift);`,Mt="border-color: var(--oc-sdk-edge); box-shadow: var(--oc-sdk-raised-lift);",Po="box-shadow: var(--oc-sdk-lit);",Mo=`inset 0 1px 0 0 ${x(H,1.5)}, 0 1px 1px 0 rgb(0 0 0 / 0.28), 0 2px 3px -2px rgb(0 0 0 / 0.2)`,ir=`
:root {
  --oc-sdk-edge: ${x(H,10)};
  --oc-sdk-field-bg: ${De};
  --oc-sdk-raised-bg: ${j};
  --oc-sdk-field-lift: inset 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --oc-sdk-raised-lift: 0 1px 2px 0 rgb(0 0 0 / 0.06);
  --oc-sdk-lit: inset 0 1px 0 0 rgb(255 255 255 / 0.45), 0 1px 2px 0 rgb(0 0 0 / 0.08);
  --oc-sdk-float-edge: rgb(0 0 0 / 0.1);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.8), inset 0 0 0 1px rgb(0 0 0 / 0.04), 0 1px 2px -0.5px rgb(0 0 0 / 0.08), 0 4px 8px -2px rgb(0 0 0 / 0.08), 0 12px 20px -4px rgb(0 0 0 / 0.08);
}
:root[data-oc-theme="dark"] {
  --oc-sdk-edge: ${x(H,6)};
  --oc-sdk-field-bg: ${x(j,50,De)};
  --oc-sdk-raised-bg: ${De};
  --oc-sdk-field-lift: ${Mo};
  --oc-sdk-raised-lift: ${Mo};
  --oc-sdk-lit: inset 0 1px 0 0 ${x(H,1.5)}, 0 1px 1px 0 rgb(0 0 0 / 0.28), 0 2px 3px -2px rgb(0 0 0 / 0.2);
  --oc-sdk-float-edge: rgb(0 0 0 / 0.36);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.06), inset 0 0 0 1px rgb(255 255 255 / 0.08), 0 1px 1px -0.5px rgb(0 0 0 / 0.22), 0 3px 3px -1.5px rgb(0 0 0 / 0.2), 0 6px 6px -3px rgb(0 0 0 / 0.16);
}`,He=(e)=>{let r=T(`status-${e}`,"currentColor");return`
.oc-sdk[data-tone="${e}"], .oc-sdk [data-tone="${e}"] { --oc-sdk-tone: ${r}; --oc-sdk-tone-text: ${T(`${e}-text`,"inherit")}; }`},ar=`
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

.oc-sdk-menu { position: relative; display: inline-flex; }

.oc-sdk-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.oc-sdk-text img { display: block; max-width: 100%; margin: 8px 0; }
`,Io=`${ir}
.oc-sdk { color: ${H}; font-family: ${nr}; }
.oc-sdk :focus-visible, .oc-sdk:focus-visible { outline: none; }
.oc-sdk :where(button, a[href], [role="button"], [role="tab"], [role="option"]):focus-visible, button.oc-sdk:focus-visible { ${Go} }
.oc-sdk-mono { font-family: ${kt}; }
.oc-sdk-muted { color: ${_}; }
${He("success")}${He("warning")}${He("error")}${He("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${W}; --oc-sdk-tone-text: ${Ct}; }

.oc-sdk-btn { border-radius: ${Gt}; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="xs"] { border-radius: ${ko}; }
.oc-sdk-btn[data-variant="default"] { color: ${Ct}; background: ${x(W,10,j)}; border-color: ${x(W,12)}; ${Po} }
.oc-sdk-btn[data-variant="default"]:hover { background: ${x(W,16,j)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${x(W,22,j)}; box-shadow: none; }
.oc-sdk-btn[data-variant="secondary"] { background: ${sr}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${I}, ${I}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${Z}, ${Z}); }
.oc-sdk-btn[data-variant="outline"] { background: var(--oc-sdk-raised-bg); color: ${ue}; ${Mt} }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${I}, ${I}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${Z}, ${Z}); box-shadow: none; }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${I}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${Z}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${T("status-error","red")}; color: ${At}; background: ${x("var(--oc-sdk-tone)",7,j)}; border-color: ${x("var(--oc-sdk-tone)",12)}; ${Po} }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${x("var(--oc-sdk-tone)",9,j)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${x("var(--oc-sdk-tone)",11,j)}; box-shadow: none; }

.oc-sdk-field-note { color: ${_}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${At}; }
.oc-sdk-input { border-radius: ${Gt}; background: var(--oc-sdk-field-bg); color: ${ue}; ${Pt("var(--oc-sdk-edge)")} transition: background 150ms ease-out; }
.oc-sdk-input::placeholder { color: ${_}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${I}, ${I}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { ${Pt(x(H,26))} }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input, .oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { ${Pt(T("status-error","red"))} }
.oc-sdk-input[data-mono="true"] { font-family: ${kt}; }

.oc-sdk-search-icon { color: ${_}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${W}; }
.oc-sdk-search-clear { border-radius: ${ko}; color: ${_}; }
.oc-sdk-search-clear:hover { background: ${I}; color: ${H}; }

.oc-sdk-trigger { border-radius: ${Gt}; background: var(--oc-sdk-raised-bg); color: ${ue}; ${Mt} transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${I}, ${I}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${Z}, ${Z}); }
.oc-sdk-trigger-value[data-empty="true"] { color: ${_}; }
.oc-sdk-trigger-chevron { color: ${_}; }
/* The app's dropdown light: lit top, hairline rings and a layered shadow. Its outer ring is the border, over the page like the app's. */
.oc-sdk-popup { --surface-foreground: ${ue}; border-color: var(--oc-sdk-float-edge); border-radius: 12px; background: ${De}; background-clip: padding-box; color: ${ue}; box-shadow: var(--oc-sdk-float); }
.oc-sdk-option { border-radius: 8px; }
.oc-sdk-option[data-active="true"] { background: ${I}; }
/* A selected option shows a check mark in the text colour, like the app's own pickers. Options without the mark come
   from bundles built before it existed and keep the selection fill as their only sign of the choice. */
.oc-sdk-option[aria-selected="true"]:not([data-mark]) { background: ${Rt}; color: ${Ot}; }
.oc-sdk-option-check { color: ${H}; }
.oc-sdk-option[data-destructive="true"] { color: ${At}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${x(T("status-error","red"),10)}; }
.oc-sdk-option-hint { color: ${_}; }
.oc-sdk-popup-empty { color: ${_}; }

/* Checked stays neutral: the mark carries the state, and the primary colour stays with primary actions. */
.oc-sdk-check-box { border-color: ${z}; border-radius: 4px; color: ${H}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${x(H,60,z)}; }
.oc-sdk-check-thumb { border-radius: 9999px; background: ${z}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { border-radius: 9999px; background: ${j}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${W}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${Go} }
.oc-sdk-check-desc { color: ${_}; }

.oc-sdk-tabs { border-radius: 10px; }
.oc-sdk-tabs[data-track="true"] { background: ${x(H,4)}; box-shadow: inset 0 1px 2px 0 rgb(0 0 0 / 0.16); }
.oc-sdk-tab { border-radius: 8px; color: ${_}; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${H}; }
.oc-sdk-tab[aria-selected="true"] { color: ${Ot}; background: ${Rt}; border-color: ${z}; }
.oc-sdk-tabs[data-track="true"] .oc-sdk-tab[aria-selected="true"] { color: ${ue}; background: var(--oc-sdk-raised-bg); ${Mt} }
.oc-sdk-tab-count { color: ${_}; }

.oc-sdk-badge { border-radius: 9999px; background: ${I}; color: ${_}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${x("var(--oc-sdk-tone)",15)}; }

.oc-sdk-row { border-radius: 6px; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${I}; }
.oc-sdk-row[aria-selected="true"] { background: ${Rt}; color: ${Ot}; }
.oc-sdk-row-lead { font-family: ${kt}; color: ${_}; }
.oc-sdk-row-sub { color: ${_}; }
.oc-sdk-row-meta { color: ${_}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { color: ${_}; }

.oc-sdk-empty-body { color: ${_}; }

.oc-sdk-spinner { color: ${_}; }
.oc-sdk-spinner-ring { border-color: ${z}; border-top-color: ${W}; border-radius: 9999px; }

/* Set apart by its tint alone, like the app's banners. */
.oc-sdk-banner { border-color: transparent; border-radius: 8px; background: ${x("var(--oc-sdk-tone)",10)}; }
.oc-sdk-banner-title { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { color: ${_}; }

.oc-sdk-separator { color: ${_}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { background: ${x(z,40)}; }

.oc-sdk-progress-label { color: ${_}; }
.oc-sdk-progress-track { border-radius: 9999px; background: ${z}; }
.oc-sdk-progress-fill { border-radius: 9999px; background: var(--oc-sdk-tone, ${W}); }

.oc-sdk-text a { color: ${Ct}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { border-radius: 8px; border: 1px solid ${x(z,60)}; }
`,P=`
${Ye}
${ar}
${Io}`;var Uo="oc-sdk-ui-style";var M=(e)=>{let r=document.getElementById(Uo);if(r instanceof HTMLStyleElement){if(r.textContent!==e)r.textContent=e;return}Qe(document);let s=document.createElement("style");s.id=Uo,s.textContent=e,document.head.appendChild(s)},A=(e,r)=>{let s=document.createElement(e);if(r)s.className=r;return s},K=(e)=>{let r=A("button",e);return r.type="button",r},L=(e,r)=>{let s=r??"";if(e.textContent!==s)e.textContent=s};var lr=()=>{let e=document.createElement("span");return e.className="oc-sdk-spinner-ring",e.setAttribute("aria-hidden","true"),e},J=(e,r)=>{M(P);let s=r,i=K("oc-sdk oc-sdk-btn"),l=lr(),m=document.createElement("span");i.append(m),e.append(i);let f=()=>{if(i.dataset.variant=s.variant??"default",i.dataset.size=s.size??"default",i.disabled=Boolean(s.disabled)||Boolean(s.loading),i.dataset.loading=s.loading?"true":"false",i.setAttribute("aria-busy",s.loading?"true":"false"),s.loading&&l.parentNode!==i)i.prepend(l);else if(!s.loading&&l.parentNode===i)l.remove();L(m,s.label)},E=()=>{if(s.disabled||s.loading)return;s.onClick()};return i.addEventListener("click",E),f(),{update:(v)=>{s={...s,...v},f()},dispose:()=>{i.removeEventListener("click",E),i.remove()}}};var It=(e,r)=>{M(P);let s=r,i=A("div","oc-sdk oc-sdk-empty"),l=A("h2","oc-sdk-empty-title"),m=A("p","oc-sdk-empty-body"),f=A("div","oc-sdk-empty-action");i.append(l,m,f),e.append(i);let E=null,v=()=>{if(L(l,s.title),L(m,s.body),m.hidden=!s.body,f.hidden=!s.action,!s.action){E?.dispose(),E=null;return}let G={label:s.action.label,onClick:s.action.onClick};if(E)E.update(G);else E=J(f,{...G,variant:"outline",size:"sm"})};return v(),{update:(G)=>{s={...s,...G},v()},dispose:()=>{E?.dispose(),E=null,i.remove()}}};var Sr=/^(\s*[-*+] )\[( |x|X)\] ?(.*)$/,Lo=(e)=>e.split(`
`).map((r)=>{let s=Sr.exec(r);return s?{kind:"item",prefix:s[1]??"- ",done:s[2]!==" ",text:s[3]??""}:{kind:"text",text:r}}),No=(e)=>e.map((r)=>r.kind==="text"?r.text:`${r.prefix}[${r.done?"x":" "}] ${r.text}`).join(`
`),$e=(e)=>{let r=2166136261;for(let s=0;s<e.length;s+=1)r^=e.charCodeAt(s),r=Math.imul(r,16777619);return`${e.length}:${(r>>>0).toString(16)}`},Ho=(e,r)=>{let s=-1,i="- ";e.forEach((E,v)=>{if(E.kind!=="item")return;s=v,i=E.prefix});let l={kind:"item",prefix:i,done:!1,text:r};if(s>=0)return[...e.slice(0,s+1),l,...e.slice(s+1)];return[...e.at(-1)?.kind==="text"&&e.at(-1)?.text===""?e.slice(0,-1):[...e],l,{kind:"text",text:""}]};var te=xt(),ee=document.querySelector("#root");if(!ee)throw Error("Missing root");var Do=document.createElement("style");Do.textContent=`
  html, body { margin: 0; height: 100%; background: var(--oc-bg); color: var(--oc-fg); font-family: var(--oc-font); font-size: 13px; }
  #root { box-sizing: border-box; height: 100%; overflow: auto; padding: 16px 20px; }
  .note { margin: 2px 0; color: var(--oc-muted); white-space: pre-wrap; min-height: 1em; }
  .item { display: flex; align-items: center; gap: 8px; margin: 2px 0; }
  .item input[type="checkbox"] { width: 16px; height: 16px; margin: 0; accent-color: var(--oc-primary); }
  .item input[type="text"] { flex: 1; min-width: 0; border: 1px solid transparent; border-radius: var(--oc-radius); padding: 4px 6px;
    background: transparent; color: inherit; font: inherit; }
  .item input[type="text"]:hover { border-color: var(--oc-border); }
  .item input[type="text"]:focus { outline: none; border-color: var(--oc-focus); background: var(--oc-elevated); }
  .item.done input[type="text"] { color: var(--oc-muted); text-decoration: line-through; }
  .item .remove { visibility: hidden; }
  .item:hover .remove, .item:focus-within .remove { visibility: visible; }
  .actions { margin-top: 12px; }
`;document.head.append(Do);te.onReady((e)=>vt(e,document.documentElement));var Y=[],pe=!1,Lt=Ce(null),Nt=()=>No(Y),qe=()=>{te.reportFileChange(Lt.observe($e(Nt())))},Ut=()=>{if(ee.replaceChildren(),!Y.some((r)=>r.kind==="item")&&pe){It(ee,{title:"No items",body:"This checklist is empty."});return}if(Y.forEach((r,s)=>{if(r.kind==="text"){let f=document.createElement("p");f.className="note",f.textContent=r.text,ee.append(f);return}let i=document.createElement("div");i.className=r.done?"item done":"item";let l=document.createElement("input");l.type="checkbox",l.checked=r.done,l.disabled=pe,l.addEventListener("change",()=>{r.done=l.checked,i.className=r.done?"item done":"item",qe()});let m=document.createElement("input");if(m.type="text",m.value=r.text,m.readOnly=pe,m.setAttribute("aria-label","Item"),m.addEventListener("input",()=>{r.text=m.value,qe()}),i.append(l,m),!pe){let f=document.createElement("span");f.className="remove",J(f,{label:"Remove",variant:"ghost",size:"xs",onClick:()=>{Y=Y.filter((E,v)=>v!==s),qe(),Ut()}}),i.append(f)}ee.append(i)}),pe)return;let e=document.createElement("div");e.className="actions",J(e,{label:"Add item",variant:"secondary",size:"sm",onClick:()=>{Y=Ho(Y,""),qe(),Ut();let r=ee.querySelectorAll('.item input[type="text"]');r.item(r.length-1)?.focus()}}),ee.append(e)};te.onFileOpen((e)=>{if(e.encoding!=="text"){te.reportFileUnsupported();return}Y=Lo(e.content),pe=e.readOnly,Lt=Ce($e(Nt())),Ut()});te.onFileSnapshot(()=>{let e=Nt();return{content:e,version:$e(e)}});te.onFileSaved((e)=>{te.reportFileChange({dirty:Lt.markSaved(e),edited:!1})});})();
