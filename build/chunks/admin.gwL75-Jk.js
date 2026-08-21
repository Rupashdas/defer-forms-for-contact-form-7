const c=window.wp.element,D=c.Fragment;function o(t,e,n){const a={...e||{}};n!==void 0&&(a.key=n);const{children:r,...s}=a;return r===void 0?c.createElement(t,s):Array.isArray(r)?c.createElement(t,s,...r):c.createElement(t,s,r)}const y=window.wp.element,{createRoot:H,render:V,useState:T,useEffect:U,useMemo:Z,useCallback:q,useRef:G,useContext:O,useReducer:J,createContext:K,Fragment:Q,cloneElement:X,createElement:Y,forwardRef:W,memo:z}=y,ee=window.wp.apiFetch,L=window.wp.i18n,{__:te,_x:ne,_n:ae,_nx:se,sprintf:re}=L,N=window.wp.element,{Children:oe,Component:ce,PureComponent:le,Fragment:ue,StrictMode:me,Suspense:ie,cloneElement:de,createContext:S,createElement:m,createRef:fe,forwardRef:x,isValidElement:ve,lazy:pe,memo:we,startTransition:xe,useCallback:Ce,useContext:F,useDebugValue:ge,useDeferredValue:$e,useEffect:he,useId:Ee,useImperativeHandle:be,useInsertionEffect:_e,useLayoutEffect:Ae,useMemo:Re,useReducer:ye,useRef:Le,useState:Ne,useSyncExternalStore:Se,useTransition:Fe,version:ke}=N;/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=(...t)=>t.filter((e,n,a)=>!!e&&e.trim()!==""&&a.indexOf(e)===n).join(" ").trim();/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=t=>t.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P=t=>t.replace(/^([A-Z])|[\s-_]+(\w)/g,(e,n,a)=>a?a.toUpperCase():n.toLowerCase());/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=t=>{const e=P(t);return e.charAt(0).toUpperCase()+e.slice(1)};/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var u={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=t=>{for(const e in t)if(e.startsWith("aria-")||e==="role"||e==="title")return!0;return!1},I=S({}),M=()=>F(I),B=x(({color:t,size:e,strokeWidth:n,absoluteStrokeWidth:a,className:r="",children:s,iconNode:g,...i},$)=>{var f,v,p;const{size:l=24,strokeWidth:d=2,absoluteStrokeWidth:h=!1,color:E="currentColor",className:b=""}=(f=M())!=null?f:{},_=(a!=null?a:h)?Number(n!=null?n:d)*24/Number(e!=null?e:l):n!=null?n:d;return m("svg",{ref:$,...u,width:(v=e!=null?e:l)!=null?v:u.width,height:(p=e!=null?e:l)!=null?p:u.height,stroke:t!=null?t:E,strokeWidth:_,className:C("lucide",b,r),...!s&&!j(i)&&{"aria-hidden":"true"},...i},[...g.map(([A,R])=>m(A,R)),...Array.isArray(s)?s:[s]])});/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pe=(t,e)=>{const n=x(({className:a,...r},s)=>m(B,{ref:s,iconNode:e,className:C(`lucide-${k(w(t))}`,`lucide-${t}`,a),...r}));return n.displayName=w(t),n},je=({children:t})=>o("div",{className:"nv-mt-4 nv-w-full nv-pb-14 nv-pr-5",children:t}),Ie=({title:t,subtitle:e,actions:n})=>o("div",{className:"nv-mb-6 nv-flex nv-flex-wrap nv-items-end nv-justify-between nv-gap-4 nv-border-b nv-border-line nv-pb-5",children:[o("div",{className:"nv-min-w-0",children:[o("h1",{className:"nv-m-0 nv-p-0 nv-text-[30px] nv-font-extrabold nv-leading-tight nv-tracking-tight nv-text-ink",children:t}),e&&o("p",{className:"nv-mb-0 nv-mt-2 nv-text-[15px] nv-text-stone-500",children:e})]}),n?o("div",{className:"nv-flex nv-shrink-0 nv-items-center nv-gap-2",children:n}):null]});export{Ee as A,_e as B,ce as C,oe as D,ve as E,D as F,ue as G,m as H,Ie as P,N as _,Re as a,Ae as b,Pe as c,he as d,Ce as e,Ne as f,S as g,ye as h,F as i,de as j,x as k,te as l,we as m,H as n,o,T as p,U as q,ee as r,G as s,q as t,Le as u,re as v,je as w,Q as x,ae as y,Z as z};
