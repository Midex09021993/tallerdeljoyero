/**
 * Catálogo público de herramientas que AURI puede recomendar.
 * Mantener las rutas alineadas con src/routes/herramientas-publicas.tsx
 * y src/routes/herramientas-publicas/$herramienta.tsx.
 *
 * Este catálogo describe las herramientas disponibles; no ejecuta cálculos
 * ni sustituye la lógica de las calculadoras del frontend.
 */
export const AURI_PUBLIC_TOOLS = [
  {
    id: "yeso-agua",
    name: "Calculadora de yeso y agua para fundición",
    path: "/herramientas-publicas/yeso-agua",
    description:
      "Calcula una estimación de revestimiento y agua para cilindros de fundición de joyería a partir del diámetro interior, la altura útil y el tipo o medida del cilindro, usando las proporciones configuradas en la herramienta.",
    keywords: [
      "yeso", "agua", "revestimiento", "fundición", "cilindro", "tarro",
      "molde", "mezcla", "polvo", "cera perdida",
    ],
  },
  {
    id: "aleacion-oro",
    name: "Calculadora de aleación de oro",
    path: "/herramientas-publicas/aleacion-oro",
    description:
      "Estima la cantidad de oro fino y metales de liga para ajustar una aleación a la ley o quilataje deseado, según la receta configurada.",
    keywords: ["oro", "aleación", "liga", "quilates", "18k", "14k", "9k", "oro amarillo", "oro blanco", "oro rosa"],
  },
  {
    id: "peso-joya-3d",
    name: "Calculadora de peso de joya desde modelo 3D",
    path: "/herramientas-publicas/peso-joya-3d",
    description:
      "Estima el peso de metal de una joya a partir del volumen de un modelo 3D y la densidad del material seleccionado.",
    keywords: ["peso", "joya", "modelo 3d", "stl", "obj", "glb", "fbx", "metal", "densidad"],
  },
  {
    id: "peso-gemas",
    name: "Calculadora de peso de gemas",
    path: "/herramientas-publicas/peso-gemas",
    description:
      "Estima el peso de una gema a partir de sus medidas, su talla y el tipo de piedra seleccionado.",
    keywords: ["gema", "gemas", "piedra", "diamante", "rubí", "zafiro", "esmeralda", "quilates", "ct"],
  },
  {
    id: "tallas-anillos",
    name: "Conversor de tallas de anillos",
    path: "/herramientas-publicas/tallas-anillos",
    description:
      "Convierte equivalencias entre sistemas de tallaje de anillos y permite consultar la talla a partir del diámetro interior.",
    keywords: ["anillo", "anillos", "talla", "tallas", "diámetro", "medida", "España", "Europa", "USA"],
  },
] as const;

export const AURI_PUBLIC_TOOLS_CONTEXT = [
  "CATÁLOGO REAL DE HERRAMIENTAS PÚBLICAS (verificado contra las rutas y componentes del proyecto):",
  ...AURI_PUBLIC_TOOLS.map((tool) =>
    `- ${tool.name}: ${tool.description} Acceso: [Abrir herramienta](${tool.path}). Palabras relacionadas: ${tool.keywords.join(", ")}.`
  ),
  "Regla: si preguntan por una herramienta incluida aquí, confirma que existe, explica brevemente su utilidad y facilita su enlace exacto. No niegues su existencia ni inventes herramientas adicionales. Las herramientas son interactivas: invita al visitante a abrirlas; no afirmes que has ejecutado un cálculo dentro del chat.",
].join("\n");

export const AURI_PUBLIC_TOOLS_LINKS = AURI_PUBLIC_TOOLS.map(
  (tool) => `- ${tool.name}: ${tool.path}`
).join("\n");
