import { createFileRoute } from "@tanstack/react-router";
import { ComunidadPublicaPage, type EntradaPublica } from "@/routes/catalogo-publico";
import { supabasePublic } from "@/integrations/supabase/client";

export const Route = createFileRoute("/directorio")({
  loader: async () => {
    const { data, error } = await (supabasePublic as any).rpc("obtener_directorio_comunidad_publica_ranking");
    if (error) {
      console.error("[Directorio] No se pudo obtener el listado público:", error);
      return undefined;
    }
    return (data ?? []) as EntradaPublica[];
  },
  head: ({ loaderData }) => {
    const entries = loaderData ?? [];
    const publicItems = entries.filter((item) => item.slug && (item.tipo === "curso" || item.catalogo_visible));
    const collectionSchema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          "@id": "https://www.tallerdeljoyero.com/directorio#collection",
          "url": "https://www.tallerdeljoyero.com/directorio",
          "name": "Directorio de joyeros de Latinoamérica | AURUM LAB",
          "description": "Encuentra talleres, joyerías y formación de la comunidad joyera latinoamericana en AURUM LAB.",
          "inLanguage": "es",
          "mainEntity": { "@id": "https://www.tallerdeljoyero.com/directorio#items" }
        },
        {
          "@type": "ItemList",
          "@id": "https://www.tallerdeljoyero.com/directorio#items",
          "itemListOrder": "https://schema.org/ItemListOrderAscending",
          "numberOfItems": publicItems.length,
          "itemListElement": publicItems.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.tipo === "curso" ? item.formacion_titulo || item.nombre : item.identidad_nombre || item.nombre,
            url: item.tipo === "curso"
              ? `https://www.tallerdeljoyero.com/formacion/${encodeURIComponent(item.slug!)}`
              : `https://www.tallerdeljoyero.com/${encodeURIComponent(item.slug!)}`
          }))
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Inicio", item: "https://www.tallerdeljoyero.com/" },
            { "@type": "ListItem", position: 2, name: "Directorio", item: "https://www.tallerdeljoyero.com/directorio" }
          ]
        }
      ]
    };
    return {
    links: [{ rel: "canonical", href: "https://www.tallerdeljoyero.com/directorio" }],
    meta: [
      { title: "Directorio de joyeros de Latinoamérica | AURUM LAB" },
      {
        name: "description",
        content: "Encuentra talleres, joyerías y formación de la comunidad joyera de Latinoamérica. Explora perfiles, catálogos y propuestas en AURUM LAB.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Directorio de joyeros de Latinoamérica | AURUM LAB" },
      { property: "og:description", content: "Encuentra talleres, joyerías y formación de la comunidad joyera de Latinoamérica en AURUM LAB." },
      { property: "og:url", content: "https://www.tallerdeljoyero.com/directorio" },
      { property: "og:type", content: "website" },
    ],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(collectionSchema) }],
    };
  },
  component: DirectorioComponent,
});

function DirectorioComponent() {
  const data = Route.useLoaderData();
  return <ComunidadPublicaPage {...(data ? { initialData: data } : {})} />;
}
