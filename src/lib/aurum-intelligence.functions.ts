import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// La identidad autorizada se comprueba exclusivamente en servidor.
// No aceptar userId, correo ni rol enviados por el navegador.
const OWNER_UID = "5d80fd40-b059-42e9-ad57-28ac5cf9899e";

export const verificarAccesoAurumIntelligence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (context.userId !== OWNER_UID) {
      throw new Error("No autorizado para AURUM INTELLIGENCE.");
    }

    return { autorizado: true as const };
  });
