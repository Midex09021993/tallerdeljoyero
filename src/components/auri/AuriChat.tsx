import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Mic, MicOff, Send, Volume2, VolumeX, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { auriInterno } from "@/lib/auri/auri-interno.functions";
import { auriDirecto } from "@/lib/auri/auri-directo.functions";

type Message = { role: "user" | "model"; text: string };
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
  text: "¡Hola! Soy AURI, tu asistente de AURUM LAB. ✨ Puedo orientarte sobre nuestras herramientas, módulos y cómo empezar. ¿Qué te gustaría conocer?",
};

const WELCOME_INTERNO: Message = {
  role: "model",
  text: "Hola, soy AURI. Puedo consultar tu taller con Gemini o usar AURI Directo, que funciona sin IA y solo realiza consultas de lectura.",
};
const CONSENT_KEY = "auri-interno-acceso";
function renderAuriInline(value: string) {
  return value.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={index} className="font-semibold text-[#293744]">{part.slice(2, -2)}</strong>
      : part,
  );
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

function textoParaVoz(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^\s*(?:\*|-)\s+/gm, "")
    .replace(/\n{2,}/g, ". ");
}


export function AuriChat({ onContact, modo = "publico" }: { onContact: () => void; modo?: "publico" | "interno" }) {
  const interno = modo === "interno";
  const llamarInterno = useServerFn(auriInterno);
  const llamarDirecto = useServerFn(auriDirecto);
  const [modoDirecto, setModoDirecto] = useState(false);
  const [vista, setVista] = useState<"texto" | "voz">("texto");
  const [autorizado, setAutorizado] = useState(false);
  useEffect(() => { if (interno) setAutorizado(window.localStorage.getItem(CONSENT_KEY) === "1"); }, [interno]);
  const [messages, setMessages] = useState<Message[]>([interno ? WELCOME_INTERNO : WELCOME]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    window.speechSynthesis.speak(utterance);
  }

  function startListening() {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) return;
    recognition.current?.stop();
    const instance = new Recognition();
    instance.lang = "es-PE";
    instance.interimResults = false;
    instance.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      if (last?.[0]?.transcript) setDraft((current) => (current ? current + " " : "") + last[0].transcript);
    };
    instance.onerror = () => setListening(false);
    instance.onend = () => setListening(false);
    recognition.current = instance;
    setListening(true);
    instance.start();
  }

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const question = draft.trim();
    if (!question || loading) return;
    const nextMessages: Message[] = [...messages, { role: "user", text: question }];
    setMessages(nextMessages);
    setDraft("");
    setError("");
    setLoading(true);
    try {
      if (interno) {
        const r = modoDirecto
          ? await llamarDirecto({ data: { message: question } })
          : await llamarInterno({ data: { message: question, history: nextMessages.slice(-9, -1) } });
        if (r.error || !r.reply) throw new Error(r.error || "AURI no pudo responder en este momento.");
        setMessages((current) => [...current, { role: "model", text: r.reply }]);
        speak(textoParaVoz(r.reply));
        return;
      }
      const { data, error: invokeError } = await supabase.functions.invoke("auri-chat", {
        body: {
          message: question,
          history: nextMessages.slice(-9, -1).map(({ role, text }) => ({ role, text })),
        },
      });
      if (invokeError) throw invokeError;
      if (!data?.reply || typeof data.reply !== "string") throw new Error(data?.error || "AURI no pudo responder en este momento.");
      const answer: Message = { role: "model", text: data.reply };
      setMessages((current) => [...current, answer]);
      speak(textoParaVoz(answer.text));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo conectar con AURI. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  if (interno && !autorizado) {
    return (
      <div className="flex min-h-[320px] flex-col justify-center gap-4 rounded-2xl border border-[#d9c58e]/50 bg-white p-6 text-[#394653]">
        <p className="font-semibold text-[#293744]">Activar AURI con datos del taller</p>
        <p className="text-sm leading-6">AURI consultará únicamente la información que tu cuenta ya puede ver. El modo Gemini usa el proveedor de IA; AURI Directo no usa IA y ejecuta consultas predeterminadas de solo lectura. Ninguno de los modos puede modificar pedidos desde este asistente.</p>
        <button type="button" onClick={() => { window.localStorage.setItem(CONSENT_KEY, "1"); setAutorizado(true); }} className="self-start rounded-xl bg-[#c7a65b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#ad8b40]">Autorizar acceso</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[440px] flex-col overflow-hidden rounded-2xl border border-[#d9c58e]/50 bg-white">
      <div className="flex items-center gap-3 border-b border-[#eee8da] bg-[#fcfaf5] px-4 py-3">
        <div className="relative grid size-11 shrink-0 place-items-center rounded-full border border-[#c9aa61] bg-white shadow-sm">
          <Bot className="size-6 text-[#b18b3e]" />
          <span className="absolute bottom-2 right-2 size-1.5 rounded-full bg-[#2786e8] shadow-[0_0_7px_#2786e8]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#293744]">AURI <span className="ml-1 text-[10px] font-medium uppercase tracking-wider text-[#a4843d]">Asistente virtual</span></p>
          <p className="text-xs text-[#7b858c]">Estoy aquí para ayudarte a crear, aprender y crecer</p>
        </div>
        {interno && <div className="flex items-center gap-1 rounded-lg border border-[#e8dfcc] bg-white p-1 text-[10px] font-semibold"><button type="button" onClick={() => setModoDirecto(false)} aria-pressed={!modoDirecto} className={`rounded-md px-2 py-1 ${!modoDirecto ? "bg-[#263746] text-white" : "text-[#69737b]"}`}>Gemini</button><button type="button" onClick={() => setModoDirecto(true)} aria-pressed={modoDirecto} className={`rounded-md px-2 py-1 ${modoDirecto ? "bg-[#263746] text-white" : "text-[#69737b]"}`}>Sin IA</button></div>}
        <div className="ml-auto flex items-center gap-1 rounded-full border border-[#e8dfcc] bg-white p-1 text-[10px] font-semibold">
          <button type="button" onClick={() => setVista("texto")} aria-pressed={vista === "texto"} className={\`rounded-full px-2.5 py-1.5 transition \${vista === "texto" ? "bg-[#263746] text-white" : "text-[#69737b]"}\`}>Texto</button>
          <button type="button" onClick={() => setVista("voz")} aria-pressed={vista === "voz"} className={\`flex items-center gap-1 rounded-full px-2.5 py-1.5 transition \${vista === "voz" ? "bg-[#263746] text-white" : "text-[#69737b]"}\`}><Mic className="size-3" /> Voz</button>
        </div>
        <Sparkles className="size-5 shrink-0 text-[#c2a252]" />
      </div>

      {vista === "voz" ? (
        <div className="relative flex min-h-[480px] flex-1 flex-col items-center justify-between overflow-hidden bg-[radial-gradient(ellipse_at_center,_#24394a_0%,_#152535_55%,_#101c29_100%)] px-5 py-8 text-white">
          <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(#d9c58e 0.7px, transparent 0.7px)", backgroundSize: "22px 22px" }} />
          <div className="relative z-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#d8bd78]">AURUM LAB · AURI</p>
            <p className="mt-2 text-sm text-slate-300">{modoDirecto ? "Modo directo · Sin inteligencia artificial" : "Asistente inteligente"}</p>
          </div>
          <div className="relative z-10 flex flex-col items-center py-5">
            <div className={\`relative grid size-52 place-items-center rounded-full border border-[#d7bd79]/50 bg-[#d8bd79]/[0.06] shadow-[0_0_70px_rgba(199,166,91,0.18)] \${listening || loading ? "animate-pulse" : ""}\`}>
              <div className={\`absolute inset-3 rounded-full border border-[#d7bd79]/35 \${listening ? "animate-ping" : ""}\`} />
              <div className="absolute inset-7 rounded-full border border-[#7ca6bd]/40" />
              <div className="absolute inset-11 rounded-full bg-[radial-gradient(circle_at_35%_30%,_#f1dfaa_0%,_#b9954d_22%,_#344b5d_58%,_#162737_100%)] shadow-[0_0_38px_rgba(214,185,112,0.45)]" />
              <Bot className="relative z-10 size-14 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.65)]" />
              <span className="absolute right-7 top-8 size-2 rounded-full bg-[#8bd4e8] shadow-[0_0_12px_#8bd4e8]" />
            </div>
            <p className="mt-7 text-lg font-semibold tracking-wide">{listening ? "Te estoy escuchando…" : loading ? "Estoy procesando…" : "Hola, soy AURI"}</p>
            <p className="mt-2 max-w-xs text-center text-sm leading-6 text-slate-300">{listening ? "Habla con claridad. Cuando termines, detén el micrófono." : loading ? "Estoy preparando tu respuesta." : "Toca el núcleo para hablar conmigo."}</p>
            <button type="button" onClick={listening ? () => recognition.current?.stop() : startListening} disabled={!voiceSupported || loading} aria-label={listening ? "Detener escucha" : "Hablar con AURI"} className={\`mt-7 grid size-16 place-items-center rounded-full border shadow-[0_0_30px_rgba(199,166,91,0.25)] transition \${listening ? "border-red-300 bg-red-500 text-white" : "border-[#e2ca8b] bg-[#c7a65b] text-[#182838] hover:scale-105"} disabled:cursor-not-allowed disabled:opacity-40\`}>
              {listening ? <MicOff className="size-7" /> : <Mic className="size-7" />}
            </button>
            {!voiceSupported && <p className="mt-3 text-xs text-amber-200">Este navegador no admite dictado por voz. Puedes usar la vista de texto.</p>}
          </div>
          <div className="relative z-10 w-full max-w-md">
            {messages.length > 1 && (
              <div className="mb-3 max-h-28 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.07] p-3 text-sm leading-6 text-slate-100 backdrop-blur">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#d8bd78]">Última respuesta</p>
                {messages[messages.length - 1]?.text}
              </div>
            )}
            <form onSubmit={sendMessage} className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] p-2 backdrop-blur">
              <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="O escribe aquí…" aria-label="Mensaje para AURI" className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-slate-400" />
              <button type="submit" disabled={!draft.trim() || loading} aria-label="Enviar mensaje" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#c7a65b] text-[#182838] disabled:opacity-40"><Send className="size-4" /></button>
            </form>
            {error && <p role="alert" className="mt-2 rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-100">{error}</p>}
          </div>
        </div>
      ) : (
      <>
      <div className="flex-1 space-y-3 overflow-y-auto bg-[#fffefa] p-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "rounded-br-md bg-[#263746] text-white" : "rounded-bl-md border border-[#eee6d5] bg-white text-[#394653] shadow-sm"}`}>
              {renderAuriMessage(message.text)}
              {message.role === "model" && index > 0 && voiceEnabled && (
                <button type="button" onClick={() => speak(textoParaVoz(message.text))} aria-label="Escuchar respuesta" className="ml-2 inline-flex align-middle text-[#a88742] hover:text-[#72551e]"><Volume2 className="size-3.5" /></button>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-[#8b7953]">AURI está preparando una respuesta…</div>}
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[#eee8da] bg-white p-3">
        <form onSubmit={sendMessage} className="flex items-end gap-2">
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); }
          }} rows={1} maxLength={1200} placeholder="Escribe tu pregunta a AURI…" aria-label="Mensaje para AURI" className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-[#dedbd3] bg-[#fffefa] px-3 py-3 text-sm text-[#303943] outline-none placeholder:text-[#a0a5a8] focus:border-[#b99642] focus:ring-2 focus:ring-[#c7a65b]/15" />
          {voiceSupported && (
            <button type="button" onClick={listening ? () => recognition.current?.stop() : startListening} aria-label={listening ? "Detener dictado" : "Dictar pregunta"} className={`grid size-11 shrink-0 place-items-center rounded-xl border ${listening ? "border-red-300 bg-red-50 text-red-600" : "border-[#e5dcc6] text-[#9b7a36] hover:bg-[#faf6eb]"}`}>
              {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </button>
          )}
          <button type="button" onClick={() => { setVoiceEnabled((value) => !value); window.speechSynthesis?.cancel(); }} aria-label={voiceEnabled ? "Silenciar respuestas" : "Activar voz"} className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#e5dcc6] text-[#9b7a36] hover:bg-[#faf6eb]">
            {voiceEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </button>
          <button type="submit" disabled={!draft.trim() || loading} aria-label="Enviar mensaje" className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#c7a65b] text-white transition hover:bg-[#ad8b40] disabled:cursor-not-allowed disabled:opacity-40">
            <Send className="size-4" />
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between gap-2 px-1">
          <p className="text-[10px] text-[#969b9e]">{interno ? (modoDirecto ? "AURI Directo · Sin IA · Solo lectura." : "AURI Gemini · Datos según tus permisos.") : "AURI usa Gemini para responder. No compartas datos privados."}</p>
          {interno ? (
            <button type="button" onClick={() => { window.localStorage.removeItem(CONSENT_KEY); setAutorizado(false); }} className="shrink-0 text-[10px] font-semibold text-[#96732e] underline underline-offset-2">Desactivar acceso a datos</button>
          ) : (
            <button type="button" onClick={onContact} className="shrink-0 text-[10px] font-semibold text-[#96732e] underline underline-offset-2">Contactar al equipo</button>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
