import { withSupabase } from "npm:@supabase/server@1";
import * as XLSX from "npm:@e965/xlsx@0.20.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizarClave(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\\s+/g, "_");
}

function numero(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace(",", ".").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function texto(row: Record<string, unknown>, aliases: string[]) {
  for (const alias of aliases) {
    const key = normalizarClave(alias);
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return String(row[key]).trim();
    }
  }
  return "";
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
      const userId = ctx.userClaims?.sub;
      if (!userId) return Response.json({ error: "Sesión no válida" }, { status: 401, headers: corsHeaders });

      const { data: esAdmin, error: adminError } = await ctx.supabase.rpc("es_admin", { _user_id: userId });
      if (adminError) throw adminError;
      if (!esAdmin) {
        return Response.json({ error: "Solo un administrador puede importar inventario" }, { status: 403, headers: corsHeaders });
      }

      const { data: perfil, error: perfilError } = await ctx.supabase
        .from("profiles").select("sede_id").eq("id", userId).single();
      if (perfilError) throw perfilError;
      if (!perfil?.sede_id) {
        return Response.json({ error: "El usuario no tiene una sede asignada" }, { status: 422, headers: corsHeaders });
      }

      const form = await req.formData();
      const file = form.get("archivo");
      if (!(file instanceof File)) {
        return Response.json({ error: "Adjunta un archivo Excel (.xlsx/.xls)" }, { status: 400, headers: corsHeaders });
      }

      const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), { cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
      if (!firstSheet) return Response.json({ error: "El archivo no contiene hojas" }, { status: 400, headers: corsHeaders });

      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
      const filas = raw.map((row) => {
        const normalized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) normalized[normalizarClave(key)] = value;
        return normalized;
      }).filter((row) => texto(row, ["codigo", "código", "sku", "codigo_producto"]));

      const { data: lote, error: loteError } = await ctx.supabase
        .from("inventario_joyas_importaciones")
        .insert({
          sede_id: perfil.sede_id,
          nombre_archivo: file.name,
          filas_detectadas: raw.length,
          filas_importadas: 0,
          filas_con_revision: 0,
          creado_por: userId,
        })
        .select("id").single();
      if (loteError) throw loteError;

      if (filas.length === 0) {
        await ctx.supabase.from("inventario_joyas_importaciones")
          .update({ filas_con_revision: raw.length }).eq("id", lote.id);
        return Response.json({ error: "No encontré una columna Código/SKU con datos", filas_detectadas: raw.length }, { status: 422, headers: corsHeaders });
      }

      const rows = filas.map((row) => ({
        sede_id: perfil.sede_id,
        importacion_id: lote.id,
        codigo: texto(row, ["codigo", "código", "sku", "codigo_producto"]),
        nombre: texto(row, ["nombre", "pieza", "producto", "descripcion", "descripción"]) || "Joya importada",
        metal: texto(row, ["metal", "material"]),
        ley: texto(row, ["ley", "quilataje", "kilataje"]),
        peso: numero(row.peso ?? row.peso_g ?? row.gramos),
        talla: texto(row, ["talla", "talla_anillo", "medida"]),
        piedras: texto(row, ["piedras", "gemas", "piedra"]),
        cantidad: numero(row.cantidad ?? row.stock ?? row.unidades) ?? 1,
        estado: texto(row, ["estado"]) || "disponible",
        origen: "excel",
        metadata: { archivo: file.name },
      }));

      let imported = 0;
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await ctx.supabase
          .from("inventario_joyas")
          .upsert(rows.slice(i, i + 100), { onConflict: "sede_id,codigo" });
        if (error) throw error;
        imported += Math.min(100, rows.length - i);
      }

      const review = Math.max(0, raw.length - filas.length);
      await ctx.supabase.from("inventario_joyas_importaciones")
        .update({ filas_importadas: imported, filas_con_revision: review }).eq("id", lote.id);

      return Response.json({
        ok: true,
        importacion_id: lote.id,
        filas_detectadas: raw.length,
        filas_importadas: imported,
        filas_con_revision: review,
      }, { headers: corsHeaders });
    } catch (error) {
      console.error("importar-inventario-joyas", error);
      return Response.json(
        { error: error instanceof Error ? error.message : "No se pudo importar el inventario" },
        { status: 500, headers: corsHeaders },
      );
    }
  }),
};