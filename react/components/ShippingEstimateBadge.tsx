import React, {useMemo} from 'react'
import { useQuery } from 'react-apollo'
import { useProduct } from 'vtex.product-context'
import { useOrderForm } from 'vtex.order-manager/OrderForm'
import { useCssHandles } from 'vtex.css-handles'

import ESTIMATE_SHIPPING from '../../graphql/estimateShipping.graphql'

const CSS_HANDLES = [
  'container',
  'title',
  'estimate',
  'carrier',
  'price',
  'error',
] as const

const FALLBACK_POSTAL_CODE = '110111'

interface Props {
  showCarrierName?: boolean
  blockClass?: string
}

interface ShippingEstimate {
  carrierName: string
  estimatedDays: number
  price: number
}

interface QueryData {
  estimateShipping: ShippingEstimate[]
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

// TODO #7: vista memoizada. Solo se re-renderiza si cambia el estimado
// o la prop, no por cada cambio del product-context.
const EstimateView = React.memo(function EstimateView({
  estimate,
  showCarrierName,
}: {
  estimate: ShippingEstimate
  showCarrierName: boolean
}) {
  const { handles } = useCssHandles(CSS_HANDLES)

  return (
    <div className={handles.container}>
      <span className={handles.title}>Recíbelo en</span>{' '}
      <strong className={handles.estimate}>
        {estimate.estimatedDays} días hábiles
      </strong>
      {showCarrierName && (
        <span className={handles.carrier}> con {estimate.carrierName}</span>
      )}{' '}
      <span className={handles.price}>({formatPrice(estimate.price)})</span>
    </div>
  )
})

const ShippingEstimateBadge: StorefrontFunctionComponent<Props> = ({
  showCarrierName = false,
}) => {
  const { handles } = useCssHandles(CSS_HANDLES)
  const productContext = useProduct()

  const productId = productContext?.product?.productId

  const { orderForm, loading: orderFormLoading } = useOrderForm()
  const postalCode = orderForm?.shippingData?.address?.postalCode || FALLBACK_POSTAL_CODE

  const { data, loading, error } = useQuery<QueryData>(ESTIMATE_SHIPPING, {
    variables: { productId, postalCode },
    skip: !productId || orderFormLoading, // Evita ejecutar la query si no hay productId o si el orderForm aún está cargando
  })

  const fastest = useMemo(
    () =>
      (data?.estimateShipping ?? []).reduce<ShippingEstimate | undefined>(
        (best: ShippingEstimate | undefined, current: ShippingEstimate) =>
          !best || current.estimatedDays < best.estimatedDays ? current : best,
        undefined
      ),
    [data]
  )

  if (!productId || loading || orderFormLoading) return null
  if (error) {
    return (
      <div className={handles.error}>
        No pudimos calcular el estimado de entrega.
      </div>
    )
  }
  if (!fastest) return null // lista vacía: no mostramos nada

  return <EstimateView estimate={fastest} showCarrierName={showCarrierName} />
}

ShippingEstimateBadge.schema = {
  title: 'Shipping Estimate Badge',
}

export default ShippingEstimateBadge
