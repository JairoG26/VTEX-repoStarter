import { health } from '../middlewares/health'

const run = async (ping: jest.Mock) => {
  const ctx: any = { clients: { shippingMock: { ping } }, status: 0, body: undefined }
  await health(ctx, async () => {})
  return ctx
}

describe('health', () => {
  it('200 y JSON ok cuando el servicio responde', async () => {
    const ctx = await run(jest.fn().mockResolvedValue({ ok: true }))

    expect(ctx.status).toBe(200)
    expect(ctx.body).toEqual({ status: 'ok' })
  })

  it('503 y JSON serializable cuando falla', async () => {
    const ctx = await run(jest.fn().mockRejectedValue(new Error('timeout')))

    expect(ctx.status).toBe(503)
    expect(JSON.parse(JSON.stringify(ctx.body))).toEqual({ status: 'down', error: 'timeout' })
  })
})