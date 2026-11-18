import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/lib/auth";

export type ServicioExternoRecibido = {
  id: string;
  pedido_id: string;
  area: string;
  titulo: string;
  descripcion: string;
  estado: string;
  prioridad: string;
  fecha_planificada: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  notas: string;
  origen_participante_id: string;
  origen_participante_nombre: string;
  referencia_pedido: string | null;
  pieza: string | null;
  material: string | null;
  cantidad_piezas: number | null;
};

export function useServiciosExternosRecibidos() {
  const { data: sesion } = useSesion();
  return useQuery({
    queryKey: ["servicios-externos-recibidos", sesion?.user.id, sesion?.participante?.id],
    enabled: Boolean(sesion?.user.id && sesion?.participante?.id),
    queryFn: async (): Promise<ServicioExternoRecibido[]> => {
      const { data, error } = await supabase.rpc("listar_servicios_externos_recibidos");
      if (error) throw error;
      return (data ?? []) as ServicioExternoRecibido[];
    },
    staleTime: 15_000,
  });
}
