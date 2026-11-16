# 5. Preguntas de entrevista (nivel junior), sin respuestas

## En criollo

Son preguntas que un entrevistador podría hacerte **sobre tu propio proyecto**. Respondelas
**en voz alta o por escrito, con tus palabras**, antes de mirar la guía
([06-guia-de-respuestas.md](06-guia-de-respuestas.md)). Si te trabás, volvé a los documentos
1 a 4. Trabarse no es fallar: es justo lo que esto busca encontrar.

Truco: en cada respuesta tratá de decir **qué hiciste**, **por qué** y **qué alternativa
había**.

---

1. Contame en dos minutos qué es Acalud y cómo está organizado el código. ¿Qué hace el
   frontend, qué hace el backend y dónde corre cada uno?

2. ¿Por qué la web y la app de Android comparten el mismo código? ¿Qué ganaste y qué
   perdiste con esa decisión?

3. ¿Qué significa que el backend tenga "arquitectura hexagonal"? Dame un ejemplo concreto de
   tu proyecto donde eso te haya servido.

4. Cuando un usuario inicia sesión, ¿qué se guarda en la base y qué recibe el usuario? ¿Por
   qué no usaste JWT?

5. ¿Cómo protegés el login contra alguien que prueba miles de contraseñas, y contra alguien
   que quiere averiguar qué emails están registrados?

6. ¿Por qué el frontend nunca manda el precio de los productos al hacer el checkout? ¿Qué
   pasaría si lo mandara?

7. Mercado Pago a veces avisa dos veces el mismo pago. ¿Qué pasa en tu sistema cuando
   ocurre eso? ¿Cómo te asegurás de no descontar el stock dos veces?

8. ¿Qué es una transacción y dónde la usaste? ¿Qué pasa si falla algo en la mitad del
   procesamiento de un pago?

9. ¿Por qué el email de confirmación de compra no se manda en el mismo momento del pago?
   ¿Qué problema resuelve el "outbox"?

10. ¿Cómo testeaste el sistema? ¿Por qué algunos tests usan una base de datos real en vez de
    simularla? Y si tuvieras que mejorar algo del proyecto, ¿qué sería?

## Cómo explicarlo en una entrevista

> Si no sabés algo, no inventes. Decí "eso no lo implementé, pero lo resolvería así…". Los
> entrevistadores valoran más la honestidad y el razonamiento que una respuesta perfecta.
