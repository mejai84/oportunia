"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminAccessGate } from "@/components/AdminAccessGate";
import { useApp } from "@/components/AppProvider";
import { drawCatalog, money } from "@/lib/domain";
import { buildLocalNumberAudit, numbersWithStatus, type LocalNumberState } from "@/lib/numberAudit";

const states: {name: LocalNumberState|"todos"; label:string}[]=[
  {name:"todos",label:"Todos"},
  {name:"libre",label:"Libres"},
  {name:"reservado",label:"Reservados"},
  {name:"parcial",label:"Abono parcial"},
  {name:"habilitado",label:"Habilitados"},
  {name:"inconsistente",label:"Inconsistentes"},
];
const SIZE=100;
function NumberControl() {
  const {state,hydrated,activeDrawId,chooseDraw}=useApp();
  const draws=drawCatalog(state);
  const draw=draws.find(d=>d.id===activeDrawId)||draws[0];
  const [filter,setFilter]=useState<LocalNumberState|"todos">("todos");
  const [term,setTerm]=useState("");
  const [page,setPage]=useState(0);
  const [selected,setSelected]=useState<string|null>(null);
  const audit=useMemo(()=>buildLocalNumberAudit(state,draw.id),[state,draw.id]);
  const filtered=useMemo(()=>numbersWithStatus(audit,filter,term),[audit,filter,term]);
  const totalPages=Math.max(1,Math.ceil(filtered.length/SIZE));
  const safePage=Math.min(page,totalPages-1);
  const visible=filtered.slice(safePage*SIZE,(safePage+1)*SIZE);
  const chosen=selected?audit.entries.get(selected):null;
  return <div className="container page-space nums-page">
    <div className="nums-top"><div><span className="overline">ADMINISTRACIÓN · MONITOREO</span>
      <h1>Control de <span className="gradient-text">10.000 números.</span></h1>
      <p>Mapa local de asignaciones y comprobación de duplicados por edición. No es un inventario central de oportunidades vendidas.</p></div>
      <Link href="/admin" className="btn btn-secondary">Volver al dashboard</Link>
    </div>
    <div className="nums-warning"><strong>Simulación local:</strong> este mapa únicamente observa órdenes en el navegador actual. No consulta reservas globales ni garantiza disponibilidad ante otros compradores. No permite asignar números ni habilitar sorteos reales.</div>
    <section className="nums-toolbar">
      <label>Sorteo que deseas analizar
        <select value={draw.id} onChange={e=>{chooseDraw(e.target.value);setPage(0);setSelected(null);}}>
          {draws.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label>
      <label>Buscar un número
        <input type="search" inputMode="numeric" maxLength={4} value={term} onChange={e=>{setTerm(e.target.value);setPage(0);}} placeholder="Ej.: 0042"/></label>
    </section>
    <div className="nums-kpis">
      <article><span>Libres en esta demo</span><strong>{audit.totals.libre.toLocaleString("es-CO")}</strong><small>De 10.000 números</small></article>
      <article><span>Reservados</span><strong>{audit.totals.reservado.toLocaleString("es-CO")}</strong><small>Sin abonos de prueba</small></article>
      <article><span>Con abono parcial</span><strong>{audit.totals.parcial.toLocaleString("es-CO")}</strong><small>No habilitados</small></article>
      <article><span>Habilitados (demo)</span><strong>{audit.totals.habilitado.toLocaleString("es-CO")}</strong><small>No son participaciones oficiales</small></article>
    </div>
    <div className="nums-meter"><div><span>Ocupación local de números</span><strong>{(audit.count/100).toLocaleString("es-CO",{maximumFractionDigits:2})}%</strong></div>
      <div className="nums-meter-track"><span style={{width:(audit.count/100)+"%"}}/></div>
      <small>{audit.orders} oportunidades vigentes en esta demo · {audit.count} números distintos ocupados</small></div>
    <div className="nums-content">
      <section className="nums-main">
        <div className="nums-filter" role="group" aria-label="Filtrar números por estado">{states.map(s=>
          <button type="button" key={s.name} className={filter===s.name?"active":""} onClick={()=>{setFilter(s.name);setPage(0);}}>{s.label}</button>)}</div>
        <div className="nums-listhead"><strong>Mapa de números</strong><span>{filtered.length.toLocaleString("es-CO")} coincidencias · {visible.length} visibles</span></div>
        {hydrated?<div className="nums-grid">{visible.map(n=>{
          const item=audit.entries.get(n);
          const status=item?.status||"libre";
          return <button type="button" key={n} className={"nums-cell nums-"+status+(selected===n?" selected":"")}
            aria-label={"Número "+n+" · "+status} aria-pressed={selected===n} onClick={()=>setSelected(n)}>{n}</button>;
        })}</div>:<p>Cargando datos locales…</p>}
        {filtered.length===0&&<p className="muted">No hay números con estos filtros.</p>}
        <div className="nums-pagination"><button type="button" disabled={safePage===0} onClick={()=>setPage(0)}>Inicio</button>
          <button type="button" disabled={safePage===0} onClick={()=>setPage(v=>Math.max(0,v-1))}>Anterior</button>
          <span>Página {safePage+1} / {totalPages}</span>
          <button type="button" disabled={safePage===totalPages-1} onClick={()=>setPage(v=>Math.min(totalPages-1,v+1))}>Siguiente</button>
          <button type="button" disabled={safePage===totalPages-1} onClick={()=>setPage(totalPages-1)}>Final</button></div>
      </section>
      <aside className="nums-side">
        <section className="nums-detail"><span className="overline">CONSULTA POR NÚMERO</span>
          <h2>{selected||"Selecciona un número"}</h2>
          {!selected?<p>Selecciona una casilla del mapa para consultar su condición y, si existe, la orden de la simulación.</p>:
            !chosen?<><span className="nums-pill nums-libre">Libre (solo en este navegador)</span>
              <p>No existe una asignación en el estado local de esta edición.</p></>:
              <><span className={"nums-pill nums-"+chosen.status}>{chosen.status}</span>
                <dl><dt>Oportunidad</dt><dd>{chosen.orderId.slice(0,8).toUpperCase()}</dd>
                  <dt>Cliente de prueba</dt><dd>{chosen.customerName}</dd>
                  <dt>Origen</dt><dd>{chosen.origin}</dd><dt>Abono demo</dt><dd>{money(chosen.paid)}</dd></dl></>}
        </section>
        <section className="nums-detail"><span className="overline">AUDITORÍA LOCAL</span><h3>Anomalías detectadas</h3>
          {audit.anomalies.length===0?<p>No se detectaron duplicados ni datos de numeración inválidos en el estado local.</p>:
            <ul>{audit.anomalies.slice(0,30).map((warning,index)=><li key={index}>{warning}</li>)}</ul>}
          {audit.anomalies.length>30&&<p>Se muestran las primeras 30 inconsistencias.</p>}
        </section>
        <section className="nums-detail"><h3>Próxima etapa de producción</h3>
          <p>La disponibilidad auténtica requiere una tabla central en PostgreSQL, reservas con vencimiento y transacciones que bloqueen duplicados entre todos los dispositivos.</p></section>
      </aside>
    </div>
  </div>;
}
export default function NumbersAdminPage(){return <AdminAccessGate><NumberControl/></AdminAccessGate>;}
