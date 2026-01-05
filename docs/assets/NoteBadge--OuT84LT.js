import{j as x}from"./index-DbyvwlW1.js";import{g as b}from"./noteHelpers-Cl6DLqkx.js";function c({noteIndex:e,isActive:a=!0,isCarnatic:r=!1,activeColor:s="bg-blue-500",onClick:t,size:o="md",className:n=""}){const i=b(r)[e]||"",d={sm:"px-1.5 py-0.5 text-[9px]",md:"px-2 py-1 text-xs",lg:"px-3 py-1.5 text-sm"},u=`
    inline-block rounded font-medium transition-all
    ${d[o]||d.md}
    ${t?"cursor-pointer hover:scale-105":""}
  `,m=`
    ${s.startsWith("bg-")?s:""} 
    text-white shadow-sm
  `,p=`
    bg-gray-200 dark:bg-gray-700 
    text-gray-400 dark:text-gray-500
  `,g=s.startsWith("#")&&a?{backgroundColor:s}:{};return x.jsx("span",{className:`${u} ${a?m:p} ${n}`,style:g,onClick:t,role:t?"button":void 0,tabIndex:t?0:void 0,children:i})}function h({pattern:e,isCarnatic:a=!1,onNoteClick:r,showInactive:s=!0,size:t="sm",className:o=""}){return e?x.jsx("div",{className:`flex flex-wrap gap-1 ${o}`,children:e.map((n,l)=>!s&&!n?null:x.jsx(c,{noteIndex:l,isActive:!!n,isCarnatic:a,onClick:r?()=>r(l):void 0,size:t},l))}):null}export{h as N};
