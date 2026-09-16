export type AurumPreviewStage="react"|"three"|"renderer"|"canvas"|"scene"|"camera"|"environment"|"model"|"materials"|"postprocess"|"ready";
export type AurumPreviewDiagnostic={stage:AurumPreviewStage;status:"pass"|"fail"|"fallback";message:string;detail?:string};

export function createAurumPreviewDiagnostics(){
  const diagnostics:AurumPreviewDiagnostic[]=[];
  let current:AurumPreviewStage="react";
  const record=(stage:AurumPreviewStage,status:AurumPreviewDiagnostic["status"],message:string,detail?:string)=>{
    current=stage; diagnostics.push({stage,status,message,detail});
  };
  return {
    record,
    get current(){return current},
    get report(){return [...diagnostics]},
    fail(stage:AurumPreviewStage,error:unknown){
      const message=error instanceof Error?error.message:String(error);
      record(stage,"fail","AURUM preview initialization failed",message);
    }
  };
}

export function installAurumPreviewErrorCapture(onError:(error:unknown)=>void){
  const onWindowError=(event:ErrorEvent)=>onError(event.error??event.message);
  const onRejection=(event:PromiseRejectionEvent)=>onError(event.reason);
  window.addEventListener("error",onWindowError);
  window.addEventListener("unhandledrejection",onRejection);
  return ()=>{window.removeEventListener("error",onWindowError);window.removeEventListener("unhandledrejection",onRejection)};
}
