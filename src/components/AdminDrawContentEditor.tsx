"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { type Draw } from "@/lib/domain";
import { removeDrawImage, saveDrawImage, useDrawImage, type DrawImageKind } from "@/lib/demoMedia";

type Details = { title: string; prize: string; description: string };

function ImageEditor({ drawId, kind, label, description }: {
  drawId: string; kind: DrawImageKind; label: string; description: string;
}) {
  const src = useDrawImage(drawId, kind);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true); setNotice(""); setError("");
    try {
      await saveDrawImage(drawId, kind, file);
      setNotice("Imagen guardada en este navegador. Vista previa actualizada.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar la imagen."); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setNotice(""); setError("");
    try {
      await removeDrawImage(drawId, kind);
      setNotice("Imagen local retirada; vuelve la ilustración original.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo quitar la imagen."); }
    finally { setBusy(false); }
  }
  return <article className="admin-image-card">
    <div><h3>{label}</h3><p className="small muted">{description}</p></div>
    <div className="admin-image-preview">
      {src ? <img src={src} alt={"Vista previa: " + label} /> :
        <div className="admin-image-placeholder"><span>▧</span><strong>Sin imagen personalizada</strong>
          <small>Se utiliza la ilustración predeterminada.</small></div>}
    </div>
    <div className="admin-image-actions">
      <label className="btn btn-secondary admin-image-picker">
        {busy ? "Procesando…" : "Seleccionar imagen"}
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={upload} />
      </label>
      <button type="button" className="btn btn-ghost" disabled={busy || !src} onClick={remove}>Quitar imagen</button>
    </div>
    <p className="small muted">PNG, JPG o WebP · máximo 6 MB · almacenamiento local de demostración.</p>
    {error && <div role="alert" className="alert alert-error">{error}</div>}
    {notice && <div role="status" className="alert alert-success">{notice}</div>}
  </article>;
}

export function AdminDrawContentEditor({ draw, saveDetails }: {
  draw: Draw; saveDetails: (id: string, details: Details) => void;
}) {
  const [title, setTitle] = useState(draw.title);
  const [prize, setPrize] = useState(draw.prize);
  const [description, setDescription] = useState(draw.description);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setTitle(draw.title); setPrize(draw.prize); setDescription(draw.description);
    setNotice(""); setError("");
  }, [draw.id, draw.title, draw.prize, draw.description]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    try {
      saveDetails(draw.id, { title, prize, description });
      setNotice("Información actualizada en esta demostración local.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo actualizar el sorteo."); }
  }
  return <div className="admin-content-stack">
    <div className="alert alert-warning">
      <strong>Editor de demostración:</strong> no hay autenticación administrativa. Los textos se guardan en localStorage y las imágenes en IndexedDB, solo en este navegador. No se publican para otros visitantes ni se envían a Supabase.
    </div>
    <section className="panel">
      <h2>Información del sorteo</h2>
      <p className="small muted">Edita el nombre de la edición, el artículo y el texto que verá el visitante.</p>
      <form className="form-stack top-gap" onSubmit={submit}>
        <label>Nombre del sorteo<input required minLength={5} maxLength={90} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>Artículo o premio<input required minLength={2} maxLength={90} value={prize} onChange={(e) => setPrize(e.target.value)} /></label>
        <label>Descripción para el carrusel<input maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {notice && <div className="alert alert-success" role="status">{notice}</div>}
        <button className="btn btn-primary" type="submit">Guardar información</button>
      </form>
    </section>
    <section className="panel">
      <div className="panel-heading"><div><h2>Imágenes independientes</h2>
        <p className="small muted">Cada sorteo dispone de una imagen promocional para la portada y otra para mostrar el premio.</p></div></div>
      <div className="admin-image-grid">
        <ImageEditor key={draw.id + ":hero"} drawId={draw.id} kind="hero" label="1 · Imagen promocional"
          description="Se muestra en el encabezado principal del embudo cuando este sorteo es el destacado." />
        <ImageEditor key={draw.id + ":prize"} drawId={draw.id} kind="prize" label="2 · Imagen del artículo"
          description="Se muestra en la tarjeta del sorteo del carrusel, como fotografía o ilustración del premio." />
      </div>
    </section>
  </div>;
}
