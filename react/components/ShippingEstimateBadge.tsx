import React from 'react'
import { useQuery } from 'react-apollo'
import { useProduct } from 'vtex.product-context'
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

// TODO #3: `showCarrierName` debe ser OPCIONAL y tener un valor por
// defecto (false). Hoy es obligatoria y el bloque falla si no se configura.
interface Props {
  showCarrierName: boolean
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

const ShippingEstimateBadge: StorefrontFunctionComponent<Props> = ({
  showCarrierName,
}) => {
  const { handles } = useCssHandles(CSS_HANDLES)
  const productContext = useProduct()

  // TODO #4: esta línea rompe la página cuando el componente se
  // renderiza fuera de un product-context o mientras el producto aún no ha
  // cargado (product es null/undefined).
  const productId = productContext.product.productId

  // TODO #5: el código postal está hardcodeado. Debe resolverse
  // desde el contexto de la tienda (por ejemplo, la dirección del orderForm
  // del comprador) y solo usar un valor por defecto como último recurso.
  const defaultPostalCode = '110111'

  const { data, loading, error } = useQuery<QueryData>(ESTIMATE_SHIPPING, {
    variables: { productId, postalCode: defaultPostalCode },
  })

  // TODO #6: no hay manejo de `loading` ni de `error`. Se lee
  // `data.estimateShipping` directamente, lo que falla mientras la query
  // está en curso o si el resolver devuelve un error.

  // TODO #7: optimización de renders. Este cálculo se rehace en cada
  // render y el componente se vuelve a renderizar con cualquier cambio del
  // product-context (p. ej. al seleccionar otro SKU), aunque el resultado no
  // cambie. Revisa también si esta línea tiene efectos colaterales.
  const fastest = data.estimateShipping.sort(
    (a, b) => a.estimatedDays - b.estimatedDays
  )[0]

  return (
    <div className={handles.container}>
      <span className={handles.title}>Recíbelo en</span>{' '}
      <strong className={handles.estimate}>
        {fastest.estimatedDays} días hábiles
      </strong>
      {showCarrierName && (
        <span className={handles.carrier}> con {fastest.carrierName}</span>
      )}{' '}
      <span className={handles.price}>({formatPrice(fastest.price)})</span>
    </div>
  )
}

ShippingEstimateBadge.schema = {
  title: 'Shipping Estimate Badge',
}

export default ShippingEstimateBadge
