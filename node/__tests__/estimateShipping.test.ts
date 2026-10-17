import { estimateShipping } from '../resolvers/estimateShipping'

const quotes = [
  { carrier: 'Servientrega', days: 3, cost: 12000 },
  { carrier: 'Coordinadora', days: 5, cost: 8000 },
]

const makeCtx = (getQuotes: jest.Mock) =>
  ({
    clients: { shippingMock: { getQuotes } },
    vtex: { logger: { warn: jest.fn() } },
  } as any)

// La caché es global al módulo: uso un productId distinto por test
// para que no se contaminen entre sí.
describe('estimateShipping', () => {
  it('mapea las cotizaciones al schema', async () => {
    const getQuotes = jest.fn().mockResolvedValue(quotes)
    const result = await estimateShipping(null, { productId: 'a', postalCode: '1' }, makeCtx(getQuotes))

    expect(result[0]).toEqual({ carrierName: 'Servientrega', estimatedDays: 3, price: 12000 })
    expect(getQuotes).toHaveBeenCalledWith('a', '1')
  })

  it('devuelve [] y registra warning si el servicio falla', async () => {
    const getQuotes = jest.fn().mockRejectedValue(new Error('boom'))
    const ctx = makeCtx(getQuotes)
    const result = await estimateShipping(null, { productId: 'b', postalCode: '1' }, ctx)

    expect(result).toEqual([])
    expect(ctx.vtex.logger.warn).toHaveBeenCalled()
  })

  it('cachea: dos llamadas iguales, una sola al servicio', async () => {
    const getQuotes = jest.fn().mockResolvedValue(quotes)
    const ctx = makeCtx(getQuotes)
    await estimateShipping(null, { productId: 'c', postalCode: '1' }, ctx)
    await estimateShipping(null, { productId: 'c', postalCode: '1' }, ctx)

    expect(getQuotes).toHaveBeenCalledTimes(1)
  })

  it('la clave incluye el código postal', async () => {
    const getQuotes = jest.fn().mockResolvedValue(quotes)
    const ctx = makeCtx(getQuotes)
    await estimateShipping(null, { productId: 'd', postalCode: '1' }, ctx)
    await estimateShipping(null, { productId: 'd', postalCode: '2' }, ctx)

    expect(getQuotes).toHaveBeenCalledTimes(2)
  })

  it('no cachea listas vacías', async () => {
    const getQuotes = jest.fn().mockResolvedValue([])
    const ctx = makeCtx(getQuotes)
    await estimateShipping(null, { productId: 'e', postalCode: '1' }, ctx)
    await estimateShipping(null, { productId: 'e', postalCode: '1' }, ctx)

    expect(getQuotes).toHaveBeenCalledTimes(2)
  })

  it('no cachea errores: tras una falla, la siguiente llamada sí consulta', async () => {
    const getQuotes = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(quotes)
    const ctx = makeCtx(getQuotes)
    await estimateShipping(null, { productId: 'f', postalCode: '1' }, ctx)
    const result = await estimateShipping(null, { productId: 'f', postalCode: '1' }, ctx)

    expect(result).toHaveLength(2)
  })

  it('la caché expira tras el TTL', async () => {
    const now = jest.spyOn(Date, 'now')
    now.mockReturnValue(1_000_000)

    const getQuotes = jest.fn().mockResolvedValue(quotes)
    const ctx = makeCtx(getQuotes)
    await estimateShipping(null, { productId: 'g', postalCode: '1' }, ctx)

    now.mockReturnValue(1_000_000 + 5 * 60 * 1000 + 1)
    await estimateShipping(null, { productId: 'g', postalCode: '1' }, ctx)

    expect(getQuotes).toHaveBeenCalledTimes(2)
    now.mockRestore()
  })
})