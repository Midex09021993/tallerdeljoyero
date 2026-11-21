import { describe, expect, test } from "bun:test";
import { AURI_TOOLS, adaptarEsquemaGemini, ejecutarHerramienta, esConfirmacionExplicita, filtrarParaModelo } from "../src/lib/auri/tool-registry";

describe("AURI interno", () => {
  test("incluye cinco consultas de solo lectura y una herramienta de registro con confirmación", () => {
    expect(AURI_TOOLS.map((tool) => tool.name).sort()).toEqual([
      "buscar_clientes", "crear_cliente", "listar_contratos", "listar_pedidos", "resumen_produccion", "ver_pedido",
    ]);
    expect(AURI_TOOLS.filter((tool) => tool.name !== "crear_cliente").every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);
    expect(AURI_TOOLS.find((tool) => tool.name === "crear_cliente")?.annotations?.readOnlyHint).toBe(false);
  });

  test("adapta los esquemas Zod al subconjunto OpenAPI admitido por Gemini", () => {
    const schema = adaptarEsquemaGemini({
      type: "object",
      additionalProperties: false,
      properties: {
        nombre: { type: "string", minLength: 2, maxLength: 160, pattern: "^[A-Z]+$", description: "Nombre" },
        confirmacion: { type: "boolean", const: true },
        tipo: { type: "string", enum: ["persona", "empresa"] },
      },
      required: ["nombre"],
    }) as Record<string, unknown>;
    const props = schema.properties as Record<string, Record<string, unknown>>;
    expect(schema.additionalProperties).toBeUndefined();
    expect(props.nombre.minLength).toBeUndefined();
    expect(props.nombre.pattern).toBeUndefined();
    expect(props.nombre.description).toBe("Nombre");
    expect(props.confirmacion.const).toBeUndefined();
    expect(props.tipo.enum).toEqual(["persona", "empresa"]);
    const bounded = adaptarEsquemaGemini({
      type: "object",
      properties: { limite: { type: "integer", minimum: 1, maximum: 100 } },
    }) as Record<string, unknown>;
    const limite = (bounded.properties as Record<string, Record<string, unknown>>).limite;
    expect(limite.minimum).toBeUndefined();
    expect(limite.maximum).toBeUndefined();
    // No se elimina la validación real: cada llamada se valida con Zod en el servidor.
  });

  test("exige una confirmación breve y explícita antes de permitir el registro", () => {
    expect(esConfirmacionExplicita("CONFIRMO EL REGISTRO")).toBe(true);
    expect(esConfirmacionExplicita("Sí, confirmo el registro")).toBe(true);
    expect(esConfirmacionExplicita("adelante")).toBe(false);
    expect(esConfirmacionExplicita("sí")).toBe(false);
    expect(esConfirmacionExplicita("todavía no")).toBe(false);
    expect(esConfirmacionExplicita("registra a Juan")).toBe(false);
  });

  test("solo permite campos operativos anonimizados hacia Gemini", () => {
    const out = filtrarParaModelo({
      pedidos: [{
        id: "uuid", referencia: "PED-001", cliente: "Ana", nombre: "Ana",
        telefono: "999", email: "a@b.pe", notas: "x", precio: 10,
        estado: "En Producción", pieza: "Anillo", trabajo: "Fabricación",
      }],
    });
    expect(out).toEqual({ pedidos: [{ estado: "En Producción", pieza: "Anillo", trabajo: "Fabricación" }] });
  });

  test("no filtra campos desconocidos ni identificadores", () => {
    expect(filtrarParaModelo({ id: "abc", customer_name: "Ana", secret: "x", estado: "Recibido" }))
      .toEqual({ estado: "Recibido" });
  });

  test("sin token no ejecuta herramientas", async () => {
    const result = await ejecutarHerramienta("listar_pedidos", {}, { token: "" });
    expect(result.ok).toBe(false);
  });

  test("rechaza herramientas desconocidas y argumentos extra", async () => {
    expect((await ejecutarHerramienta("borrar_todo", {}, { token: "t" })).ok).toBe(false);
    expect((await ejecutarHerramienta("listar_pedidos", { x: 1 }, { token: "t" })).ok).toBe(false);
  });
});
