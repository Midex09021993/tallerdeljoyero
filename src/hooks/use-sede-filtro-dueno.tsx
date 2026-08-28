import { useCallback, useEffect, useMemo, useState } from "react";
import { useSesion } from "@/lib/auth";
import { useSedes, type Pedido, type Sede } from "@/lib/taller-db";

export const TODAS_LAS_SEDES = "__todas_las_sedes__";

const STORAGE_KEY = "aurum.sedeFiltroDueno";

export function useSedeFiltroDueno() {
  const { data: sesion } = useSesion();
  const { data: sedes = [] } = useSedes();
  const [sedeFiltro, setSedeFiltroState] = useState(TODAS_LAS_SEDES);

  useEffect(() => {
    if (!sesion?.esDueno || typeof window === "undefined") return;
    const guardada = window.localStorage.getItem(STORAGE_KEY);
    if (guardada) setSedeFiltroState(guardada);
  }, [sesion?.esDueno]);

  const setSedeFiltro = useCallback((valor: string) => {
    setSedeFiltroState(valor);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, valor);
    }
  }, []);

  const sedeSeleccionada = useMemo(
    () => sedes.find((s) => s.id === sedeFiltro) ?? null,
    [sedeFiltro, sedes],
  );

  const filtrarPedidos = useCallback(
    <T extends Pick<Pedido, "sede_id">>(pedidos: T[]) => {
      if (!sesion?.esDueno || sedeFiltro === TODAS_LAS_SEDES) return pedidos;
      return pedidos.filter((pedido) => pedido.sede_id === sedeFiltro);
    },
    [sedeFiltro, sesion?.esDueno],
  );

  return {
    esDueno: Boolean(sesion?.esDueno),
    sedeFiltro,
    setSedeFiltro,
    sedeSeleccionada,
    sedes,
    filtrarPedidos,
    etiquetaSede: !sesion?.esDueno
      ? (sesion?.sede?.nombre ?? "tu sede")
      : sedeFiltro === TODAS_LAS_SEDES
        ? "Todas las sedes"
        : (sedeSeleccionada?.nombre ?? "Sede seleccionada"),
  };
}

export function SelectorSedeDueno({
  esDueno,
  sedes,
  value,
  onChange,
  className = "",
}: {
  esDueno: boolean;
  sedes: Sede[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  if (!esDueno) return null;

  return (
    <label
      className={`flex min-w-[220px] flex-col text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ${className}`}
    >
      Trabajar por sede
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium normal-case tracking-normal text-foreground outline-none focus:border-gold"
      >
        <option value={TODAS_LAS_SEDES}>Todas las sedes</option>
        {sedes.map((sede) => (
          <option key={sede.id} value={sede.id}>
            {sede.nombre}
            {sede.ciudad ? ` - ${sede.ciudad}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
