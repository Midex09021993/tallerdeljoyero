import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type PaisTelefono = { iso: string; nombre: string; prefijo: string; bandera: string };

export const PAISES_TELEFONO: PaisTelefono[] = [
  { iso: "PE", nombre: "Perú", prefijo: "51", bandera: "🇵🇪" },
  { iso: "AR", nombre: "Argentina", prefijo: "54", bandera: "🇦🇷" },
  { iso: "BO", nombre: "Bolivia", prefijo: "591", bandera: "🇧🇴" },
  { iso: "BR", nombre: "Brasil", prefijo: "55", bandera: "🇧🇷" },
  { iso: "CL", nombre: "Chile", prefijo: "56", bandera: "🇨🇱" },
  { iso: "CO", nombre: "Colombia", prefijo: "57", bandera: "🇨🇴" },
  { iso: "CR", nombre: "Costa Rica", prefijo: "506", bandera: "🇨🇷" },
  { iso: "CU", nombre: "Cuba", prefijo: "53", bandera: "🇨🇺" },
  { iso: "DO", nombre: "República Dominicana", prefijo: "1", bandera: "🇩🇴" },
  { iso: "EC", nombre: "Ecuador", prefijo: "593", bandera: "🇪🇨" },
  { iso: "SV", nombre: "El Salvador", prefijo: "503", bandera: "🇸🇻" },
  { iso: "GT", nombre: "Guatemala", prefijo: "502", bandera: "🇬🇹" },
  { iso: "HN", nombre: "Honduras", prefijo: "504", bandera: "🇭🇳" },
  { iso: "MX", nombre: "México", prefijo: "52", bandera: "🇲🇽" },
  { iso: "NI", nombre: "Nicaragua", prefijo: "505", bandera: "🇳🇮" },
  { iso: "PA", nombre: "Panamá", prefijo: "507", bandera: "🇵🇦" },
  { iso: "PY", nombre: "Paraguay", prefijo: "595", bandera: "🇵🇾" },
  { iso: "UY", nombre: "Uruguay", prefijo: "598", bandera: "🇺🇾" },
  { iso: "VE", nombre: "Venezuela", prefijo: "58", bandera: "🇻🇪" },
  { iso: "US", nombre: "Estados Unidos", prefijo: "1", bandera: "🇺🇸" },
  { iso: "CA", nombre: "Canadá", prefijo: "1", bandera: "🇨🇦" },
  { iso: "PR", nombre: "Puerto Rico", prefijo: "1", bandera: "🇵🇷" },
  { iso: "GB", nombre: "Reino Unido", prefijo: "44", bandera: "🇬🇧" },
  { iso: "ES", nombre: "España", prefijo: "34", bandera: "🇪🇸" },
  { iso: "FR", nombre: "Francia", prefijo: "33", bandera: "🇫🇷" },
  { iso: "DE", nombre: "Alemania", prefijo: "49", bandera: "🇩🇪" },
  { iso: "IT", nombre: "Italia", prefijo: "39", bandera: "🇮🇹" },
  { iso: "PT", nombre: "Portugal", prefijo: "351", bandera: "🇵🇹" },
  { iso: "NL", nombre: "Países Bajos", prefijo: "31", bandera: "🇳🇱" },
  { iso: "BE", nombre: "Bélgica", prefijo: "32", bandera: "🇧🇪" },
  { iso: "CH", nombre: "Suiza", prefijo: "41", bandera: "🇨🇭" },
  { iso: "AT", nombre: "Austria", prefijo: "43", bandera: "🇦🇹" },
  { iso: "SE", nombre: "Suecia", prefijo: "46", bandera: "🇸🇪" },
  { iso: "NO", nombre: "Noruega", prefijo: "47", bandera: "🇳🇴" },
  { iso: "DK", nombre: "Dinamarca", prefijo: "45", bandera: "🇩🇰" },
  { iso: "FI", nombre: "Finlandia", prefijo: "358", bandera: "🇫🇮" },
  { iso: "PL", nombre: "Polonia", prefijo: "48", bandera: "🇵🇱" },
  { iso: "GR", nombre: "Grecia", prefijo: "30", bandera: "🇬🇷" },
  { iso: "IE", nombre: "Irlanda", prefijo: "353", bandera: "🇮🇪" },
  { iso: "RU", nombre: "Rusia", prefijo: "7", bandera: "🇷🇺" },
  { iso: "TR", nombre: "Turquía", prefijo: "90", bandera: "🇹🇷" },
  { iso: "UA", nombre: "Ucrania", prefijo: "380", bandera: "🇺🇦" },
  { iso: "AU", nombre: "Australia", prefijo: "61", bandera: "🇦🇺" },
  { iso: "NZ", nombre: "Nueva Zelanda", prefijo: "64", bandera: "🇳🇿" },
  { iso: "JP", nombre: "Japón", prefijo: "81", bandera: "🇯🇵" },
  { iso: "CN", nombre: "China", prefijo: "86", bandera: "🇨🇳" },
  { iso: "KR", nombre: "Corea del Sur", prefijo: "82", bandera: "🇰🇷" },
  { iso: "IN", nombre: "India", prefijo: "91", bandera: "🇮🇳" },
  { iso: "ID", nombre: "Indonesia", prefijo: "62", bandera: "🇮🇩" },
  { iso: "PH", nombre: "Filipinas", prefijo: "63", bandera: "🇵🇭" },
  { iso: "SG", nombre: "Singapur", prefijo: "65", bandera: "🇸🇬" },
  { iso: "TH", nombre: "Tailandia", prefijo: "66", bandera: "🇹🇭" },
  { iso: "MY", nombre: "Malasia", prefijo: "60", bandera: "🇲🇾" },
  { iso: "VN", nombre: "Vietnam", prefijo: "84", bandera: "🇻🇳" },
  { iso: "PK", nombre: "Pakistán", prefijo: "92", bandera: "🇵🇰" },
  { iso: "BD", nombre: "Bangladés", prefijo: "880", bandera: "🇧🇩" },
  { iso: "AE", nombre: "Emiratos Árabes Unidos", prefijo: "971", bandera: "🇦🇪" },
  { iso: "SA", nombre: "Arabia Saudita", prefijo: "966", bandera: "🇸🇦" },
  { iso: "IL", nombre: "Israel", prefijo: "972", bandera: "🇮🇱" },
  { iso: "ZA", nombre: "Sudáfrica", prefijo: "27", bandera: "🇿🇦" },
  { iso: "EG", nombre: "Egipto", prefijo: "20", bandera: "🇪🇬" },
  { iso: "MA", nombre: "Marruecos", prefijo: "212", bandera: "🇲🇦" },
  { iso: "NG", nombre: "Nigeria", prefijo: "234", bandera: "🇳🇬" },
  { iso: "KE", nombre: "Kenia", prefijo: "254", bandera: "🇰🇪" },
];

const digitos = (valor: string) => valor.replace(/\\D/g, "");
const normalizarBusqueda = (valor: string) => valor.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase();

function paisPorIso(iso: string) {
  return PAISES_TELEFONO.find((pais) => pais.iso === iso) ?? PAISES_TELEFONO[0]!;
}

function interpretarNumero(valor: string, paisPredeterminado = "PE") {
  const limpio = valor.trim();
  const predeterminado = paisPorIso(paisPredeterminado);
  if (!limpio) return { pais: predeterminado.iso, nacional: "" };
  const numeros = digitos(limpio);
  if (!numeros) return { pais: predeterminado.iso, nacional: "" };
  if (limpio.startsWith("+") || numeros.startsWith("00")) {
    const internacional = limpio.startsWith("+") ? numeros : numeros.slice(2);
    const coincidencias = [...PAISES_TELEFONO].sort((a, b) => b.prefijo.length - a.prefijo.length)
      .filter((pais) => internacional.startsWith(pais.prefijo));
    const pais = coincidencias.find((item) => item.iso === paisPredeterminado) ?? coincidencias[0];
    if (pais) return { pais: pais.iso, nacional: internacional.slice(pais.prefijo.length) };
  }
  return { pais: predeterminado.iso, nacional: numeros };
}

function formatearNumero(numero: string, iso: string) {
  const n = digitos(numero);
  if (["PE", "CL", "CO", "AR", "MX"].includes(iso) && n.length === 9) return n.replace(/(\\d{3})(\\d{3})(\\d{3})/, "$1 $2 $3");
  if (["US", "CA", "PR"].includes(iso) && n.length === 10) return n.replace(/(\\d{3})(\\d{3})(\\d{4})/, "$1 $2 $3");
  if (iso === "BR" && n.length >= 10) return n.replace(/(\\d{2})(\\d{4,5})(\\d{4})$/, "$1 $2 $3");
  return n;
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  defaultCountry?: string;
  id?: string;
  label?: string;
  optional?: boolean;
  className?: string;
};

export function TelefonoInternacional({ value, onChange, defaultCountry = "PE", id, label = "WhatsApp / teléfono", optional = false, className = "" }: Props) {
  const [paisIso, setPaisIso] = useState(() => interpretarNumero(value, defaultCountry).pais);
  const [nacional, setNacional] = useState(() => interpretarNumero(value, defaultCountry).nacional);
  const [tocado, setTocado] = useState(false);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const ultimoValorEmitido = useRef<string | null>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const pais = paisPorIso(paisIso);

  const paisesFiltrados = useMemo(() => {
    const consulta = normalizarBusqueda(busqueda.trim());
    return PAISES_TELEFONO.filter((item) => !consulta || normalizarBusqueda(item.nombre).includes(consulta) || item.iso.toLowerCase().includes(consulta) || item.prefijo.includes(consulta.replace(/^\\+/, "")));
  }, [busqueda]);

  useEffect(() => {
    if (ultimoValorEmitido.current === value) {
      ultimoValorEmitido.current = null;
      return;
    }
    const interpretado = interpretarNumero(value, defaultCountry);
    setPaisIso(interpretado.pais);
    setNacional(interpretado.nacional);
  }, [value, defaultCountry]);

  useEffect(() => {
    if (!selectorAbierto) return;
    function cerrarPorFuera(event: MouseEvent) {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) setSelectorAbierto(false);
    }
    function cerrarEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectorAbierto(false);
    }
    document.addEventListener("mousedown", cerrarPorFuera);
    document.addEventListener("keydown", cerrarEscape);
    return () => {
      document.removeEventListener("mousedown", cerrarPorFuera);
      document.removeEventListener("keydown", cerrarEscape);
    };
  }, [selectorAbierto]);

  function emitir(siguientePais: PaisTelefono, siguienteNacional: string) {
    const numeros = digitos(siguienteNacional).slice(0, 15 - siguientePais.prefijo.length);
    const internacional = numeros ? `+${siguientePais.prefijo}${numeros}` : "";
    ultimoValorEmitido.current = internacional;
    onChange(internacional);
  }

  function seleccionarPais(siguiente: PaisTelefono) {
    setPaisIso(siguiente.iso);
    setSelectorAbierto(false);
    setBusqueda("");
    emitir(siguiente, nacional);
  }

  function manejarCambioNumero(valor: string) {
    const limpio = valor.trim();
    if (limpio.startsWith("+") || limpio.startsWith("00")) {
      const detectado = interpretarNumero(limpio, paisIso);
      setPaisIso(detectado.pais);
      setNacional(detectado.nacional.slice(0, 15 - paisPorIso(detectado.pais).prefijo.length));
      emitir(paisPorIso(detectado.pais), detectado.nacional);
      return;
    }
    const siguiente = digitos(valor).slice(0, 15 - pais.prefijo.length);
    setNacional(siguiente);
    emitir(pais, siguiente);
  }

  const cantidadDigitos = digitos(nacional).length;
  const invalido = tocado && nacional.length > 0 && (cantidadDigitos < 4 || cantidadDigitos + pais.prefijo.length > 15);
  const descripcionId = id ? `${id}-ayuda` : undefined;

  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}{optional ? <span className="ml-1 font-normal text-muted-foreground">(opcional)</span> : null}
      </label>
      <div className="flex min-w-0 items-stretch overflow-visible rounded-xl border border-border bg-background shadow-sm transition focus-within:border-[#b99642] focus-within:ring-2 focus-within:ring-[#c7a65b]/15">
        <div ref={selectorRef} className="relative shrink-0">
          <button
            type="button"
            aria-label={`Seleccionar país. ${pais.nombre}, +${pais.prefijo}`}
            aria-haspopup="listbox"
            aria-expanded={selectorAbierto}
            onClick={() => { setSelectorAbierto((abierto) => !abierto); setBusqueda(""); }}
            className="flex h-12 items-center gap-2 rounded-l-xl px-3 text-sm transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#b99642]"
          >
            <span className="text-xl leading-none" aria-hidden="true">{pais.bandera}</span>
            <span className="font-semibold tabular-nums text-foreground">+{pais.prefijo}</span>
            <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${selectorAbierto ? "rotate-180" : ""}`} />
          </button>
          {selectorAbierto ? (
            <div className="absolute left-0 top-[calc(100%+8px)] z-[100] w-[min(330px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-[0_18px_50px_rgba(15,23,42,.18)]">
              <div className="border-b border-border p-2.5">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
                  <Search className="size-4 shrink-0 text-muted-foreground" />
                  <input autoFocus value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar país o código..." className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" aria-label="Buscar país o código telefónico" />
                  {busqueda ? <button type="button" onClick={() => setBusqueda("")} aria-label="Limpiar búsqueda" className="rounded p-1 text-muted-foreground hover:bg-muted"><X className="size-3.5"/></button> : null}
                </div>
              </div>
              <div role="listbox" aria-label="Países y códigos telefónicos" className="max-h-64 overflow-y-auto p-1.5">
                {paisesFiltrados.length ? paisesFiltrados.map((item) => (
                  <button key={item.iso} type="button" role="option" aria-selected={item.iso === paisIso} onClick={() => seleccionarPais(item)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b99642]">
                    <span className="text-xl" aria-hidden="true">{item.bandera}</span>
                    <span className="min-w-0 flex-1 truncate">{item.nombre}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">+{item.prefijo}</span>
                    {item.iso === paisIso ? <Check className="size-4 text-[#b99642]" /> : null}
                  </button>
                )) : <p className="px-3 py-6 text-center text-sm text-muted-foreground">No encontramos ese país o código.</p>}
              </div>
            </div>
          ) : null}
        </div>
        <div className="my-2 w-px bg-border" />
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={formatearNumero(nacional, paisIso)}
          onChange={(event) => manejarCambioNumero(event.target.value)}
          onBlur={(event) => {
            setTocado(true);
            const error = nacional.trim() && (cantidadDigitos < 4 || cantidadDigitos + pais.prefijo.length > 15) ? "Revisa el número telefónico." : "";
            event.currentTarget.setCustomValidity(error);
          }}
          onInvalid={(event) => {
            if (nacional.trim() && (cantidadDigitos < 4 || cantidadDigitos + pais.prefijo.length > 15)) event.currentTarget.setCustomValidity("Revisa el número telefónico.");
          }}
          aria-invalid={invalido}
          aria-describedby={invalido ? descripcionId : undefined}
          placeholder="Número de teléfono"
          className="h-12 min-w-0 flex-1 rounded-r-xl bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {invalido ? <p id={descripcionId} role="alert" className="text-xs text-destructive">Revisa el número: debe contener al menos 4 dígitos y no superar 15 contando el código internacional.</p> : <p className="text-[11px] text-muted-foreground">Incluye el código internacional automáticamente. Puedes pegar un número con + y detectaremos el país.</p>}
    </div>
  );
}
