# Respuestas — VTEX IO Challenge

**Nombre:** Jairo Alberto Garavito Correa
**Tiempo aproximado invertido:**

> Para cada tarea, explica brevemente qué cambiaste y por qué. Si no alcanzaste a implementar alguna, describe cómo la resolverías.

---

## Store

### 1. Error de sintaxis en `store/blocks.jsonc`

**Solución:** Faltaba una coma entre `showCarrierName` y `blockClass` dentro de `props`, lo que hacía el archivo inválido y bloqueaba la compilación del builder `store`. Agregué la coma y comprobé que el archivo parsea sin errores.

### 2. Interface de `shipping-estimate-badge`

**Solución:** Agregué en `interfaces.jsonc` la interface `shipping-estimate-badge` con `component: "ShippingEstimateBadge"`, que coincide con el entry point `react/ShippingEstimateBadge.tsx` (que re-exporta el componente de components/). Sin esa interface el builder `store` no puede resolver el bloque usado en `blocks.jsonc`

---

## Componente React

### 3. Tipado de `showCarrierName`

**Solución:** Hice la prop opcional (`showCarrierName?: boolean`) y le di el valor por defecto `false` en la desestructuración del componente. Así el bloque ya no falla cuando no se configura en `blocks.jsonc`, y el comportamiento por defecto es no mostrar el nombre de la transportadora.

### 4. Acceso seguro a `product.productId`

**Solución:** Cambié el acceso a `productContext?.product?.productId` usando optional chaining. Antes, si el componente se renderizaba fuera de un product-context o mientras el producto aún no había cargado, `product` era `null`/`undefined` y la línea lanzaba un error que rompía la página. Ahora `productId` queda `undefined` en esos casos y el componente no falla. Además, la query se omite (`skip`) mientras no haya `productId`, para no consultar con una variable inválida.

### 5. Resolución de `defaultPostalCode`

**Solución:** El código postal ahora se toma de la dirección del orderForm del comprador (`orderForm.shippingData.address.postalCode`) mediante `useOrderForm`, en lugar de estar hardcodeado. Solo si el comprador aún no tiene una dirección registrada se usa `FALLBACK_POSTAL_CODE` (`110111`), como último recurso, para que el badge pueda mostrar un estimado de todas formas. La query espera a que el orderForm termine de cargar para no disparar dos consultas seguidas (una con el código por defecto y otra con el real).

### 6. Manejo de `loading` y `error`

**Solución:** Antes de leer los datos, el componente no renderiza nada mientras no hay `productId` o mientras cargan la query o el orderForm, y muestra un mensaje discreto (handle `error`) si la query falla. Si la lista llega vacía, tampoco renderiza nada. El badge es informativo, así que prefiero degradar sin ruido antes que bloquear o ensuciar la página de producto. Además, la query se omite con `skip` hasta tener `productId` y el orderForm cargado, para no consultar con variables inválidas ni disparar dos consultas seguidas.

### 7. Optimización de renders

**Solución:** El `.sort()` original mutaba el resultado que Apollo guarda en su caché, así que lo reemplacé por una búsqueda del mínimo con `reduce` dentro de un `useMemo` que depende de `data`; además es O(n) en lugar de ordenar todo el arreglo. El `useMemo` está antes de los `return` tempranos para respetar las reglas de los hooks. Como `useProduct` re-renderiza el componente por contexto (por ejemplo, al cambiar de SKU) aunque el estimado no cambie, y memoizar solo el componente principal no lo evita, separé la parte visual en `EstimateView`, envuelto en `React.memo`. Recibe solo el estimado y `showCarrierName`, y gracias a que `fastest` mantiene una referencia estable, la vista no se vuelve a renderizar si esos valores no cambian.

---

## GraphQL y Node

### 8. Argumentos en el schema y firma del resolver

**Solución:** Agregué `productId: ID!` y `postalCode: String!` como argumentos de `estimateShipping` en el schema, y los hice obligatorios porque sin ellos no se puede cotizar. En el resolver reemplacé los valores fijos por los argumentos tipados mediante una interfaz `Args`. La query `estimateShipping.graphql` del front ya declaraba esas variables, así que el contrato quedó consistente en las tres capas.

### 9. Resolver: timeout, errores, fallback y caching

**Timeout.** El `service.json` corta las requests a los 2 s, pero el client venía con `timeout: 10000` y `retries: 2` (hasta unos 30 s). Ante un servicio lento, la plataforma cortaría la request antes de que se ejecutara cualquier fallback. Configuré opciones específicas para `shippingMock` en `index.ts`: `timeout: 1500`, que deja margen dentro de los 2 s, y `retries: 0`, porque un reintento no cabe en ese presupuesto. Puse el timeout en el client y no como `Promise.race` en el resolver porque así sí se aborta la conexión.

**Errores y fallback.** El resolver usa un `try/catch` que registra la falla con `ctx.vtex.logger.warn` y no la propaga. Como fallback devuelve una lista vacía, que el componente maneja sin renderizar nada. No inventé un estimado por defecto porque sería una promesa de entrega falsa.

**Caching.**
- *Qué cacheo:* solo respuestas exitosas y no vacías. No cacheo errores ni listas vacías, para que una falla transitoria del servicio no se prolongue durante todo el TTL.
- *Clave:* `productId:postalCode`, porque el estimado depende de ambos. No incluye datos del comprador, así que es seguro compartirla entre usuarios.
- *Tiempo:* 5 minutos. Es un dato informativo cuyas tarifas y plazos cambian poco, y quería evitar mostrar algo muy desactualizado.
- *Dónde:* en memoria del proceso (un `Map` con expiración y tope de 500 entradas para que no crezca sin límite). Es simple y no agrega dependencias. Su limitación es que es por réplica y se pierde al reiniciar o escalar, lo que solo baja la tasa de aciertos. En producción evaluaría VBase o la directiva `@cacheControl` del schema.
- *Por qué en el resolver:* me da control sobre qué se guarda (nunca errores ni vacíos) y es fácil de explicar y de probar.

### 10. Health check (`health.ts`)

El endpoint devolvía 201 cuando el servicio respondía y 200 cuando no, así que un monitor creería que todo estaba bien con el servicio caído. Además, el body era un texto en un caso y un objeto en el otro. Ahora devuelve 200 con `{ status: 'ok' }` si `ping()` funciona y 503 con `{ status: 'down', error }` si falla, siempre como JSON. Uso `error.message` porque un `Error` se serializa como `{}` en JSON. Como el client ahora tiene timeout de 1.5 s y sin reintentos, `un ping()` colgado falla antes del límite de 2 s de la plataforma y el 503 sí llega a enviarse. En producción ocultaría el detalle del error y lo dejaría solo en logs.

---

## Notas adicionales

### Cómo lo probé

No hay cuenta VTEX, así que verifiqué cada capa de forma aislada:

- **Store y GraphQL (TODO 1, 2 y 8):** `react/scripts/validate.js` parsea `blocks.jsonc` e `interfaces.jsonc` sin errores y valida que la query `estimateShipping.graphql` del front sea válida contra el schema. Resultado: todo `OK`.
- **Node (TODO 8, 9 y 10):** tests con Jest y el client mockeado. Resolver: mapeo al schema, fallback `[]` con warning cuando el servicio falla, caché (hit, clave por `productId` y `postalCode`, expiración por TTL) y que no se cachean listas vacías ni errores. Health: 200 con `{ status: 'ok' }` y 503 con `{ status: 'down', error }`, comprobando que el body es JSON serializable. Resultado: 9 de 9 tests pasan.
- **React (TODO 3 a 7):** 9 tests con Jest y Testing Library, mockeando `useQuery`, `useProduct`, `useOrderForm` y `useCssHandles`: producto ausente (no falla y la query se omite con `skip`), código postal del orderForm y fallback a `110111`, `showCarrierName` opcional con default `false`, estados de loading, error y lista vacía, y que el cálculo del más rápido no muta los datos (se prueba con un arreglo congelado, con el que el `.sort()` original fallaría). Resultado: 9 de 9 pasan.
- **Tipos:** `tsc --noEmit` sin errores en `node/` y `react/`. Lo ejecuté con `typescript@4.9.5` vía `npx`, porque el 3.9.7 del starter no logra parsear los `.d.ts` de `axios` (dependencia transitiva de `@vtex/api`) y reporta más de mil errores ajenos a mi código. No modifiqué la versión del starter.

**Archivos y dependencias añadidos** (el enunciado lo permite):
- `react/typings/vtex.d.ts`: declaraciones mínimas de `vtex.product-context`, `vtex.order-manager/OrderForm` y `vtex.css-handles` para poder correr `tsc` sin `vtex setup` (que requiere login). También declara el comodín `*.graphql`, porque el de `global.d.ts` no tiene efecto: ese archivo es un módulo por su `import` inicial. Son stubs solo para desarrollo local y no sustituyen a los typings oficiales.
- `jest@26`, `ts-jest@26` y `@types/jest@26` en `node/` y `react/` (versiones alineadas con el TypeScript 3.9.7 del starter). En `react/` además `react-dom`, `@types/react-dom`, `@testing-library/react@12` y `jsonc-parser`.
- `react/jest.config.js` usa `isolatedModules` para que Jest no revise tipos (de eso se encarga `tsc`), y `node/jest.config.js` para los tests de Node.

**No verificado localmente:** el timeout real del client (`1500 ms`, `retries: 0`) y el corte de 2 s de `service.json` son comportamiento de la plataforma, y los tests mockean el client, así que no lo ejercitan. Se validaría en un workspace VTEX con `vtex link` contra un servicio lento. Tampoco hay un test que cuente renders para `React.memo`; esa decisión la justifico por diseño en el punto 7.
