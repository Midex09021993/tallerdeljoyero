import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
const Lab=lazy(()=>import("@/components/AurumDiamondOpticalLab").then(m=>({default:m.AurumDiamondOpticalLab})));
export const Route=createFileRoute("/aurum-diamond-lab")({head:()=>({meta:[{title:"Diamond Optical Lab · AURUM LAB"},{name:"robots",content:"noindex,nofollow"},{name:"description",content:"Laboratorio óptico aislado con el diamante y motor de referencia de Mini AURUM Render."}]}),component:Page});
function Page(){return <ClientOnly fallback={<div className="min-h-screen grid place-items-center">Cargando laboratorio…</div>}><Suspense fallback={<div className="min-h-screen grid place-items-center">Inicializando…</div>}><Lab/></Suspense></ClientOnly>}