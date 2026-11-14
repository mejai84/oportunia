import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {SUPABASE_PUBLIC_KEY,SUPABASE_URL} from "@/lib/oportuniaSupabase";
import {defaultHomeContent,fallbackHomeCards} from "@/lib/homeContent";
export const dynamic="force-dynamic";
export async function GET(){
 try {
  const client=createClient(SUPABASE_URL,SUPABASE_PUBLIC_KEY,{auth:{persistSession:false}});
  const [a,b]=await Promise.all([
   client.from("home_content").select("content").eq("id","homepage").single(),
   client.from("home_cards").select("id,title,description,image_url,display_order,enabled").eq("enabled",true).order("display_order"),
  ]);
  if(a.error||b.error)return NextResponse.json({content:defaultHomeContent,cards:fallbackHomeCards},
   {headers:{"Cache-Control":"no-store"}});
  return NextResponse.json({content:a.data?.content||defaultHomeContent,cards:b.data||[]},
   {headers:{"Cache-Control":"public, max-age=0, s-maxage=15"}});
 }catch{
  return NextResponse.json({content:defaultHomeContent,cards:fallbackHomeCards},
   {headers:{"Cache-Control":"no-store"}});
 }
}
