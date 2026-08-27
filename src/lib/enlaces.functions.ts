import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Lee los metadatos Open Graph de un enlace externo (visores 3D tipo iJewel, Drive, etc.). */
export const leerMetadatosEnlace = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ url: z.string().url() }).parse(data))
  .handler(async ({ data }): Promise<{ titulo: string; poster: string }> => {
    try {
      const res = await fetch(data.url, {
        headers: { "user-agent": "Mozilla/5.0 (compatible; TallerBot/1.0)" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return { titulo: "", poster: "" };
      const html = await res.text();
      const meta = (prop: string) => {
        const re = new RegExp(
          `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`,
          "i",
        );
        const alt = new RegExp(
          `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`,
          "i",
        );
        return (html.match(re)?.[1] ?? html.match(alt)?.[1] ?? "").replace(/&amp;/g, "&");
      };
      return { titulo: meta("og:title"), poster: meta("og:image") };
    } catch {
      return { titulo: "", poster: "" };
    }
  });
