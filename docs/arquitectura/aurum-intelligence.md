# AURUM INTELLIGENCE — arquitectura segura por etapas

Estado: diseño técnico inicial. REA todavía no está instalado, desplegado ni conectado.

## 1. Arquitectura verificada

- La aplicación principal usa TanStack Start y el wrapper `@lovable.dev/vite-tanstack-config`.
- La configuración del proyecto indica que Nitro usa Cloudflare como destino predeterminado.
- El servidor principal autentica funciones mediante `requireSupabaseAuth`, que valida el JWT de Supabase y entrega el UID verificado en el contexto.
- REA se distribuye como CLI/servidor MCP y ejecuta análisis en el entorno donde se instala. Sus requisitos y capacidades dependen del objetivo y de herramientas externas.

Conclusión: no ejecutar REA dentro del Worker de la aplicación principal. Debe vivir en un servicio independiente.

## 2. Arquitectura objetivo

1. **Interfaz privada (Taller del Joyero):** permite seleccionar un análisis y consultar sus resultados.
2. **Puerta de autorización (servidor de Taller):** valida la sesión Supabase y compara el UID verificado con la identidad propietaria autorizada. No acepta identidad enviada por el navegador.
3. **API privada de orquestación:** comunicación servidor-a-servidor con credencial exclusiva, nunca enviada al cliente.
4. **Runner REA aislado:** contenedor independiente con Node.js compatible y REA. No comparte filesystem, variables de entorno ni credenciales con Taller del Joyero.
5. **Almacenamiento temporal:** archivos de entrada y resultados con retención corta y limpieza automática.
6. **Resultados:** informe estructurado con hallazgos, evidencia, límites y errores; la aplicación solo recibe resultados autorizados.

## 3. Límites obligatorios del primer MVP

- Solo archivos y objetivos que el propietario tenga derecho a analizar.
- Comenzar con análisis estático de archivos JavaScript/TypeScript y metadatos; no ejecutar la aplicación objetivo.
- Sin shell arbitrario, scripts aportados por el usuario, instalación de paquetes del objetivo ni ejecución de binarios.
- Sin acceso de red saliente desde el runner durante el análisis inicial.
- Sin acceso a Supabase, GitHub, secretos de producción ni archivos del servidor principal.
- Límites estrictos de tamaño, tiempo, memoria, cantidad de archivos y profundidad de extracción.
- Rechazar archivos comprimidos peligrosos, rutas traversal, enlaces simbólicos y formatos no admitidos.
- Directorio temporal por trabajo, permisos mínimos, limpieza incluso ante errores y cancelación.
- Registrar ID de trabajo, UID autorizado, fecha, hash de entrada, estado y resultado; nunca registrar tokens ni secretos.

## 4. Etapas de implementación

### Etapa A — contrato y seguridad
Definir API, estados de trabajo, límites, formato de informe y modelo de autenticación entre servicios. No instalar ni ejecutar REA todavía.

### Etapa B — runner aislado
Crear un servicio separado en contenedor Linux con usuario no privilegiado, filesystem temporal, límites de recursos y sin credenciales del producto.

### Etapa C — análisis estático controlado
Instalar una versión fijada de REA y habilitar únicamente los comandos de análisis estático aprobados. Verificar con archivos de prueba inocuos.

### Etapa D — conexión con la web
Conectar la API privada después de probar autorización positiva/negativa, aislamiento, límites, cancelación y limpieza.

### Etapa E — capacidades adicionales
Evaluar por separado análisis web con navegador, Android/APK, .NET y binarios nativos. Cada familia requiere herramientas, permisos y límites propios; no se habilitan por defecto.

## 5. Condiciones para declarar listo

- Una cuenta distinta del UID propietario no puede crear, consultar ni cancelar trabajos.
- El runner rechaza peticiones sin autenticación de servicio válida.
- El runner no puede leer secretos ni recursos de producción.
- Un archivo de prueba no puede ejecutar comandos ni abrir conexiones salientes.
- Se aplican límites de recursos y limpieza tras éxito, error y cancelación.
- Los resultados incluyen evidencia y limitaciones, sin afirmar que REA recupera el código fuente original.
- CI, TypeScript, ESLint y pruebas de seguridad aprobados.

## 6. Fuera de alcance por ahora

- No modificar el motor Aurum Render.
- No modificar el esquema de Supabase ni ejecutar SQL.
- No dar acceso general a otros usuarios.
- No aceptar análisis de objetivos de terceros sin autorización.
- No habilitar depuración dinámica, instrumentación, modificación de memoria ni ejecución de binarios en el MVP.
