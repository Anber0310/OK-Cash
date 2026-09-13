# Clear Path Finance

Quiero construir una aplicación web de finanzas personales moderna, elegante y visualmente impactante para un hackathon de tecnología financiera.

IMPORTANTE:
Esta es la primera versión del producto. Quiero que construyas una base sólida, profesional y escalable. NO inventes ni integres todavía ninguna API bancaria externa, porque posteriormente conectaremos una API proporcionada por Capital One. La arquitectura debe quedar preparada para incorporar datos financieros provenientes de una API externa sin tener que reconstruir toda la aplicación.

1. PROPÓSITO DEL PRODUCTO

La aplicación ayuda a una persona a tomar mejores decisiones sobre su dinero mediante simulación de escenarios.

La idea central es:

"¿Qué pasaría con mi situación financiera si tomo esta decisión?"

Por ejemplo:

¿Qué pasa si compro algo ahora?

¿Cuánto dinero me quedaría después?

¿Qué pagos debería cubrir primero?

¿Qué pasa con mis metas?

¿Cuánto margen tendría para un gasto inesperado?

¿Qué alternativa me dejaría en una situación financiera más segura?

La aplicación NO debe limitarse a mostrar cuánto dinero tiene una persona. Debe ayudarla a comprender las consecuencias de sus decisiones.

2. USUARIO OBJETIVO

Personas que tienen ingresos y dinero limitados o moderados y necesitan tomar decisiones financieras cotidianas.

No asumir que el usuario tiene conocimientos financieros avanzados.

Toda la información debe ser fácil de entender.

3. FUNCIÓN PRINCIPAL

El usuario debe poder introducir una situación financiera y plantear una decisión.

Ejemplo:

Saldo actual: $5,000
Compra que quiero realizar: $1,500
Pagos próximos:

Internet: $500

Escuela: $1,000

Luz: $700
Reserva mínima deseada: $800

La aplicación debe poder mostrar cómo cambiaría la situación financiera si el usuario realiza la compra.

Debe existir una comparación visual entre:

ESCENARIO ACTUAL
ESCENARIO SI REALIZO LA COMPRA
ESCENARIO ALTERNATIVO

La simulación debe mostrar:

saldo inicial;

dinero utilizado;

pagos próximos;

gastos necesarios;

reserva;

dinero restante;

impacto en metas;

margen disponible para imprevistos;

nivel de riesgo o advertencia;

explicación sencilla del resultado.

4. FUNCIONES PRINCIPALES

Construye la interfaz y estructura necesarias para estas funciones:

A. SITUACIÓN FINANCIERA
Mostrar:

saldo actual;

dinero comprometido;

dinero disponible para decisiones;

próximos pagos;

próximas fechas importantes;

metas financieras;

reserva o margen de seguridad.

B. PRIORIZACIÓN DE PAGOS
Permitir visualizar pagos pendientes y clasificarlos por prioridad.

La aplicación debe poder mostrar:

orden recomendado;

pagos más importantes;

pagos que podrían esperar;

consecuencias asociadas a retrasar un pago, cuando esa información esté disponible;

combinaciones posibles de pagos;

dinero restante después de cada alternativa.

NO inventar consecuencias financieras. La arquitectura debe permitir que posteriormente sean proporcionadas por datos reales, reglas configurables o información externa.

C. SIMULADOR "¿QUÉ PASARÍA SI...?"
Esta es la función central de la aplicación.

El usuario debe poder plantear una acción, por ejemplo:
"Comprar algo por $1,500"

La aplicación debe calcular y visualizar diferentes escenarios.

D. CAPACIDAD DE GASTO
Mostrar cuánto dinero puede utilizar razonablemente el usuario después de considerar compromisos, gastos necesarios y reserva.

No asumir que todo el saldo actual puede gastarse.

E. METAS
Permitir visualizar metas financieras y cómo una decisión podría afectar su progreso.

F. CALENDARIO
Mostrar fechas de pagos, gastos importantes y metas mediante una visualización clara y fácil de entender.

5. DASHBOARD

Crear un dashboard principal muy visual y moderno.

Debe mostrar de forma inmediata:

Saldo actual

Disponible para gastar

Próximos compromisos

Nivel de seguridad financiera

Próxima fecha importante

Progreso de metas

Acceso destacado al simulador

El simulador debe ser el elemento visual más importante del dashboard.

6. EXPERIENCIA DEL USUARIO

La experiencia debe ser extremadamente sencilla.

El usuario no debe sentirse como si estuviera utilizando un software bancario complicado.

Utilizar lenguaje humano.

Ejemplos de mensajes:

"Puedes realizar esta compra, pero reduciría tu margen disponible."

"Si realizas esta compra hoy, después de cubrir tus compromisos previstos te quedarían aproximadamente $X."

"Esperar podría darte mayor margen para gastos inesperados."

Evitar lenguaje financiero excesivamente técnico.

7. DISEÑO VISUAL

Quiero una interfaz que parezca un producto real de una startup fintech moderna y que tenga calidad suficiente para una presentación de hackathon.

NO quiero un dashboard genérico de administración.

Quiero:

diseño elegante;

moderno;

limpio;

premium;

excelente jerarquía visual;

tarjetas con información clara;

gráficos útiles;

microinteracciones sutiles;

transiciones suaves;

excelente uso del espacio;

responsive;

tipografía moderna;

iconografía consistente.

La aplicación debe sentirse confiable, pero también amigable y humana.

Usar una estética fintech moderna con profundidad visual, tarjetas, gráficos y elementos interactivos sin sobrecargar la pantalla.

Priorizar claridad sobre decoración.

8. PANTALLAS INICIALES

Crear inicialmente:

Dashboard

Simulador de decisiones

Pagos

Metas

Calendario

Resumen/resultado de escenario

La navegación debe ser sencilla y consistente.

9. DATOS

Inicialmente utilizar datos de demostración realistas para poder probar la aplicación.

Separar claramente:

datos de usuario;

transacciones;

pagos;

gastos;

metas;

escenarios.

NO colocar los datos directamente dentro de múltiples componentes de la interfaz.

Preparar una estructura que permita sustituir posteriormente los datos de demostración por datos provenientes de una API externa.

10. ARQUITECTURA

Separar correctamente:

interfaz;

lógica de negocio;

datos;

simulación.

El motor de simulación debe poder recibir información financiera y una acción propuesta y devolver un resultado.

Conceptualmente:

DATOS FINANCIEROS
↓
MOTOR DE ANÁLISIS
↓
SIMULACIÓN
↓
COMPARACIÓN DE ESCENARIOS
↓
RESULTADO
↓
INTERFAZ

No acoplar la lógica de simulación directamente a los componentes visuales.

11. REGLA IMPORTANTE SOBRE RECOMENDACIONES

La aplicación no debe simplemente decirle al usuario qué hacer.

Debe explicar las consecuencias y permitir comparar alternativas.

La filosofía del producto es:

"Te mostramos qué podría pasar para que puedas tomar una mejor decisión."

12. PREPARACIÓN PARA CAPITAL ONE

La aplicación debe quedar preparada para que posteriormente podamos conectar una API externa proporcionada por Capital One.

No inventes endpoints, autenticación ni estructura de API.

Utiliza una capa de servicios o abstracción que posteriormente permita conectar:

cuentas;

saldos;

transacciones;

compras;

pagos;
u otros datos que proporcione la API real.

Los datos mock actuales deben poder reemplazarse posteriormente por datos reales sin rediseñar toda la aplicación.

13. CALIDAD

El código debe ser organizado, mantenible y fácil de modificar.

Evitar soluciones innecesariamente complejas.

Priorizar un MVP funcional y profesional sobre una gran cantidad de funcionalidades incompletas.

La aplicación debe estar preparada para crecer posteriormente.

Primero construye una experiencia visual y funcional sólida con datos de demostración.

NO implementes todavía inteligencia artificial generativa.

Primero quiero que el motor de simulación y la experiencia principal estén correctamente estructurados.

Al terminar esta primera generación, muéstrame la aplicación funcional y la estructura que hayas creado.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/46e67ed1-84a6-4288-9788-7d0e95b05bf2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
