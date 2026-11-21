import { useEffect, useRef, useState } from "react";
import { Bot, Mic, MicOff, Send, Volume2, VolumeX, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

export function AuriChat({ onContact }: { onContact: () => void }) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
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

  async function sendMessage(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const question = draft.trim();
    if (!question || loading) return;
    const nextMessages: Message[] = [...messages, { role: "user", text: question }];
    setMessages(nextMessages);
    setDraft("");
    setError("");
    setLoading(true);
    try {
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
      speak(answer.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo conectar con AURI. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
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
        <Sparkles className="size-5 text-[#c2a252]" />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-[#fffefa] p-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "rounded-br-md bg-[#263746] text-white" : "rounded-bl-md border border-[#eee6d5] bg-white text-[#394653] shadow-sm"}`}>
              {message.text}
              {message.role === "model" && index > 0 && voiceEnabled && (
                <button type="button" onClick={() => speak(message.text)} aria-label="Escuchar respuesta" className="ml-2 inline-flex align-middle text-[#a88742] hover:text-[#72551e]"><Volume2 className="size-3.5" /></button>
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
          <p className="text-[10px] text-[#969b9e]">AURI usa Gemini para responder. No compartas datos privados.</p>
          <button type="button" onClick={onContact} className="shrink-0 text-[10px] font-semibold text-[#96732e] underline underline-offset-2">Contactar al equipo</button>
        </div>
      </div>
    </div>
  );
}
