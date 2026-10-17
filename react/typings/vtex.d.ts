declare module 'vtex.product-context' {
  interface Product {
    productId: string
    [key: string]: unknown
  }

  export function useProduct():
    | { product?: Product | null; [key: string]: unknown }
    | undefined
}

declare module 'vtex.order-manager/OrderForm' {
  interface OrderForm {
    shippingData?: {
      address?: { postalCode?: string | null } | null
    } | null
  }

  export function useOrderForm(): {
    loading: boolean
    orderForm?: OrderForm
  }
}

declare module 'vtex.css-handles' {
  export function useCssHandles<T extends readonly string[]>(
    handles: T
  ): { handles: Record<T[number], string> }
}

declare module '*.graphql' {
  const value: import('graphql').DocumentNode
  export default value
}