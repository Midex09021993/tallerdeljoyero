# FADILAB — Inventario didáctico del Manual de formación de Rhinoceros Nivel 1

**Fuente:** *Manual de formación de Rhinoceros - Nivel 1*, Robert McNeel & Associates, revisión 14/06/2023.  
**Alcance:** inventario de los 16 capítulos del índice del manual y propuesta de recursos propios de FADILAB.  
**Criterio:** los títulos y ejercicios de la columna de contenido proceden del índice del manual. Las propuestas didácticas son diseño curricular de FADILAB, no contenido literal del manual.

## Objetivo del manual

El manual enseña a producir modelos 3D con geometría NURBS y preparar modelos para exportación, anotación y trazado. Está diseñado para Rhino 6 o posterior y declara más de 24 horas de formación.

## Inventario de los 16 capítulos

| Cap. | Título del manual | Temas identificados en el índice | Recurso FADILAB recomendado |
|---|---|---|---|
| 1 | Introducción | Software, destinatarios, duración y objetivos | Orientación del curso y mapa de competencias |
| 2 | ¿Qué es Rhino? | Ejercicio introductorio y tipos de objetos | Fichas visuales de tipos de geometría |
| 3 | La interfaz de Rhino | Ventana, menús, línea de comandos, barras, vistas, paneles, ratón, navegación, mover/copiar, visualización, dibujo y guardado | Demostración guiada de interfaz y navegación; glosario de interfaz |
| 4 | Asistentes de modelado | Ayudas de modelado, selección, bloqueo/visibilidad y capas | Demostración de capas y entrenador de selección/visibilidad |
| 5 | Modelado preciso | Entrada de coordenadas; restricciones de distancia/ángulo; Revolución; Osnap; análisis; SmartTrack; planos de construcción; círculos, arcos, elipses, polígonos, curvas libres, hélices y espirales | Biblioteca de coordenadas, Osnap y SmartTrack; simuladores guiados y retos de precisión |
| 6 | Edición de geometría | Empalmar, mezclar, transición, chaflán, mover, copiar, deshacer/rehacer, rotar, agrupar, reflejar, unir, escalar, Gumball, recortar, partir, extender, desfasar y matriz | Biblioteca de comandos de edición; comparaciones antes/después y retos de modificación |
| 7 | Edición de puntos | Puntos de control, puntos de edición, nodos y controles de toque ligero | Demostración visual de edición de puntos y reto de modificación de curvas |
| 8 | Creación de formas deformables | Ejercicio del patito de goma | Demostración secuencial de forma deformable y reto de forma libre |
| 9 | Modelado con sólidos | Ejercicio de barra con texto grabado | Proyecto guiado de sólido y diagnóstico de sólido/corte/grabado |
| 10 | Creación de superficies | Superficies simples, extrusión de curvas, superficies de transición, revolución, revolución por carril, barridos de uno y dos carriles, red de curvas y técnicas de modelado | Biblioteca de construcción de superficies; demostraciones 3D y proyecto aplicado |
| 11 | Anotaciones en el modelo | Cotas, tipos de cotas, anotaciones y dibujo 2D desde modelo 3D | Fichas de documentación técnica y reto de plano acotado |
| 12 | Importación y exportación | Importar otros formatos, exportar información y exportar a formato de malla | Guía de formatos, flujo de importación/exportación y checklist de entrega |
| 13 | Renderizado | Materiales, luces, texturas, plano de suelo, resolución, metales, trazado de rayos y sol | Demostraciones de escena y fichas de materiales/iluminación; separar conceptos generales de los flujos específicos de Aurum Render |
| 14 | Impresión y diseños | Impresión, diseños, escala y bloqueo de detalles | Guía de presentación/impresión y reto de lámina |
| 15 | Introducción a Grasshopper | Ejercicio de rueda de bicicleta | Introducción visual a lógica paramétrica y actividad de reconocimiento |
| 16 | Transformación de sólidos | Fluir por superficie y Fluir; ejercicios de texto, logotipo y anillo | Demostración de Flow/FlowAlongSrf y proyecto de aplicación en anillo |

## Catálogo inicial de recursos que se implementarán

### 1. Biblioteca de comandos
- Buscador por nombre de comando y palabra clave.
- Filtros por familia: interfaz, precisión, curvas, transformación, puntos, sólidos, superficies, documentación, intercambio, renderizado y Grasshopper.
- Ficha por comando: nombre, finalidad, cuándo utilizarlo, secuencia de uso, opciones relevantes, ejemplo, errores frecuentes y relación con una práctica.
- Etiquetar claramente qué datos proceden del manual y qué ejemplos son adaptaciones didácticas de FADILAB.

### 2. Demostraciones paso a paso
- Una operación por demostración.
- Pasos cortos y numerados, con captura o esquema por paso.
- Mostrar comando y opción activa antes de pedir que el alumno practique.
- Cerrar con resultado esperado y comprobación.

### 3. Retos y diagnósticos
- Objetivo verificable, medidas/unidades cuando correspondan y condiciones de entrega.
- No exigir operaciones que no hayan sido explicadas previamente.
- Diagnósticos con geometría correcta/incorrecta y explicación de la causa.
- Los retos de modelado en Rhino se evalúan mediante archivo/captura o revisión docente; no fingir que un simulador 2D valida un archivo 3D real.

## Reglas pedagógicas de FADILAB

1. Enseñar antes de evaluar: explicación breve → demostración → práctica acompañada → reto.
2. Las herramientas interactivas deben abrirse en ventana independiente de la lectura, conservar el progreso al regresar y tener controles propios.
3. Un laboratorio conceptual no debe presentarse como si ejecutara Rhino ni validar geometría real cuando solo simula coordenadas o relaciones.
4. No duplicar un laboratorio si una demostración o ficha resuelve mejor el objetivo.
5. Aplicar los ejemplos al diseño de joyería cuando sea pedagógicamente adecuado, distinguiendo siempre esa adaptación del ejercicio original del manual.
6. No copiar capturas ni reproducir extensamente el manual. Crear explicaciones, esquemas y ejemplos originales; comprobar permisos antes de redistribuir páginas o imágenes.

## Orden de implementación propuesto

**Fase A — Base reutilizable**
1. Definir taxonomía de categorías y estructura de ficha.
2. Crear la biblioteca inicial con comandos confirmados en el manual y en el material de las sesiones ya impartidas.
3. Incorporar búsqueda, filtros y vista de detalle.

**Fase B — Enseñanza visual**
4. Crear demostraciones paso a paso para interfaz, capas, coordenadas, Osnap, SmartTrack y edición de curvas.
5. Añadir comparaciones antes/después y errores frecuentes.

**Fase C — Aplicación**
6. Crear retos progresivos de curvas, sólidos, superficies, documentación y preparación de archivos.
7. Vincular cada recurso a la sesión y apartado correcto del curso.
8. Verificar experiencia de alumno, docente, vista previa, permisos y persistencia antes de publicar.

## Observaciones de precisión

- El índice del manual contiene 16 capítulos; no debe confundirse con el número de apartados que FADILAB decida distribuir en cada sesión.
- El manual cubre Rhino 6 o posterior. Las instrucciones específicas de interfaz o atajos deben verificarse contra la versión de Rhino que utiliza el curso (actualmente Rhino 7/MatrixGold 3.1 en las lecturas existentes).
- El índice confirma temas y ejercicios, pero no basta por sí solo para redactar todas las opciones de cada comando. Antes de publicar una ficha detallada se debe revisar el apartado correspondiente del manual y, cuando haga falta, la ayuda oficial de la versión utilizada.
