import { withSupabase } from "npm:@supabase/server@1";
import * as XLSX from "npm:@e965/xlsx@0.20.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CAMPOS = [
  { key: "codigo", label: "Código / SKU", aliases: ["codigo", "código", "sku", "codigo_producto", "cod"] },
  { key: "nombre", label: "Nombre / pieza", aliases: ["nombre", "pieza", "producto", "descripcion", "descripción", "modelo"] },
  { key: "metal", label: "Metal / material", aliases: ["metal", "material", "aleacion", "aleación"] },
  { key: "ley", label: "Ley / quilataje", aliases: ["ley", "quilataje", "kilataje", "oro", "pureza"] },
  { key: "peso", label: "Peso (g)", aliases: ["peso", "peso_g", "gramos", "gr", "peso gr"] },
  { key: "talla", label: "Talla", aliases: ["talla", "talla_anillo", "medida", "size"] },
  { key: "piedras", label: "Piedras / gemas", aliases: ["piedras", "gemas", "piedra", "gema"] },
  { key: "cantidad", label: "Cantidad / stock", aliases: ["cantidad", "stock", "existencia", "existencias", "unidades", "exist"] },
  { key: "estado", label: "Estado", aliases: ["estado", "situacion", "situación"] },
];

function normalizarClave(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().toLowerCase().replace(/\s+/g, "_");
}
function numero(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(",", ".").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function sugerir(headers: string[], aliases: string[]) {
  const normalized = headers.map((h) => ({ original: h, key: normalizarClave(h) }));
  const exact = normalized.find((h) => aliases.includes(h.key));
  if (exact) return exact.original;
  return normalized.find((h) => aliases.some((a) => h.key.includes(normalizarClave(a))))?.original ?? "";
}
function leerFilas(file: File) {
  return file.arrayBuffer().then((bytes) => {
    const workbook = XLSX.read(new Uint8Array(bytes), { cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
    if (!sheet) throw new Error("El archivo no contiene hojas");
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  });
}
function transformar(row: Record<string, unknown>, mapping: Record<string, string>) {
  const get = (key: string) => {
    const col = mapping[key];
    return col ? row[col] : "";
  };
  return {
    codigo: String(get("codigo") ?? "").trim(),
    nombre: String(get("nombre") ?? "").trim() || "Joya importada",
    metal: String(get("metal") ?? "").trim(),
    ley: String(get("ley") ?? "").trim(),
    peso: numero(get("peso")),
    talla: String(get("talla") ?? "").trim(),
    piedras: String(get("piedras") ?? "").trim(),
    cantidad: numero(get("cantidad")) ?? 1,
    estado: String(get("estado") ?? "").trim() || "disponible",
  };
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    try {
      const userId = ctx.userClaims?.sub;
      if (!userId) return Response.json({ error: "Sesión no válida" }, { status: 401, headers: corsHeaders });

      const { data: esAdmin, error: adminError } = await ctx.supabase.rpc("es_admin", { _user_id: userId });
      if (adminError) throw adminError;
      if (!esAdmin) return Response.json({ error: "Solo un administrador puede importar inventario" }, { status: 403, headers: corsHeaders });

      const { data: perfil, error: perfilError } = await ctx.supabase.from("profiles").select("sede_id").eq("id", userId).single();
      if (perfilError) throw perfilError;
      if (!perfil?.sede_id) return Response.json({ error: "El usuario no tiene una sede asignada" }, { status: 422, headers: corsHeaders });

      const form = await req.formData();
      const file = form.get("archivo");
      if (!(file instanceof File)) return Response.json({ error: "Adjunta un Excel" }, { status: 400, headers: corsHeaders });

      const mode = String(form.get("modo") ?? "preview");
      const rows = await leerFilas(file);
      const headers = Object.keys(rows[0] ?? {});
      const mappingRaw = String(form.get("mapping") ?? "");
      const mapping = mappingRaw ? JSON.parse(mappingRaw) as Record<string,string> : Object.fromEntries(CAMPOS.map((c) => [c.key, sugerir(headers, c.aliases)]));
      const normalizedRows = rows.map((r) => transformar(r, mapping));
      const validos = normalizedRows.filter((r) => r.codigo);
      const sinCodigo = normalizedRows.length - validos.length;
      const codigos = validos.map((r) => r.codigo.toLowerCase());
      const duplicados = codigos.filter((c, i) => codigos.indexOf(c) !== i);
      const duplicadosUnicos = [...new Set(duplicados)];

      if (mode === "preview") {
        return Response.json({
          ok: true,
          modo: "preview",
          archivo: file.name,
          hojas: 1,
          columnas: headers,
          mapping,
          campos: CAMPOS.map(({ key, label }) => ({ key, label })),
          filas: rows.length,
          validas: validos.length,
          sinCodigo,
          duplicados: duplicadosUnicos.length,
          muestra: normalizedRows.slice(0, 8),
          advertencias: [
            ...(sinCodigo ? [`${sinCodigo} filas no tienen código y no se importarán`] : []),
            ...(duplicadosUnicos.length ? [`${duplicadosUnicos.length} códigos están repetidos dentro del archivo`] : []),
          ],
        }, { headers: corsHeaders });
      }

      if (mode !== "confirm") throw new Error("Modo de importación no válido");
      if (!mappingRaw) throw new Error("Falta el mapeo de columnas");
      if (!validos.length) throw new Error("No hay registros válidos para importar");

      const { data: lote, error: loteError } = await ctx.supabase.from("inventario_joyas_importaciones").insert({
        sede_id: perfil.sede_id,
        nombre_archivo: file.name,
        filas_detectadas: rows.length,
        filas_importadas: 0,
        filas_con_revision: sinCodigo + duplicadosUnicos.length,
        creado_por: userId,
      }).select("id").single();
      if (loteError) throw loteError;

      const payload = validos.map((r) => ({
        sede_id: perfil.sede_id,
        importacion_id: lote.id,
        ...r,
        origen: "excel",
        metadata: { archivo: file.name, importado_por: userId },
      }));

      let imported = 0;
      for (let i = 0; i < payload.length; i += 100) {
        const { error } = await ctx.supabase.from("inventario_joyas").upsert(payload.slice(i, i + 100), { onConflict: "sede_id,codigo" });
        if (error) throw error;
        imported += Math.min(100, payload.length - i);
      }

      await ctx.supabase.from("inventario_joyas_importaciones").update({
        filas_importadas: imported,
        filas_con_revision: sinCodigo + duplicadosUnicos.length,
      }).eq("id", lote.id);

      return Response.json({
        ok: true,
        modo: "confirm",
        importacion_id: lote.id,
        filas_detectadas: rows.length,
        filas_importadas: imported,
        filas_con_revision: sinCodigo + duplicadosUnicos.length,
      }, { headers: corsHeaders });
    } catch (error) {
      console.error("importar-inventario-joyas", error);
      return Response.json({ error: error instanceof Error ? error.message : "No se pudo procesar el inventario" }, { status: 500, headers: corsHeaders });
    }
  }),
};