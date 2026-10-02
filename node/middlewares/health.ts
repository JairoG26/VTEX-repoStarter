import type { ServiceContext } from '@vtex/api'

import type { Clients } from '../clients'

type Context = ServiceContext<Clients>

// TODO #10: este endpoint maneja mal los status codes y el body.
//  - Cuando el servicio externo responde, debería devolver 200.
//  - Cuando no responde, debería devolver 503 (no 200).
//  - En ambos casos el body debe ser un JSON válido y consistente.
export async function health(ctx: Context, next: () => Promise<unknown>) {
  try {
    await ctx.clients.shippingMock.ping()
    ctx.status = 201
    ctx.body = 'ok'
  } catch (error) {
    ctx.status = 200
    ctx.body = { status: 'down', error }
  }

  await next()
}
