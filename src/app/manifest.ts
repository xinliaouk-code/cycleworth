import type { MetadataRoute } from 'next'
export default function manifest(): MetadataRoute.Manifest {
  return { name: 'CycleWorth', short_name: 'CycleWorth', description: 'Your rides, savings and bike care.', start_url: '/dashboard', scope: '/', display: 'standalone', background_color: '#eaf3f7', theme_color: '#eaf3f7', icons: [{ src: '/brand/cycleworth-icon-hd.png', sizes: '1254x1254', type: 'image/png', purpose: 'any' }] }
}
