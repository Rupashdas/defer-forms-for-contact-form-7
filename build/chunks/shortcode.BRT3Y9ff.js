import{c as s,p as v,o,S as i,x as l,l as p}from"./admin.Bch7nIR1.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]],d=s("copy",m);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]],x=s("pencil",h),b=({code:n,loading:e=!1,compact:c=!1})=>{const[r,a]=v(!1);return!n&&!e?null:o("button",{type:"button",onClick:e?void 0:async()=>{try{await navigator.clipboard.writeText(n)}catch{const t=document.createElement("textarea");t.value=n,t.style.position="fixed",t.style.opacity="0",document.body.appendChild(t),t.select(),document.execCommand("copy"),document.body.removeChild(t)}a(!0),setTimeout(()=>a(!1),1600)},disabled:e,title:e?void 0:n,"aria-label":p("Copy shortcode","cf7-nova-lite"),className:`nv-flex nv-items-center nv-gap-2 nv-rounded-lg nv-border nv-border-line nv-bg-stone-50/60 nv-px-2.5 nv-text-left nv-transition-colors ${c?"nv-h-9 nv-max-w-[15rem]":"nv-mt-4 nv-w-full nv-py-1.5"} ${e?"":"nv-cursor-pointer hover:nv-border-stroke hover:nv-bg-stone-50"}`,children:[o("code",{className:"nv-min-w-0 nv-flex-1 nv-truncate nv-bg-transparent nv-p-0 nv-text-[14px] nv-text-stone-500",children:e?o(i,{w:"nv-w-2/3"}):n}),e||!r?o(d,{className:`nv-h-3.5 nv-w-3.5 nv-shrink-0 nv-text-stone-400 ${e?"nv-animate-pulse nv-opacity-40":""}`}):o(l,{className:"nv-h-3.5 nv-w-3.5 nv-shrink-0 nv-text-emerald-600"})]})};export{d as C,x as P,b as S};
