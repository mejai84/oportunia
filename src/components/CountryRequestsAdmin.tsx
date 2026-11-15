"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {oportuniaClient} from "@/lib/oportuniaSupabase";

type Request={id:string;user_id:string;country_code:string;status:string;requested_at:string};
export function CountryRequestsAdmin(){
 const client=useMemo(()=>oportuniaClient(),[]);
 const [requests,setRequests]=useState<Request[]>([]);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const [reviewId,setReviewId]=useState("");
 const [note,setNote]=useState("");
 const [busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{
  const {data,error:readError}=await client.from("commerce_country_requests")
   .select("id,user_id,country_code,status,requested_at")
   .eq("status","pending").order("requested_at",{ascending:true}).limit(100);
  if(readError)throw new Error("No se pudieron consultar las solicitudes de país.");
  setRequests((data||[]) as Request[]);
 },[client]);
 useEffect(()=>{void refresh().catch(e=>setError(e instanceof Error?e.message:"Error de solicitudes"));},[refresh]);
 async function review(approve:boolean){
  if(busy||!reviewId)return;
  if(note.trim().length<20){setError("Documenta la verificación con al menos 20 caracteres.");return;}
  if(approve&&!window.confirm("¿Revisaste evidencia fiable de residencia y elegibilidad en este país? Una declaración del usuario no es suficiente."))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {error:rpcError}=await client.rpc("review_commerce_country_request",{
    p_request_id:reviewId,p_approve:approve,p_review_note:note.trim()
   });
   if(rpcError)throw rpcError;
   await refresh();setReviewId("");setNote("");
   setNotice(approve?"País aprobado para esta cuenta durante 180 días.":"Solicitud rechazada y registrada.");
  }catch(e){setError(e instanceof Error?e.message:"No se pudo registrar la decisión.");}
  finally{setBusy(false);}
 }
 return <section className="panel">
  <span className="overline">PAÍSES EXTRANJEROS · REVISIÓN DE ELEGIBILIDAD</span>
  <h2>Solicitudes de clientes por país</h2>
  <p>Para ediciones fuera de Colombia, antes de permitir un pedido se requiere confirmar manualmente que el cliente cumple las condiciones territoriales. No se debe confiar solo en la dirección IP ni en lo que escriba el usuario.</p>
  {error&&<p role="alert" className="alert alert-error">{error}</p>}
  {notice&&<p role="status" className="alert alert-success">{notice}</p>}
  {requests.length===0?<p className="muted">No hay solicitudes pendientes.</p>:
   <div className="stack">{requests.map(r=><article className="account-card" key={r.id}>
    <strong>País {r.country_code}</strong>
    <p className="small muted">Cliente {r.user_id} · Solicitado {new Date(r.requested_at).toLocaleString("es-CO")}</p>
    <button type="button" className="btn btn-secondary btn-small"
     onClick={()=>{setReviewId(r.id);setNote("");}}>Revisar elegibilidad</button>
    {reviewId===r.id&&<div className="form-stack">
     <p>Comprueba la residencia y las condiciones locales mediante canales apropiados antes de aprobar. No solicites contraseñas ni códigos OTP.</p>
     <label>Evidencia o motivo de la decisión<textarea required minLength={20} maxLength={500} rows={3}
      value={note} onChange={e=>setNote(e.target.value)}
      placeholder="Indica qué se revisó y quién realizó la comprobación"/></label>
     <div className="row-actions">
      <button type="button" disabled={busy||note.trim().length<20} className="btn btn-primary"
       onClick={()=>void review(true)}>Aprobar país de residencia</button>
      <button type="button" disabled={busy||note.trim().length<20} className="btn btn-secondary"
       onClick={()=>void review(false)}>Rechazar</button>
     </div>
    </div>}
   </article>)}</div>}
 </section>;
}
