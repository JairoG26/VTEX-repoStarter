import type { ServiceContext } from '@vtex/api'

import type { Clients } from '../clients'

type Context = ServiceContext<Clients>

// TODO #8: actualizar la firma para recibir { productId, postalCode }
// como argumentos tipados, una vez agregados al schema GraphQL.
export const estimateShipping = async (
  _root: unknown,
  _args: unknown,
  ctx: Context
) => {
  // Valores fijos mientras el schema no recibe argumentos.
  const productId = '1'
  const postalCode = '110111'

  // TODO #9: implementación incompleta.
  //  - No hay timeout: si el servicio externo tarda, la PDP queda esperando.
  //  - No hay manejo de errores: cualquier falla del servicio se propaga tal cual.
  //  - No hay fallback: el front no recibe nada útil si el servicio cae.
  //  - No hay caching: cada render de la PDP genera una llamada externa.
  //  Implementa estos cuatro puntos y justifica tu estrategia de caching
  //  en RESPUESTAS.md.
  const quotes = await ctx.clients.shippingMock.getQuotes(productId, postalCode)

  return quotes.map((quote) => ({
    carrierName: quote.carrier,
    estimatedDays: quote.days,
    price: quote.cost,
  }))
}
