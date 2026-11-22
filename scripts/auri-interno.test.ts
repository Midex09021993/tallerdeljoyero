import { describe, expect, test } from "bun:test";
import { AURI_TOOLS, adaptarEsquemaGemini, ejecutarHerramienta, esConfirmacionExplicita, filtrarParaModelo } from "../src/lib/auri/tool-registry";
import { extraerBusqueda } from "../src/lib/auri/auri-directo.functions";

describe("AURI interno", () => {
  test("expone únicamente consultas de solo lectura hasta implementar consentimiento de escritura", () => {
    expect(AURI_TOOLS.map((tool) => tool.name).sort()).toEqual([
      "buscar_clientes", "listar_contratos", "listar_pedidos", "resumen_produccion", "ver_pedido",
    ]);
    expect(AURI_TOOLS.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);
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
  });

  test("exige una confirmación breve y explícita antes de permitir el registro", () => {
    expect(esConfirmacionExplicita("CONFIRMO EL REGISTRO")).toBe(true);
    expect(esConfirmacionExplicita("Sí, confirmo el registro")).toBe(true);
    expect(esConfirmacionExplicita("adelante")).toBe(false);
    expect(esConfirmacionExplicita("sí")).toBe(false);
    expect(esConfirmacionExplicita("todavía no")).toBe(false);
    expect(esConfirmacionExplicita("registra a Juan")).toBe(false);
  });

  test("filtra resultados de clientes y contratos sin exponer PII", () => {
    const out = filtrarParaModelo({
      clientes: [{ id: "uuid", nombre: "Ana Pérez", tipo: "persona", ciudad: "Lima", estado: "activo", telefono: "999", email: "a@b.pe", documento: "123" }],
      contratos: [{ id: "uuid", numero: "CT-01", cliente: "Ana Pérez", creado: "2026-01-01", pedidos: 2, direccion: "privada" }],
    });
    expect(out).toEqual({
      clientes: [{ nombre: "Ana Pérez", tipo: "persona", ciudad: "Lima", estado: "activo" }],
      contratos: [{ numero: "CT-01", cliente: "Ana Pérez", creado: "2026-01-01", pedidos: 2 }],
    });
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

describe("AURI Directo · extracción de filtros", () => {
  test("extrae nombre de cliente, contrato y cliente asociado a pedidos", () => {
    expect(extraerBusqueda("Buscar cliente Juan Pérez", "cliente")).toBe("Juan Pérez");
    expect(extraerBusqueda("Clientes de Juan Pérez", "cliente")).toBe("Juan Pérez");
    expect(extraerBusqueda("Contratos de Acme", "contrato")).toBe("Acme");
    expect(extraerBusqueda("Pedidos de Juan Pérez", "pedido")).toBe("Juan Pérez");
  });

  test("no inventa filtros cuando el usuario no especifica un valor", () => {
    expect(extraerBusqueda("Consultar pedidos", "pedido")).toBeUndefined();
    expect(extraerBusqueda("Buscar cliente", "cliente")).toBeUndefined();
  });
});
