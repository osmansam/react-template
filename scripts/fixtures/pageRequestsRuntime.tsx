import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { GeneralContextProvider } from "../../src/context/General.context";
import { UserContextProvider } from "../../src/context/User.context";
import { PageRuntimeProvider } from "../../src/pageRuntime/PageRuntimeProvider";
import { PageSectionView } from "../../src/components/DynamicPageSections";
import { axiosClient } from "../../src/utils/api/axiosClient";
import { AxiosHeaders } from "axios";
import type { PageModel } from "../../src/types/page";
import "../../src/index.css";
let reads=0;
axiosClient.defaults.adapter=async config=>{
 const url=config.url||"";
 let data:unknown;
 if(url.includes("auth/session"))data={authenticated:true,user:{_id:"qa"}};
 else if(url.includes("runtime/schemas"))data=[{_id:"schema",schemaName:"products",fields:[{name:"_id",type:"string"},{name:"name",type:"string"},{name:"price",type:"float"}]}];
 else if(url.includes("table-source")){reads++;document.querySelector("#reads")!.textContent=String(reads);data={items:[{_id:"p",name:url.includes("active=true")?"Active product":"Shared product",price:10}],totalItems:1,totalPages:1,currentPage:1};}
 else data=[];
 return {config,status:200,statusText:"OK",headers:new AxiosHeaders(),data};
};
const base:PageModel={id:"qa-page",name:"Products",requests:[{id:"products",name:"Product list",source:{transport:"table-source",kind:"schema",schemaName:"products"},defaults:{controls:{page:1,limit:20}},result:{kind:"records"}}],sections:[
 {id:"table-section",type:"component",component:{id:"table",type:"table",title:"Products table",outputs:[{id:"selected",key:"selectedRecord",type:"record",source:{kind:"tableSelectedRecord"}}],requestBindings:{data:{requestId:"products"}},table:{dataFields:["_id","name","price"],columns:[{field:"name",displayName:"Name"},{field:"price",displayName:"Price"}]}}},
 {id:"visual-section",type:"component",component:{id:"visual",type:"custom",title:"Product cards",requestBindings:{"collection:products":{requestId:"products"}},props:{visualBuilder:{document:{version:2,id:"design",name:"Cards",root:{id:"root",type:"section",children:[{id:"repeat",type:"repeater",itemAlias:"item",source:{kind:"autotable",requestSlot:"products",schemaName:"products",limit:20},children:[{id:"item",type:"slot",name:"item",children:[{id:"name",type:"heading",level:2,text:"{{item.name}}"}]}]}]}}}}}}
,{id:"details-section",type:"component",component:{id:"details",type:"custom",dataBinding:{kind:"schema",parameters:{item:{source:"componentOutput",componentId:"table",outputId:"selected"}}},props:{visualBuilder:{document:{version:2,id:"details-doc",name:"Selected record",root:{id:"details-root",type:"section",children:[{id:"selected-name",type:"heading",level:2,text:"Selected: {{item.name}}"}]}}}}}}
]};
function App(){const[page,setPage]=useState(base);return <><header style={{padding:20,background:"#edf2f7"}}><h1>Shared page requests QA</h1><p>Dataset reads: <output id="reads">0</output></p><button onClick={()=>setPage({...base,sections:base.sections.map((section,index)=>index===1?{...section,component:{...section.component!,requestBindings:{"collection:products":{requestId:"products",overrides:{filters:{active:true}}}}}}:section)})}>Different visual filter</button> <button onClick={()=>setPage({...base})}>Match again</button></header><PageRuntimeProvider page={page}>{page.sections.map(section=><PageSectionView key={section.id} section={section} pageFilters={[]} routeParams={{}}/>)}</PageRuntimeProvider></>}
createRoot(document.getElementById("root")!).render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={["/t/qa/p/demo/products"]}><UserContextProvider><GeneralContextProvider><App/></GeneralContextProvider></UserContextProvider></MemoryRouter></QueryClientProvider>);
