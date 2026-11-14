"use client";
import {useEffect,useMemo,useState,type ReactNode} from "react";
import {oportuniaClient} from "@/lib/oportuniaSupabase";
/** Additional UI separation; privileged operations still require database permission. */
export function AdminOwnerOnly({children}:{children:ReactNode}){
  const client=useMemo(()=>oportuniaClient(),[]);
  const [isOwner,setIsOwner]=useState<boolean|null>(null);
  useEffect(()=>{
    let active=true;
    void Promise.resolve(client.rpc("staff_has_permission",{p_permission:"admin.dashboard"}))
      .then(({data,error})=>{if(active)setIsOwner(!error&&data===true);})
      .catch(()=>{if(active)setIsOwner(false);});
    return()=>{active=false;};
  },[client]);
  if(isOwner===null)return <div className="muted">Comprobando permiso del dashboard…</div>;
  if(!isOwner)return <p className="muted">Selecciona arriba uno de los módulos habilitados para tu rol. El dashboard de simulaciones está reservado al propietario.</p>;
  return <>{children}</>;
}
