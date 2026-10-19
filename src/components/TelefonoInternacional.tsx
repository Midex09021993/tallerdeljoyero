import { useEffect, useState } from "react";

type PaisTelefono = { iso: string; nombre: string; prefijo: string; bandera: string };

const PAISES: PaisTelefono[] = [
  { iso: "PE", nombre: "Perú", prefijo: "51", bandera: "🇵🇪" },
  { iso: "US", nombre: "Estados Unidos", prefijo: "1", bandera: "🇺🇸" },
  { iso: "CA", nombre: "Canadá", prefijo: "1", bandera: "🇨🇦" },
  { iso: "MX", nombre: "México", prefijo: "52", bandera: "🇲🇽" },
  { iso: "ES", nombre: "España", prefijo: "34", bandera: "🇪🇸" },
  { iso: "CO", nombre: "Colombia", prefijo: "57", bandera: "🇨🇴" },
  { iso: "CL", nombre: "Chile", prefijo: "56", bandera: "🇨🇱" },
  { iso: "AR", nombre: "Argentina", prefijo: "54", bandera: "🇦🇷" },
  { iso: "BR", nombre: "Brasil", prefijo: "55", bandera: "🇧🇷" },
  { iso: "EC", nombre: "Ecuador", prefijo: "593", bandera: "🇪🇨" },
  { iso: "BO", nombre: "Bolivia", prefijo: "591", bandera: "🇧🇴" },
  { iso: "UY", nombre: "Uruguay", prefijo: "598", bandera: "🇺🇾" },
  { iso: "PY", nombre: "Paraguay", prefijo: "595", bandera: "🇵🇾" },
  { iso: "VE", nombre: "Venezuela", prefijo: "58", bandera: "🇻🇪" },
  { iso: "CR", nombre: "Costa Rica", prefijo: "506", bandera: "🇨🇷" },
  { iso: "PA", nombre: "Panamá", prefijo: "507", bandera: "🇵🇦" },
  { iso: "DO", nombre: "República Dominicana", prefijo: "1", bandera: "🇩🇴" },
  { iso: "GB", nombre: "Reino Unido", prefijo: "44", bandera: "🇬🇧" },
  { iso: "FR", nombre: "Francia", prefijo: "33", bandera: "🇫🇷" },
  { iso: "DE", nombre: "Alemania", prefijo: "49", bandera: "🇩🇪" },
  { iso: "IT", nombre: "Italia", prefijo: "39", bandera: "🇮🇹" },
  { iso: "PT", nombre: "Portugal", prefijo: "351", bandera: "🇵🇹" },
  { iso: "NL", nombre: "Países Bajos", prefijo: "31", bandera: "🇳🇱" },
  { iso: "CH", nombre: "Suiza", prefijo: "41", bandera: "🇨🇭" },
  { iso: "AU", nombre: "Australia", prefijo: "61", bandera: "🇦🇺" },
  { iso: "NZ", nombre: "Nueva Zelanda", prefijo: "64", bandera: "🇳🇿" },
  { iso: "JP", nombre: "Japón", prefijo: "81", bandera: "🇯🇵" },
  { iso: "CN", nombre: "China", prefijo: "86", bandera: "🇨🇳" },
  { iso: "IN", nombre: "India", prefijo: "91", bandera: "🇮🇳" },
  { iso: "AE", nombre: "Emiratos Árabes Unidos", prefijo: "971", bandera: "🇦🇪" },
];

function digitos(valor: string) {
  return valor.replace(/\D/g, "");
}

function interpretarNumero(valor: string, paisPredeterminado = "PE") {
  const limpio = valor.trim();
  if (!limpio) return { pais: PAISES.some((pais) => pais.iso === paisPredeterminado) ? paisPredeterminado : "PE", nacional: "" };
  const numeros = digitos(limpio);
  if (!numeros) return { pais: PAISES.some((pais) => pais.iso === paisPredeterminado) ? paisPredeterminado : "PE", nacional: "" };
  const paisCoincidente = limpio.startsWith("+")
    ? [...PAISES].sort((a, b) => b.prefijo.length - a.prefijo.length).find((pais) => numeros.startsWith(pais.prefijo))
    : numeros.startsWith("00")
      ? [...PAISES].sort((a, b) => b.prefijo.length - a.prefijo.length).find((pais) => numeros.slice(2).startsWith(pais.prefijo))
      : undefined;
  if (paisCoincidente) {
    const internacional = limpio.startsWith("+") ? numeros : numeros.slice(2);
    return { pais: paisCoincidente.iso, nacional: internacional.slice(paisCoincidente.prefijo.length) };
  }
  // Los números antiguos sin prefijo se interpretan con el país configurado para el taller.
  return { pais: PAISES.some((pais) => pais.iso === paisPredeterminado) ? paisPredeterminado : "PE", nacional: numeros };
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  defaultCountry?: string;
  id?: string;
};

export function TelefonoInternacional({ value, onChange, defaultCountry = "PE", id }: Props) {
  const [paisIso, setPaisIso] = useState(() => interpretarNumero(value, defaultCountry).pais);
  const [nacional, setNacional] = useState(() => interpretarNumero(value, defaultCountry).nacional);
  const [tocado, setTocado] = useState(false);
  const pais = PAISES.find((item) => item.iso === paisIso) ?? PAISES[0];

  useEffect(() => {
    const interpretado = interpretarNumero(value, defaultCountry);
    setPaisIso(interpretado.pais);
    setNacional(interpretado.nacional);
  }, [value, defaultCountry]);

  function emitir(siguientePais: PaisTelefono, siguienteNacional: string) {
    const numeros = digitos(siguienteNacional);
    const internacional = numeros ? `+${siguientePais.prefijo}${numeros}` : "";
    onChange(internacional);
  }

  const cantidadDigitos = digitos(nacional).length;
  const prefijoDuplicado = nacional.startsWith(pais.prefijo) && nacional.length > pais.prefijo.length + 4;
  const invalido = tocado && nacional.length > 0 && (cantidadDigitos < 4 || cantidadDigitos + pais.prefijo.length > 15 || prefijoDuplicado);

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id ? `${id}-pais` : undefined} className="text-xs font-medium text-foreground">País o región</label>
      <select
        id={id ? `${id}-pais` : undefined}
        value={paisIso}
        onChange={(event) => {
          const siguiente = PAISES.find((item) => item.iso === event.target.value) ?? PAISES[0];
          setPaisIso(siguiente.iso);
          emitir(siguiente, nacional);
        }}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
      >
        {PAISES.map((item) => <option key={item.iso} value={item.iso}>{item.bandera} {item.nombre} (+{item.prefijo})</option>)}
      </select>
      <label htmlFor={id} className="text-xs font-medium text-foreground">Número de teléfono</label>
      <div className="flex min-w-0 items-center rounded-xl border border-border bg-background focus-within:border-gold/50 focus-within:ring-1 focus-within:ring-gold/20">
        <span className="shrink-0 border-r border-border px-3 text-sm text-muted-foreground">+{pais.prefijo}</span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={nacional}
          onChange={(event) => {
            const siguiente = event.target.value;
            setNacional(siguiente);
            event.currentTarget.setCustomValidity("");
            emitir(pais, siguiente);
          }}
          onBlur={(event) => {
            setTocado(true);
            const digitosNumero = digitos(nacional).length;
            const errorNumero = nacional.trim() && (digitosNumero < 4 || digitosNumero + pais.prefijo.length > 15 || (nacional.startsWith(pais.prefijo) && nacional.length > pais.prefijo.length + 4))
              ? "Revisa el número y el código de país."
              : "";
            event.currentTarget.setCustomValidity(errorNumero);
          }}
          onInvalid={(event) => {
            const digitosNumero = digitos(nacional).length;
            if (nacional.trim() && (digitosNumero < 4 || digitosNumero + pais.prefijo.length > 15 || (nacional.startsWith(pais.prefijo) && nacional.length > pais.prefijo.length + 4))) {
              event.currentTarget.setCustomValidity("Revisa el número y el código de país.");
            }
          }}
          aria-invalid={invalido}
          aria-describedby={invalido && id ? `${id}-ayuda` : undefined}
          placeholder="Número nacional"
          className="h-11 min-w-0 flex-1 rounded-r-xl bg-transparent px-3 text-sm outline-none"
        />
      </div>
      {invalido ? <p id={id ? `${id}-ayuda` : undefined} role="alert" className="text-xs text-destructive">Revisa el número: debe tener entre 4 y 15 dígitos contando el prefijo y no repetir el código de país.</p> : <p className="text-[11px] text-muted-foreground">Se guardará en formato internacional, por ejemplo +51987654321.</p>}
    </div>
  );
}
