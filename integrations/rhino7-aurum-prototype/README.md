# AURUM CONECT — Rhino 7 / MatrixGold 3.1

Complemento nativo de AURUM LAB para Rhino 7 de 64 bits. El instalador de Windows se compila en GitHub Actions; el usuario final no instala SDK ni compila código.

## Instalador único

El flujo profesional está definido en:

- `installer/AurumConect.iss`: genera un único instalador EXE con Inno Setup.
- `.github/workflows/aurum-conect-installer.yml`: restaura y compila el complemento para .NET Framework 4.8, valida que exista el .RHP, empaqueta el EXE y publica una versión beta en GitHub Releases.
- `AurumConect.csproj`: usa versiones fijadas de RhinoCommon 7 y Eto.Forms para que el build no dependa de DLL copiadas manualmente desde el ordenador del usuario.

La instalación coloca el complemento en el perfil del usuario y registra su GUID en el registro de Rhino 7 (HKCU64), siguiendo el mecanismo documentado por McNeel. No necesita privilegios de administrador. Al terminar, el usuario debe cerrar y volver a abrir Rhino 7; después ejecuta el comando `AurumConect`.

## Requisitos

- Windows de 64 bits.
- Rhino 7 actualizado (SDK de compilación fijado a RhinoCommon 7.27).
- MatrixGold 3.1 dentro de Rhino 7 para el flujo CAD previsto.
- Conexión a Internet para iniciar sesión en AURUM LAB y usar el canal de transferencia.

No se requiere .NET SDK, Developer Pack ni compilación en el equipo del usuario. Rhino 7 proporciona en ejecución las bibliotecas de RhinoCommon y Eto que necesita el complemento.

## Qué instala

- `AurumConect.rhp` compilado en Release.
- Registro del complemento para Rhino 7 en el perfil del usuario.
- Entrada de desinstalación de Windows.

La instalación no distribuye RhinoCommon ni componentes propietarios de McNeel/MatrixGold.

## Funciones del complemento y estado de validación

El código incluye:
- Panel acoplable **AURUM CONECT**.
- Comando `AurumConect`.
- Inicio de sesión en el navegador oficial de AURUM LAB; el complemento no captura ni almacena contraseñas.
- Comando `AurumConectActualizar`, que copia los objetos seleccionados a un .3dm temporal sin modificar el documento original.
- Servidor local efímero en 127.0.0.1, con token aleatorio, origen web fijo, vencimiento de tres minutos, límite de 100 MB y recepción de un solo uso.

**Límite actual:** la instalación automática y el registro se empaquetan en el EXE, pero el flujo completo de recepción en Chrome/AURUM RENDER, permisos de red local y conservación de materiales/escena necesita pruebas reales de extremo a extremo en Rhino 7 + MatrixGold 3.1. No se debe anunciar como integración certificada hasta completar esas pruebas.

## Compilación y empaquetado de desarrollo

En GitHub Actions se ejecuta automáticamente al cambiar los archivos de esta integración en `main`. El workflow:

1. Restaura los paquetes fijados.
2. Compila el proyecto `.rhp` para `net48`.
3. Comprueba que el binario exista y tenga tamaño razonable.
4. Genera `AURUM-CONECT-Setup-Rhino7-1.0.0.exe`.
5. Publica el EXE como artefacto y como versión beta de GitHub Releases.

El instalador publicado es beta y no está firmado digitalmente. Windows SmartScreen puede mostrar una advertencia de editor desconocido hasta que AURUM LAB disponga de un certificado de firma de código.

## Referencias técnicas

- [McNeel: Registering Plugins (Windows)](https://developer.rhino3d.com/en/guides/rhinocommon/registering-plugins-windows/)
- [McNeel: RhinoCommon](https://www.nuget.org/packages/RhinoCommon/7.27.23032.13001)
