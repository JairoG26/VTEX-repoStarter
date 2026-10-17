import React from 'react'
import { render, screen } from '@testing-library/react'
import { useQuery } from 'react-apollo'
import { useProduct } from 'vtex.product-context'
import { useOrderForm } from 'vtex.order-manager/OrderForm'

import ShippingEstimateBadge from '../components/ShippingEstimateBadge'

jest.mock('react-apollo', () => ({ useQuery: jest.fn() }))
jest.mock('vtex.product-context', () => ({ useProduct: jest.fn() }), { virtual: true })
jest.mock('vtex.order-manager/OrderForm', () => ({ useOrderForm: jest.fn() }), { virtual: true })
jest.mock(
  'vtex.css-handles',
  () => ({
    useCssHandles: (hs: readonly string[]) => ({
      handles: hs.reduce((acc: Record<string, string>, h) => {
        acc[h] = h
        return acc
      }, {}),
    }),
  }),
  { virtual: true }
)

const mockQuery = useQuery as jest.Mock
const mockProduct = useProduct as jest.Mock
const mockOrderForm = useOrderForm as jest.Mock

const estimates = [
  { carrierName: 'Lenta', estimatedDays: 5, price: 8000 },
  { carrierName: 'Rápida', estimatedDays: 2, price: 15000 },
]

beforeEach(() => {
  mockProduct.mockReturnValue({ product: { productId: '10' } })
  mockOrderForm.mockReturnValue({
    loading: false,
    orderForm: { shippingData: { address: { postalCode: '050001' } } },
  })
  mockQuery.mockReturnValue({ data: { estimateShipping: estimates }, loading: false })
})

describe('ShippingEstimateBadge', () => {
  it('TODO 4: no falla y omite la query si no hay product', () => {
    mockProduct.mockReturnValue(undefined)
    const { container } = render(<ShippingEstimateBadge />)

    expect(container.firstChild).toBeNull()
    expect(mockQuery.mock.calls[0][1].skip).toBe(true)
  })

  it('TODO 5: usa el código postal del orderForm', () => {
    render(<ShippingEstimateBadge />)

    expect(mockQuery.mock.calls[0][1].variables).toEqual({ productId: '10', postalCode: '050001' })
  })

  it('TODO 5: cae al código por defecto si no hay dirección', () => {
    mockOrderForm.mockReturnValue({ loading: false, orderForm: {} })
    render(<ShippingEstimateBadge />)

    expect(mockQuery.mock.calls[0][1].variables.postalCode).toBe('110111')
  })

  it('TODO 3: showCarrierName es opcional y por defecto no muestra la transportadora', () => {
    render(<ShippingEstimateBadge />)

    expect(screen.queryByText(/con Rápida/)).toBeNull()
  })

  it('muestra la transportadora cuando showCarrierName es true', () => {
    render(<ShippingEstimateBadge showCarrierName />)

    expect(screen.getByText(/con Rápida/)).toBeTruthy()
  })

  it('TODO 6: no renderiza nada mientras carga', () => {
    mockQuery.mockReturnValue({ data: undefined, loading: true })
    const { container } = render(<ShippingEstimateBadge />)

    expect(container.firstChild).toBeNull()
  })

  it('TODO 6: muestra mensaje si la query falla', () => {
    mockQuery.mockReturnValue({ data: undefined, loading: false, error: new Error('x') })
    render(<ShippingEstimateBadge />)

    expect(screen.getByText(/No pudimos calcular/)).toBeTruthy()
  })

  it('TODO 6: lista vacía no renderiza nada', () => {
    mockQuery.mockReturnValue({ data: { estimateShipping: [] }, loading: false })
    const { container } = render(<ShippingEstimateBadge />)

    expect(container.firstChild).toBeNull()
  })

  it('TODO 7: elige el más rápido sin mutar los datos', () => {
    const frozen = Object.freeze([...estimates]) // .sort() sobre esto lanzaría error
    mockQuery.mockReturnValue({ data: { estimateShipping: frozen }, loading: false })
    render(<ShippingEstimateBadge />)

    expect(screen.getByText(/2 días hábiles/)).toBeTruthy()
    expect(frozen[0].carrierName).toBe('Lenta')
  })
})