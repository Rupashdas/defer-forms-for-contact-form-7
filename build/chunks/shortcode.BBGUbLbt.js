import{c as a,p as n,o,S as i,x as l,l as p}from"./admin.DTch3gEV.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]],d=a("copy",m);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]],x=a("pencil",h),b=({code:t,loading:e=!1,compact:r=!1})=>{const[f,s]=n(!1);return!t&&!e?null:o("button",{type:"button",onClick:e?void 0:async()=>{try{await navigator.clipboard.writeText(t)}catch{const c=document.createElement("textarea");c.value=t,c.style.position="fixed",c.style.opacity="0",document.body.appendChild(c),c.select(),document.execCommand("copy"),document.body.removeChild(c)}s(!0),setTimeout(()=>s(!1),1600)},disabled:e,title:e?void 0:t,"aria-label":p("Copy shortcode","essentials-for-contact-form-7"),className:`cf7e-flex cf7e-items-center cf7e-gap-2 cf7e-rounded-lg cf7e-border cf7e-border-line cf7e-bg-stone-50/60 cf7e-px-2.5 cf7e-text-left cf7e-transition-colors ${r?"cf7e-h-9 cf7e-max-w-[15rem]":"cf7e-mt-4 cf7e-w-full cf7e-py-1.5"} ${e?"":"cf7e-cursor-pointer hover:cf7e-border-stroke hover:cf7e-bg-stone-50"}`,children:[o("code",{className:"cf7e-min-w-0 cf7e-flex-1 cf7e-truncate cf7e-bg-transparent cf7e-p-0 cf7e-text-[14px] cf7e-text-stone-500",children:e?o(i,{w:"cf7e-w-2/3"}):t}),e||!f?o(d,{className:`cf7e-h-3.5 cf7e-w-3.5 cf7e-shrink-0 cf7e-text-stone-400 ${e?"cf7e-animate-pulse cf7e-opacity-40":""}`}):o(l,{className:"cf7e-h-3.5 cf7e-w-3.5 cf7e-shrink-0 cf7e-text-emerald-600"})]})};export{d as C,x as P,b as S};
