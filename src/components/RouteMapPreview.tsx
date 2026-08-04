'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface RouteMapPreviewProps {
  polyline: string
}

// Google Polyline 解码函数
function decodePolyline(encoded: string): [number, number][] {
  let points: [number, number][] = []
  let index = 0, len = encoded.length
  let lat = 0, lng = 0
  while (index < len) {
    let b, shift = 0, result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lat += dlat
    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lng += dlng
    points.push([lat / 1e5, lng / 1e5])
  }
  return points
}

export default function RouteMapPreview({ polyline }: RouteMapPreviewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current || !polyline) return

    // 初始化地图实例（仅执行一次）
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      })

      // 加载高颜值精美浅色地图底图 (CartoDB Voyager)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map)

      mapInstanceRef.current = map
    }

    const map = mapInstanceRef.current
    const coords = decodePolyline(polyline)

    if (coords.length > 0) {
      // 清理旧的轨迹图层
      map.eachLayer((layer) => {
        if (layer instanceof L.Polyline) {
          map.removeLayer(layer)
        }
      })

      // 绘制骑行轨迹路线
      const polylineLayer = L.polyline(coords, {
        color: '#0284c7', // 天蓝色
        weight: 4.5,
        opacity: 0.9,
      }).addTo(map)

      // 自动缩放并居中适配路线
      map.fitBounds(polylineLayer.getBounds(), { padding: [15, 15] })
    }

    setTimeout(() => {
      map.invalidateSize()
    }, 50)

  }, [polyline])

  // 组件卸载时销毁地图
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  if (!polyline) {
    return <div className="text-xs text-slate-400 flex items-center justify-center h-36 bg-slate-100 rounded-2xl">暂无轨迹数据</div>
  }

  return (
    <div className="w-[260px] h-[160px] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white relative">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-lg text-[10px] font-semibold text-slate-700 shadow-sm z-[1000] border border-slate-100">
        🗺️ 真实路线地图
      </div>
    </div>
  )
}