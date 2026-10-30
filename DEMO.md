# Guion de demo · Cierre EEFF y Notas · Cencosud

Duración sugerida: 15 a 20 minutos. Escenario inicial: **Cierre en curso** (se restablece con "Reiniciar demo" en el menú lateral).

## 1. Entrada y Portada (2 min)
1. Clave de acceso `eeff-3030`. Entrar como **María José Riquelme** (Responsable del proceso). Mostrar que la cuenta sin perfil queda rechazada y registrada.
2. Portada del 3T 2026: el estado del EEFF aparece como tag junto al título (al pasar el cursor muestra las 9 etapas), KPIs, tablero de notas y pendientes. **Nuevo ejercicio** tiene tres pasos: periodo y sociedades, fecha de cierre e hitos, y parametrización (UF, dólar de cierre y promedio, homologación y responsables por nota).
3. Calendario de hitos D+4 a D+23 con el hito en curso destacado. Abrir **Parámetros** (UF, TC, homologación versionada, responsables por nota).
4. Abrir **Agente del proceso** y preguntar: "¿Qué notas están bloqueando el cierre hoy?".

## 2. Carga de información (3 min)
1. Catálogo de 26 fuentes. En una fuente integrada, el ícono de actualizar lanza la extracción asíncrona con contador de registros. La cuenta nueva sin homologar llega como notificación en la campanita.
2. Abrir **RR.HH. · Beneficios a empleados**: errores bloqueantes por fila y columna. Clic en **Usar archivo de ejemplo corregido** para ver el escaneo de estructura y contenido y la habilitación.
3. Abrir **Inmobiliario · Tasaciones**: advertencias no bloqueantes. Confirmarlas y habilitar. La Nota 22 pasa a "Lista para generar".
4. Pestaña **Fuentes documentales**.

## 3. Estados financieros y el caso de la Nota 18 (5 min) · momento central
0. En Generación de notas, pestaña **Estados financieros**: situación financiera (activos, pasivos y patrimonio), resultados, cambios en el patrimonio y flujos de efectivo por método directo. Cada línea muestra si cuadra con su nota. La Nota 18 aparece descuadrada.
1. Ir a la **Nota 18**: 4 cuadros (composición, por moneda, corriente/no corriente, por país) navegables desde el índice. La cuadratura con la carátula aparece en rojo con una diferencia de M$ 1.283.715.
2. Clic en **Ver trazabilidad**: el grafo se dibuja desde BPC C480 hasta la cifra publicada. En rojo aparece la cuenta **2105990017 · Proveedores extranjeros en tránsito · Brasil**, sin asignar. El Agente explica la diferencia.
3. **Asignar cuenta en homologación**, luego **Regenerar Nota 18** y **Actualizar**: animación de generación paso a paso. El control pasa a OK y el total incorpora la cuenta.
4. Mostrar que la **Nota 35** (depende de la 18) quedó desactualizada en el mapa de dependencias.

## 4. Nota con texto (2 min)
1. **Nota 29**: Generar, luego la pestaña Texto y **Proponer texto**. El Agente actualiza fechas y montos, marca los cambios e incorpora el nuevo juicio civil citando la carta de abogados [D1]. Se verifica que los montos citados coincidan con los cuadros.
2. Aceptar el texto.
3. **Ajustes manuales** (por ejemplo en la Nota 15): cualquier monto del periodo se edita en la misma tabla, en una capa provisoria que recalcula totales y controles. Al confirmar con justificación se publica una nueva versión y cada celda ajustada queda marcada en naranjo con el valor original y el ajuste. **Versiones** permite comparar.

## 5. Pre-aprobación (2 min)
1. Cambiar a **Patricia Soto** (Aprobador de notas) desde el menú de usuario.
2. Bandeja con SLA, luego abrir una nota: versión congelada. Activar "Comentar celdas" y dejar una observación, o aprobar para ver el sello.
3. Cambiar a **Ignacio Herrera** (Auditor externo): en la revisión de una nota, al seleccionar una cifra se abre un pop-up para registrar la observación de auditoría sobre esa celda. El auditor no puede crear ejercicios ni editar parámetros.

## 6. Consolidado, auditoría y Directorio (4 min)
Para no aprobar las 38 notas en vivo: Configuración (Sebastián Rojas, clave `Caracas1982`), escenario **Listo para consolidar**.
1. Patricia Soto: **Generar pre-informe**. Las notas vuelan al documento y el Agente de informe de cierre revisa carátula, cruzadas y variaciones. Luego **Pre-aprobar consolidado**.
2. **Ignacio Herrera** (Auditor externo): **Cerrar sin observaciones**. Patricia: **Enviar al Directorio**.
3. **Carlos Mena** (Directorio): lector tipo Word con índice que incluye los cuatro estados financieros y las 38 notas; **Aprobar informe**, sello y acta.

## 7. Informes y log (2 min)
1. María José: generar **XBRL** (mapeo a taxonomía y validación), **CMF** y **Informe 555**. Descargarlos: son archivos reales con UID.
2. **Marcar como publicados** para pasar a Emitido y luego **Cerrar ejercicio**.
3. **Log de auditoría**: todo lo hecho en la demo, con filtros, hash encadenado y exportación a Excel.

## Escenarios (Configuración)
- **Cierre en curso**: el punto de partida del guion.
- **Listo para consolidar**: las 38 notas aprobadas.
- **En aprobación Directorio**: parte en el Track 05.
- **Aprobado**: parte en los informes regulatorios.

Sin `ANTHROPIC_API_KEY` los agentes responden con un respaldo determinista construido desde los datos, marcado como "Respuesta sin conexión al modelo".
