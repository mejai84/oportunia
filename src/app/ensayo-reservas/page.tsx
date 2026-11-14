"use client";

import Link from "next/link";
import { useCallback,useEffect,useMemo,useState,type FormEvent } from "react";
import { oportuniaClient } from "@/lib/oportuniaSupabase";
import { PreviewProgress } from "@/components/PreviewProgress";
import { displayPreviewNumber,parsePreviewNumber,validatePreviewSelection,effectivePreviewStatus,
  type PreviewDraw,type PreviewReservation,type PreviewNumber,type PreviewEvent,type PreviewMode,type PreviewPlan
} from "@/lib/previewReservations";

const plans:{value:PreviewPlan;label:string}[]=[
  {value:"contado",label:"Una cuota (preferencia de ensayo)"},
  {value:"dos-cuotas",label:"Dos cuotas (preferencia de ensayo)"},
  {value:"tres-cuotas",label:"Tres cuotas (preferencia de ensayo)"},
];
const statusLabel={active:"Prueba vigente",expired:"Vencida",cancelled:"Cancelada"};

export default function PreviewReservationsPage(){
  const client=useMemo(()=>oportuniaClient(),[]);
  const [userId,setUserId]=useState<string|null>(null);
  const [checked,setChecked]=useState(false);
  const [draws,setDraws]=useState<PreviewDraw[]>([]);
  const [drawId,setDrawId]=useState("");
  const [holds,setHolds]=useState<PreviewReservation[]>([]);
  const [allNumbers,setAllNumbers]=useState<PreviewNumber[]>([]);
  const [events,setEvents]=useState<PreviewEvent[]>([]);
  const [taken,setTaken]=useState<Set<number>>(new Set());
  const [chosen,setChosen]=useState<number[]>([]);
  const [mode,setMode]=useState<PreviewMode>("manual");
  const [plan,setPlan]=useState<PreviewPlan>("contado");
  const [entry,setEntry]=useState("");
  const [page,setPage]=useState(0);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [openHistoryId,setOpenHistoryId]=useState<string|null>(null);

  useEffect(()=>{
    let mounted=true;
    void client.auth.getUser().then(({data})=>{
      if(mounted){setUserId(data.user?.id??null);setChecked(true);}
    }).catch(()=>{if(mounted)setChecked(true);});
    const {data:sub}=client.auth.onAuthStateChange((_event,session)=>{
      if(mounted){setUserId(session?.user?.id??null);setChecked(true);}
    });
    return()=>{mounted=false;sub.subscription.unsubscribe();};
  },[client]);

  const load=useCallback(async(id:string)=>{
    const [a,b,c,d]=await Promise.all([
      client.from("draw_catalog").select("id,title,enabled,status")
        .eq("enabled",true).eq("status","preview").order("display_order",{ascending:true}).limit(25),
      client.from("preview_reservations").select("id,draw_id,user_id,selection_mode,preferred_plan,status,created_at,expires_at,closed_at")
        .eq("user_id",id).order("created_at",{ascending:false}).limit(100),
      client.from("preview_reserved_numbers").select("draw_id,reservation_id,number,created_at,category,milestone").limit(500),
      client.from("preview_reservation_events").select("id,reservation_id,actor_id,event_type,numbers,created_at")
        .order("created_at",{ascending:false}).limit(200),
    ]);
    if(a.error||b.error||c.error||d.error)throw new Error("No se pudieron consultar las selecciones de prueba. Revisa tu sesión o la migración de Supabase.");
    const ds=(a.data||[]) as PreviewDraw[];
    setDraws(ds);
    setDrawId(old=>ds.some(x=>x.id===old)?old:(ds[0]?.id||""));
    setHolds((b.data||[]) as PreviewReservation[]);
    setAllNumbers((c.data||[]) as PreviewNumber[]);
    setEvents((d.data||[]) as PreviewEvent[]);
  },[client]);
  const loadTaken=useCallback(async(draw:string)=>{
    const {data,error:rpcError}=await client.rpc("list_preview_taken_numbers",{p_draw_id:draw});
    if(rpcError)throw new Error("No se pudo consultar el inventario global de esta edición.");
    setTaken(new Set(((data||[]) as {number:number}[]).map(item=>item.number)));
  },[client]);
  useEffect(()=>{
    let live=true;
    if(!userId){setDraws([]);setHolds([]);setAllNumbers([]);setEvents([]);setTaken(new Set());setLoading(false);return;}
    setLoading(true);setError("");
    void load(userId).catch(e=>{if(live)setError(e instanceof Error?e.message:"Error de consulta");})
      .finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[userId,load]);
  useEffect(()=>{
    let live=true;
    if(!userId||!drawId){setTaken(new Set());return;}
    void loadTaken(drawId).catch(e=>{if(live)setError(e instanceof Error?e.message:"No hay disponibilidad");});
    return()=>{live=false;};
  },[userId,drawId,loadTaken]);

  const current=holds.find(h=>h.draw_id===drawId&&effectivePreviewStatus(h)==="active");
  const currentNumbers=current?allNumbers.filter(n=>n.reservation_id===current.id&&n.category!=="extra_demo").map(n=>n.number):[];
  const visible=Array.from({length:100},(_,i)=>i+page*100);
  function addNumber(input:string){
    setError("");
    const n=parsePreviewNumber(input);
    if(n===null){setError("Escribe un número entre 0000 y 9999.");return;}
    if(taken.has(n)){setError("Este número está ocupado en el ensayo central. Actualiza la lista.");return;}
    if(chosen.includes(n)){setError("Ese número ya está en tu selección.");return;}
    if(chosen.length>=10){setError("Ya seleccionaste diez números.");return;}
    setChosen(items=>[...items,n]);
    setEntry("");
  }
  async function reserve(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!userId||busy||!drawId)return;
    if(mode==="manual"){
      const problem=validatePreviewSelection(chosen);
      if(problem){setError(problem);return;}
    }
    if(current){setError("Cancela o deja vencer la selección actual antes de crear otra.");return;}
    setError("");setNotice("");setBusy(true);
    try{
      const {error:rpcError}=await client.rpc("create_preview_reservation",{
        p_draw_id:drawId,p_selection_mode:mode,p_numbers:mode==="manual"?chosen:[],p_preferred_plan:plan,
      });
      if(rpcError)throw rpcError;
      await Promise.all([load(userId),loadTaken(drawId)]);
      setChosen([]);setEntry("");
      setNotice("Se guardó tu selección de ensayo en Supabase. No es una compra, no permite pagos y no participa en un sorteo.");
    }catch(e){
      setError(e instanceof Error?e.message:"No fue posible guardar la selección.");
      await loadTaken(drawId).catch(()=>undefined);
    }finally{setBusy(false);}
  }
  async function cancel(id:string){
    if(busy||!userId||!window.confirm("¿Cancelar esta selección de prueba y liberar sus números?"))return;
    setBusy(true);setError("");setNotice("");
    try{
      const {error:rpcError}=await client.rpc("cancel_preview_reservation",{p_reservation_id:id});
      if(rpcError)throw rpcError;
      await Promise.all([load(userId),loadTaken(drawId)]);
      setNotice("Selección cancelada. Los diez números quedaron disponibles nuevamente.");
    }catch(e){setError(e instanceof Error?e.message:"No se pudo cancelar.");}
    finally{setBusy(false);}
  }
  return <div className="container page-space central-page">
    <div className="central-head"><div><span className="overline">LABORATORIO · SUPABASE</span>
      <h1>Selección <span className="gradient-text">centralizada.</span></h1>
      <p>Ensaya la selección de 10 números guardados en la base de datos, compartiendo la disponibilidad entre celulares y computadores.</p></div>
      <Link href="/numeros" className="btn btn-secondary">Volver a la demostración</Link>
    </div>
    <div className="central-warning"><strong>Solo ensayo no comercial.</strong> La disponibilidad corresponde a este módulo de pruebas, no a participaciones oficiales. No realices transferencias, no hay cobros, ni asignación de 40 números adicionales. Los cupos de ensayo vencen a las 24 horas.</div>
    {!checked?<section className="central-panel">Comprobando sesión…</section>:!userId?
      <section className="central-panel central-login"><h2>Inicia sesión para ensayar</h2>
        <p>La selección queda ligada a tu cuenta y no a un navegador. Solo tú y los administradores autorizados pueden ver tu registro completo.</p>
        <Link href="/acceso" className="btn btn-primary">Iniciar sesión o crear cuenta</Link></section>:
    loading?<section className="central-panel">Consultando Supabase…</section>:<>
      {error&&<div className="alert alert-error" role="alert">{error}</div>}
      {notice&&<div className="alert alert-success" role="status">{notice}</div>}
      {draws.length===0?<section className="central-panel">No hay ediciones con vista previa disponible en Supabase.</section>:<>
        <section className="central-panel">
          <div className="central-toolbar"><label>Edición de prueba<select value={drawId} onChange={e=>{setDrawId(e.target.value);setChosen([]);setPage(0);setError("");}}>
            {draws.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label>
          <button type="button" className="btn btn-secondary btn-small" disabled={busy} onClick={()=>void loadTaken(drawId).then(()=>setNotice("Disponibilidad actualizada.")).catch(e=>setError(e instanceof Error?e.message:"Error"))}>Actualizar disponibilidad</button></div>
          <div className="central-stats"><div><span>Números ocupados en este ensayo</span><strong>{taken.size.toLocaleString("es-CO")}</strong></div>
            <div><span>Libres en este ensayo</span><strong>{(10000-taken.size).toLocaleString("es-CO")}</strong></div>
            <div><span>Tu selección actual</span><strong>{current?"10 / 10":"Sin selección"}</strong></div></div>
          {current?<div className="central-current"><span className="overline">TU SELECCIÓN VIGENTE</span>
            <h2>Diez números bloqueados en Supabase</h2>
            <div className="central-numbers">{currentNumbers.map(n=><span key={n}>{displayPreviewNumber(n)}</span>)}</div>
            <p>Vence: {new Date(current.expires_at).toLocaleString("es-CO")} · Modalidad: {current.selection_mode==="manual"?"Manual":"Automática"}</p>
            <p className="central-demo-separation">Los 40 adicionales, si se simulan, aparecen abajo por hitos. No requieren ni acreditan dinero.</p>
            <PreviewProgress reservationId={current.id} allowOwnLink={true}
              onChanged={()=>{void load(userId);void loadTaken(drawId);}}/>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={()=>void cancel(current.id)}>Cancelar y liberar números</button>
          </div>:<form onSubmit={e=>void reserve(e)}>
            <div className="central-mode"><label><input type="radio" checked={mode==="manual"} onChange={()=>setMode("manual")}/> Escoger diez números</label>
              <label><input type="radio" checked={mode==="automatic"} onChange={()=>setMode("automatic")}/> Elegir diez automáticamente</label></div>
            {mode==="manual"?<><div className="central-input"><input aria-label="Número entre 0000 y 9999" inputMode="numeric" maxLength={4} value={entry} onChange={e=>setEntry(e.target.value.replace(/[^0-9]/g,""))} placeholder="0007"/>
                <button type="button" className="btn btn-secondary" onClick={()=>addNumber(entry)} disabled={busy||chosen.length===10}>Agregar</button></div>
              <div className="central-selected"><strong>Elegidos: {chosen.length}/10</strong>
                <div className="central-numbers">{chosen.map(n=><button key={n} type="button" onClick={()=>setChosen(arr=>arr.filter(x=>x!==n))} title="Quitar número">{displayPreviewNumber(n)} ×</button>)}</div></div>
              <div className="central-grid">{visible.map(n=><button key={n} type="button" className={(taken.has(n)?"central-taken ":chosen.includes(n)?"central-picked ":"")+""}
                disabled={busy||taken.has(n)} aria-pressed={chosen.includes(n)} title={taken.has(n)?"Ocupado en el ensayo":"Seleccionar"}
                onClick={()=>chosen.includes(n)?setChosen(arr=>arr.filter(x=>x!==n)):addNumber(String(n))}>{displayPreviewNumber(n)}</button>)}</div>
              <div className="central-pages"><button type="button" className="btn btn-ghost btn-small" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Anterior</button>
                <span>Página {page+1} / 100</span>
                <button type="button" className="btn btn-ghost btn-small" disabled={page===99} onClick={()=>setPage(p=>p+1)}>Siguiente</button></div>
            </>:<div className="central-auto"><strong>Diez números al azar</strong><p>La base de datos los elegirá entre los libres en el momento de registrar el ensayo. No se publican ni se consideran pagados.</p></div>}
            <label className="central-plan">Preferencia ilustrativa de cuotas<select value={plan} onChange={e=>setPlan(e.target.value as PreviewPlan)}>{plans.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
            <button type="submit" className="btn btn-primary" disabled={busy||(mode==="manual"&&chosen.length!==10)}>{busy?"Registrando…":"Guardar selección de prueba por 24 horas"}</button>
          </form>}
        </section>
      </>}
      <section className="central-panel"><span className="overline">HISTORIAL DEL USUARIO</span><h2>Mis selecciones en Supabase</h2>
        {holds.length===0?<p className="muted">Todavía no has creado selecciones de prueba.</p>:<div className="central-history">{holds.map(h=>{
          const nums=events.find(e=>e.reservation_id===h.id&&e.event_type==="created")?.numbers||allNumbers.filter(n=>n.reservation_id===h.id&&n.category!=="extra_demo").map(n=>n.number);
          const status=effectivePreviewStatus(h);
          return <article key={h.id}><div><strong>{draws.find(d=>d.id===h.draw_id)?.title||h.draw_id}</strong>
            <span className={"central-tag central-"+status}>{statusLabel[status]}</span></div>
            <small>Creada: {new Date(h.created_at).toLocaleString("es-CO")} · Vence: {new Date(h.expires_at).toLocaleString("es-CO")}</small>
            <div className="central-numbers">{nums.map(n=><span key={n}>{displayPreviewNumber(n)}</span>)}</div>
            <small>ID de seguimiento: {h.id.slice(0,8).toUpperCase()} · Sin dinero recibido, sin participación</small>
            {effectivePreviewStatus(h)!=="active"&&<><button type="button" className="btn btn-secondary btn-small"
              onClick={()=>setOpenHistoryId(old=>old===h.id?null:h.id)}>
              {openHistoryId===h.id?"Ocultar":"Consultar"} hitos y referencias históricas</button>
              {openHistoryId===h.id&&<PreviewProgress reservationId={h.id}/>}</>}
          </article>;
        })}</div>}
      </section>
      </>}
  </div>;
}
