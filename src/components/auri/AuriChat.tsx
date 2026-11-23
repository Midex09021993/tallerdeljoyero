import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Mic, MicOff, Send, Volume2, VolumeX, Sparkles, Headphones, MessageCircle, PackageSearch, Gem, Activity } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { auriInterno } from "@/lib/auri/auri-interno.functions";
import { auriDirecto } from "@/lib/auri/auri-directo.functions";

type Message = { role: "user" | "model"; text: string; source?: { motor: "directo" | "gemini"; herramientas: string[]; modelo?: string; consultadoEn: string } };
type SpeechRecognitionResultLike = { 0: { transcript: string }; isFinal: boolean };
type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const WELCOME: Message = {
  role: "model",
  text: "¡Hola! Soy AURI, tu asistente de AURUM LAB. Puedo orientarte sobre nuestras herramientas, módulos y cómo empezar. ¿Qué te gustaría conocer?",
};
const WELCOME_INTERNO: Message = {
  role: "model",
  text: "Hola, soy AURI. Estoy aquí para ayudarte a consultar la información de tu taller. Puedes preguntarme por pedidos, clientes, producción o fichas técnicas.",
};
const QUICK_ACTIONS = [
  { label: "Consultar pedidos", prompt: "Ayúdame a consultar los pedidos de mi taller.", icon: PackageSearch },
  { label: "Producción", prompt: "Dame un resumen del estado de producción de mi taller.", icon: Activity },
  { label: "Buscar cliente", prompt: "Ayúdame a buscar un cliente.", icon: MessageCircle },
  { label: "Fichas técnicas", prompt: "Quiero consultar una ficha técnica de joyería.", icon: Gem },
] as const;
const PUBLIC_QUICK_ACTIONS = [
  { label: "AURUM RENDER", prompt: "Explícame qué es AURUM RENDER y dónde puedo conocerlo.", icon: Gem },
  { label: "Herramientas", prompt: "¿Qué herramientas públicas ofrece Taller del Joyero?", icon: PackageSearch },
  { label: "Planes y precios", prompt: "¿Qué planes ofrece AURUM LAB y dónde puedo ver sus precios?", icon: Activity },
  { label: "Formación", prompt: "¿Qué recursos de formación y guías técnicas hay disponibles?", icon: MessageCircle },
] as const;
const CONSENT_KEY = "auri-interno-acceso";

export function AuriMascota({ estado = "idle", compact = false }: { estado?: "idle" | "thinking" | "listening" | "speaking"; compact?: boolean }) {
  return (
    <span className={`auri-mascot auri-mascot--${estado} ${compact ? "auri-mascot--compact" : ""}`} style={{ position: "relative", display: "inline-grid", width: compact ? 43 : 68, height: compact ? 48 : 76, placeItems: "center", flexShrink: 0, isolation: "isolate" }} role="img" aria-label="Mascota AURI animada">
      <svg viewBox="0 0 96 104" aria-hidden="true" className="auri-mascot__art" style={{ position: "relative", zIndex: 1, display: "block", width: "100%", height: "100%", overflow: "visible" }}>
        <defs>
          <linearGradient id="auri-shell" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset=".55" stopColor="#f4f1e8" /><stop offset="1" stopColor="#d9d7d0" /></linearGradient>
          <linearGradient id="auri-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f8e7b5" /><stop offset=".5" stopColor="#c6a052" /><stop offset="1" stopColor="#8e6b2d" /></linearGradient>
          <linearGradient id="auri-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#29475a" /><stop offset="1" stopColor="#142b3c" /></linearGradient>
        </defs>
        <ellipse cx="48" cy="97" rx="27" ry="4" fill="#9a824e" opacity=".16" />
        <g className="auri-mascot__body">
          <path d="M24 68 Q13 70 15 84 Q18 91 29 86 L35 78" fill="url(#auri-shell)" stroke="url(#auri-gold)" strokeWidth="2.5" />
          <path d="M72 68 Q83 70 81 84 Q78 91 67 86 L61 78" fill="url(#auri-shell)" stroke="url(#auri-gold)" strokeWidth="2.5" />
          <rect x="24" y="52" width="48" height="39" rx="15" fill="url(#auri-shell)" stroke="url(#auri-gold)" strokeWidth="2.5" />
          <circle cx="48" cy="77" r="6" fill="url(#auri-gold)" />
          <path d="M45 77h6M48 74v6" stroke="#fff9e9" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M48 13v7" stroke="url(#auri-gold)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="48" cy="10" r="5" fill="url(#auri-gold)" />
          <rect x="13" y="19" width="70" height="48" rx="17" fill="url(#auri-shell)" stroke="url(#auri-gold)" strokeWidth="3" />
          <rect x="20" y="26" width="56" height="34" rx="12" fill="url(#auri-screen)" />
          <g className="auri-mascot__eyes" fill="#8fe8f0"><ellipse cx="36" cy="42" rx="4" ry="5.5" /><ellipse cx="60" cy="42" rx="4" ry="5.5" /></g>
          <path d="M41 52 Q48 57 55 52" fill="none" stroke="#d5bd7d" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M10 37h4M82 37h4" stroke="url(#auri-gold)" strokeWidth="3" strokeLinecap="round" />
        </g>
        <path d="M27 29 Q48 21 69 29" fill="none" stroke="#fff" strokeWidth="2" opacity=".8" />
      </svg>
      <span className="auri-mascot__aura" />
    </span>
  );
}

const AURI_PUBLIC_LINKS = new Set([
  "/herramientas-publicas", "/aurum-render-public", "/auth", "/guias", "/transfer",
  "/comunidad", "/cursos-diseno-3d", "/galeria-joyas", "/tienda", "/herramientas-publicas/aleacion-oro", "/#planes", "/#como-funciona", "/#aurum-render", "/#contacto",
]);

function renderAuriInline(value: string) {
  return value.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(\/[^)]+\))/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-semibold text-[#263746]">{part.slice(2, -2)}</strong>;
    }
    const link = part.match(/^\[([^\]]+)\]\((\/[^)]+)\)$/);
    if (link?.[2] && AURI_PUBLIC_LINKS.has(link[2])) {
      return <a key={index} href={link[2]} className="font-semibold text-[#96732e] underline decoration-[#d7c28c] underline-offset-4 hover:text-[#263746]">{link[1]}</a>;
    }
    return part;
  });
}

function renderAuriMessage(value: string) {
  return value.split("\n").map((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return <div key={index} className="h-2" />;
    const bullet = /^(?:\*|-)\s+/g.test(line);
    const content = bullet ? line.replace(/^(?:\*|-)\s+/g, "") : line;
    return (
      <p key={index} className={bullet ? "flex gap-2 pl-1" : undefined}>
        {bullet && <span aria-hidden="true" className="text-[#b18b3e]">•</span>}
        <span>{renderAuriInline(content)}</span>
      </p>
    );
  });
}

function etiquetaHerramienta(name: string) {
  const labels: Record<string, string> = {
    listar_pedidos: "Pedidos",
    ver_pedido: "Ficha técnica",
    resumen_produccion: "Producción",
    listar_contratos: "Contratos",
    buscar_clientes: "Clientes",
  };
  return labels[name] ?? name.replace(/_/g, " ");
}

function horaConsulta(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function generarRespuestaTutorLocal(pregunta: string, contexto: string) {
  const normalizada = pregunta.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const apartado = contexto.match(/Apartado:\s*([^\n]+)/i)?.[1]?.trim() ?? "este apartado";
  const contenido = contexto.split("Contenido de referencia:")[1]?.trim() ?? contexto;
  const extracto = contenido.replace(/\s+/g, " ").slice(0, 900);
  if (/pista|ayuda|atascad|no entiendo/.test(normalizada)) {
    return `Vamos paso a paso con **${apartado}**. Primera pista: identifica qué concepto, herramienta o decisión explica el material y para qué se utiliza en el diseño de joyería. Después, intenta relacionarlo con una pieza concreta. ¿Qué parte te está resultando más difícil?`;
  }
  if (/pregunta|comprueba|evalu|prueba|quiz/.test(normalizada)) {
    return `Comprobemos lo aprendido en **${apartado}**.\n1. ¿Cuál es la idea principal de este apartado?\n2. ¿Cómo la aplicarías al diseño o fabricación de una joya?\n3. ¿Qué revisarías antes de dar por terminado el trabajo?\n\nRespóndeme una por una y te ayudaré a revisar tu razonamiento.`;
  }
  if (/paso a paso|procedimiento|como hago|cómo hago|aplicar/.test(normalizada)) {
    return `Te propongo esta ruta para trabajar **${apartado}**:\n1. Lee el objetivo y reconoce los conceptos principales.\n2. Identifica qué herramienta o criterio interviene.\n3. Relaciona cada paso con la geometría de una pieza de joyería.\n4. Realiza la práctica en tu entorno CAD y comprueba el resultado.\n5. Si aparece un error, describe qué hiciste y qué resultado obtuviste; revisaremos la causa sin saltarnos el aprendizaje.`;
  }
  return `**${apartado}**\n\nSegún el material de este módulo: ${extracto}\n\nPuedo ayudarte a comprender la idea, relacionarla con un ejemplo de joyería, organizar los pasos o practicar con preguntas. ¿Qué concepto quieres revisar primero?`;
}

function textoParaVoz(value: string) {
  return value.replace(/\*\*(.*?)\*\*/g, "$1").replace(/^\s*(?:\*|-)\s+/gm, "").replace(/\n{2,}/g, ". ");
}

type PublicPageConfig = {
  eyebrow: string;
  title: string;
  description: string;
  welcome: string;
  actions: ReadonlyArray<{ label: string; prompt: string; icon: typeof Gem }>;
  focus: string;
};

function getPublicPageConfig(pathname = ""): PublicPageConfig {
  if (pathname.startsWith("/herramientas-publicas")) {
    const tool = pathname.split("/").filter(Boolean)[1] ?? "";
    const tools = [
      { label: "Yeso y agua", prompt: "Quiero calcular el revestimiento y el agua para mi cilindro de fundición.", icon: Activity },
      { label: "Aleación de oro", prompt: "Ayúdame a calcular una aleación de oro y alcanzar los quilates deseados.", icon: Gem },
      { label: "Peso de joya 3D", prompt: "Quiero calcular el peso de una joya a partir de un modelo 3D.", icon: PackageSearch },
      { label: "Peso de gemas", prompt: "Quiero calcular el peso de mis gemas.", icon: Gem },
      { label: "Tallas de anillos", prompt: "Necesito convertir o identificar una talla de anillo.", icon: MessageCircle },
    ] as const;
    const toolTitles: Record<string, string> = {
      "yeso-agua": "Calculadora de yeso y agua",
      "aleacion-oro": "Calculadora de aleaciones de oro",
      "peso-joya-3d": "Calculadora de peso de joya 3D",
      "peso-gemas": "Calculadora de peso de gemas",
      "tallas-anillos": "Conversor de tallas de anillos",
    };
    const title = toolTitles[tool];
    const actions = tool === "yeso-agua" ? [tools[0]]
      : tool === "aleacion-oro" ? [tools[1]]
      : tool === "peso-joya-3d" ? [tools[2]]
      : tool === "peso-gemas" ? [tools[3]]
      : tool === "tallas-anillos" ? [tools[4]]
      : tools;
    return {
      eyebrow: "ASISTENCIA DE HERRAMIENTAS",
      title: title ? `¿Qué necesitas saber sobre ${title}?` : "¿Qué herramienta necesitas utilizar?",
      description: title ? "Estoy aquí para ayudarte con esta calculadora y orientarte paso a paso." : "Te ayudo a elegir y utilizar las calculadoras de joyería y fundición disponibles en esta sección.",
      welcome: title ? `¡Hola! Estás en ${title}. Puedo explicarte cómo utilizar esta herramienta y qué datos necesitas.` : "¡Hola! Estás en Herramientas Públicas. Puedo ayudarte con yeso y agua, aleaciones, peso de joyas 3D, peso de gemas y tallas de anillos. ¿Qué cálculo necesitas realizar?",
      actions,
      focus: title
        ? `La persona está en la página ${title}. Responde exclusivamente sobre esta calculadora: su propósito, datos de entrada, interpretación y uso. No promociones otras secciones ni herramientas, salvo que la persona lo solicite expresamente.`
        : "La persona está en Herramientas Públicas. Céntrate exclusivamente en sus cinco calculadoras: yeso y agua para fundición, aleación de oro, peso de joya desde modelo 3D, peso de gemas y tallas de anillos. No promociones AURUM RENDER, planes ni cursos salvo que lo solicite expresamente.",
    };
  }
  if (pathname === "/cursos-diseno-3d") {
    return {
      eyebrow: "ASESORÍA DE FORMACIÓN",
      title: "¿Qué quieres conocer del curso?",
      description: "Te oriento sobre el programa, sus sesiones, laboratorios y modalidad.",
      welcome: "¡Hola! Estás en la página del curso de Diseño CAD 3D para Joyería y Manufactura Aditiva con Inteligencia Artificial – Nivel 1. Puedo explicarte el contenido, las sesiones, los laboratorios y cómo participar.",
      actions: [
        { label: "Contenido del curso", prompt: "¿Qué aprenderé en este curso y cuáles son sus objetivos?", icon: MessageCircle },
        { label: "Sesiones y duración", prompt: "Explícame cómo se organizan las sesiones y cuánto dura el curso.", icon: Activity },
        { label: "Laboratorios", prompt: "¿Qué laboratorios y prácticas incluye el curso?", icon: PackageSearch },
        { label: "Inscripción", prompt: "¿Cómo puedo solicitar información para inscribirme?", icon: Gem },
      ],
      focus: "La persona está en la página pública del curso CAD 3D Nivel 1. Responde sobre el programa, objetivos, sesiones, duración, laboratorios, modalidad e inscripción. No promociones herramientas, planes ni otras secciones salvo que lo solicite.",
    };
  }
  return {
    eyebrow: "GUÍA VIRTUAL DE TALLER DEL JOYERO",
    title: "¿Qué te gustaría conocer de AURUM LAB?",
    description: "Te explico nuestras herramientas, render 3D, recursos de formación y planes.",
    welcome: WELCOME.text,
    actions: PUBLIC_QUICK_ACTIONS,
    focus: "La persona está explorando el sitio público de AURUM LAB. Responde de forma general y ofrece solo las secciones relevantes a su consulta.",
  };
}

export function AuriChat({ onContact, modo = "publico", rutaActual = "", contextoCurso = "" }: { onContact: () => void; modo?: "publico" | "interno"; rutaActual?: string; contextoCurso?: string }) {
  const interno = modo === "interno";
  const tutorCurso = Boolean(contextoCurso.trim());
  const publicPage = !interno ? getPublicPageConfig(rutaActual) : null;
  const bienvenida = tutorCurso ? "¡Hola! Soy AURI Tutor. Estoy aquí para acompañarte en este apartado del curso. Puedo aclarar conceptos, relacionarlos con la práctica de joyería y darte pistas paso a paso." : publicPage?.welcome ?? WELCOME.text;
  const accionesTutor = [
    { label: "Explícame este tema", prompt: "Explícame este apartado con palabras sencillas y un ejemplo aplicado a joyería.", icon: MessageCircle },
    { label: "Guíame paso a paso", prompt: "Guíame paso a paso para comprender y aplicar este contenido.", icon: Activity },
    { label: "Dame una pista", prompt: "Dame una pista progresiva para resolver la práctica, sin darme la solución completa.", icon: Sparkles },
    { label: "Comprueba lo aprendido", prompt: "Hazme tres preguntas breves para comprobar si comprendí este apartado.", icon: Gem },
  ];
  const llamarInterno = useServerFn(auriInterno);
  const llamarDirecto = useServerFn(auriDirecto);
  const [modoDirecto, setModoDirecto] = useState(false);
  const [vista, setVista] = useState<"texto" | "voz">("texto");
  const [autorizado, setAutorizado] = useState(false);
  const [messages, setMessages] = useState<Message[]>([interno ? WELCOME_INTERNO : { role: "model", text: bienvenida }]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceBeat, setVoiceBeat] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const pendingVoiceText = useRef("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (interno) setAutorizado(window.localStorage.getItem(CONSENT_KEY) === "1");
  }, [interno]);

  useEffect(() => {
    if (interno) return;
    setMessages([{ role: "model", text: bienvenida }]);
    setDraft("");
    setError("");
    setVista("texto");
  }, [interno, rutaActual, contextoCurso]);

  useEffect(() => {
    const speechWindow = window as SpeechWindow;
    setVoiceSupported(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition));
    return () => {
      recognition.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  function speak(text: string) {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-PE";
    utterance.rate = 1;
    utterance.onstart = () => { setSpeaking(true); setVoiceBeat(true); };
    utterance.onboundary = () => setVoiceBeat((current) => !current);
    utterance.onend = () => { setSpeaking(false); setVoiceBeat(false); };
    utterance.onerror = () => { setSpeaking(false); setVoiceBeat(false); };
    window.speechSynthesis.speak(utterance);
  }

  function startListening() {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition || loading) return;
    recognition.current?.stop();
    pendingVoiceText.current = "";
    setVoiceTranscript("");
    const instance = new Recognition();
    instance.lang = "es-PE";
    instance.interimResults = false;
    instance.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      if (last?.[0]?.transcript) {
        const transcript = last[0].transcript.trim();
        pendingVoiceText.current = transcript;
        setVoiceTranscript(transcript);
        if (vista === "texto") setDraft((current) => (current ? current + " " : "") + transcript);
      }
    };
    instance.onerror = () => setListening(false);
    instance.onend = () => {
      setListening(false);
      const spokenQuestion = pendingVoiceText.current;
      pendingVoiceText.current = "";
      if (vista === "voz" && spokenQuestion) void sendMessage(undefined, spokenQuestion);
    };
    recognition.current = instance;
    setListening(true);
    instance.start();
  }

  async function sendMessage(event?: FormEvent<HTMLFormElement>, messageOverride?: string) {
    event?.preventDefault();
    const question = (messageOverride ?? draft).trim();
    if (!question || loading) return;
    const questionForAssistant = !interno && publicPage
      ? `[CONTEXTO DE NAVEGACIÓN ACTUAL: ${publicPage.focus}]\nConsulta del visitante: ${question}`
      : question;
    const nextMessages: Message[] = [...messages, { role: "user", text: question }];
    setMessages(nextMessages);
    setDraft("");
    setError("");
    setLoading(true);
    try {
      if (tutorCurso) {
        const reply = generarRespuestaTutorLocal(question, contextoCurso);
        setMessages((current) => [...current, { role: "model", text: reply }]);
        speak(textoParaVoz(reply));
        return;
      }
      if (interno) {
        const r = modoDirecto
          ? await llamarDirecto({ data: { message: question } })
          : await llamarInterno({ data: { message: question, history: nextMessages.slice(-9, -1) } });
        if (r.error || !r.reply) throw new Error(r.error || "AURI no pudo responder en este momento.");
        setMessages((current) => [...current, { role: "model", text: r.reply, ...(r.motor ? { source: { motor: r.motor, herramientas: r.herramientas ?? [], consultadoEn: r.consultadoEn ?? new Date().toISOString() } } : {}) }]);
        speak(textoParaVoz(r.reply));
        return;
      }
      const { data, error: invokeError } = await supabase.functions.invoke("auri-chat", {
        body: { message: questionForAssistant, history: nextMessages.slice(-9, -1).map(({ role, text }) => ({ role, text })) },
      });
      if (invokeError) throw invokeError;
      if (!data?.reply || typeof data.reply !== "string") throw new Error(data?.error || "AURI no pudo responder en este momento.");
      setMessages((current) => [...current, { role: "model", text: data.reply }]);
      speak(textoParaVoz(data.reply));
    } catch (err) {
      if (!interno && err && typeof err === "object" && "context" in err) {
        const context = (err as { context?: unknown }).context;
        if (context instanceof Response) {
          const payload = await context.clone().json().catch(() => null) as { error?: unknown } | null;
          if (typeof payload?.error === "string" && payload.error.trim()) {
            setError(payload.error.trim().slice(0, 240));
          } else if (context.status === 429) {
            setError("AURI recibió demasiadas consultas seguidas. Espera unos minutos e inténtalo nuevamente.");
          } else if (context.status >= 500) {
            setError("AURI está temporalmente sin conexión. Inténtalo nuevamente en unos minutos o utiliza Contactar.");
          } else {
            setError("No se pudo procesar tu consulta. Revisa el mensaje e inténtalo nuevamente.");
          }
        } else {
          setError("No se pudo conectar con AURI. Comprueba tu conexión e inténtalo nuevamente.");
        }
      } else if (interno) {
        setError(err instanceof Error ? err.message : "No se pudo conectar con AURI. Inténtalo nuevamente.");
      } else {
        setError("No se pudo conectar con AURI. Comprueba tu conexión e inténtalo nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (interno && !autorizado) {
    return (
      <div className="flex min-h-[320px] h-full flex-col justify-center gap-4 bg-white p-6 text-[#394653] sm:rounded-2xl">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-[#dfc98e] bg-[#fbf8ef] text-[#ad8a3d]"><Bot className="size-8" /></div>
        <div className="text-center"><p className="font-display text-xl text-[#263746]">Activa tu espacio AURI</p><p className="mt-2 text-sm leading-6 text-[#687580]">AURI solo consulta información que tu cuenta ya puede ver. En Gemini, tu consulta y los campos mínimos necesarios para responder se envían al proveedor de IA; si buscas clientes, puede incluir sus nombres, pero nunca teléfonos, correos, documentos ni direcciones. AURI Directo realiza consultas predeterminadas sin IA. Ambos modos son de solo lectura.</p></div>
        <button type="button" onClick={() => { window.localStorage.setItem(CONSENT_KEY, "1"); setAutorizado(true); }} className="mx-auto min-h-11 rounded-xl bg-[#263746] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-[#344d62]">Autorizar acceso</button>
      </div>
    );
  }

  const voiceStatus = listening ? "Te estoy escuchando" : loading ? "Estoy preparando tu respuesta" : speaking ? "AURI está hablando" : "Tu espacio de conversación";
  const voiceHint = listening ? "Te escucho. Cuando termines, toca el botón para enviar tu consulta." : loading ? "Estoy consultando la información para darte una respuesta." : speaking ? "AURI está respondiendo. Toca el micrófono para interrumpir y hablar." : "Toca el micrófono una vez para empezar a hablar.";

  return (
    <section className="auri-shell flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white text-[#263746] sm:rounded-2xl sm:border sm:border-[#e8dfcc]" aria-label="Asistente AURI">
      <header className="auri-header relative z-10 shrink-0 border-b border-[#eee8da] bg-white px-3 py-3 pr-14 sm:px-5 sm:pr-14">
        <div className="auri-header__row flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative grid size-11 shrink-0 place-items-center rounded-2xl border border-[#e4d3a5] bg-gradient-to-br from-[#fffdf7] to-[#f5edd9] shadow-sm">
              <AuriMascota compact />
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-[#4b9b79]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2"><p className="font-semibold tracking-tight text-[#263746]">AURI</p><span className="auri-brand-tag rounded-full border border-[#e9dfc7] bg-[#fbf8ef] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#9b7936]">AURUM LAB</span></div>
              <p className="mt-0.5 truncate text-[11px] text-[#87919a]">{interno ? "Tu asistente de gestión" : tutorCurso ? "Tutor guiado local del curso CAD 3D" : "Asistente virtual de AURUM LAB"}</p>
            </div>
          </div>
          <div className="auri-header__controls flex shrink-0 items-center gap-1.5 sm:gap-2">
            {interno && <div className="auri-desktop-modes hidden items-center gap-1 rounded-full bg-[#f7f5f0] p-1 sm:flex">
              <button type="button" onClick={() => setModoDirecto(false)} aria-pressed={!modoDirecto} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${!modoDirecto ? "bg-white text-[#263746] shadow-sm" : "text-[#7d8790] hover:text-[#263746]"}`}>Gemini</button>
              <button type="button" onClick={() => setModoDirecto(true)} aria-pressed={modoDirecto} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${modoDirecto ? "bg-white text-[#263746] shadow-sm" : "text-[#7d8790] hover:text-[#263746]"}`}>Directo</button>
            </div>}
            <div className="flex items-center rounded-full border border-[#e9e3d7] bg-white p-1">
              <button type="button" onClick={() => setVista("texto")} aria-pressed={vista === "texto"} aria-label="Vista de texto" className={`grid size-8 place-items-center rounded-full transition ${vista === "texto" ? "bg-[#263746] text-white shadow-sm" : "text-[#87919a] hover:bg-[#f7f5f0]"}`}><MessageCircle className="size-4" /></button>
              <button type="button" onClick={() => setVista("voz")} aria-pressed={vista === "voz"} aria-label="Vista de voz" className={`grid size-8 place-items-center rounded-full transition ${vista === "voz" ? "bg-[#263746] text-white shadow-sm" : "text-[#87919a] hover:bg-[#f7f5f0]"}`}><Headphones className="size-4" /></button>
            </div>
          </div>
        </div>
        {interno && <div className="auri-mobile-modes mt-2 flex items-center justify-between sm:hidden">
          <span className="text-[10px] text-[#8b949b]">Motor de consulta</span>
          <div className="flex items-center gap-1 rounded-full bg-[#f7f5f0] p-1">
            <button type="button" onClick={() => setModoDirecto(false)} aria-pressed={!modoDirecto} className={`rounded-full px-3 py-1 text-[10px] font-semibold ${!modoDirecto ? "bg-white text-[#263746] shadow-sm" : "text-[#7d8790]"}`}>Gemini</button>
            <button type="button" onClick={() => setModoDirecto(true)} aria-pressed={modoDirecto} className={`rounded-full px-3 py-1 text-[10px] font-semibold ${modoDirecto ? "bg-white text-[#263746] shadow-sm" : "text-[#7d8790]"}`}>Directo</button>
          </div>
        </div>}
      </header>

      {vista === "voz" ? (
        <div className={`auri-voice relative flex min-h-0 flex-1 flex-col items-center justify-between overflow-hidden px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-5 sm:py-7 ${listening ? "is-listening" : loading ? "is-thinking" : speaking ? "is-speaking" : "is-idle"}`}>
          <div className="auri-voice__ambient" aria-hidden="true"><span /><span /><span /></div>
          <div className="relative z-10 flex w-full max-w-md items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#d7b765]">AURI · VOICE INTELLIGENCE</p>
              <p className="mt-1.5 text-xs text-[#aab9c8]">{modoDirecto && interno ? "Modo directo · Sin IA" : "Interfaz de conversación inteligente"}</p>
            </div>
            <span className="auri-voice__status"><i />{listening ? "ESCUCHANDO" : loading ? "PROCESANDO" : speaking ? "HABLANDO" : "EN ESPERA"}</span>
          </div>
          <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col items-center justify-center py-2 sm:py-5">
            <div className={`auri-voice__reactor relative grid place-items-center ${listening ? "is-listening" : loading ? "is-thinking" : speaking ? "is-speaking" : ""}`} data-voice-beat={voiceBeat ? "on" : "off"}>
              <span className="auri-voice__soundwave auri-voice__soundwave--one" />
              <span className="auri-voice__soundwave auri-voice__soundwave--two" />
              <span className="auri-voice__soundwave auri-voice__soundwave--three" />
              <span className="auri-voice__orbit auri-voice__orbit--one" />
              <span className="auri-voice__orbit auri-voice__orbit--two" />
              <span className="auri-voice__orbit auri-voice__orbit--three" />
              <span className="auri-voice__particle auri-voice__particle--one" />
              <span className="auri-voice__particle auri-voice__particle--two" />
              <span className="auri-voice__particle auri-voice__particle--three" />
              <div className="auri-voice__core"><span className="auri-voice__core-glow" /><AuriMascota estado={listening ? "listening" : loading ? "thinking" : speaking ? "speaking" : "idle"} /></div>
            </div>
            <p className="mt-7 text-center text-xl font-semibold tracking-tight text-white">{voiceStatus}</p>
            <p className="mt-2 max-w-xs text-center text-sm leading-6 text-[#aab9c8]">{voiceHint}</p>
            <button type="button"
              onClick={() => {
                if (!voiceSupported || loading) return;
                if (listening) {
                  recognition.current?.stop();
                  return;
                }
                if (speaking) {
                  window.speechSynthesis?.cancel();
                  setSpeaking(false);
                  setVoiceBeat(false);
                }
                startListening();
              }}
              disabled={!voiceSupported || loading}
              aria-label={listening ? "Terminar de hablar y enviar consulta" : speaking ? "Interrumpir respuesta y hablar con AURI" : "Iniciar conversación por voz con AURI"}
              aria-pressed={listening}
              className={`auri-voice__mic mt-7 grid size-[76px] place-items-center rounded-full border transition duration-300 ${listening ? "is-active" : ""} disabled:cursor-not-allowed disabled:opacity-45`}>
              {listening ? <MicOff className="size-7" /> : <Mic className="size-7" />}
            </button>
            <p className="mt-3 text-[10px] font-semibold tracking-[0.16em] text-[#d5c18f]">{listening ? "TOCA PARA ENVIAR" : speaking ? "TOCA PARA INTERRUMPIR Y HABLAR" : "TOCA PARA HABLAR"}</p>
            {!voiceSupported && <p className="mt-3 rounded-lg border border-[#806c42] bg-[#24394b] px-3 py-2 text-xs text-[#f0dcae]">Este navegador no admite dictado por voz. Puedes conversar desde la vista de texto.</p>}
            {speaking && <button type="button" onClick={() => { window.speechSynthesis?.cancel(); setSpeaking(false); }} className="mt-4 rounded-full border border-[#718394] bg-[#203447] px-4 py-2 text-xs font-semibold text-[#e6d5a9] hover:bg-[#2a4359]">Interrumpir respuesta</button>}
          </div>
          <div className="relative z-10 w-full max-w-md text-center">
            {voiceTranscript && <p className="auri-voice__transcript mx-auto mb-3 max-w-sm rounded-xl px-4 py-2.5 text-center text-xs leading-5">“{voiceTranscript}”</p>}
            
            <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.2em] text-[#71869a]">AURUM LAB · VOICE SYSTEM</p>
            {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-950/40 px-3 py-2 text-xs text-red-100">{error}</p>}
          </div>
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#fffefa] px-4 py-4 sm:px-5">
            {messages.length === 1 && (
              <div className="mb-5 mt-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a98535]">{interno ? "CENTRO DE ASISTENCIA" : tutorCurso ? "AURI TUTOR · FORMACIÓN FADILAB" : publicPage?.eyebrow ?? "GUÍA VIRTUAL DE TALLER DEL JOYERO"}</p>
                <h2 className="mt-2 font-display text-2xl leading-tight text-[#263746] sm:text-[27px]">{interno ? "¿Qué necesitas resolver hoy?" : tutorCurso ? "Aprendamos este módulo juntos" : publicPage?.title ?? "¿Qué te gustaría conocer de AURUM LAB?"}</h2>
                <p className="mt-2 max-w-sm text-xs leading-5 text-[#7f8991]">{interno ? "Consulta la información de tu taller en lenguaje natural." : tutorCurso ? "Puedo explicar conceptos, conectar la teoría con el taller y acompañarte en los ejercicios de esta sesión." : publicPage?.description ?? "Te explico nuestras herramientas, render 3D, recursos de formación y planes."}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {(interno ? QUICK_ACTIONS : tutorCurso ? accionesTutor : publicPage?.actions ?? PUBLIC_QUICK_ACTIONS).map(({ label, prompt, icon: Icon }) => <button key={label} type="button" onClick={() => void sendMessage(undefined, prompt)} disabled={loading} className="group flex min-h-[66px] items-center gap-2.5 rounded-xl border border-[#e9e2d3] bg-white px-3 py-3 text-left shadow-[0_2px_8px_rgba(38,55,70,.025)] transition hover:-translate-y-0.5 hover:border-[#d5bf87] hover:shadow-md disabled:opacity-50"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#f8f3e7] text-[#a98535] transition group-hover:bg-[#f1e6c9]"><Icon className="size-4" /></span><span className="text-[11px] font-semibold leading-4 text-[#475663]">{label}</span></button>)}
                </div>
              </div>
            )}
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "model" && <div className="mr-2 mt-1 grid size-10 shrink-0 place-items-center"><AuriMascota compact /></div>}
                  <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[13px] leading-[1.7] ${message.role === "user" ? "rounded-br-md bg-[#263746] text-white shadow-sm" : "rounded-bl-md border border-[#eee8dc] bg-white text-[#485560] shadow-[0_2px_10px_rgba(38,55,70,.035)]"}`}>
                    {renderAuriMessage(message.text)}
                    {message.role === "model" && index > 0 && <button type="button" onClick={() => speak(textoParaVoz(message.text))} aria-label="Escuchar respuesta" className="ml-2 inline-flex align-middle text-[#a88742] hover:text-[#72551e]"><Volume2 className="size-3.5" /></button>}
                    {interno && message.role === "model" && message.source && (
                      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[#eee8dc] pt-2 text-[9px] leading-4 text-[#87919a]" aria-label="Origen de la respuesta">
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#e8dfca] bg-[#fbf8ef] px-2 py-0.5 font-bold uppercase tracking-[0.1em] text-[#9b7936]">
                          <span className={`size-1.5 rounded-full ${message.source.motor === "directo" ? "bg-[#4b9b79]" : "bg-[#4b9fc1]"}`} />
                          {message.source.motor === "directo" ? "AURI Directo · Sin IA" : "Gemini · IA"}
                        </span>
                        {message.source.modelo && <span>Modelo: {message.source.modelo}</span>}
                        <span>{message.source.herramientas.length ? `Consultó: ${message.source.herramientas.map(etiquetaHerramienta).join(", ")}` : "Sin consulta a datos del taller"}</span>
                        <span>· {horaConsulta(message.source.consultadoEn)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && <div className="flex items-center gap-2 pl-9 text-xs text-[#9a824d]"><span className="size-1.5 animate-pulse rounded-full bg-[#c7a65b]" /> AURI está consultando…</div>}
              {error && <p role="alert" className="ml-9 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            </div>
            <div ref={bottomRef} />
          </div>
          <footer className="shrink-0 border-t border-[#eee8da] bg-white px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-4">
            <form onSubmit={sendMessage} className="flex items-end gap-2 rounded-2xl border border-[#e5dfd2] bg-[#fffefa] p-1.5 transition focus-within:border-[#c7a65b] focus-within:shadow-[0_0_0_3px_rgba(199,166,91,.10)]">
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} rows={1} maxLength={1200} placeholder="Escribe tu consulta…" aria-label="Mensaje para AURI" className="max-h-28 min-h-10 flex-1 resize-y bg-transparent px-3 py-2.5 text-sm text-[#303943] outline-none placeholder:text-[#a0a5a8]" />
              {voiceSupported && <button type="button" onClick={listening ? () => recognition.current?.stop() : startListening} aria-label={listening ? "Detener dictado" : "Dictar pregunta"} className={`grid size-10 shrink-0 place-items-center rounded-xl transition ${listening ? "bg-red-50 text-red-600" : "text-[#9b7a36] hover:bg-[#f7f1e4]"}`}>{listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}</button>}
              <button type="submit" disabled={!draft.trim() || loading} aria-label="Enviar mensaje" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#263746] text-white transition hover:bg-[#3b5367] disabled:cursor-not-allowed disabled:opacity-35"><Send className="size-4" /></button>
            </form>
            <div className="mt-2 flex items-center justify-between gap-2 px-1">
              <p className="min-w-0 truncate text-[9px] text-[#9aa1a5]">{interno ? (modoDirecto ? "AURI Directo · Consultas de solo lectura" : "Gemini · Datos según tus permisos") : "No compartas información privada."}</p>
              <div className="flex shrink-0 items-center gap-3">
                <button type="button" onClick={() => { setVoiceEnabled((value) => !value); window.speechSynthesis?.cancel(); setSpeaking(false); setVoiceBeat(false); }} aria-label={voiceEnabled ? "Silenciar respuestas" : "Activar voz"} className="text-[#9b7a36] hover:text-[#72551e]">{voiceEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}</button>
                {interno ? <button type="button" onClick={() => { window.localStorage.removeItem(CONSENT_KEY); setAutorizado(false); }} className="text-[9px] font-semibold text-[#96732e] underline underline-offset-2">Desactivar acceso</button> : <button type="button" onClick={onContact} className="text-[9px] font-semibold text-[#96732e] underline underline-offset-2">Contactar</button>}
              </div>
            </div>
          </footer>
        </>
      )}
      <style>{`
        .auri-mascot { position:relative; display:inline-grid; width:68px; height:76px; place-items:center; isolation:isolate; animation:auri-float 3.2s ease-in-out infinite; }
        .auri-mascot__art { position:relative; z-index:1; width:100%; height:100%; overflow:visible; filter:drop-shadow(0 4px 5px rgba(93,75,38,.13)); }
        .auri-mascot__aura { position:absolute; z-index:0; inset:16% 8%; border-radius:50%; background:radial-gradient(circle,rgba(220,193,125,.22),transparent 70%); filter:blur(5px); }
        .auri-mascot--compact { width:43px; height:48px; }
        .auri-mascot--thinking .auri-mascot__art { animation:auri-think 1.4s ease-in-out infinite; }
        .auri-mascot--listening .auri-mascot__aura,.auri-mascot--speaking .auri-mascot__aura { animation:auri-aura 1s ease-in-out infinite; }
        .auri-mascot--speaking .auri-mascot__body { animation:auri-speak .65s ease-in-out infinite; transform-origin:48px 55px; }
        .auri-mascot--listening .auri-mascot__art { animation:auri-listen 1.1s ease-in-out infinite; }
        .auri-mascot--thinking .auri-mascot__eyes { animation:auri-blink 1.5s ease-in-out infinite; }
        .auri-shell { container-type:inline-size; }
        .auri-header__brand { flex:1 1 auto; }
        @container (max-width: 440px) {
          .auri-brand-tag { display:none; }
          .auri-header__brand { gap:6px; }
          .auri-header__controls { gap:4px; }
          .auri-header__controls button { padding-left:8px; padding-right:8px; }
        }
        @keyframes auri-float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-3px); } }
        @keyframes auri-think { 0%,100% { transform:rotate(0); } 30% { transform:rotate(-4deg) translateY(-2px); } 70% { transform:rotate(4deg); } }
        @keyframes auri-listen { 0%,100% { transform:rotate(0); } 35% { transform:rotate(-5deg); } 70% { transform:rotate(4deg); } }
        @keyframes auri-aura { 50% { transform:scale(1.18); opacity:.5; } }
        @keyframes auri-blink { 0%,43%,49%,100% { opacity:1; } 46% { opacity:.18; } }
        .auri-voice { isolation:isolate; color:#fff; background:radial-gradient(ellipse at 50% 42%,#213d53 0%,#142b3d 46%,#0b1723 100%); }
        .auri-voice::before { content:""; position:absolute; inset:0; pointer-events:none; opacity:.22; background-image:linear-gradient(rgba(146,178,199,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(146,178,199,.10) 1px,transparent 1px); background-size:42px 42px; mask-image:radial-gradient(ellipse at center,#000,transparent 78%); }
        .auri-voice__ambient { position:absolute; inset:0; overflow:hidden; pointer-events:none; }
        .auri-voice__ambient span { position:absolute; width:340px; height:340px; border:1px solid rgba(194,165,99,.09); border-radius:50%; left:50%; top:42%; transform:translate(-50%,-50%); }
        .auri-voice__ambient span:nth-child(2) { width:480px; height:480px; border-color:rgba(99,190,214,.07); }
        .auri-voice__ambient span:nth-child(3) { width:620px; height:620px; border-color:rgba(194,165,99,.05); }
        .auri-voice__status { display:inline-flex; align-items:center; gap:7px; border:1px solid rgba(190,170,122,.24); border-radius:999px; padding:7px 10px; color:#d9c28d; background:rgba(18,38,54,.72); font-size:9px; font-weight:700; letter-spacing:.12em; white-space:nowrap; }
        .auri-voice__status i { width:6px; height:6px; border-radius:50%; background:#75c7a5; box-shadow:0 0 10px rgba(117,199,165,.8); }
        .auri-voice.is-listening .auri-voice__status i { background:#4ee7f4; box-shadow:0 0 12px #4ee7f4; }
        .auri-voice.is-thinking .auri-voice__status i { background:#e4bc68; box-shadow:0 0 12px #e4bc68; }
        .auri-voice.is-speaking .auri-voice__status i { background:#4ee7f4; box-shadow:0 0 12px #4ee7f4; }
        .auri-voice__reactor { width:min(68vw,280px,30dvh); max-width:min(280px,30dvh); aspect-ratio:1; flex-shrink:0; }
        .auri-voice__orbit { position:absolute; inset:8%; border:1px solid rgba(203,174,105,.38); border-radius:50%; box-shadow:inset 0 0 28px rgba(192,162,92,.06),0 0 24px rgba(85,177,202,.05); }
        .auri-voice__orbit--two { inset:17%; border-color:rgba(108,197,220,.30); transform:rotateX(62deg) rotate(-22deg); }
        .auri-voice__orbit--three { inset:0; border-color:rgba(199,169,103,.25); border-style:dashed; animation:auri-voice-orbit 28s linear infinite; }
        .auri-voice__particle { position:absolute; z-index:3; width:7px; height:7px; border-radius:50%; background:#65e6f2; box-shadow:0 0 14px #65e6f2; }
        .auri-voice__particle--one { top:13%; right:17%; }
        .auri-voice__particle--two { bottom:18%; left:13%; width:5px; height:5px; background:#d8b765; box-shadow:0 0 12px #d8b765; }
        .auri-voice__particle--three { top:48%; left:3%; width:4px; height:4px; }
        .auri-voice__core { position:relative; z-index:2; display:grid; width:46%; aspect-ratio:1; place-items:center; border:1px solid rgba(225,196,126,.72); border-radius:50%; background:radial-gradient(circle at 34% 24%,#f5e7c4 0%,#c5a45c 35%,#6b592f 72%,#23384a 100%); box-shadow:0 0 0 12px rgba(206,173,102,.06),0 0 55px rgba(74,201,224,.20),inset 0 2px 12px rgba(255,255,255,.55); }
        .auri-voice__core-glow { position:absolute; inset:-18%; border-radius:50%; background:radial-gradient(circle,rgba(75,213,235,.22),transparent 68%); filter:blur(10px); }
        .auri-voice__core .auri-mascot { width:76%; height:84%; }
        .auri-voice__reactor.is-listening .auri-voice__orbit--one,.auri-voice.is-listening .auri-voice__orbit--one { animation:auri-voice-pulse 1.2s ease-in-out infinite; border-color:rgba(76,226,244,.8); box-shadow:0 0 28px rgba(76,226,244,.16); }
        .auri-voice__reactor.is-listening .auri-voice__orbit--two { animation:auri-voice-orbit 5s linear infinite; border-color:rgba(76,226,244,.6); }
        .auri-voice__reactor.is-thinking .auri-voice__orbit--three { animation:auri-voice-orbit 3s linear infinite; border-color:rgba(223,186,102,.72); }
        .auri-voice__core { transition:transform 180ms ease,box-shadow 180ms ease,filter 180ms ease; }
        .auri-voice__reactor.is-speaking[data-voice-beat="on"] .auri-voice__core { transform:scale(1.075); box-shadow:0 0 0 16px rgba(206,173,102,.09),0 0 72px rgba(74,201,224,.42),inset 0 2px 12px rgba(255,255,255,.72); filter:brightness(1.08); }
        .auri-voice__reactor.is-speaking[data-voice-beat="off"] .auri-voice__core { transform:scale(.985); box-shadow:0 0 0 8px rgba(206,173,102,.05),0 0 34px rgba(74,201,224,.18),inset 0 2px 12px rgba(255,255,255,.5); }
        .auri-voice__mic { color:#10283a; border:1px solid rgba(246,220,160,.9); background:linear-gradient(145deg,#f2d994,#bd984b); box-shadow:0 0 0 8px rgba(205,171,99,.10),0 10px 35px rgba(0,0,0,.28),inset 0 1px 2px rgba(255,255,255,.7); }
        .auri-voice__mic:hover { box-shadow:0 0 0 11px rgba(205,171,99,.12),0 12px 38px rgba(0,0,0,.3); }
        .auri-voice__mic.is-active { color:#092331; border-color:#71f1fa; background:linear-gradient(145deg,#75f2fa,#22a9c1); box-shadow:0 0 0 9px rgba(67,222,240,.12),0 0 42px rgba(67,222,240,.4); transform:scale(1.06); }
        .auri-voice__transcript,.auri-voice__reply { border:1px solid rgba(150,181,198,.22); background:rgba(24,48,67,.84); color:#d6e1e8; }
        .auri-voice__soundwave { position:absolute; z-index:1; inset:17%; border:1px solid rgba(91,220,239,.0); border-radius:50%; opacity:0; transform:scale(.72); pointer-events:none; }
        .auri-voice__soundwave--two { inset:10%; }
        .auri-voice__soundwave--three { inset:3%; }
        .auri-voice__reactor.is-listening .auri-voice__soundwave { border-color:rgba(91,220,239,.65); animation:auri-voice-ripple 1.65s ease-out infinite; }
        .auri-voice__reactor.is-speaking .auri-voice__soundwave { border-color:rgba(91,220,239,.7); opacity:.28; transform:scale(.88); transition:opacity 180ms ease,transform 180ms ease,box-shadow 180ms ease; box-shadow:0 0 22px rgba(91,220,239,.12); }
        .auri-voice__reactor.is-speaking[data-voice-beat="on"] .auri-voice__soundwave { opacity:.95; transform:scale(1.18); box-shadow:0 0 30px rgba(91,220,239,.28); }
        .auri-voice__reactor.is-speaking[data-voice-beat="off"] .auri-voice__soundwave { opacity:.3; transform:scale(.9); }
        .auri-voice__reactor.is-listening .auri-voice__soundwave--two,.auri-voice__reactor.is-speaking .auri-voice__soundwave--two { animation-delay:.55s; }
        .auri-voice__reactor.is-listening .auri-voice__soundwave--three,.auri-voice__reactor.is-speaking .auri-voice__soundwave--three { animation-delay:1.1s; }
        .auri-voice__reactor.is-thinking .auri-voice__soundwave { border-color:rgba(215,183,101,.5); opacity:.5; transform:scale(1); animation:auri-voice-pulse 1.8s ease-in-out infinite; }
        @keyframes auri-voice-ripple { 0% { opacity:0; transform:scale(.72); } 25% { opacity:.8; } 100% { opacity:0; transform:scale(1.35); } }
        @keyframes auri-voice-pulse { 50% { transform:scale(1.055); opacity:.55; } }
        @keyframes auri-voice-orbit { to { transform:rotate(360deg); } }
        @keyframes auri-voice-speak { 50% { transform:scale(1.08); box-shadow:0 0 0 16px rgba(206,173,102,.08),0 0 68px rgba(74,201,224,.38),inset 0 2px 12px rgba(255,255,255,.7); } }
        .auri-orb { isolation:isolate; background:radial-gradient(circle at 50% 48%,rgba(255,255,255,.96) 0 38%,rgba(232,215,172,.44) 57%,rgba(199,166,91,.10) 70%,transparent 72%); }
        .auri-orb__ring { position:absolute; border-radius:9999px; border:1px solid rgba(183,148,73,.38); }
        .auri-orb__ring--outer { inset:0; box-shadow:0 0 35px rgba(190,158,91,.10),inset 0 0 25px rgba(190,158,91,.08); }
        .auri-orb__ring--inner { inset:17px; border-color:rgba(183,148,73,.24); }
        .auri-orb__core { position:relative; display:grid; width:92px; height:92px; place-items:center; border-radius:9999px; background:radial-gradient(circle at 32% 25%,#f3e4bd 0%,#c5a45c 34%,#9c7938 68%,#6e592f 100%); box-shadow:0 12px 34px rgba(157,121,56,.28),inset 0 2px 8px rgba(255,255,255,.6); }
        .auri-orb__glint { position:absolute; top:27%; left:31%; width:13px; height:13px; border-radius:50%; background:rgba(255,255,255,.72); filter:blur(5px); }
        .auri-orb.is-listening .auri-orb__ring--outer { animation:auri-breathe 1.15s ease-in-out infinite; border-color:rgba(178,139,55,.75); }
        .auri-orb.is-thinking .auri-orb__ring--inner { animation:auri-rotate 2.4s linear infinite; border-style:dashed; }
        .auri-orb.is-speaking .auri-orb__core { animation:auri-speak 1.05s ease-in-out infinite; }
        .auri-wave-bar { width:3px; border-radius:8px; background:#d5c49b; opacity:.55; }
        .auri-wave-bar.active,.auri-wave-bar.speaking { animation:auri-wave .62s ease-in-out infinite alternate; opacity:1; background:#b99642; }
        @keyframes auri-breathe { 50% { transform:scale(1.08); opacity:.55; } }
        @keyframes auri-rotate { to { transform:rotate(360deg); } }
        @keyframes auri-speak { 50% { transform:scale(1.07); box-shadow:0 12px 42px rgba(157,121,56,.42),inset 0 2px 8px rgba(255,255,255,.7); } }
        @keyframes auri-wave { to { transform:scaleY(2.2); } }
        @media (max-width:640px) and (max-height:720px) { .auri-voice__reactor { width:min(58vw,220px,30dvh); max-width:min(220px,30dvh); } .auri-voice__reactor + p { margin-top:.65rem; } .auri-voice__reactor + p + p { margin-top:.2rem; } .auri-voice__reactor + p + p + button { margin-top:.8rem; } .auri-voice__reactor + p + p + button + p { margin-top:.45rem; } }
        @media (prefers-reduced-motion:reduce) { .auri-mascot, .auri-mascot *, .auri-orb *, .auri-wave-bar, .auri-voice *, .auri-voice__ambient span { animation:none!important; transition:none!important; } }
      `}</style>
    </section>
  );
}
