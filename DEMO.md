# Guion de demo · Cierre EEFF y Notas · Cencosud

Duración sugerida: 15 a 20 minutos. Escenario inicial: **Cierre en curso** (se restablece con "Reiniciar demo" en el menú lateral).

## 1. Entrada y Portada (2 min)
1. Entrar como **María José Riquelme** (Responsable del proceso). Mostrar que la cuenta sin perfil queda rechazada y registrada.
2. Portada del 3T 2026: estados del ejercicio, KPIs y el **recorrido de las 38 notas**, donde cada cuadro es una nota en su etapa.
3. Calendario de hitos D+4 a D+23 con la marca de "Hoy". Abrir **Parámetros** (UF, TC, homologación versionada, responsables por nota).
4. Abrir **Agente del proceso** y preguntar: "¿Qué notas están bloqueando el cierre hoy?".

## 2. Carga de información (3 min)
1. Semáforo de 26 fuentes. Clic en **Actualizar todas las integradas**: extracción asíncrona con contador de registros.
2. Abrir **RR.HH. · Beneficios a empleados**: errores bloqueantes por fila y columna. Clic en **Usar archivo de ejemplo corregido** para ver el escaneo de estructura y contenido y la habilitación.
3. Abrir **Inmobiliario · Tasaciones**: advertencias no bloqueantes. Confirmarlas y habilitar. La Nota 22 pasa a "Lista para generar".
4. Pestaña **Completitud por nota**.

## 3. El caso de la Nota 18 (4 min) · momento central
1. Ir a Generación de notas, luego a la **Nota 18**: la cuadratura con la carátula aparece en rojo con una diferencia de M$ 1.283.715.
2. Clic en **Ver trazabilidad**: el grafo se dibuja desde BPC C480 hasta la cifra publicada. En rojo aparece la cuenta **2105990017 · Proveedores extranjeros en tránsito · Brasil**, sin asignar. El Agente explica la diferencia.
3. **Asignar cuenta en homologación**, luego **Regenerar Nota 18** y **Actualizar**: animación de generación paso a paso. El control pasa a OK y el total incorpora la cuenta.
4. Mostrar que la **Nota 35** (depende de la 18) quedó desactualizada en el mapa de dependencias.

## 4. Nota con texto (2 min)
1. **Nota 29**: Generar, luego la pestaña Texto y **Proponer texto**. El Agente actualiza fechas y montos, marca los cambios e incorpora el nuevo juicio civil citando la carta de abogados [D1]. Se verifica que los montos citados coincidan con los cuadros.
2. Aceptar el texto. Opcional: **Ajustes manuales** con capa provisoria y **Versiones** comparadas.

## 5. Pre-aprobación (2 min)
1. Cambiar a **Patricia Soto** (Aprobador de notas) desde el menú de usuario.
2. Bandeja con SLA, luego abrir una nota: versión congelada. Activar "Comentar celdas" y dejar una observación, o aprobar para ver el sello.

## 6. Consolidado, auditoría y Directorio (4 min)
Para no aprobar las 38 notas en vivo: Configuración (Sebastián Rojas, clave `Caracas1982`), escenario **Listo para consolidar**.
1. Patricia Soto: **Generar pre-informe**. Las notas vuelan al documento y el Agente de informe de cierre revisa carátula, cruzadas y variaciones. Luego **Pre-aprobar consolidado**.
2. **Ignacio Herrera** (Auditor externo): **Cerrar sin observaciones**. Patricia: **Enviar al Directorio**.
3. **Carlos Mena** (Directorio): lector tipo Word con índice, **Aprobar informe**, sello y acta.

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
