import{c as a,p as f,o,S as n,x as i,l}from"./admin.eL9b1suH.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]],m=a("copy",p);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]],x=a("pencil",h),b=({code:d,loading:e=!1,compact:c=!1})=>{const[r,s]=f(!1);return!d&&!e?null:o("button",{type:"button",onClick:e?void 0:async()=>{try{await navigator.clipboard.writeText(d)}catch{const t=document.createElement("textarea");t.value=d,t.style.position="fixed",t.style.opacity="0",document.body.appendChild(t),t.select(),document.execCommand("copy"),document.body.removeChild(t)}s(!0),setTimeout(()=>s(!1),1600)},disabled:e,title:e?void 0:d,"aria-label":l("Copy shortcode","defer-forms-for-contact-form-7"),className:`df7-flex df7-items-center df7-gap-2 df7-rounded-lg df7-border df7-border-line df7-bg-stone-50/60 df7-px-2.5 df7-text-left df7-transition-colors ${c?"df7-h-9 df7-max-w-[15rem]":"df7-mt-4 df7-w-full df7-py-1.5"} ${e?"":"df7-cursor-pointer hover:df7-border-stroke hover:df7-bg-stone-50"}`,children:[o("code",{className:"df7-min-w-0 df7-flex-1 df7-truncate df7-bg-transparent df7-p-0 df7-text-[14px] df7-text-stone-500",children:e?o(n,{w:"df7-w-2/3"}):d}),e||!r?o(m,{className:`df7-h-3.5 df7-w-3.5 df7-shrink-0 df7-text-stone-400 ${e?"df7-animate-pulse df7-opacity-40":""}`}):o(i,{className:"df7-h-3.5 df7-w-3.5 df7-shrink-0 df7-text-emerald-600"})]})};export{m as C,x as P,b as S};
