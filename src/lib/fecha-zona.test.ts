import { describe, expect, it } from "bun:test";
import { formatearFechaZona, zonaValida } from "./fecha-zona";

describe("fecha comercial por zona de sede", () => {
  it("un instante UTC de madrugada sigue siendo el día anterior en Lima", () => {
    expect(formatearFechaZona("2026-10-10T02:10:00Z", "America/Lima")).toBe("9 de octubre de 2026");
  });
  it("el mismo instante ya es 10 de octubre en Madrid", () => {
    expect(formatearFechaZona("2026-10-10T02:10:00Z", "Europe/Madrid")).toBe("10 de octubre de 2026");
  });
  it("una fecha pura no se desplaza con la zona", () => {
    expect(formatearFechaZona("2026-10-10", "Pacific/Kiritimati")).toBe("10 de octubre de 2026");
  });
  it("rechaza zonas que no son IANA", () => {
    expect(zonaValida("Lima/Peru")).toBeNull();
  });
});
