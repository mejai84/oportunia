"use client";
import {useEffect,useState} from "react";
import {defaultHomeContent,fallbackHomeCards,normalizeHomeContent,type HomeContentData,type HomeCard} from "@/lib/homeContent";
export function useHomeContent(){
 const [content,setContent]=useState<HomeContentData>(defaultHomeContent);
 const [ideas,setIdeas]=useState<HomeCard[]>(fallbackHomeCards);
 useEffect(()=>{
  const controller=new AbortController();
  fetch("/api/home-content",{signal:controller.signal,cache:"no-store"})
   .then(async r=>{if(!r.ok)throw Error("CMS unavailable");return r.json() as Promise<{content:HomeContentData;cards:HomeCard[]}>;})
   .then(data=>{setContent(normalizeHomeContent(data.content));setIdeas(data.cards||[]);})
   .catch(()=>{/* Preserve visual defaults if the CMS is not reachable. */});
  return()=>controller.abort();
 },[]);
 return {content,ideas};
}
