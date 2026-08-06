import { NextResponse } from 'next/server'

export const revalidate = 1800

export async function GET() {
  try {
    const [weatherResponse, airResponse] = await Promise.all([
      fetch('https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278&current=temperature_2m,wind_speed_10m,wind_direction_10m,precipitation&daily=precipitation_probability_max,sunset&timezone=Europe%2FLondon', { next: { revalidate: 1800 } }),
      fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=51.5074&longitude=-0.1278&current=european_aqi&timezone=Europe%2FLondon', { next: { revalidate: 1800 } }),
    ])
    if (!weatherResponse.ok || !airResponse.ok) throw new Error('Weather data unavailable')
    const weather = await weatherResponse.json(); const air = await airResponse.json()
    return NextResponse.json({ temperature: weather.current.temperature_2m, windSpeed: weather.current.wind_speed_10m, windDirection: weather.current.wind_direction_10m, raining: weather.current.precipitation > 0, rainProbability: weather.daily.precipitation_probability_max[0] ?? 0, sunset: weather.daily.sunset[0], aqi: air.current.european_aqi })
  } catch { return NextResponse.json({ error: 'unavailable' }, { status: 503 }) }
}
