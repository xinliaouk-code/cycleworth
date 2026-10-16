// The credential is passed only to the installed iPhone app, never to a web URL.
export function autoExportLink(origin: string, credential: string, writesAuthorized = false) {
  const target = new URL('/api/health/sync', origin)
  const parameters = {
    url: target.href, name: 'CycleWorth Cycling', format: 'json', datatype: 'workouts',
    exportversion: 'v2', period: 'none', includeroutes: 'true', includeworkoutmetadata: 'true',
    workoutsmetadatainterval: 'minutes', batchrequests: 'true', syncinterval: 'hours', syncquantity: '1',
    requesttimeout: '120', enabled: 'true', notifywhenrun: 'true',
    headers: `Authorization,Bearer ${credential},X-CycleWorth-Dry-Run,${writesAuthorized ? 'false' : 'true'}`,
  }
  return 'com.HealthExport://automation?' + Object.entries(parameters).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')
}
