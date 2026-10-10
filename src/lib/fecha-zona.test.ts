import { test } from "node:test";
import assert from "node:assert/strict";
import { formatearFechaZona, zonaValida } from "./fecha-zona";

test("un instante UTC de madrugada sigue siendo el día anterior en Lima", () => {
  assert.equal(formatearFechaZona("2026-10-10T02:10:00Z", "America/Lima"), "9 de octubre de 2026");
});
test("el mismo instante ya es 10 de octubre en Madrid", () => {
  assert.equal(formatearFechaZona("2026-10-10T02:10:00Z", "Europe/Madrid"), "10 de octubre de 2026");
});
test("una fecha pura no se desplaza con la zona", () => {
  assert.equal(formatearFechaZona("2026-10-10", "Pacific/Kiritimati"), "10 de octubre de 2026");
});
test("rechaza zonas que no son IANA", () => {
  assert.equal(zonaValida("Lima/Peru"), null);
});
