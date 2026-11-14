/**
 * Photographs: free-to-use real photographs from Unsplash.
 * These are category/reference photographs, not evidence that Oportunia
 * owns a prize and not exact-model certification (notably the iPhone 18).
 * Use a real organizer-uploaded URL in preference to stock photography.
 */
export type PrizePhoto={src:string;source:string;photographer:string;description:string};
export const prizePhotography:Record<string,PrizePhoto>={
  principal:{
    src:"https://images.unsplash.com/photo-1760443728269-29f0e2188598?auto=format&fit=crop&w=1200&q=82",
    source:"https://unsplash.com/photos/white-smartphone-resting-on-a-wooden-desk-next-to-keyboard-C0Ax4dvnbB8",
    photographer:"Todd Jiang",description:"Fotografía real de un teléfono Apple; no corresponde necesariamente al modelo iPhone 18"
  },
  "concepto-consola":{
    src:"https://images.unsplash.com/photo-1622297845775-5ff3fef71d13?auto=format&fit=crop&w=1200&q=82",
    source:"https://unsplash.com/photos/white-playstation-five-console-and-controller-ads33nL7V4k",
    photographer:"Nik",description:"Fotografía real de una consola PlayStation 5"
  },
  "concepto-televisor":{
    src:"https://images.unsplash.com/photo-1735078254602-b7818942c324?auto=format&fit=crop&w=1200&q=82",
    source:"https://unsplash.com/photos/a-living-room-filled-with-furniture-and-a-flat-screen-tv-gNhaTTZtwVE",
    photographer:"Andrii Solok",description:"Fotografía real de un televisor dentro de una sala"
  },
  "concepto-moto":{
    src:"https://images.unsplash.com/photo-1749902511284-493f1cb94804?auto=format&fit=crop&w=1200&q=82",
    source:"https://unsplash.com/photos/a-motorcycle-parked-on-a-city-street-TFiuDaXnqYM",
    photographer:"Danny Greenberg",description:"Fotografía real de una motocicleta urbana"
  },
  "concepto-portatil":{
    src:"https://images.unsplash.com/photo-1768219565623-501f93ae384b?auto=format&fit=crop&w=1200&q=82",
    source:"https://unsplash.com/photos/laptop-notebook-and-coffee-on-a-desk-srrvlsaB2P4",
    photographer:"Lau Clrd",description:"Fotografía real de un computador portátil"
  },
  "concepto-tablet":{
    src:"https://images.unsplash.com/photo-1708765275942-091b2e04905c?auto=format&fit=crop&w=1200&q=82",
    source:"https://unsplash.com/photos/a-tablet-computer-sitting-on-top-of-a-wooden-table-w3mSws0IAU4",
    photographer:"Salvador Rios",description:"Fotografía real de una tablet en un escritorio"
  }
};
export type SelectedPrizeImage={src:string;isStockPhoto:boolean;description:string};
export function selectPrizeImage(
 drawId:string,
 uploadedOrExisting:string|null|undefined,
 fallback:string
):SelectedPrizeImage{
 const provided=(uploadedOrExisting||"").trim();
 // An organizer-provided photograph replaces the stock example. SVG placeholders do not.
 const organizerPhoto=Boolean(provided)&&!/(\/raffles\/|\.svg(?:$|\?))/i.test(provided);
 if(organizerPhoto)return {src:provided,isStockPhoto:false,description:"Foto de la edición"};
 const stock=prizePhotography[drawId];
 if(stock)return {src:stock.src,isStockPhoto:true,description:stock.description};
 return {src:provided||fallback,isStockPhoto:false,description:"Imagen del catálogo"};
}
