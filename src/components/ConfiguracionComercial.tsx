import { Building2, FileText } from "lucide-react";
import { Panel } from "@/components/AppShell";
import { ConfiguracionIdentidadComercial } from "@/components/ConfiguracionIdentidadComercial";
import { ConfiguracionContratos } from "@/components/ConfiguracionContratos";

export function ConfiguracionComercial() {
  return (
    <div className="space-y-6">
      <Panel titulo="Identidad comercial, moneda e impuestos">
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Datos maestros del taller / joyería</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Esta identidad es la fuente de verdad para cotizaciones, contratos y demás documentos comerciales.
                Los datos fiscales y monetarios no se vuelven a registrar dentro de los contratos.
              </p>
            </div>
          </div>
        </div>
        <ConfiguracionIdentidadComercial />
      </Panel>

      <Panel titulo="Contratos y plantillas">
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Contenido contractual</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Aquí se configuran plantillas, cláusulas, textos, secciones y versiones.
                El nombre, identidad fiscal, moneda e impuestos se toman automáticamente de la identidad comercial.
              </p>
            </div>
          </div>
        </div>
        <ConfiguracionContratos />
      </Panel>
    </div>
  );
}
