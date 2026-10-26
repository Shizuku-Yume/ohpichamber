(()=>{var g="openchamber.sdk",E=2;var Se="openchamber:guest-bootstrap",Io=(e,r,s)=>{let{window:c,MessageChannel:d}=globalThis;if(!c||!d)return;try{let S=new d,_=S.port1,m=!1,h=!1,G=null,L=(k)=>{try{k.close()}catch{}},Q=(k=[])=>{for(let U of k)L(U);if(!m)m=!0,L(_)},J=(k)=>{let U=new CustomEvent(s,{detail:k,cancelable:!0});if(!c.dispatchEvent(U))return;L(k),m=!0};c.addEventListener(s,(k)=>{if(!("detail"in k)||k.detail!==null)return;if(h=!0,G){let U=G;G=null,J(U)}}),_.addEventListener("message",(k)=>{if(m)return;let U=k.data,V=k.ports??[];if(!U||U.channel!==e||U.v!==r||U.type!=="connect-port"||V.length!==1){Q(V);return}let X=V[0];if(m=!0,L(_),X.start(),!h){G=X;return}J(X)}),_.start(),c.parent.postMessage({channel:e,v:r,type:"bootstrap"},"*",[S.port2])}catch{}},wo=`(${Io.toString()})(${JSON.stringify("openchamber.guest-bootstrap")}, 2, ${JSON.stringify("openchamber:guest-bootstrap")});`;var $e=`
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
`;function qe(e){let r=e.documentElement;if(r.hasAttribute("data-oc-scrollbar-activity"))return;r.setAttribute("data-oc-scrollbar-activity","");let s=new WeakMap;e.addEventListener("scroll",(c)=>{let d=c.target===e?r:c.target;if(!(d instanceof Element))return;if(!d.hasAttribute("data-oc-scrolling"))d.setAttribute("data-oc-scrolling","");let S=s.get(d);if(S!==void 0)clearTimeout(S);s.set(d,setTimeout(()=>{s.delete(d),d.removeAttribute("data-oc-scrolling")},1000))},{capture:!0,passive:!0})}var Uo=`(${qe.toString()})(document);`;var We=128,je=65536;var he=128;var ye=65536;var Xt=/^[a-z][a-z0-9-]{0,39}$/;var Bt=(e)=>Object(e)===e&&!Array.isArray(e),ze=(e,r)=>Object.keys(e).every((s)=>r.includes(s)),Ft=(e)=>String(e)===e&&e.length>=1&&e.length<=60,Vt=(e)=>String(e)===e&&e.length>=1&&e.length<=80,$t=(e)=>{if(!Array.isArray(e)||e.length>4)return!1;let r=new Set;for(let s of e){if(!Bt(s)||!Xt.test(s.id)||!Ft(s.label))return!1;if(s.disabled!==void 0&&s.disabled!==!0&&s.disabled!==!1)return!1;if(r.has(s.id))return!1;if(r.add(s.id),s.kind==="button"){if(!ze(s,["kind","id","label","disabled"]))return!1;continue}if(s.kind!=="select"||!ze(s,["kind","id","label","value","options","disabled"]))return!1;if(!Vt(s.value)||!Array.isArray(s.options)||s.options.length<1||s.options.length>16)return!1;let c=new Set;for(let d of s.options){if(!Bt(d)||!ze(d,["value","label"])||!Vt(d.value)||!Ft(d.label)||c.has(d.value))return!1;c.add(d.value)}if(!c.has(s.value))return!1}return!0};var be=20000000,xe=256;var Ke=(e)=>("bytes"in e)?e.bytes.byteLength:e.content.length,qt=(e,r)=>{if(e.path!==r.path||e.readOnly!==r.readOnly)return!1;if(e.encoding==="text"||r.encoding==="text")return e.encoding==="text"&&r.encoding==="text"&&e.content===r.content;if(e.bytes.byteLength!==r.bytes.byteLength)return!1;for(let s=0;s<e.bytes.byteLength;s+=1)if(e.bytes[s]!==r.bytes[s])return!1;return!0};var Wt=/^[A-Za-z0-9_-]{1,80}$/;var jt=["left","right","top","bottom"];var zt=(e,r=0,s={remaining:16000})=>{if(--s.remaining<0||r>=32)return!1;if(e===null)return!0;let c=Array.isArray(e)?e:Object(e)===e?Object.values(e):[];for(let d of c)if(!zt(d,r+1,s))return!1;return!0},Je=(e)=>{if(e===null||e===!0||e===!1)return!0;if(Array.isArray(e))return Object.keys(e).every((r)=>/^(0|[1-9]\d*)$/.test(r)&&Number(r)<e.length)&&e.every(Je);if(Object(e)===e){let r=Object.getPrototypeOf(e);return(r===null||r===Object.prototype)&&Object.values(e).every(Je)}return String(e)===e||Number.isFinite(e)},Ye=(e)=>{try{if(String(e.id)!==e.id||!Wt.test(e.id)||!Number.isFinite(e.anchor.x)||Math.abs(e.anchor.x)>1e5||!Number.isFinite(e.anchor.y)||Math.abs(e.anchor.y)>1e5||!Number.isFinite(e.anchor.width)||!Number.isFinite(e.anchor.height)||e.anchor.width<=0||e.anchor.height<=0||e.anchor.width>1e5||e.anchor.height>1e5||!Number.isInteger(e.width)||e.width<160||e.width>640||!Number.isInteger(e.height)||e.height<48||e.height>480||e.side!==void 0&&!jt.includes(e.side)||e.focus!==void 0&&e.focus!==!0&&e.focus!==!1||!zt(e.data)||!Je(e.data))return!1;return JSON.stringify(e.data).length<=16000}catch{return!1}};var Jt=["file","directory","other","missing"],Ze=(e)=>Boolean(e&&"sessionId"in e),et=(e)=>Boolean(e&&"sent"in e&&!("sessionId"in e));var Yt=/^[0-9a-f]{7,64}$/i,tt=(e)=>Yt.test(e),Re=500,ve=32000,Qt=16000,Zt=128,eo=200,to=2000,oo=16000,ro=80,so=200,no=16000;var io=2000;var ot=20000,Oe=1024,Ce=2000000;var Ae=64000,ke=8000,rt=4000;var st=90000;var ao=999,lo=1e4,ge=500,co=["HOST_UNAVAILABLE","HOST_TIMEOUT","HOST_REJECTED","DISCONNECTED","DISABLED","BAD_PATH","NO_INTEGRATION","NO_SERVICE","SERVICE_FAILED","REQUEST_FAILED","RESPONSE_TOO_LARGE","NO_SESSION","SESSION_BUSY","NOT_GRANTED","NO_DIRECTORY","NOT_FOUND","FILE_TOO_LARGE","DENIED","NO_MODEL","MODEL_FAILED","UNSUPPORTED"],uo=["stopped","starting","ready","failed"],No=new Set(co),po=(e)=>No.has(e),So=(e)=>e&&po(e)?e:"HOST_REJECTED",re=(e)=>{if(e===void 0)return!1;if(e===null||e===!0||e===!1)return!0;if(String(e)===e)return!0;if(Number(e)===e)return Number.isFinite(e);if(Array.isArray(e))return e.every(re);if(Object(e)===e)return Object.values(e).every(re);return!1},go=(e)=>re(e)&&JSON.stringify(e).length<=no,Kt=(e)=>e?.trim().slice(0,so)??"",se=(e)=>{let r=e.id.trim().slice(0,Zt),s=e.title.trim().slice(0,eo),c=e.url.trim().slice(0,to),d=e.text?.trim().slice(0,oo),S=e.author?.trim().slice(0,ro),_=e.kind==="pull"?"pull":"issue",m={providerId:e.providerId.trim(),id:r,title:s||r,url:c,kind:_};if(d)m.text=d;if(S)m.author=S;if(_==="pull"){let h=Kt(e.branches?.head),G=Kt(e.branches?.base);if(h&&G)m.branches={head:h,base:G}}if(go(e.data))m.data=e.data;return m},nt=(e)=>{let r=se(e);if(e.projectId)r.projectId=e.projectId;if(e.navigation)r.navigation=e.navigation;if(e.worktree)r.worktree=e.worktree;return r},it=(e)=>{let r={text:e.text.trim().slice(0,Qt)};if(e.send)r.send=!0;return r},at=(e)=>{if(e===null||!Number.isFinite(e))return null;return Math.min(ao,Math.max(0,Math.round(e)))},lt=(e)=>{if(!Number.isFinite(e))return 0;return Math.min(lo,Math.max(0,Math.ceil(e)))};var ne=(e)=>e.length>0&&e.length<=Oe&&!e.includes("\x00")&&!e.includes("\\");var Ge=(e)=>{if(!e.startsWith("/")||e.includes("\x00")||e.includes("\\")||e.includes("://"))return!1;if(e.length>io)return!1;return!e.split("/").some((s)=>s==="."||s==="..")},Ho=new Set(uo),ct=(e)=>Boolean(e&&"status"in e&&Ho.has(String(e.status))&&!("body"in e)),Pe=(e)=>Boolean(e&&"status"in e&&"body"in e&&Number.isInteger(e.status)),ut=(e)=>Boolean(e&&"content"in e&&String(e.content)===e.content),pt=(e)=>Boolean(e&&"written"in e&&e.written===!0),dt=(e)=>Boolean(e&&"entries"in e&&Array.isArray(e.entries)),Do=new Set(Jt),St=(e)=>Boolean(e&&"kind"in e&&"size"in e&&Do.has(String(e.kind))&&Number.isFinite(e.size)),gt=(e)=>Boolean(e&&"text"in e&&String(e.text)===e.text&&!("status"in e)),Bo=new Set(["workspace","shells","ready","directory","session","connection","settings","session-lifecycle","item","resolve","action","status-control-event","popover-closed","file-open","file-snapshot","file-saved","generate-late"]),Fo=(e)=>Object(e)===e?e:null,Qe=(e)=>String(e)===e&&e.length>0,Vo=(e)=>{if(!Qe(e.id))return null;if(e.ok===!0){let r={channel:g,v:E,type:"result",id:e.id,ok:!0};if(Object(e.payload)===e.payload)r.payload=e.payload;return r}if(e.ok===!1&&Qe(e.error))return{channel:g,v:E,type:"result",id:e.id,ok:!1,error:e.error,code:So(Qe(e.code)?e.code:void 0)};return null},Et=(e)=>{let r=Fo(e);if(!r||r.channel!==g||r.v!==E)return null;if(r.type==="result")return Vo(r);if(!Bo.has(String(r.type))||Object(r.payload)!==r.payload)return null;return r};var Eo=(e)=>("key"in e)&&("metaKey"in e)&&("ctrlKey"in e),Xo=(e)=>(e.metaKey||e.ctrlKey)&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==="s";class a extends Error{code;constructor(e,r){super(r);this.name="HostRequestError",this.code=e}}var mo=()=>Promise.reject(new a("BAD_PATH",'Request path must start with "/" and stay on the declared origin.')),Me=()=>Promise.reject(new a("BAD_PATH",`File path must be 1 to ${Oe} characters without NUL or backslash.`)),Ie=(e)=>{if(e===void 0)return;if(Object(e)!==e||Array.isArray(e)||e.scope!==void 0&&e.scope!=="instance"&&e.scope!=="device")throw new a("HOST_REJECTED",'Storage scope must be "instance" or "device".');return e.scope==="device"?"device":void 0},p=(e)=>(e.value+=1,`oc-${e.value}`),mt=(e={})=>{let r=e.target??("window"in globalThis?window:null);if(!r)throw new a("HOST_UNAVAILABLE","No window. connectHost runs in a browser frame.");let s=e.requestTimeoutMs??ot,c=e.acceptSource??((t)=>t===r.parent),d=new Set,S=new Set,_=new Set,m=new Set,h=new Set,G=new Set,L=new Set,Q=new Set,J=new Set,k=new Set,U=[],V=null,X=null,Ee=new Set,me=new Set,ce=null,ue=null,De=!1,Z=new Map,ee=new Map,te=new Map,B=!1,u={value:0},l=null,q=null,pe=!1,de=!1,kt=null,Gt=(t)=>{if(!t)return null;return{sessionId:t.id,phase:t.busy?"started":"completed"}},oe=null,Be=[],H=(t)=>{if(B)return;if(oe){oe.postMessage(t);return}Be.push(t)},Pt=()=>{if(B||Object.is(r.parent,r)||k.size===0||l?.features?.lateGenerateResults!==!0)return;H({channel:g,v:E,type:"generate-late-listen"})},x=(t,o)=>{for(let n of t)try{n(o)}catch(i){console.error(i)}},ko=(t)=>{if(!("data"in t))return;let o=Et(t.data);if(!o)return;if(o.type==="workspace"){let i=ee.get(o.payload.subscriptionId);if(i)x([i],o.payload.snapshot);return}if(o.type==="shells"){let i=te.get(o.payload.subscriptionId);if(i)x([i],o.payload.snapshot);return}if(o.type==="ready"){if(l=o.payload,q=Gt(o.payload.session),x(d,o.payload),x(S,o.payload.directory),x(_,o.payload.session),q)x(m,q);x(h,o.payload.connection),x(G,o.payload.settings),x(L,o.payload.item),Pt();return}if(o.type==="generate-late"){if(k.size===0)U.push(o.payload);else x(k,o.payload);return}if(o.type==="directory"){if(l)l={...l,directory:o.payload.directory};x(S,o.payload.directory);return}if(o.type==="session"){if(l)l={...l,session:o.payload.session};if(!o.payload.session)q=null;else if(q?.sessionId!==o.payload.session.id)q=Gt(o.payload.session);x(_,o.payload.session);return}if(o.type==="session-lifecycle"){q=o.payload,x(m,o.payload);return}if(o.type==="connection"){if(l)l={...l,connection:o.payload.connection};x(h,o.payload.connection);return}if(o.type==="settings"){if(l)l={...l,settings:o.payload.settings};x(G,o.payload.settings);return}if(o.type==="item"){if(l)l={...l,item:o.payload.item};x(L,o.payload.item);return}if(o.type==="status-control-event"){x(Q,o.payload);return}if(o.type==="popover-closed"){x(J,o.payload);return}if(o.type==="action"){let i=(f)=>{if(!B)H({channel:g,v:E,type:"action-result",id:o.id,payload:f})},T=X;if(!T){i({ok:!1,error:"This extension does not handle background actions."});return}Promise.resolve().then(()=>T(o.payload)).then(()=>i({ok:!0}),(f)=>{let A=(f instanceof Error?f.message:String(f)).trim();i({ok:!1,error:(A||"Action failed.").slice(0,ge)})});return}if(o.type==="file-open"){let i=o.payload;if(ue&&qt(ue,i))return;ue=i,x(Ee,o.payload);return}if(o.type==="file-saved"){x(me,o.payload.version);return}if(o.type==="file-snapshot"){let i=(A)=>{if(!B)H({channel:g,v:E,type:"file-snapshot-result",id:o.id,payload:A})},T=(A)=>i({error:(A.trim()||"Could not read the edited file.").slice(0,ge)}),f=ce;if(!f){T("This extension does not edit files.");return}Promise.resolve().then(()=>f(o.payload.purpose)).then((A)=>{if(Ke(A)>be){T(`The file is over ${be} ${"bytes"in A?"bytes":"characters"}.`);return}if(A.version.length>xe){T(`The snapshot version is over ${xe} characters.`);return}i({snapshot:"bytes"in A?{bytes:A.bytes,version:A.version}:{content:A.content,version:A.version}})},(A)=>T(A instanceof Error?A.message:String(A)));return}if(o.type==="resolve"){let i=(f)=>{H({channel:g,v:E,type:"resolve-result",id:o.id,payload:f})},T=V;if(!T){i({error:"This extension does not resolve commands."});return}Promise.resolve().then(()=>T(o.payload)).then((f)=>i({item:f?se(f):null}),(f)=>{let A=(f instanceof Error?f.message:String(f)).trim();i({error:(A||"Command failed.").slice(0,ge)})});return}let n=Z.get(o.id);if(!n)return;if(clearTimeout(n.timer),Z.delete(o.id),o.ok){n.resolve(o.payload);return}n.reject(new a(o.code,o.error))},Go=(t)=>{if(!("source"in t))return!0;return c(t.source)},Mt=(t)=>{if(!Go(t)||!("detail"in t))return;let o=t.detail;if(!(o instanceof MessagePort))return;t.preventDefault(),t.stopImmediatePropagation(),oe?.close(),oe=o,o.addEventListener("message",ko),o.start(),o.postMessage({channel:g,v:E,type:"hello"});for(let n of Be.splice(0))o.postMessage(n)};r.addEventListener(Se,Mt),r.dispatchEvent?.(new CustomEvent(Se,{detail:null}));let I=(t,o=s)=>{if(B||Object.is(r.parent,r))return Promise.reject(new a("HOST_UNAVAILABLE","No host frame. This page is not in an iframe."));return new Promise((n,i)=>{let T=setTimeout(()=>{Z.delete(t.id),i(new a("HOST_TIMEOUT","Host did not answer in time."))},o);Z.set(t.id,{resolve:n,reject:i,timer:T}),H(t)})},O=(t)=>I(t).then(()=>{return}),C={channel:g,v:E},Fe=(t)=>{if(!B&&!Object.is(r.parent,r))H(t)},It=()=>Fe({...C,type:"file-save"}),wt=(t)=>{if(!Eo(t)||!Xo(t))return;t.preventDefault(),It()},Ut=(t)=>{if(!Eo(t)||t.key!=="Escape"||l?.surface!=="popover"||!l.popover)return;t.preventDefault(),Ht(l.popover.id,"escape").catch(()=>{return})},fe=()=>{let t=l?.surface==="popover"?l.popover:void 0;if(!t)return;let o=pe||de;if(kt===o)return;kt=o,Dt(t.id,o).catch(()=>{return})},_e=()=>{if(l?.surface!=="popover"||pe)return;pe=!0,fe()},Lt=(t)=>{if(l?.surface!=="popover"||t.relatedTarget!==null||!pe)return;pe=!1,fe()},Nt=()=>{if(l?.surface!=="popover"||de)return;de=!0,fe()},Po=()=>{if(l?.surface!=="popover"||!de)return;de=!1,fe()},F=(t,o=1024)=>{if(!t.trim()||t.length>o)throw new a("HOST_REJECTED",`Identity must contain 1 to ${o} characters.`)},Ve=async(t)=>{if(t.kind!=="projects")F(t.projectId);let o=await I({...C,type:"workspace-read",id:p(u),payload:t});if(!o||!("kind"in o)||!("state"in o)||o.kind!==t.kind)throw new a("HOST_REJECTED","Host did not return workspace data.");return o},Xe=async(t,o)=>{if(t.kind!=="projects")F(t.projectId);let n=p(u);ee.set(n,o);try{await O({...C,type:"workspace-subscribe",id:p(u),payload:{subscriptionId:n,query:t}})}catch(i){if(ee.delete(n),!B)H({...C,type:"workspace-unsubscribe",id:p(u),payload:{subscriptionId:n}});throw i}return()=>{if(!ee.delete(n)||B)return;H({...C,type:"workspace-unsubscribe",id:p(u),payload:{subscriptionId:n}})}},Mo=async(t,o)=>{if(t.kind==="session")F(t.sessionId);if(t.kind==="project")F(t.projectId);let n=p(u);te.set(n,o);try{await O({...C,type:"shells-subscribe",id:p(u),payload:{subscriptionId:n,scope:t}})}catch(i){if(te.delete(n),!B)H({...C,type:"shells-unsubscribe",id:p(u),payload:{subscriptionId:n}});throw i}return()=>{if(!te.delete(n)||B)return;H({...C,type:"shells-unsubscribe",id:p(u),payload:{subscriptionId:n}})}},Te=async(t)=>{if("key"in t&&(t.key.length===0||t.key.length>We))throw new a("HOST_REJECTED","Storage key must contain 1 to 128 characters.");if(t.op==="set"&&!re(t.value))throw new a("HOST_REJECTED","Storage values must be JSON.");if(t.op==="set"&&new TextEncoder().encode(JSON.stringify(t.value)).length>je)throw new a("HOST_REJECTED","Storage value exceeds 64 KiB.");if(t.scope==="device"&&l?.features?.deviceStorage!==!0)throw new a("UNSUPPORTED","This host does not support device storage.");let o=await I({...C,type:"storage",id:p(u),payload:t});if(!o||!("storage"in o)||o.op!==t.op)throw new a("HOST_REJECTED","Host did not return storage data.");return o},Ht=(t,o)=>l?.features?.popovers!==!0&&!(l?.surface==="popover"&&l.popover?.id===t)?Promise.reject(new a("UNSUPPORTED","This host does not support popovers.")):O({...C,type:"popover-close",id:p(u),payload:o?{id:t,reason:o}:{id:t}}),Dt=(t,o)=>l?.features?.popovers!==!0&&!(l?.surface==="popover"&&l.popover?.id===t)?Promise.reject(new a("UNSUPPORTED","This host does not support popovers.")):O({...C,type:"popover-anchor",id:p(u),payload:{id:t,active:o}});return r.addEventListener("keydown",Ut,!0),r.addEventListener("pointerover",_e),r.addEventListener("pointermove",_e),r.addEventListener("pointerout",Lt),r.addEventListener("focus",Nt),r.addEventListener("blur",Po),{onAction:(t)=>(X=t,()=>{if(X===t)X=null}),listProjects:async()=>{let t=await Ve({kind:"projects"});if(t.kind!=="projects")throw new a("HOST_REJECTED","Expected projects.");return t},listWorktrees:async(t)=>{let o=await Ve({kind:"worktrees",projectId:t});if(o.kind!=="worktrees")throw new a("HOST_REJECTED","Expected worktrees.");return o},listSessions:async(t)=>{let o=await Ve({kind:"sessions",projectId:t});if(o.kind!=="sessions")throw new a("HOST_REJECTED","Expected sessions.");return o},onProjects:(t)=>Xe({kind:"projects"},(o)=>{if(o.kind==="projects")t(o)}),onWorktrees:(t,o)=>Xe({kind:"worktrees",projectId:t},(n)=>{if(n.kind==="worktrees")o(n)}),onSessions:(t,o)=>Xe({kind:"sessions",projectId:t},(n)=>{if(n.kind==="sessions")o(n)}),onRunningShells:(t,o)=>Mo(t,o),readShellOutput:async(t,o)=>{F(t,he);let n=o?.cursor;if(n!==void 0&&(!Number.isInteger(n)||n<0))throw new a("HOST_REJECTED","Shell output cursor must be a non-negative integer.");let i=o?.tailBytes;if(i!==void 0&&(!Number.isInteger(i)||i<1||i>ye))throw new a("HOST_REJECTED",`Shell output tailBytes must be an integer between 1 and ${ye}.`);let f=await I({...C,type:"shell-output",id:p(u),payload:{shellId:t,cursor:n,tailBytes:i}});if(!f||typeof f.output!=="string"||!Number.isFinite(f.cursor))throw new a("HOST_REJECTED","Host did not return shell output.");return f},stopShell:async(t)=>{if(F(t,he),(await I({...C,type:"shell-stop",id:p(u),payload:{shellId:t}}))?.stopped!==!0)throw new a("HOST_REJECTED","Host did not stop the shell.");return{stopped:!0}},openSession:async(t)=>{F(t),await O({...C,type:"open-session",id:p(u),payload:{sessionId:t}})},storage:{get:async(t,o)=>{let n=Ie(o),i={op:"get",key:t};if(n)i.scope=n;let T=await Te(i);return T.op==="get"&&T.found?T.value:void 0},set:async(t,o,n)=>{let i=Ie(n),T={op:"set",key:t,value:o};if(i)T.scope=i;await Te(T)},delete:async(t,o)=>{let n=Ie(o),i={op:"delete",key:t};if(n)i.scope=n;await Te(i)},keys:async(t)=>{let o=Ie(t),n={op:"keys"};if(o)n.scope=o;let i=await Te(n);if(i.op!=="keys")throw new a("HOST_REJECTED","Expected storage keys.");return i.keys}},onReady:(t)=>{if(d.add(t),l)t(l);return()=>{d.delete(t)}},onDirectory:(t)=>{if(S.add(t),l)t(l.directory);return()=>{S.delete(t)}},onSession:(t)=>{if(_.add(t),l)t(l.session);return()=>{_.delete(t)}},onSessionLifecycle:(t)=>{if(m.add(t),q)t(q);return()=>{m.delete(t)}},onConnection:(t)=>{if(h.add(t),l)t(l.connection);return()=>{h.delete(t)}},onSettings:(t)=>{if(G.add(t),l)t(l.settings);return()=>{G.delete(t)}},onItem:(t)=>{if(L.add(t),l)t(l.item);return()=>{L.delete(t)}},onStatusControl:(t)=>(Q.add(t),()=>{Q.delete(t)}),onPopoverClosed:(t)=>(J.add(t),()=>{J.delete(t)}),onLateGenerateResult:(t)=>{k.add(t);for(let o of U.splice(0))x([t],o);return Pt(),()=>{k.delete(t)}},setStatusControls:(t)=>{if(l?.features?.statusControls!==!0)return Promise.reject(new a("UNSUPPORTED","This host does not support status controls."));if(!$t(t))return Promise.reject(new a("HOST_REJECTED","Status controls must have unique bounded ids and valid selected options."));return O({...C,type:"status-controls",id:p(u),payload:{controls:t}})},openPopover:(t)=>{if(l?.features?.popovers!==!0)return Promise.reject(new a("UNSUPPORTED","This host does not support popovers."));if(!Ye(t))return Promise.reject(new a("HOST_REJECTED","Popover requests need bounded geometry and JSON data."));return O({...C,type:"popover-open",id:p(u),payload:t})},closePopover:Ht,setPopoverAnchorActive:Dt,onResolve:(t)=>(V=t,()=>{if(V===t)V=null}),toast:(t)=>{let o=t.message.trim();if(!o||o.length>Re)return Promise.reject(new a("HOST_REJECTED",`Toast message must contain 1 to ${Re} characters.`));if(t.copy&&t.copy!==!0&&(!t.copy.text.length||t.copy.text.length>ve))return Promise.reject(new a("HOST_REJECTED",`Toast copy text must contain 1 to ${ve} characters.`));return O({channel:g,v:E,type:"toast",id:p(u),payload:{...t,message:o}})},openUrl:(t)=>O({channel:g,v:E,type:"open-url",id:p(u),payload:{url:t}}),openCommit:(t)=>tt(t)?O({channel:g,v:E,type:"open-commit",id:p(u),payload:{sha:t}}):Promise.reject(new a("HOST_REJECTED","Commit id must be 7 to 64 hex characters.")),openSurface:(t)=>O({channel:g,v:E,type:"open-surface",id:p(u),payload:{surfaceId:t}}),writeClipboard:(t)=>O({channel:g,v:E,type:"clipboard-write",id:p(u),payload:{text:t}}),compose:(t)=>O({channel:g,v:E,type:"compose",id:p(u),payload:t}),attach:(t)=>O({channel:g,v:E,type:"attach",id:p(u),payload:se(t)}),startSession:async(t)=>{if(t.projectId!==void 0)F(t.projectId);let o=t.worktree;if(o&&o!==!0)if(o.kind==="existing")F(o.directory);else{if(o.name!==void 0)F(o.name,200);if(o.baseBranch!==void 0)F(o.baseBranch,200)}let n=await I({channel:g,v:E,type:"start-session",id:p(u),payload:nt(t)},e.requestTimeoutMs??180000);if(!Ze(n))throw new a("HOST_REJECTED","Host did not return a session.");return n},prompt:(t)=>I({channel:g,v:E,type:"prompt",id:p(u),payload:it(t)}).then((o)=>{if(!et(o))throw new a("HOST_REJECTED","Host did not return a prompt result.");return o}),sessionLink:(t)=>O({channel:g,v:E,type:"session-link",id:p(u),payload:se(t)}),close:()=>O({channel:g,v:E,type:"close",id:p(u)}),oauthStart:()=>O({channel:g,v:E,type:"oauth-start",id:p(u)}),oauthDisconnect:()=>O({channel:g,v:E,type:"oauth-disconnect",id:p(u)}),request:(t)=>(Ge(t.path)?I({channel:g,v:E,type:"request",id:p(u),payload:t}):mo()).then((o)=>{if(!Pe(o))throw new a("HOST_REJECTED","Host request result was empty.");return o}),serviceRequest:(t)=>(Ge(t.path)?I({channel:g,v:E,type:"service-request",id:p(u),payload:t}):mo()).then((o)=>{if(!Pe(o))throw new a("HOST_REJECTED","Host service request result was empty.");return o}),serviceStatus:()=>I({channel:g,v:E,type:"service-status",id:p(u)}).then((t)=>{if(!ct(t))throw new a("HOST_REJECTED","Host did not return service status.");return t}),readFile:(t)=>(ne(t)?I({channel:g,v:E,type:"file-read",id:p(u),payload:{path:t}}):Me()).then((o)=>{if(!ut(o))throw new a("HOST_REJECTED","Host did not return file content.");return o}),writeFile:(t,o)=>{if(!ne(t))return Me();if(o.length>Ce)return Promise.reject(new a("FILE_TOO_LARGE",`Content is over ${Ce} characters.`));return I({channel:g,v:E,type:"file-write",id:p(u),payload:{path:t,content:o}}).then((n)=>{if(!pt(n))throw new a("HOST_REJECTED","Host did not confirm the write.");return n})},listDir:(t)=>(ne(t)?I({channel:g,v:E,type:"file-list",id:p(u),payload:{path:t}}):Me()).then((o)=>{if(!dt(o))throw new a("HOST_REJECTED","Host did not return directory entries.");return o}),stat:(t)=>(ne(t)?I({channel:g,v:E,type:"file-stat",id:p(u),payload:{path:t}}):Me()).then((o)=>{if(!St(o))throw new a("HOST_REJECTED","Host did not return file status.");return o}),generate:(t)=>{let o=t.prompt.trim(),n=t.system?.trim();if(o.length===0||o.length>Ae)return Promise.reject(new a("HOST_REJECTED",`Prompt must be 1 to ${Ae} characters.`));if(n!==void 0&&(n.length===0||n.length>ke))return Promise.reject(new a("HOST_REJECTED",`System prompt must be 1 to ${ke} characters.`));let i=t.maxOutputTokens===void 0?void 0:Math.min(rt,Math.max(1,Math.floor(t.maxOutputTokens)));if(i!==void 0&&!Number.isFinite(i))return Promise.reject(new a("HOST_REJECTED","maxOutputTokens must be a number."));let T={prompt:o};if(n!==void 0)T.system=n;if(i!==void 0)T.maxOutputTokens=i;return I({channel:g,v:E,type:"generate",id:p(u),payload:T},e.requestTimeoutMs??st).then((f)=>{if(!gt(f))throw new a("HOST_REJECTED","Host did not return generated text.");return f})},setBadge:(t)=>O({channel:g,v:E,type:"badge",id:p(u),payload:{count:at(t)}}),setHeight:(t)=>O({channel:g,v:E,type:"resize",id:p(u),payload:{height:lt(t)}}),onFileOpen:(t)=>{if(Ee.add(t),!De)De=!0,r.addEventListener("keydown",wt,!0);if(ue)t(ue);return()=>{Ee.delete(t)}},onFileSnapshot:(t)=>(ce=t,()=>{if(ce===t)ce=null}),onFileSaved:(t)=>(me.add(t),()=>{me.delete(t)}),reportFileChange:(t)=>Fe({...C,type:"file-change",payload:{dirty:t.dirty,edited:t.edited}}),requestFileSave:It,reportFileUnsupported:()=>Fe({...C,type:"file-unsupported"}),dispose:()=>{for(let t of ee.keys())H({...C,type:"workspace-unsubscribe",id:p(u),payload:{subscriptionId:t}});ee.clear();for(let t of te.keys())H({...C,type:"shells-unsubscribe",id:p(u),payload:{subscriptionId:t}});if(te.clear(),B=!0,V=null,X=null,ce=null,Ee.clear(),me.clear(),De)r.removeEventListener("keydown",wt,!0);r.removeEventListener(Se,Mt),r.removeEventListener("keydown",Ut,!0),r.removeEventListener("pointerover",_e),r.removeEventListener("pointermove",_e),r.removeEventListener("pointerout",Lt),r.removeEventListener("focus",Nt),oe?.close(),oe=null,Be.length=0;for(let t of Z.values())clearTimeout(t.timer),t.reject(new a("HOST_UNAVAILABLE","Host client was disposed."));Z.clear(),d.clear(),S.clear(),_.clear(),m.clear(),h.clear(),G.clear(),L.clear(),Q.clear(),J.clear(),k.clear(),U.length=0}}};var fo=["browser.open","browser.snapshot","browser.click","browser.type","browser.select","browser.scroll","browser.back","browser.forward","browser.inspect","browser.capture","browser.resize","browser.close"];var Or=new Set(fo);var _o=["none","agent","user"];var Ar=new Set(_o);var $o=[["--oc-bg","background"],["--oc-elevated","elevated"],["--oc-fg","foreground"],["--oc-muted","muted"],["--oc-subtle","subtle"],["--oc-border","border"],["--oc-hover","hover"],["--oc-selection","selection"],["--oc-focus","focus"],["--oc-primary","primary"],["--oc-muted-surface","mutedSurface"],["--oc-elevated-fg","elevatedForeground"],["--oc-active","active"],["--oc-selection-fg","selectionForeground"],["--oc-primary-fg","primaryForeground"],["--oc-primary-text","primaryText"],["--oc-success-text","successText"],["--oc-warning-text","warningText"],["--oc-error-text","errorText"],["--oc-info-text","infoText"],["--oc-success","success"],["--oc-warning","warning"],["--oc-error","error"],["--oc-info","info"],["--oc-font","font"],["--oc-mono","mono"],["--oc-radius","radius"],["--surface-background","background"],["--surface-elevated","elevated"],["--surface-foreground","foreground"],["--surface-muted-foreground","muted"],["--surface-subtle","subtle"],["--interactive-border","border"],["--interactive-hover","hover"],["--interactive-selection","selection"],["--interactive-focus-ring","focus"],["--primary","primary"],["--surface-muted","mutedSurface"],["--surface-elevated-foreground","elevatedForeground"],["--interactive-active","active"],["--interactive-selection-foreground","selectionForeground"],["--primary-foreground","primaryForeground"],["--primary-text","primaryText"],["--success-text","successText"],["--warning-text","warningText"],["--error-text","errorText"],["--info-text","infoText"],["--status-success","success"],["--status-warning","warning"],["--status-error","error"],["--status-info","info"],["--font-sans","font"],["--font-mono","mono"],["--radius","radius"]],qo=[["--oc-syntax-keyword","--syntax-keyword","syntaxKeyword"],["--oc-syntax-string","--syntax-string","syntaxString"],["--oc-syntax-number","--syntax-number","syntaxNumber"],["--oc-syntax-function","--syntax-function","syntaxFunction"],["--oc-syntax-type","--syntax-type","syntaxType"],["--oc-syntax-comment","--syntax-comment","syntaxComment"],["--oc-syntax-variable","--syntax-variable","syntaxVariable"],["--oc-syntax-operator","--syntax-operator","syntaxOperator"]],To=(e,r)=>{r.style.colorScheme=e.mode;for(let[s,c]of $o)r.style.setProperty(s,e.tokens[c]);for(let[s,c,d]of qo){let S=e.tokens[d]??"";r.style.setProperty(s,S),r.style.setProperty(c,S)}r.style.setProperty("font-family",e.tokens.font),r.style.setProperty("font-size","0.875rem"),r.style.setProperty("line-height","1.45"),r.style.setProperty("color",e.tokens.foreground)},ft=(e,r)=>{if(To(e.theme,r),r.dataset)r.dataset.ocSurface=e.surface,r.dataset.ocTheme=e.theme.mode};var Wo={"surface-background":"bg","surface-elevated":"elevated","surface-elevated-foreground":"elevated-fg","surface-foreground":"fg","surface-muted-foreground":"muted","surface-muted":"muted-surface","surface-subtle":"subtle","interactive-border":"border","interactive-hover":"hover","interactive-active":"active","interactive-selection":"selection","interactive-selection-foreground":"selection-fg","interactive-focus-ring":"focus",primary:"primary","primary-foreground":"primary-fg","primary-text":"primary-text","success-text":"success-text","warning-text":"warning-text","error-text":"error-text","info-text":"info-text","status-success":"success","status-warning":"warning","status-error":"error","status-info":"info","font-sans":"font","font-mono":"mono",radius:"radius"},b=(e,r)=>`var(--${e}, var(--oc-${Wo[e]}, ${r}))`,j=b("surface-background","transparent"),Ue=b("surface-elevated","transparent"),ie=b("surface-elevated-foreground","inherit"),D=b("surface-foreground","inherit"),y=b("surface-muted-foreground","gray"),jo=b("surface-muted","transparent"),z=b("interactive-border","currentColor"),w=b("interactive-hover","transparent"),Y=b("interactive-active","transparent"),_t=b("interactive-selection","transparent"),Tt=b("interactive-selection-foreground","inherit"),W=b("primary","currentColor"),ht=b("primary-text","inherit"),yt=b("error-text","inherit"),zo=b("font-sans","inherit"),bt=b("font-mono","monospace"),Ro=b("radius","9px"),xt=`calc(${Ro} - 2px)`,ho=`calc(${Ro} - 4px)`,R=(e,r,s="transparent")=>`color-mix(in srgb, ${e} ${r}%, ${s})`,yo=`background-image: linear-gradient(${w}, ${w});`,Rt=(e)=>`box-shadow: inset 0 0 0 1px ${e}, var(--oc-sdk-field-lift);`,vt="border-color: var(--oc-sdk-edge); box-shadow: var(--oc-sdk-raised-lift);",bo="box-shadow: var(--oc-sdk-lit);",xo=`inset 0 1px 0 0 ${R(D,1.5)}, 0 1px 1px 0 rgb(0 0 0 / 0.28), 0 2px 3px -2px rgb(0 0 0 / 0.2)`,Ko=`
:root {
  --oc-sdk-edge: ${R(D,10)};
  --oc-sdk-field-bg: ${Ue};
  --oc-sdk-raised-bg: ${j};
  --oc-sdk-field-lift: inset 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --oc-sdk-raised-lift: 0 1px 2px 0 rgb(0 0 0 / 0.06);
  --oc-sdk-lit: inset 0 1px 0 0 rgb(255 255 255 / 0.45), 0 1px 2px 0 rgb(0 0 0 / 0.08);
  --oc-sdk-float-edge: rgb(0 0 0 / 0.1);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.8), inset 0 0 0 1px rgb(0 0 0 / 0.04), 0 1px 2px -0.5px rgb(0 0 0 / 0.08), 0 4px 8px -2px rgb(0 0 0 / 0.08), 0 12px 20px -4px rgb(0 0 0 / 0.08);
}
:root[data-oc-theme="dark"] {
  --oc-sdk-edge: ${R(D,6)};
  --oc-sdk-field-bg: ${R(j,50,Ue)};
  --oc-sdk-raised-bg: ${Ue};
  --oc-sdk-field-lift: ${xo};
  --oc-sdk-raised-lift: ${xo};
  --oc-sdk-lit: inset 0 1px 0 0 ${R(D,1.5)}, 0 1px 1px 0 rgb(0 0 0 / 0.28), 0 2px 3px -2px rgb(0 0 0 / 0.2);
  --oc-sdk-float-edge: rgb(0 0 0 / 0.36);
  --oc-sdk-float: inset 0 1px 0 0 rgb(255 255 255 / 0.06), inset 0 0 0 1px rgb(255 255 255 / 0.08), 0 1px 1px -0.5px rgb(0 0 0 / 0.22), 0 3px 3px -1.5px rgb(0 0 0 / 0.2), 0 6px 6px -3px rgb(0 0 0 / 0.16);
}`,we=(e)=>{let r=b(`status-${e}`,"currentColor");return`
.oc-sdk[data-tone="${e}"], .oc-sdk [data-tone="${e}"] { --oc-sdk-tone: ${r}; --oc-sdk-tone-text: ${b(`${e}-text`,"inherit")}; }`},Jo=`
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
`,vo=`${Ko}
.oc-sdk { color: ${D}; font-family: ${zo}; }
.oc-sdk :focus-visible, .oc-sdk:focus-visible { outline: none; }
.oc-sdk :where(button, a[href], [role="button"], [role="tab"], [role="option"]):focus-visible, button.oc-sdk:focus-visible { ${yo} }
.oc-sdk-mono { font-family: ${bt}; }
.oc-sdk-muted { color: ${y}; }
${we("success")}${we("warning")}${we("error")}${we("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${W}; --oc-sdk-tone-text: ${ht}; }

.oc-sdk-btn { border-radius: ${xt}; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="xs"] { border-radius: ${ho}; }
.oc-sdk-btn[data-variant="default"] { color: ${ht}; background: ${R(W,10,j)}; border-color: ${R(W,12)}; ${bo} }
.oc-sdk-btn[data-variant="default"]:hover { background: ${R(W,16,j)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${R(W,22,j)}; box-shadow: none; }
.oc-sdk-btn[data-variant="secondary"] { background: ${jo}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${w}, ${w}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${Y}, ${Y}); }
.oc-sdk-btn[data-variant="outline"] { background: var(--oc-sdk-raised-bg); color: ${ie}; ${vt} }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${w}, ${w}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${Y}, ${Y}); box-shadow: none; }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${w}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${Y}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${b("status-error","red")}; color: ${yt}; background: ${R("var(--oc-sdk-tone)",7,j)}; border-color: ${R("var(--oc-sdk-tone)",12)}; ${bo} }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${R("var(--oc-sdk-tone)",9,j)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${R("var(--oc-sdk-tone)",11,j)}; box-shadow: none; }

.oc-sdk-field-note { color: ${y}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${yt}; }
.oc-sdk-input { border-radius: ${xt}; background: var(--oc-sdk-field-bg); color: ${ie}; ${Rt("var(--oc-sdk-edge)")} transition: background 150ms ease-out; }
.oc-sdk-input::placeholder { color: ${y}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${w}, ${w}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { ${Rt(R(D,26))} }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input, .oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { ${Rt(b("status-error","red"))} }
.oc-sdk-input[data-mono="true"] { font-family: ${bt}; }

.oc-sdk-search-icon { color: ${y}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${W}; }
.oc-sdk-search-clear { border-radius: ${ho}; color: ${y}; }
.oc-sdk-search-clear:hover { background: ${w}; color: ${D}; }

.oc-sdk-trigger { border-radius: ${xt}; background: var(--oc-sdk-raised-bg); color: ${ie}; ${vt} transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${w}, ${w}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${Y}, ${Y}); }
.oc-sdk-trigger-value[data-empty="true"] { color: ${y}; }
.oc-sdk-trigger-chevron { color: ${y}; }
/* The app's dropdown light: lit top, hairline rings and a layered shadow. Its outer ring is the border, over the page like the app's. */
.oc-sdk-popup { --surface-foreground: ${ie}; border-color: var(--oc-sdk-float-edge); border-radius: 12px; background: ${Ue}; background-clip: padding-box; color: ${ie}; box-shadow: var(--oc-sdk-float); }
.oc-sdk-option { border-radius: 8px; }
.oc-sdk-option[data-active="true"] { background: ${w}; }
/* A selected option shows a check mark in the text colour, like the app's own pickers. Options without the mark come
   from bundles built before it existed and keep the selection fill as their only sign of the choice. */
.oc-sdk-option[aria-selected="true"]:not([data-mark]) { background: ${_t}; color: ${Tt}; }
.oc-sdk-option-check { color: ${D}; }
.oc-sdk-option[data-destructive="true"] { color: ${yt}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${R(b("status-error","red"),10)}; }
.oc-sdk-option-hint { color: ${y}; }
.oc-sdk-popup-empty { color: ${y}; }

/* Checked stays neutral: the mark carries the state, and the primary colour stays with primary actions. */
.oc-sdk-check-box { border-color: ${z}; border-radius: 4px; color: ${D}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${R(D,60,z)}; }
.oc-sdk-check-thumb { border-radius: 9999px; background: ${z}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { border-radius: 9999px; background: ${j}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${W}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${yo} }
.oc-sdk-check-desc { color: ${y}; }

.oc-sdk-tabs { border-radius: 10px; }
.oc-sdk-tabs[data-track="true"] { background: ${R(D,4)}; box-shadow: inset 0 1px 2px 0 rgb(0 0 0 / 0.16); }
.oc-sdk-tab { border-radius: 8px; color: ${y}; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${D}; }
.oc-sdk-tab[aria-selected="true"] { color: ${Tt}; background: ${_t}; border-color: ${z}; }
.oc-sdk-tabs[data-track="true"] .oc-sdk-tab[aria-selected="true"] { color: ${ie}; background: var(--oc-sdk-raised-bg); ${vt} }
.oc-sdk-tab-count { color: ${y}; }

.oc-sdk-badge { border-radius: 9999px; background: ${w}; color: ${y}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${R("var(--oc-sdk-tone)",15)}; }

.oc-sdk-row { border-radius: 6px; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${w}; }
.oc-sdk-row[aria-selected="true"] { background: ${_t}; color: ${Tt}; }
.oc-sdk-row-lead { font-family: ${bt}; color: ${y}; }
.oc-sdk-row-sub { color: ${y}; }
.oc-sdk-row-meta { color: ${y}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { color: ${y}; }

.oc-sdk-empty-body { color: ${y}; }

.oc-sdk-spinner { color: ${y}; }
.oc-sdk-spinner-ring { border-color: ${z}; border-top-color: ${W}; border-radius: 9999px; }

/* Set apart by its tint alone, like the app's banners. */
.oc-sdk-banner { border-color: transparent; border-radius: 8px; background: ${R("var(--oc-sdk-tone)",10)}; }
.oc-sdk-banner-title { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { color: ${y}; }

.oc-sdk-separator { color: ${y}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { background: ${R(z,40)}; }

.oc-sdk-progress-label { color: ${y}; }
.oc-sdk-progress-track { border-radius: 9999px; background: ${z}; }
.oc-sdk-progress-fill { border-radius: 9999px; background: var(--oc-sdk-tone, ${W}); }

.oc-sdk-text a { color: ${ht}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { border-radius: 8px; border: 1px solid ${R(z,60)}; }
`,P=`
${$e}
${Jo}
${vo}`;var Oo="oc-sdk-ui-style";var M=(e)=>{let r=document.getElementById(Oo);if(r instanceof HTMLStyleElement){if(r.textContent!==e)r.textContent=e;return}qe(document);let s=document.createElement("style");s.id=Oo,s.textContent=e,document.head.appendChild(s)},v=(e,r)=>{let s=document.createElement(e);if(r)s.className=r;return s},K=(e)=>{let r=v("button",e);return r.type="button",r},N=(e,r)=>{let s=r??"";if(e.textContent!==s)e.textContent=s},ae=(e,r,s)=>{if(s===void 0||s===null||s==="")e.removeAttribute(r);else if(e.getAttribute(r)!==s)e.setAttribute(r,s)};var Yo=()=>{let e=document.createElement("span");return e.className="oc-sdk-spinner-ring",e.setAttribute("aria-hidden","true"),e},le=(e,r)=>{M(P);let s=r,c=K("oc-sdk oc-sdk-btn"),d=Yo(),S=document.createElement("span");c.append(S),e.append(c);let _=()=>{if(c.dataset.variant=s.variant??"default",c.dataset.size=s.size??"default",c.disabled=Boolean(s.disabled)||Boolean(s.loading),c.dataset.loading=s.loading?"true":"false",c.setAttribute("aria-busy",s.loading?"true":"false"),s.loading&&d.parentNode!==c)c.prepend(d);else if(!s.loading&&d.parentNode===c)d.remove();N(S,s.label)},m=()=>{if(s.disabled||s.loading)return;s.onClick()};return c.addEventListener("click",m),_(),{update:(h)=>{s={...s,...h},_()},dispose:()=>{c.removeEventListener("click",m),c.remove()}}};var Ot=(e,r)=>{M(P);let s=r,c=v("label","oc-sdk oc-sdk-field"),d=v("span","oc-sdk-field-label"),S=s.multiline?v("textarea","oc-sdk-input"):v("input","oc-sdk-input"),_=v("span","oc-sdk-field-note");c.append(d,S,_),e.append(c);let m=()=>{if(N(d,s.label),d.hidden=!s.label,S instanceof HTMLInputElement)S.type=s.password?"password":"text";else S.rows=s.rows??3;if(S.value!==s.value)S.value=s.value;S.disabled=Boolean(s.disabled),ae(S,"placeholder",s.placeholder),S.dataset.mono=s.mono?"true":"false";let G=Boolean(s.error);c.dataset.invalid=G?"true":"false",S.setAttribute("aria-invalid",G?"true":"false");let L=s.error??s.helper??"";N(_,L),_.hidden=L===""},h=()=>{s.onChange(S.value)};return S.addEventListener("input",h),m(),{update:(G)=>{s={...s,...G},m()},dispose:()=>{S.removeEventListener("input",h),c.remove()}}};var At=mt(),Ao=document.querySelector("#root");if(!Ao)throw Error("Missing root");var Co=!1;At.onReady((e)=>{if(ft(e,document.documentElement),Co)return;Co=!0;let r=document.createElement("div");r.style.cssText="display:flex;align-items:center;gap:8px;height:100%;padding:0 8px;box-sizing:border-box;",Ao.append(r);let s="",c=document.createElement("div");c.style.flex="1",r.append(c);let d=Ot(c,{value:s,placeholder:"https://example.com",mono:!0,onChange:(m)=>{s=m,d.update({value:m})}}),S=le(r,{label:"Go",size:"sm",onClick:()=>{if(!s.trim())return;S.update({loading:!0}),At.serviceRequest({method:"POST",path:"/navigate",body:JSON.stringify({url:s.trim()})}).then(()=>_()).finally(()=>S.update({loading:!1}))}}),_=async()=>{try{let m=await At.serviceRequest({method:"GET",path:"/state"}),h=JSON.parse(m.body);if(String(h.url)===h.url&&h.url!==s)s=h.url==="about:blank"?"":h.url,d.update({value:s})}catch{}};_(),setInterval(()=>{_()},2000)});})();
