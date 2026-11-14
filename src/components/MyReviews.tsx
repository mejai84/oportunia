"use client";
import { useEffect,useMemo,useState,type FormEvent } from "react";
import { oportuniaClient } from "@/lib/oportuniaSupabase";
import type { User } from "@supabase/supabase-js";
import { usePublicDraws } from "@/lib/usePublicDraws";
export function MyReviews(){
 const client=useMemo(()=>oportuniaClient(),[]);
 const {draws}=usePublicDraws();
 const [user,setUser]=useState<User|null>(null);
 const [drawId,setDrawId]=useState("");
 const [rating,setRating]=useState(5);
 const [comment,setComment]=useState("");
 const [displayName,setDisplayName]=useState("");
 const [existing,setExisting]=useState(false);
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  let live=true;
  void client.auth.getUser().then(({data})=>{if(live)setUser(data.user);});
  const {data:sub}=client.auth.onAuthStateChange((_e,s)=>{if(live)setUser(s?.user||null);});
  return()=>{live=false;sub.subscription.unsubscribe();};
 },[client]);
 useEffect(()=>{if(!drawId&&draws.length)setDrawId(draws[0].id);},[draws,drawId]);
 useEffect(()=>{
  if(!user||!drawId)return;
  let live=true;
  void client.from("draw_reviews").select("rating,comment,display_name,status").eq("draw_id",drawId).eq("user_id",user.id).maybeSingle().then(({data})=>{
   if(!live)return;
   setExisting(!!data);setRating(data?.rating||5);setComment(data?.comment||"");setDisplayName(data?.display_name||"");
  });
  return()=>{live=false;};
 },[client,user,drawId]);
 async function submit(e:FormEvent){
  e.preventDefault();if(!user||!drawId)return;
  setBusy(true);setNotice("");
  const values={rating,comment:comment.trim(),display_name:displayName.trim()};
  // Reviews can be edited only while pending; published reviews require moderation.
  const query=existing
   ? client.from("draw_reviews").update({...values,status:"pending",updated_at:new Date().toISOString()}).eq("draw_id",drawId).eq("user_id",user.id)
   : client.from("draw_reviews").insert({...values,draw_id:drawId,user_id:user.id,status:"pending"});
  const {error}=await query;
  setNotice(error?"No fue posible guardar. Una opinión ya publicada requiere revisión del administrador.":"Tu opinión se envió para revisión.");
  if(!error)setExisting(true);
  setBusy(false);
 }
 return <section className="panel review-account-panel"><span className="overline">TU EXPERIENCIA</span><h2>Comparte tu opinión</h2>
  {!user?<p>Inicia sesión para calificar cada edición desde tu cuenta. <a href="/acceso">Ingresar</a></p>:
  <form className="form-stack" onSubmit={submit}>
   <label>Edición<select required value={drawId} onChange={e=>{setDrawId(e.target.value);setNotice("");}}>{draws.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label>
   <fieldset className="rating-stars-field"><legend>Tu calificación</legend><div className="rating-stars">{[1,2,3,4,5].map(n=><button type="button" key={n} aria-label={n+" estrellas"} aria-pressed={rating===n} onClick={()=>setRating(n)}>{n<=rating?"★":"☆"}</button>)}</div></fieldset>
   <label>Nombre público o alias<input required minLength={2} maxLength={70} value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Ej.: María G." /></label>
   <label>Tu opinión<textarea required minLength={12} maxLength={700} rows={4} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Cuéntanos qué te pareció la edición, sin incluir datos personales." /></label>
   <p className="small muted">Una opinión por persona y edición. La publicación está sujeta a moderación. No afirmes haber ganado o recibido pagos si no ocurrió.</p>
   <button type="submit" disabled={busy||!drawId} className="btn btn-primary">{busy?"Guardando…":existing?"Actualizar opinión":"Enviar opinión"}</button>
   {notice&&<p role="status" className="small">{notice}</p>}
  </form>}
 </section>;
}
