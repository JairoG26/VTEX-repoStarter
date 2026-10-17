import type { ServiceContext } from '@vtex/api'

import type { Clients } from '../clients'

type Context = ServiceContext<Clients>

interface Args {
  productId: string
  postalCode: string
}

interface ShippingEstimate {
  carrierName: string
  estimatedDays: number
  price: number
}

const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_MAX_ENTRIES = 500

// Caché en memoria del proceso: Map con expiración y tope de tamaño
const cache = new Map<string, { value: ShippingEstimate[]; expiresAt: number }>()

function getCached(key: string) {
  const entry = cache.get(key)

  if (!entry) return undefined
  if (entry.expiresAt < Date.now()) {
    cache.delete(key)

    return undefined
  }

  return entry.value
}

function setCached(key: string, value: ShippingEstimate[]) {
  cache.delete(key) // reinsertar para que quede como la más reciente

  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value

    if (oldest !== undefined) cache.delete(oldest)
  }

  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout tras ${ms} ms`)), ms)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export const estimateShipping = async (
  _root: unknown,
  { productId, postalCode }: Args,
  ctx: Context
): Promise<ShippingEstimate[]> => {
  const key = `${productId}:${postalCode}`
  const cached = getCached(key)

  if (cached) return cached

  try {
    const quotes = await ctx.clients.shippingMock.getQuotes(productId, postalCode)

    const estimates = (quotes ?? []).map((quote) => ({
      carrierName: quote.carrier,
      estimatedDays: quote.days,
      price: quote.cost,
    }))

    // Solo cacheamos respuestas útiles; ni errores ni listas vacías
    if (estimates.length > 0) setCached(key, estimates)

    return estimates
  } catch (error) {
    ctx.vtex.logger.warn({
      message: 'estimateShipping falló, devolviendo fallback',
      productId,
      postalCode,
      error: error instanceof Error ? error.message : String(error),
    })

    return []
  }
}