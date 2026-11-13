import { expect, test } from "bun:test";
import { canViewAurumInternalArchitecture } from "../src/lib/aurum/aurum-internal-access";

test("only the FADILAB participant workspace can view internal AURUM architecture", () => {
  expect(canViewAurumInternalArchitecture("FADILAB")).toBe(true);
  expect(canViewAurumInternalArchitecture("  fadilab  ")).toBe(true);
  expect(canViewAurumInternalArchitecture("Taller del Joyero")).toBe(false);
  expect(canViewAurumInternalArchitecture("AURUM LAB")).toBe(false);
  expect(canViewAurumInternalArchitecture(null)).toBe(false);
  expect(canViewAurumInternalArchitecture(undefined)).toBe(false);
});
