import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Mic, MicOff, Send, Volume2, VolumeX, Sparkles, Headphones, MessageCircle, PackageSearch, Gem, Activity } from "lucide-react";
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
const CONSENT_KEY = "auri-interno-acceso";

function renderAuriInline(value: string) {
  return value.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={index} className="font-semibold text-[#263746]">{part.slice(2, -2)}</strong>
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
  return value.replace(/\*\*(.*?)\*\*/g, "$1").replace(/^\s*(?:\*|-)\s+/gm, "").replace(/\n{2,}/g, ". ");
}

export function AuriChat({ onContact, modo = "publico" }: { onContact: () => void; modo?: "publico" | "interno" }) {
  const interno = modo === "interno";
  const llamarInterno = useServerFn(auriInterno);
  const llamarDirecto = useServerFn(auriDirecto);
  const [modoDirecto, setModoDirecto] = useState(false);
  const [vista, setVista] = useState<"texto" | "voz">("texto");
  const [autorizado, setAutorizado] = useState(false);
  const [messages, setMessages] = useState<Message[]>([interno ? WELCOME_INTERNO : WELCOME]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const pendingVoiceText = useRef("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (interno) setAutorizado(window.localStorage.getItem(CONSENT_KEY) === "1");
  }, [interno]);

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
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function startListening() {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition || loading) return;
    recognition.current?.stop();
    pendingVoiceText.current = "";
    const instance = new Recognition();
    instance.lang = "es-PE";
    instance.interimResults = false;
    instance.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      if (last?.[0]?.transcript) {
        const transcript = last[0].transcript.trim();
        pendingVoiceText.current = transcript;
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
        body: { message: question, history: nextMessages.slice(-9, -1).map(({ role, text }) => ({ role, text })) },
      });
      if (invokeError) throw invokeError;
      if (!data?.reply || typeof data.reply !== "string") throw new Error(data?.error || "AURI no pudo responder en este momento.");
      setMessages((current) => [...current, { role: "model", text: data.reply }]);
      speak(textoParaVoz(data.reply));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo conectar con AURI. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  if (interno && !autorizado) {
    return (
      <div className="flex min-h-[320px] h-full flex-col justify-center gap-4 bg-white p-6 text-[#394653] sm:rounded-2xl">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-[#dfc98e] bg-[#fbf8ef] text-[#ad8a3d]"><Bot className="size-8" /></div>
        <div className="text-center"><p className="font-display text-xl text-[#263746]">Activa tu espacio AURI</p><p className="mt-2 text-sm leading-6 text-[#687580]">AURI consultará únicamente la información que tu cuenta ya puede ver. Gemini usa el proveedor de IA; AURI Directo ejecuta consultas predeterminadas sin IA. Ambos modos son de solo lectura.</p></div>
        <button type="button" onClick={() => { window.localStorage.setItem(CONSENT_KEY, "1"); setAutorizado(true); }} className="mx-auto min-h-11 rounded-xl bg-[#263746] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-[#344d62]">Autorizar acceso</button>
      </div>
    );
  }

  const voiceStatus = listening ? "Te estoy escuchando" : loading ? "Estoy preparando tu respuesta" : speaking ? "AURI está hablando" : "Tu espacio de conversación";
  const voiceHint = listening ? "Habla con naturalidad. Suelta el botón para enviar." : loading ? "Estoy consultando la información para darte una respuesta." : speaking ? "Puedes interrumpir la respuesta cuando quieras." : "Mantén presionado el micrófono y conversa conmigo.";

  return (
    <section className="auri-shell flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white text-[#263746] sm:rounded-2xl sm:border sm:border-[#e8dfcc]" aria-label="Asistente AURI">
      <header className="relative z-10 shrink-0 border-b border-[#eee8da] bg-white px-4 py-3 pr-14 sm:px-5 sm:pr-14">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative grid size-11 shrink-0 place-items-center rounded-2xl border border-[#e4d3a5] bg-gradient-to-br from-[#fffdf7] to-[#f5edd9] shadow-sm">
              <Bot className="size-6 text-[#a98535]" />
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-[#4b9b79]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2"><p className="font-semibold tracking-tight text-[#263746]">AURI</p><span className="rounded-full border border-[#e9dfc7] bg-[#fbf8ef] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#9b7936]">AURUM LAB</span></div>
              <p className="mt-0.5 truncate text-[11px] text-[#87919a]">{interno ? "Tu asistente de gestión" : "Asistente virtual de AURUM LAB"}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {interno && <div className="hidden items-center gap-1 rounded-full bg-[#f7f5f0] p-1 sm:flex">
              <button type="button" onClick={() => setModoDirecto(false)} aria-pressed={!modoDirecto} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${!modoDirecto ? "bg-white text-[#263746] shadow-sm" : "text-[#7d8790] hover:text-[#263746]"}`}>Gemini</button>
              <button type="button" onClick={() => setModoDirecto(true)} aria-pressed={modoDirecto} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${modoDirecto ? "bg-white text-[#263746] shadow-sm" : "text-[#7d8790] hover:text-[#263746]"}`}>Directo</button>
            </div>}
            <div className="flex items-center rounded-full border border-[#e9e3d7] bg-white p-1">
              <button type="button" onClick={() => setVista("texto")} aria-pressed={vista === "texto"} aria-label="Vista de texto" className={`grid size-8 place-items-center rounded-full transition ${vista === "texto" ? "bg-[#263746] text-white shadow-sm" : "text-[#87919a] hover:bg-[#f7f5f0]"}`}><MessageCircle className="size-4" /></button>
              <button type="button" onClick={() => setVista("voz")} aria-pressed={vista === "voz"} aria-label="Vista de voz" className={`grid size-8 place-items-center rounded-full transition ${vista === "voz" ? "bg-[#263746] text-white shadow-sm" : "text-[#87919a] hover:bg-[#f7f5f0]"}`}><Headphones className="size-4" /></button>
            </div>
          </div>
        </div>
        {interno && <div className="mt-2 flex items-center justify-between sm:hidden">
          <span className="text-[10px] text-[#8b949b]">Motor de consulta</span>
          <div className="flex items-center gap-1 rounded-full bg-[#f7f5f0] p-1">
            <button type="button" onClick={() => setModoDirecto(false)} aria-pressed={!modoDirecto} className={`rounded-full px-3 py-1 text-[10px] font-semibold ${!modoDirecto ? "bg-white text-[#263746] shadow-sm" : "text-[#7d8790]"}`}>Gemini</button>
            <button type="button" onClick={() => setModoDirecto(true)} aria-pressed={modoDirecto} className={`rounded-full px-3 py-1 text-[10px] font-semibold ${modoDirecto ? "bg-white text-[#263746] shadow-sm" : "text-[#7d8790]"}`}>Directo</button>
          </div>
        </div>}
      </header>

      {vista === "voz" ? (
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-between overflow-y-auto bg-[radial-gradient(ellipse_at_50%_38%,#fffdf7_0%,#f8f4e9_48%,#f0eadb_100%)] px-5 py-6 sm:py-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d7bd79] to-transparent" />
          <div className="relative z-10 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#a98535]">AURI · VOICE EXPERIENCE</p>
            <p className="mt-2 text-sm text-[#7c8790]">{modoDirecto && interno ? "Modo directo · Sin IA" : "Conversación por voz"}</p>
          </div>
          <div className="relative z-10 flex w-full flex-col items-center py-4">
            <div className={`auri-orb relative grid size-44 place-items-center rounded-full sm:size-52 ${listening ? "is-listening" : loading ? "is-thinking" : speaking ? "is-speaking" : ""}`}>
              <div className="auri-orb__ring auri-orb__ring--outer" />
              <div className="auri-orb__ring auri-orb__ring--inner" />
              <div className="auri-orb__core"><Sparkles className="size-12 text-white drop-shadow-md sm:size-14" /></div>
              <span className="auri-orb__glint" />
            </div>
            <p className="mt-7 text-lg font-semibold tracking-tight text-[#263746]">{voiceStatus}</p>
            <p className="mt-2 max-w-xs text-center text-sm leading-6 text-[#7b858c]">{voiceHint}</p>
            <button type="button"
              onPointerDown={(event) => { event.preventDefault(); if (!voiceSupported || loading || speaking || listening) return; event.currentTarget.setPointerCapture(event.pointerId); startListening(); }}
              onPointerUp={(event) => { event.preventDefault(); if (listening) recognition.current?.stop(); }}
              onPointerCancel={() => { if (listening) recognition.current?.stop(); }}
              onContextMenu={(event) => event.preventDefault()}
              disabled={!voiceSupported || loading || speaking}
              aria-label="Mantén presionado para hablar con AURI" aria-pressed={listening}
              className={`mt-7 grid size-[68px] touch-none select-none place-items-center rounded-full border transition duration-200 ${listening ? "scale-105 border-[#b84e45] bg-[#b84e45] text-white shadow-[0_8px_28px_rgba(184,78,69,.24)]" : "border-[#d6bd7e] bg-gradient-to-b from-[#e5cf96] to-[#c4a45b] text-[#263746] shadow-[0_8px_28px_rgba(173,138,61,.24)] hover:-translate-y-0.5"} disabled:cursor-not-allowed disabled:opacity-45`}>
              {listening ? <MicOff className="size-7" /> : <Mic className="size-7" />}
            </button>
            <p className="mt-3 text-[10px] font-medium text-[#92999d]">{listening ? "SUELTA PARA ENVIAR" : "MANTÉN PRESIONADO PARA HABLAR"}</p>
            {!voiceSupported && <p className="mt-3 text-xs text-[#9a6b35]">Este navegador no admite dictado por voz. Puedes conversar desde la vista de texto.</p>}
            {speaking && <button type="button" onClick={() => { window.speechSynthesis?.cancel(); setSpeaking(false); }} className="mt-4 rounded-full border border-[#ded4bc] bg-white/80 px-4 py-2 text-xs font-semibold text-[#80662e] hover:bg-white">Interrumpir respuesta</button>}
          </div>
          <div className="relative z-10 w-full max-w-md text-center">
            <div className="mx-auto flex max-w-[210px] items-center justify-center gap-1.5" aria-hidden="true">
              {Array.from({ length: 19 }, (_, i) => <span key={i} className={`auri-wave-bar ${listening ? "active" : speaking ? "speaking" : ""}`} style={{ animationDelay: `${i * 45}ms`, height: `${8 + Math.abs(9 - i) % 5 * 3}px` }} />)}
            </div>
            {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          </div>
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#fffefa] px-4 py-4 sm:px-5">
            {messages.length === 1 && interno && (
              <div className="mb-5 mt-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a98535]">CENTRO DE ASISTENCIA</p>
                <h2 className="mt-2 font-display text-2xl leading-tight text-[#263746] sm:text-[27px]">¿Qué necesitas resolver hoy?</h2>
                <p className="mt-2 max-w-sm text-xs leading-5 text-[#7f8991]">Consulta la información de tu taller en lenguaje natural.</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map(({ label, prompt, icon: Icon }) => <button key={label} type="button" onClick={() => void sendMessage(undefined, prompt)} disabled={loading} className="group flex min-h-[66px] items-center gap-2.5 rounded-xl border border-[#e9e2d3] bg-white px-3 py-3 text-left shadow-[0_2px_8px_rgba(38,55,70,.025)] transition hover:-translate-y-0.5 hover:border-[#d5bf87] hover:shadow-md disabled:opacity-50"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#f8f3e7] text-[#a98535] transition group-hover:bg-[#f1e6c9]"><Icon className="size-4" /></span><span className="text-[11px] font-semibold leading-4 text-[#475663]">{label}</span></button>)}
                </div>
              </div>
            )}
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "model" && <div className="mr-2 mt-1 grid size-7 shrink-0 place-items-center rounded-lg border border-[#e8d9b4] bg-[#fbf8ef] text-[#a98535]"><Bot className="size-4" /></div>}
                  <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[13px] leading-[1.7] ${message.role === "user" ? "rounded-br-md bg-[#263746] text-white shadow-sm" : "rounded-bl-md border border-[#eee8dc] bg-white text-[#485560] shadow-[0_2px_10px_rgba(38,55,70,.035)]"}`}>
                    {renderAuriMessage(message.text)}
                    {message.role === "model" && index > 0 && <button type="button" onClick={() => speak(textoParaVoz(message.text))} aria-label="Escuchar respuesta" className="ml-2 inline-flex align-middle text-[#a88742] hover:text-[#72551e]"><Volume2 className="size-3.5" /></button>}
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
                <button type="button" onClick={() => { setVoiceEnabled((value) => !value); window.speechSynthesis?.cancel(); setSpeaking(false); }} aria-label={voiceEnabled ? "Silenciar respuestas" : "Activar voz"} className="text-[#9b7a36] hover:text-[#72551e]">{voiceEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}</button>
                {interno ? <button type="button" onClick={() => { window.localStorage.removeItem(CONSENT_KEY); setAutorizado(false); }} className="text-[9px] font-semibold text-[#96732e] underline underline-offset-2">Desactivar acceso</button> : <button type="button" onClick={onContact} className="text-[9px] font-semibold text-[#96732e] underline underline-offset-2">Contactar</button>}
              </div>
            </div>
          </footer>
        </>
      )}
      <style>{`
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
        @media (prefers-reduced-motion:reduce) { .auri-orb *, .auri-wave-bar { animation:none!important; transition:none!important; } }
      `}</style>
    </section>
  );
}
