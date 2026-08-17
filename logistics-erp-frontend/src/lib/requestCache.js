const entries = new Map()

function keyFor(config) {
  const identity = localStorage.getItem('erp_user') || 'anonymous'
  return `${identity}:${config.method || 'get'}:${config.url}:${JSON.stringify(config.params || {})}`
}

export function readCached(config) {
  const cached = entries.get(keyFor(config))
  return cached && cached.expiresAt > Date.now() ? cached.response : null
}

export function cacheResponse(config, response, ttl = 30_000) {
  entries.set(keyFor(config), { response, expiresAt: Date.now() + ttl })
}

export function invalidateCache(...prefixes) {
  for (const key of entries.keys()) {
    if (prefixes.some((prefix) => key.includes(`:${prefix}`))) entries.delete(key)
  }
}
