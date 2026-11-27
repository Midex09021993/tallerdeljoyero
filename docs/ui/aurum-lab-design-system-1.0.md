# AURUM LAB Design System 1.0 — Midnight Champagne

## Identidad
Una identidad de lujo contemporáneo que combina precisión tecnológica, calidez mineral y acentos de orfebrería. El ERP utiliza superficies claras y una navegación azul medianoche. El dorado champán es un acento, no un color de relleno dominante.

## Paleta institucional

| Token | Valor | Uso |
|---|---|---|
| Midnight | `#182838` | Navegación, acciones primarias, encabezados puntuales |
| Slate | `#293B4A` | Texto principal y superficies secundarias oscuras |
| Champagne | `#C5A36B` | Acentos, selección, iconos y detalles |
| Champagne light | `#D9BD8B` | Estados hover y detalles suaves |
| Champagne deep | `#92734B` | Texto dorado sobre superficies claras |
| Ivory | `#F6F4EF` | Fondo general del ERP |
| Warm white | `#FFFEFC` | Tarjetas, formularios y superficies elevadas |
| Stone | `#EAE6DE` | Superficies secundarias |
| Steel | `#687887` | Texto secundario |\n| Turquesa Surf | `#00C2B5` | Acento digital/creativo, destacados puntuales y elementos de innovación; no sustituye al Champagne |

## Acento complementario — Turquesa Surf\n\n- HEX: `#00C2B5`\n- RGB: `0, 194, 181`\n- CMYK: `100, 0, 7, 24`\n- Uso: destacar elementos creativos, tecnología, innovación y frases clave de la identidad pública.\n- Mantenerlo como acento complementario; Midnight Champagne sigue siendo la paleta institucional principal.\n\n## Estados funcionales
Los estados semánticos de éxito, información, advertencia y error conservan colores diferenciados. No se reemplazan por dorado: el usuario debe distinguir el significado del estado sin depender del color de marca.

## Reglas de aplicación
- Fondo de trabajo: blanco cálido ligeramente neutro (`#F6F4EF`).
- Tarjetas y formularios: blanco cálido.
- Texto: azul pizarra oscuro.
- Navegación: azul medianoche con texto marfil.
- Elemento activo: fondo azul pizarra translúcido y una línea/acento champán.
- Botones principales: azul medianoche; reservar champán para acciones destacadas.
- Sombras suaves, bordes de baja opacidad y radios consistentes.
- Mantener contraste legible; no usar champán claro para texto pequeño sobre blanco.

## Alcance y excepciones
La clase `.aurum-erp-theme` aplica los tokens solo al ERP dentro de `AppShell`. Se excluyen explícitamente las rutas `/aula-formacion`, `/aula-comandos` y `/aurum-render`, así como el modo expandido del Aula. No modificar los estilos propios del Aula de Formación, sus laboratorios ni AURUM Render al evolucionar este sistema.

## Implementación
- Tokens scoped: `src/styles.css`, selector `.aurum-erp-theme`.
- Aplicación por ruta y navegación: `src/components/AppShell.tsx`.
- Los módulos del ERP deben preferir tokens semánticos (`bg-background`, `bg-card`, `text-foreground`, `border-border`, `bg-primary`, `text-gold-deep`) frente a colores hexadecimales aislados.
