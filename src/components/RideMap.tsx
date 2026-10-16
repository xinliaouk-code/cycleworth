'use client'
import {useEffect,useRef,useState} from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Bounds checks prevent a truncated legacy polyline from creating invalid map bounds.
function decodePolyline(encoded:string):[number,number][]{
 const points:[number,number][]=[]
 let index=0,lat=0,lng=0
 function delta(){
  let shift=0,result=0,b=0
  do{
   if(index>=encoded.length || shift>30)throw new Error('Invalid route')
   b=encoded.charCodeAt(index++)-63
   if(b<0||b>63)throw new Error('Invalid route')
   result|=(b&31)<<shift;shift+=5
  }while(b>=32)
  return result&1?~(result>>1):result>>1
 }
 try{
  while(index<encoded.length){lat+=delta();lng+=delta();if(Math.abs(lat)>9000000||Math.abs(lng)>18000000)return [];points.push([lat/1e5,lng/1e5])}
  return points
 }catch{return []}
}
export default function RideMap({polyline}:{polyline:string|null}){
 const container=useRef<HTMLDivElement>(null)
 const [tileError,setTileError]=useState(false)
 const coords=decodePolyline(polyline??'')
 const valid=coords.length>1
 useEffect(()=>{
  if(!container.current || !valid)return
  const points=decodePolyline(polyline??'')
  let disposed=false
  const map=L.map(container.current,{zoomControl:false,attributionControl:true,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false})
  // Standard OSM endpoint: normal browser caching and Referer, visible attribution,
  // viewport tiles only. CARTO now returns API-key-required placeholder images.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
   maxZoom:19,keepBuffer:0,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).on('tileerror',()=>{if(!disposed)setTileError(true)}).addTo(map)
  const route=L.polyline(points,{color:'#0284c7',weight:4.5,opacity:0.9}).addTo(map)
  const fit=()=>{if(!disposed){map.invalidateSize();map.fitBounds(route.getBounds(),{padding:[20,20],maxZoom:16,animate:false})}}
  const observer=new ResizeObserver(fit);observer.observe(container.current)
  const frame=requestAnimationFrame(()=>{setTileError(false);fit()})
  return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();map.remove()}
 },[polyline,valid])
 if(!valid)return <div className="flex h-full min-h-32 items-center justify-center rounded-2xl bg-slate-100 p-4 text-xs text-slate-500">暂无可用轨迹 · No route data</div>
 return <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
  <div ref={container} className="h-full w-full" aria-label="Ride route map"/>
  <div className="pointer-events-none absolute left-2 top-2 z-[1000] rounded-lg border border-slate-100 bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-sm">🗺️ 骑行路线 · Ride route</div>
  {tileError&&<p role="status" className="absolute bottom-6 left-2 right-2 z-[1000] rounded-lg bg-white/95 p-2 text-[10px] text-amber-800">底图暂时不可用，路线仍保留 · Map tiles unavailable; route retained.</p>}
 </div>
}
