# Acalud explicado (modo didáctico)

> Material de estudio para entender **cómo está hecho** Acalud y poder explicarlo en una
> entrevista o en la defensa de la tesis. No reemplaza la documentación oficial
> (`docs/casos-de-uso/` sigue siendo la fuente de verdad): es una guía de lectura.
>
> Escrito el 2026-11-16 leyendo el código real (commit `27a6afd`). Si algo cambió después,
> manda el código.

## En criollo

Acalud es una tienda online de juegos educativos para docentes y escuelas. Un docente puede
comprar juegos y descargar recursos. Una escuela puede comprar licencias en cantidad y
repartirlas entre sus docentes. Los docentes, a su vez, registran cómo les fue al usar cada
juego en clase, y la escuela ve reportes con esos datos. Hay además una parte de comunidad
(encuestas y propuestas) y un panel de administración.

Técnicamente son **dos programas que se hablan**: una página web (que también se empaqueta
como app de Android) y un servidor que guarda todo en una base de datos.

## Cómo leer esta carpeta (en orden)

| # | Archivo | Qué vas a sacar de ahí |
|---|---|---|
| 1 | [01-mapa-del-proyecto.md](01-mapa-del-proyecto.md) | Qué hace cada carpeta y cada módulo. El "plano de la casa". |
| 2 | [02-flujos-de-punta-a-punta.md](02-flujos-de-punta-a-punta.md) | Tres recorridos completos: login, compra con pago, y carga de una sesión de juego. |
| 3 | [03-decisiones-de-diseno.md](03-decisiones-de-diseno.md) | Las 5 decisiones más importantes, con lo que se descartó y por qué. |
| 4 | [04-glosario.md](04-glosario.md) | Todas las palabras técnicas que aparecen, definidas simple. |
| 5 | [05-preguntas-de-entrevista.md](05-preguntas-de-entrevista.md) | 10 preguntas para practicar, **sin** respuestas. |
| 6 | [06-guia-de-respuestas.md](06-guia-de-respuestas.md) | La guía para corregirte. Leela **después** de intentar responder. |

Consejo: cuando una palabra no se entienda, buscala en el glosario antes de seguir.

## Cosas que encontré y no están del todo claras

Esto se ve en el código, y vale la pena que lo sepas antes de que te lo pregunten:

- **El ADR-004 promete autenticación de dos factores (MFA TOTP) para el admin**, pero en el
  código no hay nada de eso. Es una promesa de diseño sin implementar.
- **El contrato OpenAPI** (el documento que describe todos los endpoints) está atrasado:
  describe alrededor de 64 rutas y el código tiene bastantes más.
- **El rol de base de datos con permisos mínimos** (que la app no se conecte como dueña de la
  base) figura como pendiente desde la Etapa 1.

## Cómo explicarlo en una entrevista

> "Acalud es una plataforma de juegos educativos con dos tipos de cliente: docentes que compran
> individualmente y escuelas que compran licencias en lote y las reparten. La hice como un
> monorepo con un frontend Next.js, que sirve tanto como web como app Android vía Capacitor, y
> un backend NestJS con arquitectura hexagonal sobre PostgreSQL. Lo más interesante está en
> el checkout: el pago con Mercado Pago es idempotente y todo lo que toca plata y stock va en
> una sola transacción."
