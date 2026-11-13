"use client";

import { useEffect, useState } from "react";

/**
 * Imágenes de DEMOSTRACIÓN: IndexedDB del navegador, nunca Supabase ni GitHub.
 * No representa publicación global, ni debe habilitarse como administrador real
 * hasta incorporar autenticación, roles y Storage protegido.
 */
export type DrawImageKind = "hero" | "prize";
const DB_NAME = "oportunia-demo-images-v1";
const STORE = "draw-images";
const EVENT = "oportunia-demo-image-updated";
const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

type ImageRecord = { id: string; blob: Blob; updatedAt: string };
const imageKey = (drawId: string, kind: DrawImageKind) => drawId + ":" + kind;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Este navegador no permite almacenar imágenes locales."));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("No se pudo abrir el almacén de imágenes."));
  });
}

export async function readDrawImage(drawId: string, kind: DrawImageKind): Promise<Blob | null> {
  const db = await openDb();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(imageKey(drawId, kind));
      request.onsuccess = () => resolve((request.result as ImageRecord | undefined)?.blob || null);
      request.onerror = () => reject(request.error || new Error("No se pudo leer la imagen."));
    });
  } finally { db.close(); }
}

export async function saveDrawImage(drawId: string, kind: DrawImageKind, file: File): Promise<void> {
  if (!drawId) throw new Error("Selecciona un sorteo.");
  if (!ALLOWED.has(file.type)) throw new Error("Usa una imagen PNG, JPG o WebP.");
  if (file.size === 0 || file.size > MAX_BYTES) throw new Error("La imagen debe pesar entre 1 byte y 6 MB.");
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({
        id: imageKey(drawId, kind), blob: file, updatedAt: new Date().toISOString(),
      } satisfies ImageRecord);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("No se pudo guardar la imagen."));
      tx.onabort = () => reject(tx.error || new Error("El navegador canceló el guardado."));
    });
  } finally { db.close(); }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { drawId, kind } }));
}

export async function removeDrawImage(drawId: string, kind: DrawImageKind): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(imageKey(drawId, kind));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("No se pudo quitar la imagen."));
      tx.onabort = () => reject(tx.error || new Error("El navegador canceló el cambio."));
    });
  } finally { db.close(); }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { drawId, kind } }));
}

/** Hook seguro para URLs temporales de Blob, revocadas al cambiar imagen/sorteo. */
export function useDrawImage(drawId: string | undefined, kind: DrawImageKind): string | null {
  const key = drawId ? imageKey(drawId, kind) : "";
  const [current, setCurrent] = useState<{ key: string; url: string | null }>({ key: "", url: null });
  useEffect(() => {
    let live = true;
    let version = 0;
    let activeUrl: string | null = null;
    async function refresh() {
      const requestVersion = ++version;
      try {
        const blob = drawId ? await readDrawImage(drawId, kind) : null;
        if (!live || requestVersion !== version) return;
        const url = blob ? URL.createObjectURL(blob) : null;
        if (activeUrl) URL.revokeObjectURL(activeUrl);
        activeUrl = url;
        setCurrent({ key, url });
      } catch {
        if (live && requestVersion === version) {
          if (activeUrl) URL.revokeObjectURL(activeUrl);
          activeUrl = null;
          setCurrent({ key, url: null });
        }
      }
    }
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ drawId: string; kind: DrawImageKind }>).detail;
      if (detail?.drawId === drawId && detail?.kind === kind) void refresh();
    };
    void refresh();
    window.addEventListener(EVENT, onUpdated);
    return () => {
      live = false; version++;
      window.removeEventListener(EVENT, onUpdated);
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [drawId, kind, key]);
  return current.key === key ? current.url : null;
}
