import { describe, expect, test } from "bun:test";
import { AURI_TOOLS, ejecutarHerramienta, filtrarParaModelo } from "../src/lib/auri/tool-registry";

describe("AURI interno", () => {
  test("reutiliza exactamente las cinco herramientas MCP, todas de solo lectura", () => {
    expect(AURI_TOOLS.map((t) => t.name).sort()).toEqual(["buscar_clientes", "listar_contratos", "listar_pedidos", "resumen_produccion", "ver_pedido"]);
    expect(AURI_TOOLS.every((t) => t.annotations?.readOnlyHint === true)).toBe(true);
  });
  test("no envía teléfonos, correos, costes ni notas al modelo", () => {
    const out = filtrarParaModelo({ clientes: [{ nombre: "Ana", telefono: "999", email: "a@b.pe", notas: "x", precio: 10 }] });
    expect(out).toEqual({ clientes: [{ nombre: "Ana" }] });
  });
  test("sin token no ejecuta herramientas", async () => {
    const r = await ejecutarHerramienta("listar_pedidos", {}, { token: "", userId: "u", claims: {} });
    expect(r.ok).toBe(false);
  });
  test("rechaza herramientas desconocidas y argumentos extra", async () => {
    expect((await ejecutarHerramienta("borrar_todo", {}, { token: "t", userId: "u", claims: {} })).ok).toBe(false);
    expect((await ejecutarHerramienta("listar_pedidos", { x: 1 }, { token: "t", userId: "u", claims: {} })).ok).toBe(false);
  });
});
